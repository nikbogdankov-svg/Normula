import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Button,
  Dialog,
  Flex,
  Icon,
  Label,
  Loader,
  Select,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import {
  ArrowLeft,
  ArrowRotateLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
} from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import {
  useAllowViolation,
  useCreateMenu,
  useFillSchedule,
  useMenus,
  useSchedule,
  useUpdateSlot,
} from './api';
import { useDiets } from '@/features/diets/api';
import type { Diet } from '@/features/diets/types';
import {
  formatDateRange,
  formatDayHeader,
  formatSlotTitle,
  isCycleDayToday,
  dateForCycleDay,
  shiftIsoDate,
  startOfWeekMonday,
  toIsoDate,
  todayIsoDate,
} from './dates';
import { DishPickerDialog, type PickedDish } from './dish-picker-dialog';
import {
  dietNorm,
  formatMetric,
  statusOf,
  sumDishes,
  sumPrice,
  type DayNorm,
  type DayTotals,
  type NormStatus,
} from './norms';
import { MEALS, type Dish, type MealId, type Violation, type ViolationMetric } from './types';
import { buildMenuPrintRows, downloadMenuDoc } from './menu-print';
import { useTranslation } from '@/shared/i18n';
import './menu-route.css';
import { errorText } from '@/shared/api/error-text';

const EMPTY_DISHES: Dish[] = [];

/** Окно сетки: бэкенд работает с любым отрезком дат, 14 дней — выбор экрана. */
const CYCLE_DAYS = 14;

/** Ключи метрик нарушения в попапе «Нарушения за день». */
const METRIC_LABELS: Record<ViolationMetric, { labelKey: string; unitKey: string }> = {
  kcal: { labelKey: 'metrics.kcal', unitKey: 'menu.kcalUnit' },
  protein: { labelKey: 'metrics.protein', unitKey: 'units.gram' },
  fat: { labelKey: 'metrics.fat', unitKey: 'units.gram' },
  carbs: { labelKey: 'metrics.carbs', unitKey: 'units.gram' },
  price: { labelKey: 'metrics.price', unitKey: 'units.ruble' },
};

/** Диеты групп объекта или подобъекта, без повторов, в порядке групп. */
function objectDiets(): never[] {
  return [];
}

/** Приёмы пищи сетки — из диеты; пустой mealIds у диеты — все приёмы. */
function resolveActiveMeals(diet: Diet | undefined): MealId[] {
  const source = diet?.mealIds ?? [];
  if (source.length === 0) return MEALS.map((meal) => meal.id);
  const active = new Set(source);
  return MEALS.filter((meal) => active.has(meal.id)).map((meal) => meal.id);
}

/**
 * Раздел «Меню»: сразу сетка приёмов по датам (без списка циклов).
 * Расписание берётся по объекту, диете и окну дат.
 */
export function MenuRoute() {
  const { current } = useOrganizations();

  if (current === null) {
    return (
      <div className="menu-page">
        <NoOrganizationSelectedState />
      </div>
    );
  }

  return <MenuByDates />;
}

function MenuByDates() {
  const diets = useDiets();
  const menus = useMenus();
  const updateSlot = useUpdateSlot();
  const allowViolation = useAllowViolation();
  const fillSchedule = useFillSchedule();
  const createMenu = useCreateMenu();
  const toaster = useToaster();
  const { t } = useTranslation();
  const [picker, setPicker] = useState<{ day: number; mealId: MealId } | null>(null);
  const [dietId, setDietId] = useState<string | null>(null);
  const [fillMenuOpen, setFillMenuOpen] = useState(false);
  const [fillMenuSourceId, setFillMenuSourceId] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuName, setCreateMenuName] = useState('');
  const [fillMenuSubmitting, setFillMenuSubmitting] = useState(false);
  /** День, для которого открыт попап нарушений. */
  const [violationDay, setViolationDay] = useState<number | null>(null);
  /** Окно просмотра — стрелки обновляют только его, данные подтягиваются запросом. */
  const [startDate, setStartDate] = useState(() => startOfWeekMonday());
  const endDate = shiftIsoDate(startDate, CYCLE_DAYS - 1);

  const selectedObject = undefined;

  useEffect(() => {
    // objects removed
  }, []);

  /** Диеты, которые справочник ещё знает: группы объекта могут ссылаться на удалённые. */
  const knownDietIds = useMemo(
    () => new Set((diets.data?.diets ?? []).map((diet) => diet.id)),
    [diets.data]
  );

  /** Рационы селекта — весь справочник. */
  const dietOptions: GroupDiet[] = (diets.data?.diets ?? []).map((diet) => ({ id: diet.id, name: diet.name }));

  useEffect(() => {
    if (dietOptions.length === 0) {
      setDietId(null);
      return;
    }
    setDietId((current) =>
      current && dietOptions.some((option) => option.id === current) ? current : dietOptions[0].id
    );
  }, [dietOptions]);

  const diet = diets.data?.diets.find((item) => item.id === dietId);
  /** Приёмы пищи сетки — зависят от выбранной диеты. */
  const activeMeals = resolveActiveMeals(diet);
  const norm = dietNorm(diet);
  const priceLimit = norm.price;

  const scheduleParams = useMemo(
    () => (dietId ? { objectId: 'default', dietId, from: startDate, to: endDate } : null),
    [dietId, startDate, endDate]
  );
  const schedule = useSchedule(scheduleParams);
  /** Пока в данных предыдущее окно — слоты ещё от другого периода. */
  const periodSynced = schedule.data !== undefined && !schedule.isPlaceholderData;
  const weekLoading = scheduleParams !== null && (schedule.isPending || schedule.isPlaceholderData);

  useEffect(() => {
    if (!picker || activeMeals.includes(picker.mealId)) return;
    setPicker(null);
  }, [picker, activeMeals]);

  useEffect(() => {
    if (!periodSynced) setPicker(null);
  }, [periodSynced]);

  const slotMap = useMemo(() => {
    const map = new Map<string, Dish[]>();
    if (!periodSynced) return map;
    schedule.data.days.forEach((day, index) => {
      for (const slot of day.slots ?? []) {
        map.set(slotKey(index + 1, slot.mealId), slot.dishes ?? EMPTY_DISHES);
      }
    });
    return map;
  }, [schedule.data, periodSynced]);

  /** Дни, для которых нарушение разрешено (кнопка-глаз в обычном стиле). */
  const allowedViolationDays = useMemo(() => {
    const set = new Set<number>();
    if (!periodSynced) return set;
    schedule.data.days.forEach((day, index) => {
      if (day.violationAllowed) set.add(index + 1);
    });
    return set;
  }, [schedule.data, periodSynced]);

  const dayTotals = useMemo(() => {
    const map = new Map<number, DayTotals>();
    for (let day = 1; day <= CYCLE_DAYS; day += 1) {
      const dishes: Dish[] = [];
      for (const meal of activeMeals) {
        dishes.push(...(slotMap.get(slotKey(day, meal)) ?? []));
      }
      map.set(day, sumDishes(dishes));
    }
    return map;
  }, [slotMap, activeMeals]);

  /** Нарушения норм по дням — считает бэкенд. */
  const dayViolations = useMemo(() => {
    const map = new Map<number, Violation[]>();
    if (!periodSynced) return map;
    schedule.data.days.forEach((day, index) => {
      map.set(index + 1, day.violations ?? []);
    });
    return map;
  }, [schedule.data, periodSynced]);

  const hasDayViolation = (day: number): boolean => (dayViolations.get(day) ?? []).length > 0;

  const pickerDishes = useMemo(() => {
    if (!picker) return EMPTY_DISHES;
    return slotMap.get(slotKey(picker.day, picker.mealId)) ?? EMPTY_DISHES;
  }, [picker, slotMap]);

  const pickerDayPriceWithoutSlot = useMemo(() => {
    if (!picker) return 0;
    return (dayTotals.get(picker.day)?.price ?? 0) - sumDishes(pickerDishes).price;
  }, [picker, dayTotals, pickerDishes]);

  const pickerMeal = picker ? MEALS.find((meal) => meal.id === picker.mealId) : undefined;
  const pickerTitle = picker
    ? formatSlotTitle(startDate, picker.day, pickerMeal ? t(pickerMeal.labelKey) : '')
    : '';

  const fillMenuOptions = useMemo(() => menus.data?.menus ?? [], [menus.data]);

  useEffect(() => {
    if (!fillMenuOpen) return;
    setFillMenuSourceId((current) =>
      current && fillMenuOptions.some((option) => option.id === current) ? current : null
    );
  }, [fillMenuOpen, fillMenuOptions]);

  if (diets.isPending) {
    return (
      <div className="menu-page">
        <LoadingState />
      </div>
    );
  }

  if (diets.isError) {
    return (
      <div className="menu-page">
        <ErrorState error={diets.error} onRetry={() => void diets.refetch()} />
      </div>
    );
  }

  if (diets.isError) {
    return (
      <div className="menu-page">
        <ErrorState error={diets.error} onRetry={() => void diets.refetch()} />
      </div>
    );
  }

  if (schedule.isError) {
    return (
      <div className="menu-page">
        <ErrorState error={schedule.error} onRetry={() => void schedule.refetch()} />
      </div>
    );
  }

  const days = Array.from({ length: CYCLE_DAYS }, (_, index) => index + 1);
  const isEmptyWeek = days.every((day) =>
    activeMeals.every((mealId) => (slotMap.get(slotKey(day, mealId)) ?? []).length === 0)
  );
  const objectOptions: any[] = [];
  /** Имя меню по умолчанию — по окну, которое сохраняем. */
  const defaultMenuName = t('menu.defaultName', { range: formatDateRange(startDate, CYCLE_DAYS) });

  const fillFromSourceMenu = async (sourceMenuId: string) => {
    const sourceMenu = fillMenuOptions.find((candidate) => candidate.id === sourceMenuId);
    if (!sourceMenu || !objectId || !dietId) return;

    setFillMenuSubmitting(true);
    try {
      // Уже прошедшие дни и сегодняшний не перезаписываются — меню
      // применяется со следующего дня.
      await fillSchedule.mutateAsync({
        objectId: 'default',
        dietId,
        menuId: sourceMenu.id,
        from: startDate,
        to: endDate,
        keepThrough: todayIsoDate(),
      });
      setFillMenuOpen(false);
      setFillMenuSourceId(null);
      toaster.add({
        name: 'menu-filled-from-source',
        title: t('menu.filledToast'),
        content: t('menu.filledContent', { name: sourceMenu.name }),
        theme: 'success',
      });
    } catch (error) {
      toaster.add({
        name: 'menu-fill-error',
        title: t('menu.fillError'),
        content: errorText(error),
        theme: 'danger',
      });
    } finally {
      setFillMenuSubmitting(false);
    }
  };

  const createAndFillNewMenu = async () => {
    if (!objectId || !dietId) return;
    const name = createMenuName.trim() || defaultMenuName;
    setFillMenuSubmitting(true);
    try {
      await createMenu.mutateAsync({ name, objectId: 'default', dietId, from: startDate, to: endDate });
      setFillMenuOpen(false);
      setCreateMenuOpen(false);
      setCreateMenuName('');

      toaster.add({
        name: 'menu-created-and-filled',
        title: t('menu.createdToast'),
        content: t('menu.createdContent', { name }),
        theme: 'success',
      });
    } catch (error) {
      toaster.add({
        name: 'menu-create-error',
        title: t('menu.createError'),
        content: errorText(error),
        theme: 'danger',
      });
    } finally {
      setFillMenuSubmitting(false);
    }
  };

  const goToWeek = (iso: string) => {
    const next = startOfWeekMonday(iso);
    if (next === startDate || weekLoading) return;
    setPicker(null);
    setStartDate(next);
  };

  const shiftPeriod = (direction: -1 | 1) => {
    goToWeek(shiftIsoDate(startDate, direction * CYCLE_DAYS));
  };

  const printMenu = () => {
    const mealLabelOf = (mealId: MealId) => {
      const meal = MEALS.find((item) => item.id === mealId);
      return meal ? t(meal.labelKey) : mealId;
    };
    void downloadMenuDoc({
      startDate,
      cycleDays: CYCLE_DAYS,
      objectName: selectedObject?.name ?? '',
      dietName: diet?.name ?? '',
      rows: buildMenuPrintRows({
        days,
        meals: activeMeals,
        dayLabelOf: (day) => {
          const header = formatDayHeader(startDate, day);
          return `${header.weekday} ${header.date}`;
        },
        mealLabelOf,
        dishesOf: (day, mealId) => slotMap.get(slotKey(day, mealId)) ?? EMPTY_DISHES,
        totalsOf: (day) => dayTotals.get(day) ?? sumDishes([]),
      }),
    });
  };

  const allowDayViolation = (day: number) => {
    if (!dietId) return;
    allowViolation.mutate(
      { objectId: 'default', dietId, date: toIsoDate(dateForCycleDay(startDate, day)) },
      {
        onSuccess: () => {
          toaster.add({
            name: 'menu-violation-allowed',
            title: t('menu.violationAllowedToast'),
            content: t('menu.violationAllowedContent', { day }),
            theme: 'warning',
          });
          setViolationDay(null);
        },
        onError: (e) =>
          toaster.add({
            name: 'menu-violation-error',
            title: t('common.error'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  const saveSlot = (picked: PickedDish[]) => {
    if (!picker || !dietId) return;
    const dayPrice =
      (dayTotals.get(picker.day)?.price ?? 0) - sumDishes(pickerDishes).price + sumPrice(picked);
    updateSlot.mutate(
      {
        objectId: 'default',
        dietId,
        date: toIsoDate(dateForCycleDay(startDate, picker.day)),
        mealId: picker.mealId,
        recipeIds: picked.map((dish) => dish.recipeId),
      },
      {
        onSuccess: () => {
          if (dayPrice > priceLimit) {
            toaster.add({
              name: 'menu-price-warning',
              title: t('menu.priceExceededToast'),
              content: t('menu.priceExceededContent', {
                price: Math.round(dayPrice),
                limit: priceLimit,
              }),
              theme: 'warning',
            });
          } else {
            toaster.add({
              name: 'menu-slot-saved',
              title: t('menu.slotSaved'),
              theme: 'success',
            });
          }
          setPicker(null);
        },
        onError: (e) =>
          toaster.add({
            name: 'menu-slot-error',
            title: t('common.error'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <div className="menu-page">
      <Flex className="menu-toolbar" alignItems="center" justifyContent="space-between" gap={3}>
        <Flex alignItems="center" gap={2}>
          <Select
            size="l"
            label={t('menu.dietLabel')}
            width={200}
            value={dietId ? [dietId] : []}
            placeholder={t('menu.dietPlaceholder')}
            onUpdate={(values) => setDietId(values[0] ?? null)}
            options={dietOptions.map((option) => ({ value: option.id, content: option.name }))}
            disabled={dietOptions.length === 0}
          />
        </Flex>

        <Flex alignItems="center" gap={2}>
          <Button
            view="outlined"
            size="l"
            title={t('menu.prevPeriod')}
            disabled={weekLoading}
            onClick={() => shiftPeriod(-1)}
          >
            <Icon data={ChevronLeft} size={16} />
          </Button>
          <TextInput
            className="menu-week-field"
            size="l"
            value={formatDateRange(startDate, CYCLE_DAYS)}
            readOnly
            endContent={
              <Button
                view="normal"
                size="s"
                title={t('menu.currentWeek')}
                disabled={weekLoading}
                onClick={() => goToWeek(startOfWeekMonday())}
              >
                <Icon data={ArrowRotateLeft} size={14} />
              </Button>
            }
          />
          <Button
            view="outlined"
            size="l"
            title={t('menu.nextPeriod')}
            disabled={weekLoading}
            onClick={() => shiftPeriod(1)}
          >
            <Icon data={ChevronRight} size={16} />
          </Button>
          <Button
            type="button"
            view={isEmptyWeek ? 'action' : 'normal-contrast'}
            size="l"
            onClick={() => setFillMenuOpen(true)}
            disabled={weekLoading || !periodSynced}
          >
            {t('menu.fillMenu')}
          </Button>
          <Button
            type="button"
            view="normal-contrast"
            size="l"
            onClick={printMenu}
            disabled={weekLoading || !periodSynced}
            title={t('menu.print')}
          >
            <Icon data={Printer} size={16} />
          </Button>
        </Flex>
      </Flex>

      <div className="menu-grid-wrap">
        <div className={`menu-grid-fade${weekLoading ? ' menu-grid-fade_loading' : ''}`}>
          <div
            className="menu-grid"
            style={
              {
                '--menu-days': days.length,
                '--menu-meal-rows': activeMeals.length,
              } as CSSProperties
            }
          >
            <div className="menu-grid__cell menu-grid__meal menu-grid__day menu-grid__corner" />
            {days.map((day, dayIndex) => {
              const header = formatDayHeader(startDate, day);
              const isToday = isCycleDayToday(startDate, day);
              const end = dayIndex === days.length - 1 ? ' menu-grid__cell_end' : '';
              return (
                <div
                  key={`day-${day}`}
                  className={`menu-grid__cell menu-grid__day${end}${isToday ? ' menu-grid__day_today' : ''}`}
                >
                  <div className="menu-grid__day-weekday">{header.weekday}</div>
                  <div className="menu-grid__day-date">
                    {header.date}
                    {isToday && (
                      <Label className="menu-grid__today-label" theme="success" size="xs">
                        {t('menu.today')}
                      </Label>
                    )}
                  </div>
                </div>
              );
            })}

            {activeMeals.map((mealId, mealIndex) => {
              const meal = MEALS.find((item) => item.id === mealId);
              const label = meal ? t(meal.labelKey) : mealId;
              const beforeTotal =
                mealIndex === activeMeals.length - 1 ? ' menu-grid__cell_before-total' : '';

              return (
                <Fragment key={mealId}>
                  <div className={`menu-grid__cell menu-grid__meal${beforeTotal}`}>{label}</div>
                  {days.map((day, dayIndex) => {
                    const dishes = slotMap.get(slotKey(day, mealId)) ?? [];
                    const totals = sumDishes(dishes);
                    const end = dayIndex === days.length - 1 ? ' menu-grid__cell_end' : '';

                    return (
                      <div
                        key={`${mealId}-${day}`}
                        className={`menu-grid__cell menu-grid__slot${end}${beforeTotal}`}
                      >
                        <button
                          type="button"
                          className="menu-grid__cell-btn"
                          disabled={!periodSynced || weekLoading}
                          onClick={() => {
                            if (!periodSynced || weekLoading) return;
                            setPicker({ day, mealId });
                          }}
                        >
                          {dishes.length === 0 ? (
                            <span className="menu-grid__empty">{t('menu.addDish')}</span>
                          ) : (
                            <>
                              <Text
                                variant="body-1"
                                className="menu-grid__dish"
                                title={dishes.map((dish) => dish.name).join(' | ')}
                              >
                                {dishes.map((dish) => dish.name).join(' | ')}
                              </Text>
                              <div className="menu-grid__slot-meta">
                                <span>
                                  {formatMetric(totals.kcal)} {t('menu.kcalUnit')} |{' '}
                                  {formatMetric(totals.price)} Kč
                                </span>
                                <span>
                                  {t('menu.macroProtein')} {formatMetric(totals.protein)} |{' '}
                                  {t('menu.macroFat')} {formatMetric(totals.fat)} |{' '}
                                  {t('menu.macroCarbs')} {formatMetric(totals.carbs)}
                                </span>
                              </div>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}

            <div className="menu-grid__cell menu-grid__total-label">{t('menu.dayTotal')}</div>
            {days.map((day, dayIndex) => {
              const totals = dayTotals.get(day) ?? sumDishes([]);
              const end = dayIndex === days.length - 1 ? ' menu-grid__cell_end' : '';
              return (
                <div
                  key={`total-${day}`}
                  className={`menu-grid__cell menu-grid__total-cell${end}${hasDayViolation(day) && !allowedViolationDays.has(day) ? ' menu-grid__total-cell_violation' : ''}`}
                >
                  <DayTotalCell
                    day={day}
                    totals={totals}
                    norm={norm}
                    violations={dayViolations.get(day) ?? []}
                    onInspect={setViolationDay}
                    allowed={allowedViolationDays.has(day)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {weekLoading && (
          <div className="menu-grid-overlay" aria-hidden>
            <Loader size="m" />
          </div>
        )}
      </div>

      <Dialog
        open={fillMenuOpen}
        onClose={() => {
          setFillMenuOpen(false);
          setCreateMenuOpen(false);
        }}
        size="s"
      >
        {createMenuOpen ? (
          <Flex alignItems="center" gap={1} style={{ padding: '16px 20px 12px' }}>
            <Button
              view="flat"
              size="s"
              title={t('common.back')}
              onClick={() => setCreateMenuOpen(false)}
            >
              <Icon data={ArrowLeft} size={16} />
            </Button>
            <Text variant="subheader-2">{t('menu.createMenuTitle')}</Text>
          </Flex>
        ) : (
          <Dialog.Header caption={t('menu.fillMenuTitle')} />
        )}
        <Dialog.Divider />
        <Dialog.Body>
          {createMenuOpen ? (
            <TextInput
              size="l"
              label={t('menu.nameLabel')}
              placeholder={defaultMenuName}
              value={createMenuName}
              onUpdate={setCreateMenuName}
              autoFocus
            />
          ) : (
            <Flex direction="column" gap={3}>
              {fillMenuOptions.length > 0 && (
                <Select
                  size="l"
                  label={t('menu.chooseLabel')}
                  placeholder={t('menu.choosePlaceholder')}
                  value={fillMenuSourceId ? [fillMenuSourceId] : []}
                  onUpdate={(value) => setFillMenuSourceId(value[0] ?? null)}
                  options={fillMenuOptions.map((candidate) => ({
                    value: candidate.id,
                    content: candidate.name,
                  }))}
                />
              )}
              {!isEmptyWeek && (
                <Button
                  type="button"
                  view="normal"
                  size="l"
                  loading={fillMenuSubmitting}
                  onClick={() => setCreateMenuOpen(true)}
                  disabled={fillMenuSubmitting}
                >
                  {t('menu.createFromCurrent')}
                </Button>
              )}
              {fillMenuSourceId && (
                <Text variant="body-2" color="secondary">
                  {t('menu.nextDayNote')}
                </Text>
              )}
            </Flex>
          )}
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
            {createMenuOpen ? (
              <>
                <Button
                  type="button"
                  view="outlined"
                  size="l"
                  onClick={() => setCreateMenuOpen(false)}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  view="action"
                  size="l"
                  loading={fillMenuSubmitting}
                  onClick={() => void createAndFillNewMenu()}
                  disabled={fillMenuSubmitting}
                >
                  {t('menu.createNewMenu')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  view="outlined"
                  size="l"
                  onClick={() => setFillMenuOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                {fillMenuOptions.length > 0 && fillMenuSourceId && (
                  <Button
                    type="button"
                    view="action"
                    size="l"
                    loading={fillMenuSubmitting}
                    onClick={() => void fillFromSourceMenu(fillMenuSourceId)}
                    disabled={fillMenuSubmitting}
                  >
                    {t('menu.choose')}
                  </Button>
                )}
              </>
            )}
          </Flex>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={violationDay !== null} onClose={() => setViolationDay(null)} size="s">
        <Dialog.Header caption={t('menu.violationsTitle')} />
        <Dialog.Divider />
        <Dialog.Body>
          {violationDay !== null && (
            <Flex direction="column" gap={3}>
              {(dayViolations.get(violationDay) ?? []).map((item) => (
                <Text key={item.metric} variant="body-2">
                  {t('menu.violationLine', {
                    label: t(METRIC_LABELS[item.metric].labelKey),
                    actual: formatMetric(item.actual),
                    norm: formatMetric(item.norm),
                    unit: t(METRIC_LABELS[item.metric].unitKey),
                    direction: t(item.status === 'low' ? 'menu.below' : 'menu.above'),
                  })}
                </Text>
              ))}
              <Text variant="body-2" color="secondary">
                {t('menu.violationHint')}
              </Text>
            </Flex>
          )}
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
            <Button type="button" view="outlined" size="l" onClick={() => setViolationDay(null)}>
              {t('common.cancel')}
            </Button>
            {violationDay !== null && !allowedViolationDays.has(violationDay) && (
              <Button
                type="button"
                view="outlined"
                size="l"
                loading={allowViolation.isPending}
                onClick={() => allowDayViolation(violationDay)}
              >
                {t('menu.allowViolation')}
              </Button>
            )}
          </Flex>
        </Dialog.Footer>
      </Dialog>
      <DishPickerDialog
        open={picker !== null}
        title={pickerTitle}
        dishes={pickerDishes}
        priceLimit={priceLimit}
        dayPriceWithoutSlot={pickerDayPriceWithoutSlot}
        saving={updateSlot.isPending}
        onClose={() => setPicker(null)}
        onSave={saveSlot}
      />
    </div>
  );
}

function DayTotalCell({
  day,
  totals,
  norm,
  violations,
  onInspect,
  allowed,
}: {
  day: number;
  totals: DayTotals;
  norm: DayNorm;
  /** Нарушения норм за день с бэкенда; пусто — день в норме. */
  violations: Violation[];
  onInspect: (day: number) => void;
  /** Нарушение дня было разрешено — кнопка-глаз в обычном стиле. */
  allowed?: boolean;
}) {
  const { t } = useTranslation();
  const anyViolation = violations.length > 0;

  return (
    <div className="menu-grid__total-stack">
      <div className="menu-grid__metric">
        <MetricLine
          actual={totals.kcal}
          norm={norm.kcal}
          digits={0}
          unit={` ${t('menu.kcalUnit')}`}
          status={statusOf(violations, 'kcal')}
        />
      </div>
      <div className="menu-grid__metric">
        <NormValue
          actual={totals.protein}
          norm={norm.protein}
          digits={0}
          prefix={`${t('menu.macroProtein')} `}
          status={statusOf(violations, 'protein')}
        />
        <NormValue
          actual={totals.fat}
          norm={norm.fat}
          digits={0}
          prefix={`${t('menu.macroFat')} `}
          status={statusOf(violations, 'fat')}
        />
        <NormValue
          actual={totals.carbs}
          norm={norm.carbs}
          digits={0}
          prefix={`${t('menu.macroCarbs')} `}
          status={statusOf(violations, 'carbs')}
        />
      </div>
      <div className="menu-grid__metric">
        <MetricLine
          actual={totals.price}
          norm={norm.price}
          digits={0}
          unit=""
          normUnit=" Kč"
          status={statusOf(violations, 'price')}
        />
      </div>
      {anyViolation && (
        <Button
          view={allowed ? 'flat' : 'action'}
          size="s"
          className="menu-grid__violation-btn"
          title={t('menu.viewViolations')}
          onClick={() => onInspect(day)}
        >
          <Icon data={Eye} size={16} />
        </Button>
      )}
    </div>
  );
}

function MetricLine({
  label,
  actual,
  norm,
  digits,
  unit,
  normUnit,
  status,
}: {
  label?: string;
  actual: number;
  norm: number;
  digits: number;
  unit: string;
  normUnit?: string;
  status: NormStatus;
}) {
  return (
    <div className="menu-grid__metric">
      {label && <span className="menu-grid__metric-label">{label}</span>}
      <span className={metricClass(status)}>
        {formatMetric(actual, digits)}
        {unit} / {formatMetric(norm, digits)}
        {normUnit ?? unit}
      </span>
    </div>
  );
}

function NormValue({
  actual,
  norm,
  digits,
  prefix,
  status,
}: {
  actual: number;
  norm: number;
  digits: number;
  prefix: string;
  status: NormStatus;
}) {
  return (
    <span className={metricClass(status)}>
      {prefix}
      {formatMetric(actual, digits)}/{formatMetric(norm, digits)}
    </span>
  );
}

function metricClass(status: NormStatus): string {
  return `menu-grid__metric-value menu-grid__metric-value_${status}`;
}

function slotKey(day: number, mealId: MealId): string {
  return `${day}:${mealId}`;
}
