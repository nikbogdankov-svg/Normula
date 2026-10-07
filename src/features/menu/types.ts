/**
 * Контракт раздела «Меню» — menu.v1.MenuService в onemore-admin
 * (api/menu/v1/menu.proto).
 *
 * Расписание — список по календарным датам для объекта (или подобъекта) и
 * диеты: на каждый приём пищи — набор карт ТТК. У него нет ни названия, ни
 * периода: фронтенд сам решает, каким окном дат его смотреть, и запрашивает
 * отрезок from..to. Сохранённое меню — копия отрезка расписания без дат
 * (день 1..N и имя), им заполняется любой другой отрезок.
 *
 * Блюдо — ссылка на карту ТТК: название, выход, КБЖУ и цена приходят из
 * карты при каждом запросе. Нарушения норм диеты за день бэкенд считает
 * при чтении и отдаёт готовым списком; суммы по ячейке для показа клиент
 * складывает сам.
 */

export type MealId = 'breakfast' | 'second_breakfast' | 'lunch' | 'snack' | 'dinner';

/** Приёмы пищи в порядке дня. */
export const MEALS: { id: MealId; label: string }[] = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'second_breakfast', label: '2-й завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'snack', label: 'Полдник' },
  { id: 'dinner', label: 'Ужин' },
];

/** Блюдо в приёме пищи — карта ТТК с полями на чтение. */
export interface Dish {
  recipeId: string;
  name: string;
  /** Выход порции: чистый выход и потери, целые. */
  yieldNet: number;
  yieldLoss: number;
  kcal: number;
  /** Белки / жиры / углеводы, г на порцию. */
  protein: number;
  fat: number;
  carbs: number;
  /** Цена порции, ₽, по средним ценам склада. */
  price: number;
}

/** Приём пищи одного дня; приёмы без блюд в ответ не попадают. */
export interface ScheduleSlot {
  mealId: MealId;
  dishes: Dish[];
}

export type ViolationMetric = 'kcal' | 'protein' | 'fat' | 'carbs' | 'price';

/** low — итог дня не больше половины нормы, high — больше нормы. */
export type ViolationStatus = 'low' | 'high';

/** Нарушение нормы диеты по одной метрике дня. */
export interface Violation {
  metric: ViolationMetric;
  /** Итог дня по метрике. */
  actual: number;
  /** Норма диеты на день. */
  norm: number;
  status: ViolationStatus;
}

/** День расписания. */
export interface ScheduleDay {
  /** Дата, YYYY-MM-DD. */
  date: string;
  /** Нарушение нормы на этот день разрешено. */
  violationAllowed: boolean;
  slots: ScheduleSlot[];
  /** Нарушения норм в порядке метрик; пусто — день в норме. */
  violations: Violation[];
}

/** Параметры GET /v1/menu-schedule: отрезок дат включительно. */
export interface ScheduleParams {
  objectId: string;
  dietId: string;
  from: string;
  to: string;
}

export interface GetScheduleResponse {
  /** Все даты отрезка подряд, пустые тоже. */
  days: ScheduleDay[];
}

/** Тело PUT /v1/menu-schedule/slot: ячейка заменяется целиком. */
export interface UpdateSlotRequest {
  objectId: string;
  dietId: string;
  date: string;
  mealId: MealId;
  /** Карты ТТК в порядке строк, без повторов; пусто — убрать все блюда. */
  recipeIds: string[];
}

export interface UpdateSlotResponse {
  /** День целиком после замены. */
  day: ScheduleDay;
}

/** Тело POST /v1/menu-schedule/allow. */
export interface AllowViolationRequest {
  objectId: string;
  dietId: string;
  date: string;
}

/**
 * Тело POST /v1/menu-schedule/fill: день i отрезка получает день i меню,
 * хвост за пределами меню становится пустым. Даты не позже keepThrough не
 * трогаются.
 */
export interface FillScheduleRequest {
  objectId: string;
  dietId: string;
  menuId: string;
  from: string;
  to: string;
  keepThrough?: string;
}

/** Сохранённое меню в списке. */
export interface Menu {
  id: string;
  name: string;
  /** Длина меню в днях. */
  days: number;
}

export interface ListMenusResponse {
  menus: Menu[];
}

/** Тело POST /v1/menus: отрезок расписания сохраняется как меню, from — день 1. */
export interface CreateMenuRequest {
  name: string;
  objectId: string;
  dietId: string;
  from: string;
  to: string;
}

export interface CreateMenuResponse {
  id: string;
}
