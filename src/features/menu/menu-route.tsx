import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Button,
  Dialog,
  Flex,
  Icon,
  Loader,
  Select,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { ChevronLeft, ChevronRight, Gear } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import { useCreateMenu, useMenu, useMenus, useUpdateMenu, useUpdateMenuSlot } from './api';
import {
  formatDateRange,
  formatDayHeader,
  formatSlotTitle,
  isCycleDayToday,
  shiftIsoDate,
  startOfWeekMonday,
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
import { MEALS, type MealId, type MenuDishRef } from './types';
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

  return <MenuByDates menuId={menuId} />;
}

function MenuByDates({ menuId }: { menuId: string }) {
  const { data, isPending, isError, error, refetch } = useMenu(menuId);
  const updateMenu = useUpdateMenu(menuId);
  const updateSlot = useUpdateMenuSlot(menuId);
  const toaster = useToaster();
  const [picker, setPicker] = useState<{ day: number; mealId: MealId } | null>(null);
  const [organizationId, setOrganizationId] = useState(ORG_OPTIONS[0].value);
  const [parametersOpen, setParametersOpen] = useState(false);
  const [customPriceLimit, setCustomPriceLimit] = useState<number | null>(null);
  const [parametersDraftLimit, setParametersDraftLimit] = useState<string>('');
  /** Локальная неделя просмотра — стрелки обновляют только календарь. */
  const [viewStartDate, setViewStartDate] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const pendingWeekRef = useRef<string | null>(null);
  const weekTimerRef = useRef<number | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setViewStartDate(null);
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
  const norm = normForDiet(menu.dietName);
  const priceLimit = customPriceLimit ?? norm.price;

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
            width={300}
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
          <Button
            view="outlined"
            size="l"
            onClick={() => {
              setParametersDraftLimit(
                customPriceLimit !== null ? String(customPriceLimit) : String(norm.price)
              );
              setParametersOpen(true);
            }}
          >
            <Icon data={Gear} size={16} />
            Параметры
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
            <div className="menu-grid__cell menu-grid__meal menu-grid__day menu-grid__corner">
              Приём
            </div>
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
                    {isToday && <span className="menu-grid__today-dot" aria-label="Сегодня" />}
                  </div>
                </div>
              );
            })}

            {MEALS.map((meal) => (
              <Fragment key={meal.id}>
                <div className="menu-grid__cell menu-grid__meal">{meal.label}</div>
                {days.map((day, dayIndex) => {
                  const dishes = slotMap.get(slotKey(day, meal.id)) ?? [];
                  const totals = sumDishes(dishes);
                  const end = dayIndex === days.length - 1 ? ' menu-grid__cell_end' : '';

                  return (
                    <div
                      key={`${meal.id}-${day}`}
                      className={`menu-grid__cell menu-grid__slot${end}`}
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
                            {dishes.map((dish) => (
                              <Text
                                key={dish.recipeId}
                                variant="body-1"
                                className="menu-grid__dish"
                                title={dish.name}
                              >
                                {dish.name}
                              </Text>
                            ))}
                            <div className="menu-grid__slot-meta">
                              <span>
                                {formatMetric(totals.kcal)} ккал · {formatMetric(totals.price)} ₽
                              </span>
                              <span>
                                Б {formatMetric(totals.protein)} · Ж {formatMetric(totals.fat)} · У{' '}
                                {formatMetric(totals.carbs)}
                              </span>
                            </div>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </Fragment>
            ))}

            <div className="menu-grid__cell menu-grid__total-label">Итог на день</div>
            {days.map((day, dayIndex) => {
              const totals = dayTotals.get(day) ?? sumDishes([]);
              const end = dayIndex === days.length - 1 ? ' menu-grid__cell_end' : '';
              return (
                <div key={`total-${day}`} className={`menu-grid__cell menu-grid__total-cell${end}`}>
                  <DayTotalCell totals={totals} norm={norm} />
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
        <Dialog.Header caption="Параметры" />
        <Dialog.Divider />
        <Dialog.Body>
          <Flex direction="column" gap={3}>
            <Text variant="body-1" color="secondary">
              Укажите лимит цены на день. Если оставить пустым, будет использован лимит диеты.
            </Text>
            <TextInput
              className="menu-price-input"
              size="l"
              type="number"
              label="Лимит цены"
              placeholder={`${norm.price}`}
              value={parametersDraftLimit}
              onUpdate={setParametersDraftLimit}
              endContent={<Text color="secondary">₽</Text>}
              style={{ width: '100%' }}
            />
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
                setParametersOpen(false);
              }}
            >
              Сохранить
            </Button>
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

function DayTotalCell({ totals, norm }: { totals: DayTotals; norm: DayNorm }) {
  return (
    <div className="menu-grid__total-stack">
      <MetricLine label="ккал" actual={totals.kcal} norm={norm.kcal} digits={0} unit="" />
      <div className="menu-grid__metric">
        <span className="menu-grid__metric-label">КБЖУ</span>
        <NormValue actual={totals.protein} norm={norm.protein} digits={0} prefix="Б " />
        <NormValue actual={totals.fat} norm={norm.fat} digits={0} prefix="Ж " />
        <NormValue actual={totals.carbs} norm={norm.carbs} digits={0} prefix="У " />
      </div>
      <MetricLine
        label="цена"
        actual={totals.price}
        norm={norm.price}
        digits={0}
        unit=" ₽"
        compare={comparePriceToLimit}
      />
    </div>
  );
}

function MetricLine({
  label,
  actual,
  norm,
  digits,
  unit,
  compare = compareToNorm,
}: {
  label: string;
  actual: number;
  norm: number;
  digits: number;
  unit: string;
  compare?: (actual: number, norm: number) => NormStatus;
}) {
  const status = compare(actual, norm);
  return (
    <div className="menu-grid__metric">
      <span className="menu-grid__metric-label">{label}</span>
      <span className={metricClass(status)}>
        {formatMetric(actual, digits)}
        {unit} / {formatMetric(norm, digits)}
        {unit}
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
