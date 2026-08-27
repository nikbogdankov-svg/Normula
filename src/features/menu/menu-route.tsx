import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Gear, FloppyDisk } from '@gravity-ui/icons';
import { useApi } from '@/shared/api/use-api';
import { useOrganizations } from '@/shared/auth';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import { useCreateMenu, useMenu, useMenus, useUpdateMenu, useUpdateMenuSlot } from './api';
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
import { DishPickerDialog } from './dish-picker-dialog';
import {
  comparePriceToLimit,
  compareToNorm,
  formatMetric,
  normForDiet,
  parseRuNumber,
  sumDishes,
  type DayNorm,
  type DayTotals,
  type NormStatus,
} from './norms';
import { MEALS, type CycleMenu, type MealId, type MenuDishRef } from './types';
import './menu-route.css';

const EMPTY_DISHES: MenuDishRef[] = [];

const ORG_OPTIONS = [{ value: 'school-5', content: 'Школа номер 5' }];

const DIET_OPTIONS = [
  { value: 'Основная', content: 'Основная' },
  { value: 'Щадящая', content: 'Щадящая' },
  { value: 'Диабетическая', content: 'Диабетическая' },
];

const CYCLE_DAYS = 14;

/**
 * Раздел «Меню»: сразу сетка приёмов по датам (без списка циклов).
 * Меню организации подхватывается автоматически; если нет — создаётся.
 */
export function MenuRoute() {
  const { current } = useOrganizations();
  const menus = useMenus();
  const create = useCreateMenu();
  const toaster = useToaster();
  const creating = useRef(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [localMenus, setLocalMenus] = useState<CycleMenu[]>([]);

  useEffect(() => {
    if (!menus.data || create.isPending) return;

    if (menus.data.menus.length > 0) {
      setMenuId((currentId) => currentId ?? menus.data.menus[0].id);
      creating.current = false;
      return;
    }

    if (creating.current) return;
    creating.current = true;
    create.mutate(
      {
        name: 'Меню',
        dietName: 'Основная',
        startDate: startOfWeekMonday(),
        cycleDays: CYCLE_DAYS,
      },
      {
        onSuccess: (result) => setMenuId(result.menu.id),
        onError: (e) => {
          creating.current = false;
          toaster.add({
            name: 'menu-bootstrap',
            title: 'Не удалось открыть меню',
            content: e.message,
            theme: 'danger',
          });
        },
      }
    );
  }, [menus.data, create, toaster]);

  if (current === null) {
    return (
      <div className="menu-page">
        <NoOrganizationSelectedState />
      </div>
    );
  }

  if (menus.isPending || !menuId) {
    return (
      <div className="menu-page">
        <LoadingState />
      </div>
    );
  }

  if (menus.isError) {
    return (
      <div className="menu-page">
        <ErrorState error={menus.error} onRetry={() => void menus.refetch()} />
      </div>
    );
  }

  const menuOptions = [
    ...localMenus,
    ...menus.data.menus.filter((item) => !localMenus.some((local) => local.id === item.id)),
  ];

  return (
    <MenuByDates
      menuId={menuId}
      menus={menuOptions}
      onMenuCreated={(newMenu) => {
        setLocalMenus((current) => [newMenu, ...current.filter((item) => item.id !== newMenu.id)]);
        setMenuId(newMenu.id);
      }}
    />
  );
}

function MenuByDates({
  menuId,
  menus,
  onMenuCreated,
}: {
  menuId: string;
  menus: CycleMenu[];
  onMenuCreated: (menu: CycleMenu) => void;
}) {
  const api = useApi();
  const create = useCreateMenu();
  const { data, isPending, isError, error, refetch } = useMenu(menuId);
  const updateMenu = useUpdateMenu(menuId);
  const updateSlot = useUpdateMenuSlot(menuId);
  const toaster = useToaster();
  const [picker, setPicker] = useState<{ day: number; mealId: MealId } | null>(null);
  const [organizationId, setOrganizationId] = useState(ORG_OPTIONS[0].value);
  const [parametersOpen, setParametersOpen] = useState(false);
  const [customPriceLimit, setCustomPriceLimit] = useState<number | null>(null);
  const [customNorm, setCustomNorm] = useState<Partial<DayNorm> | null>(null);
  const [parametersDraftLimit, setParametersDraftLimit] = useState<string>('');
  const [parametersDraftKcal, setParametersDraftKcal] = useState<string>('');
  const [parametersDraftProtein, setParametersDraftProtein] = useState<string>('');
  const [parametersDraftFat, setParametersDraftFat] = useState<string>('');
  const [parametersDraftCarbs, setParametersDraftCarbs] = useState<string>('');
  const [fillMenuOpen, setFillMenuOpen] = useState(false);
  const [fillMenuSourceId, setFillMenuSourceId] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuName, setCreateMenuName] = useState('');
  const [fillMenuSubmitting, setFillMenuSubmitting] = useState(false);
  /** День, для которого открыт попап нарушений. */
  const [violationDay, setViolationDay] = useState<number | null>(null);
  /** Дни, для которых нарушение разрешено (кнопка-глаз в обычном стиле). */
  const [allowedViolationDays, setAllowedViolationDays] = useState<ReadonlySet<number>>(
    () => new Set()
  );
  /** Локальная неделя просмотра — стрелки обновляют только календарь. */
  const [viewStartDate, setViewStartDate] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const pendingWeekRef = useRef<string | null>(null);
  const weekTimerRef = useRef<number | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setViewStartDate(null);
    setAllowedViolationDays(new Set());
  }, [menuId]);

  useEffect(() => {
    const weekTimer = weekTimerRef;
    const persistTimer = persistTimerRef;
    return () => {
      if (weekTimer.current !== null) window.clearTimeout(weekTimer.current);
      if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    };
  }, []);

  const menu = data?.menu;
  const startDate = viewStartDate ?? menu?.startDate ?? startOfWeekMonday();
  /** Пока startDate на сервере не совпал с просматриваемым — слоты ещё от другого периода. */
  const periodSynced = menu?.startDate === startDate;

  useEffect(() => {
    if (!menu || menu.cycleDays === CYCLE_DAYS) return;
    updateMenu.mutate({ cycleDays: CYCLE_DAYS });
  }, [menu, updateMenu]);

  useEffect(() => {
    if (!periodSynced) setPicker(null);
  }, [periodSynced]);

  const slotMap = useMemo(() => {
    const map = new Map<string, MenuDishRef[]>();
    for (const slot of menu?.slots ?? []) {
      map.set(slotKey(slot.day, slot.mealId), periodSynced ? slot.dishes : EMPTY_DISHES);
    }
    return map;
  }, [menu?.slots, periodSynced]);

  const dayTotals = useMemo(() => {
    if (!menu) return new Map<number, DayTotals>();
    const map = new Map<number, DayTotals>();
    for (let day = 1; day <= CYCLE_DAYS; day += 1) {
      const dishes: MenuDishRef[] = [];
      for (const meal of MEALS) {
        dishes.push(...(slotMap.get(slotKey(day, meal.id)) ?? []));
      }
      map.set(day, sumDishes(dishes));
    }
    return map;
  }, [menu, slotMap]);

  const hasDayViolation = (day: number): boolean => {
    const totals = dayTotals.get(day) ?? sumDishes([]);
    const base = normForDiet(menu?.dietName ?? 'Основная');
    const activeNorm: DayNorm = {
      kcal: customNorm?.kcal ?? base.kcal,
      protein: customNorm?.protein ?? base.protein,
      fat: customNorm?.fat ?? base.fat,
      carbs: customNorm?.carbs ?? base.carbs,
      price: customPriceLimit ?? base.price,
    };
    return (
      compareToNorm(totals.kcal, activeNorm.kcal) !== 'ok' ||
      compareToNorm(totals.protein, activeNorm.protein) !== 'ok' ||
      compareToNorm(totals.fat, activeNorm.fat) !== 'ok' ||
      compareToNorm(totals.carbs, activeNorm.carbs) !== 'ok' ||
      comparePriceToLimit(totals.price, activeNorm.price) !== 'ok'
    );
  };

  const pickerDishes = useMemo(() => {
    if (!picker) return EMPTY_DISHES;
    return slotMap.get(slotKey(picker.day, picker.mealId)) ?? EMPTY_DISHES;
  }, [picker, slotMap]);

  const pickerDayPriceWithoutSlot = useMemo(() => {
    if (!picker) return 0;
    return (dayTotals.get(picker.day)?.price ?? 0) - sumDishes(pickerDishes).price;
  }, [picker, dayTotals, pickerDishes]);

  const pickerTitle = picker
    ? formatSlotTitle(
        startDate,
        picker.day,
        MEALS.find((meal) => meal.id === picker.mealId)?.label ?? ''
      )
    : '';

  const fillMenuOptions = useMemo(
    () => (menu ? [menu, ...menus.filter((item) => item.id !== menu.id)] : menus),
    [menu, menus]
  );

  useEffect(() => {
    if (!fillMenuOpen) return;
    if (fillMenuOptions.length === 0) {
      setFillMenuSourceId(null);
      return;
    }

    const weekIsEmpty = Array.from({ length: CYCLE_DAYS }, (_, index) => index + 1).every(
      (day) => MEALS.every((meal) => (slotMap.get(slotKey(day, meal.id)) ?? []).length === 0)
    );

    if (weekIsEmpty) {
      setFillMenuSourceId(null);
      return;
    }

    setFillMenuSourceId((current) => current ?? menuId ?? fillMenuOptions[0].id);
  }, [fillMenuOpen, fillMenuOptions, menuId, slotMap]);

  if (isPending && !menu) {
    return (
      <div className="menu-page">
        <LoadingState />
      </div>
    );
  }

  if (isError || !menu) {
    return (
      <div className="menu-page">
        <ErrorState error={error ?? new Error('Меню не найдено')} onRetry={() => void refetch()} />
      </div>
    );
  }

  const days = Array.from({ length: CYCLE_DAYS }, (_, index) => index + 1);
  const baseNorm = normForDiet(menu.dietName);
  const norm: DayNorm = {
    kcal: customNorm?.kcal ?? baseNorm.kcal,
    protein: customNorm?.protein ?? baseNorm.protein,
    fat: customNorm?.fat ?? baseNorm.fat,
    carbs: customNorm?.carbs ?? baseNorm.carbs,
    price: customPriceLimit ?? baseNorm.price,
  };
  const priceLimit = norm.price;
  const isEmptyWeek = days.every((day) =>
    MEALS.every((meal) => (slotMap.get(slotKey(day, meal.id)) ?? []).length === 0)
  );
  const fillFromSourceMenu = async (sourceMenuId: string) => {
    const sourceMenu = fillMenuOptions.find((candidate) => candidate.id === sourceMenuId);
    if (!sourceMenu) return;

    const sourceSlots = new Map(
      sourceMenu.slots.map((slot) => [slotKey(slot.day, slot.mealId), slot.dishes] as const)
    );
    const currentSlots = new Map(
      menu.slots.map((slot) => [slotKey(slot.day, slot.mealId), slot.dishes] as const)
    );
    const today = todayIsoDate();

    setFillMenuSubmitting(true);
    try {
      const payloads = days.flatMap((day) =>
        MEALS.map((meal) => ({
          day,
          mealId: meal.id,
          dishes:
            sourceMenu.id === menuId || toIsoDate(dateForCycleDay(startDate, day)) > today
              ? (sourceSlots.get(slotKey(day, meal.id)) ?? [])
              : (currentSlots.get(slotKey(day, meal.id)) ?? []),
        }))
      );

      await Promise.all(payloads.map((payload) => updateSlot.mutateAsync(payload)));
      setFillMenuOpen(false);
      setFillMenuSourceId(null);
      toaster.add({
        name: 'menu-filled-from-source',
        title: 'Меню заполнено',
        content: `Скопировано из меню «${sourceMenu.name}».`,
        theme: 'success',
      });
    } finally {
      setFillMenuSubmitting(false);
    }
  };

  const createAndFillNewMenu = async () => {
    const name = createMenuName.trim() || `${menu.name} (копия)`;
    setFillMenuSubmitting(true);
    try {
      const created = await create.mutateAsync({
        name,
        dietName: menu.dietName,
        startDate: startOfWeekMonday(startDate),
        cycleDays: CYCLE_DAYS,
      });

      const payloads = days.flatMap((day) =>
        MEALS.map((meal) => ({
          day,
          mealId: meal.id,
          dishes:
            menu.slots.find((slot) => slotKey(slot.day, slot.mealId) === slotKey(day, meal.id))
              ?.dishes ?? [],
        }))
      );

      await Promise.all(
        payloads.map((payload) =>
          api.request<{ menu: { id: string } }>(`/v1/menus/${created.menu.id}/slots`, {
            method: 'PUT',
            body: payload,
          })
        )
      );

      const newMenu = { ...created.menu, slots: payloads };
      onMenuCreated(newMenu);
      setFillMenuOpen(false);
      setCreateMenuOpen(false);
      setCreateMenuName('');

      toaster.add({
        name: 'menu-created-and-filled',
        title: 'Новое меню создано',
        content: `Меню «${name}» создано и выбрано на текущую неделю.`,
        theme: 'success',
      });
    } catch (error) {
      toaster.add({
        name: 'menu-create-error',
        title: 'Не удалось создать меню',
        content: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        theme: 'danger',
      });
    } finally {
      setFillMenuSubmitting(false);
    }
  };

  const patchMenu = (patch: { startDate?: string; dietName?: string }) => {
    updateMenu.mutate(patch, {
      onError: (e) =>
        toaster.add({
          name: 'menu-patch',
          title: 'Ошибка',
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  const goToWeek = (iso: string) => {
    const next = startOfWeekMonday(iso);
    if (next === startDate || weekLoading) return;

    pendingWeekRef.current = next;
    setWeekLoading(true);
    setPicker(null);

    if (weekTimerRef.current !== null) window.clearTimeout(weekTimerRef.current);
    if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);

    weekTimerRef.current = window.setTimeout(() => {
      const pending = pendingWeekRef.current;
      pendingWeekRef.current = null;
      if (!pending) {
        setWeekLoading(false);
        return;
      }

      // Сначала переключаем период на сервере (свои слоты), потом обновляем календарь.
      updateMenu.mutate(
        { startDate: pending },
        {
          onSettled: () => {
            setViewStartDate(pending);
            setWeekLoading(false);
          },
        }
      );
    }, 180);
  };

  const shiftPeriod = (direction: -1 | 1) => {
    goToWeek(shiftIsoDate(startDate, direction * CYCLE_DAYS));
  };

  return (
    <div className="menu-page">
      <Flex className="menu-toolbar" alignItems="center" justifyContent="space-between" gap={3}>
        <Flex alignItems="center" gap={2}>
          <Button
            view="outlined"
            size="l"
            title="Предыдущий период"
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
          />
          <Button
            view="outlined"
            size="l"
            title="Следующий период"
            disabled={weekLoading}
            onClick={() => shiftPeriod(1)}
          >
            <Icon data={ChevronRight} size={16} />
          </Button>
          <Button
            view="outlined"
            size="l"
            disabled={weekLoading}
            onClick={() => goToWeek(startOfWeekMonday())}
          >
            Текущая неделя
          </Button>
        </Flex>

        <Flex alignItems="center" gap={2}>
          <Select
            size="l"
            label="Организация:"
            width={250}
            value={[organizationId]}
            onUpdate={(value) => setOrganizationId(value[0] ?? ORG_OPTIONS[0].value)}
            options={ORG_OPTIONS}
          />
          <Select
            size="l"
            label="Диета:"
            width={200}
            value={[menu.dietName]}
            onUpdate={(value) => patchMenu({ dietName: value[0] ?? 'Основная' })}
            options={DIET_OPTIONS}
          />
          {(isEmptyWeek || !isEmptyWeek) && (
            <Button
              type="button"
              view={isEmptyWeek ? 'action' : 'normal-contrast'}
              size="l"
              onClick={() => setFillMenuOpen(true)}
              disabled={weekLoading}
            >
              Заполнение меню
            </Button>
          )}
          <Button
            view="normal-contrast"
            size="l"
            onClick={() => {
              setParametersDraftLimit(
                customPriceLimit !== null ? String(customPriceLimit) : String(norm.price)
              );
              setParametersDraftKcal(
                customNorm?.kcal !== undefined ? String(customNorm.kcal) : String(norm.kcal)
              );
              setParametersDraftProtein(
                customNorm?.protein !== undefined
                  ? String(customNorm.protein)
                  : String(norm.protein)
              );
              setParametersDraftFat(
                customNorm?.fat !== undefined ? String(customNorm.fat) : String(norm.fat)
              );
              setParametersDraftCarbs(
                customNorm?.carbs !== undefined ? String(customNorm.carbs) : String(norm.carbs)
              );
              setParametersOpen(true);
            }}
          >
            <Icon data={Gear} size={16} />
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
                '--menu-meal-rows': MEALS.length,
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
                        Сегодня
                      </Label>
                    )}
                  </div>
                </div>
              );
            })}

            {MEALS.map((meal, mealIndex) => {
              const beforeTotal =
                mealIndex === MEALS.length - 1 ? ' menu-grid__cell_before-total' : '';

              return (
                <Fragment key={meal.id}>
                  <div className={`menu-grid__cell menu-grid__meal${beforeTotal}`}>
                    {meal.label}
                  </div>
                  {days.map((day, dayIndex) => {
                    const dishes = slotMap.get(slotKey(day, meal.id)) ?? [];
                    const totals = sumDishes(dishes);
                    const end = dayIndex === days.length - 1 ? ' menu-grid__cell_end' : '';

                    return (
                      <div
                        key={`${meal.id}-${day}`}
                        className={`menu-grid__cell menu-grid__slot${end}${beforeTotal}`}
                      >
                        <button
                          type="button"
                          className="menu-grid__cell-btn"
                          disabled={!periodSynced || weekLoading}
                          onClick={() => {
                            if (!periodSynced || weekLoading) return;
                            setPicker({ day, mealId: meal.id });
                          }}
                        >
                          {dishes.length === 0 ? (
                            <span className="menu-grid__empty">+ блюдо</span>
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
                                  {formatMetric(totals.kcal)} ккал | {formatMetric(totals.price)} ₽
                                </span>
                                <span>
                                  Б {formatMetric(totals.protein)} | Ж {formatMetric(totals.fat)} |
                                  У {formatMetric(totals.carbs)}
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

            <div className="menu-grid__cell menu-grid__total-label">Итог на день</div>
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

      <Dialog open={parametersOpen} onClose={() => setParametersOpen(false)} size="s">
        <Dialog.Header caption="Параметры на день" />
        <Dialog.Divider />
        <Dialog.Body>
          <Flex direction="column" gap={3}>
            <TextInput
              className="menu-price-input"
              size="l"
              type="number"
              label="Лимит цены:"
              placeholder={`${norm.price}`}
              value={parametersDraftLimit}
              onUpdate={setParametersDraftLimit}
              endContent={
                <span style={{ paddingInlineEnd: 8 }}>
                  <Text color="secondary">₽</Text>
                </span>
              }
              style={{ width: '100%' }}
            />
            <TextInput
              className="menu-price-input"
              size="l"
              type="number"
              label="Калорийность:"
              placeholder={`${norm.kcal}`}
              value={parametersDraftKcal}
              onUpdate={setParametersDraftKcal}
              endContent={
                <span style={{ paddingInlineEnd: 8 }}>
                  <Text color="secondary">ккал</Text>
                </span>
              }
              style={{ width: '100%' }}
            />
            <Flex gap={2}>
              <TextInput
                className="menu-price-input"
                size="l"
                type="number"
                label="Белки:"
                placeholder={`${norm.protein}`}
                value={parametersDraftProtein}
                onUpdate={setParametersDraftProtein}
                endContent={
                  <span style={{ paddingInlineEnd: 8 }}>
                    <Text color="secondary">г</Text>
                  </span>
                }
                style={{ width: '100%' }}
              />
              <TextInput
                className="menu-price-input"
                size="l"
                type="number"
                label="Жиры:"
                placeholder={`${norm.fat}`}
                value={parametersDraftFat}
                onUpdate={setParametersDraftFat}
                endContent={
                  <span style={{ paddingInlineEnd: 8 }}>
                    <Text color="secondary">г</Text>
                  </span>
                }
                style={{ width: '100%' }}
              />
              <TextInput
                className="menu-price-input"
                size="l"
                type="number"
                label="Углеводы:"
                placeholder={`${norm.carbs}`}
                value={parametersDraftCarbs}
                onUpdate={setParametersDraftCarbs}
                endContent={
                  <span style={{ paddingInlineEnd: 8 }}>
                    <Text color="secondary">г</Text>
                  </span>
                }
                style={{ width: '100%' }}
              />
            </Flex>
          </Flex>
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
            <Button type="button" view="outlined" size="l" onClick={() => setParametersOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              view="action"
              size="l"
              onClick={() => {
                setCustomPriceLimit(
                  parametersDraftLimit.trim() === '' ? null : parseRuNumber(parametersDraftLimit)
                );
                setCustomNorm({
                  kcal:
                    parametersDraftKcal.trim() === ''
                      ? undefined
                      : parseRuNumber(parametersDraftKcal),
                  protein:
                    parametersDraftProtein.trim() === ''
                      ? undefined
                      : parseRuNumber(parametersDraftProtein),
                  fat:
                    parametersDraftFat.trim() === ''
                      ? undefined
                      : parseRuNumber(parametersDraftFat),
                  carbs:
                    parametersDraftCarbs.trim() === ''
                      ? undefined
                      : parseRuNumber(parametersDraftCarbs),
                });
                setParametersOpen(false);
              }}
            >
              <Icon data={FloppyDisk} size={16} />
              Сохранить
            </Button>
          </Flex>
        </Dialog.Footer>
      </Dialog>

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
            <Button view="flat" size="s" title="Назад" onClick={() => setCreateMenuOpen(false)}>
              <Icon data={ArrowLeft} size={16} />
            </Button>
            <Text variant="subheader-2">Создание нового меню</Text>
          </Flex>
        ) : (
          <Dialog.Header caption="Заполнить меню" />
        )}
        <Dialog.Divider />
        <Dialog.Body>
          {createMenuOpen ? (
            <TextInput
              size="l"
              label="Название меню:"
              placeholder={`${menu.name} (копия)`}
              value={createMenuName}
              onUpdate={setCreateMenuName}
              autoFocus
            />
          ) : (
            <Flex direction="column" gap={3}>
              {fillMenuOptions.length > 0 && (
                <Select
                  size="l"
                  label="Выбор меню:"
                  placeholder="Выберите меню"
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
                  Создать новое из текущего
                </Button>
              )}
              {fillMenuSourceId && fillMenuSourceId !== menuId && (
                <Text variant="body-2" color="secondary">
                  При выборе другого меню изменения будут применены только со следующего дня.
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
                  Назад
                </Button>
                <Button
                  type="button"
                  view="action"
                  size="l"
                  loading={fillMenuSubmitting}
                  onClick={() => void createAndFillNewMenu()}
                  disabled={fillMenuSubmitting}
                >
                  Создать новое меню
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
                  Отмена
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
                    Выбрать
                  </Button>
                )}
              </>
            )}
          </Flex>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={violationDay !== null} onClose={() => setViolationDay(null)} size="s">
        <Dialog.Header caption="Нарушения за день" />
        <Dialog.Divider />
        <Dialog.Body>
          {violationDay !== null && (
            <Flex direction="column" gap={3}>
              {(() => {
                const totals = dayTotals.get(violationDay) ?? sumDishes([]);
                const violations = [
                  {
                    label: 'Калорийность',
                    actual: totals.kcal,
                    norm: norm.kcal,
                    unit: 'ккал',
                    status: compareToNorm(totals.kcal, norm.kcal),
                  },
                  {
                    label: 'Белки',
                    actual: totals.protein,
                    norm: norm.protein,
                    unit: 'г',
                    status: compareToNorm(totals.protein, norm.protein),
                  },
                  {
                    label: 'Жиры',
                    actual: totals.fat,
                    norm: norm.fat,
                    unit: 'г',
                    status: compareToNorm(totals.fat, norm.fat),
                  },
                  {
                    label: 'Углеводы',
                    actual: totals.carbs,
                    norm: norm.carbs,
                    unit: 'г',
                    status: compareToNorm(totals.carbs, norm.carbs),
                  },
                  {
                    label: 'Цена',
                    actual: totals.price,
                    norm: norm.price,
                    unit: '₽',
                    status: comparePriceToLimit(totals.price, norm.price),
                  },
                ].filter((item) => item.status !== 'ok');
                return violations.map((item) => (
                  <Text key={item.label} variant="body-2">
                    {item.label}: {formatMetric(item.actual)} / {formatMetric(item.norm)}{' '}
                    {item.unit} - {item.status === 'low' ? 'ниже' : 'выше'} нормы
                  </Text>
                ));
              })()}
              <Text variant="body-2" color="secondary">
                Вы можете разрешить нарушение или изменить состав блюд в приёмах.
              </Text>
            </Flex>
          )}
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
            <Button type="button" view="outlined" size="l" onClick={() => setViolationDay(null)}>
              Отмена
            </Button>
            {violationDay !== null && !allowedViolationDays.has(violationDay) && (
              <Button
                type="button"
                view="outlined"
                size="l"
                onClick={() => {
                  setAllowedViolationDays((prev) => new Set(prev).add(violationDay));
                  toaster.add({
                    name: 'menu-violation-allowed',
                    title: 'Нарушение разрешено',
                    content: `День ${violationDay} сохранён с нарушением нормы.`,
                    theme: 'warning',
                  });
                  setViolationDay(null);
                }}
              >
                Разрешить нарушение
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
        onSave={(dishes, force) => {
          if (!picker) return;
          const dayPrice =
            (dayTotals.get(picker.day)?.price ?? 0) -
            sumDishes(pickerDishes).price +
            sumDishes(dishes).price;
          updateSlot.mutate(
            { day: picker.day, mealId: picker.mealId, dishes },
            {
              onSuccess: () => {
                if (dayPrice > priceLimit) {
                  toaster.add({
                    name: force ? 'menu-price-allowed' : 'menu-price-warning',
                    title: force
                      ? 'Превышение разрешено и ячейка сохранена'
                      : 'Ячейка сохранена с превышением цены',
                    content: `Цена дня ${Math.round(dayPrice)} ₽ выше лимита ${priceLimit} ₽.`,
                    theme: 'warning',
                  });
                } else {
                  toaster.add({
                    name: 'menu-slot-saved',
                    title: 'Ячейка сохранена',
                    theme: 'success',
                  });
                }
                setPicker(null);
              },
              onError: (e) =>
                toaster.add({
                  name: 'menu-slot-error',
                  title: 'Ошибка',
                  content: e.message,
                  theme: 'danger',
                }),
            }
          );
        }}
      />
    </div>
  );
}

function DayTotalCell({
  day,
  totals,
  norm,
  onInspect,
  allowed,
}: {
  day: number;
  totals: DayTotals;
  norm: DayNorm;
  onInspect: (day: number) => void;
  /** Нарушение дня было разрешено — кнопка-глаз в обычном стиле. */
  allowed?: boolean;
}) {
  const kcalStatus = compareToNorm(totals.kcal, norm.kcal);
  const anyViolation =
    kcalStatus !== 'ok' ||
    compareToNorm(totals.protein, norm.protein) !== 'ok' ||
    compareToNorm(totals.fat, norm.fat) !== 'ok' ||
    compareToNorm(totals.carbs, norm.carbs) !== 'ok' ||
    comparePriceToLimit(totals.price, norm.price) !== 'ok';

  return (
    <div className="menu-grid__total-stack">
      <div className="menu-grid__metric">
        <MetricLine
          actual={totals.kcal}
          norm={norm.kcal}
          digits={0}
          unit=" ккал"
          compare={compareToNorm}
        />
      </div>
      <div className="menu-grid__metric">
        <NormValue actual={totals.protein} norm={norm.protein} digits={0} prefix="Б " />
        <NormValue actual={totals.fat} norm={norm.fat} digits={0} prefix="Ж " />
        <NormValue actual={totals.carbs} norm={norm.carbs} digits={0} prefix="У " />
      </div>
      <div className="menu-grid__metric">
        <MetricLine
          actual={totals.price}
          norm={norm.price}
          digits={0}
          unit=""
          normUnit=" ₽"
          compare={comparePriceToLimit}
        />
      </div>
      {anyViolation && (
        <Button
          view={allowed ? 'flat' : 'action'}
          size="s"
          className="menu-grid__violation-btn"
          title="Посмотреть нарушения"
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
  compare = compareToNorm,
}: {
  label?: string;
  actual: number;
  norm: number;
  digits: number;
  unit: string;
  normUnit?: string;
  compare?: (actual: number, norm: number) => NormStatus;
}) {
  const status = compare(actual, norm);
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
}: {
  actual: number;
  norm: number;
  digits: number;
  prefix: string;
}) {
  const status = compareToNorm(actual, norm);
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
