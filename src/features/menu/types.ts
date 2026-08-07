/**
 * Контракт раздела «Меню» (цикловое меню).
 * Бэкенда ещё нет — эндпоинты живут в mock-handlers.
 */

export type MealId = 'breakfast' | 'second_breakfast' | 'lunch' | 'snack' | 'dinner';

export type MenuStatus = 'draft' | 'active';

/** Приёмы пищи в сетке цикла. */
export const MEALS: { id: MealId; label: string }[] = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'second_breakfast', label: '2-й завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'snack', label: 'Полдник' },
  { id: 'dinner', label: 'Ужин' },
];

/** Блюдо в ячейке меню — снимок из ТТК. */
export interface MenuDishRef {
  recipeId: string;
  name: string;
  kcal: number;
  /** Себестоимость порции, ₽. */
  price: number;
  /** Белки / жиры / углеводы, г на порцию. */
  protein: number;
  fat: number;
  carbs: number;
  portionYield: string;
}

export interface MenuSlot {
  day: number;
  mealId: MealId;
  dishes: MenuDishRef[];
}

export interface CycleMenu {
  id: string;
  name: string;
  /** Пока справочника диет нет — строка. */
  dietName: string;
  /** Первый день цикла, YYYY-MM-DD. */
  startDate: string;
  cycleDays: number;
  status: MenuStatus;
  createdAt: string;
  slots: MenuSlot[];
}

export interface ListMenusResponse {
  menus: CycleMenu[];
  total: number;
}

export interface CreateMenuRequest {
  name: string;
  dietName: string;
  startDate: string;
  cycleDays: number;
}

export interface UpdateMenuRequest {
  name?: string;
  dietName?: string;
  startDate?: string;
  cycleDays?: number;
}

export interface UpdateMenuSlotRequest {
  day: number;
  mealId: MealId;
  dishes: MenuDishRef[];
}
