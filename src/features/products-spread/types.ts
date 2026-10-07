/**
 * Контракт раздела «Раскладка продуктов» — GetProductSpread в
 * portions.v1.PortionsService (api/portions/v1/portions.proto).
 *
 * Бэкенд считает из порционника (численность на дату), меню (расписание
 * объекта и диеты) и ТТК (брутто ингредиентов на порцию): сколько какого
 * продукта идёт на каждое блюдо и сколько всего надо выдать на кухню в этот
 * день. Поиск по продуктам — на клиенте.
 */

import type { MealId } from '@/features/menu/types';

/** Приёмы пищи берутся из меню, чтобы раскладка считалась по фактическим блюдам дня. */
export type ProductSpreadMealId = MealId;

export { MEALS } from '@/features/menu/types';

/** Строка авторазбивки продукта: конкретное блюдо приёма пищи. */
export interface ProductSpreadDishRow {
  mealId: ProductSpreadMealId;
  dishName: string;
  /** Порций блюда в этот день (численность). */
  portions: number;
  /** Сколько этого продукта уходит на блюдо (в единицах item.unit). */
  quantity: number;
}

/** Один продукт: сумма по всем блюдам дня и разбивка по приёмам пищи. */
export interface ProductSpreadItem {
  productId: string;
  productName: string;
  /** Килограммы / литры / штуки. */
  unit: string;
  /** Всего на день. */
  total: number;
  /** Сколько на каждый приём пищи; приёмов без расхода в ответе нет. */
  byMeal: Partial<Record<ProductSpreadMealId, number>>;
  /** Авторазбивка между блюдами: 10 л молока → 3 л на кашу, 5 л на перловую… */
  dishes: ProductSpreadDishRow[];
}

export interface ProductSpreadResponse {
  date: string;
  /** Объект из запроса; пусто — раскладка по всей организации. */
  objectId?: string;
  items: ProductSpreadItem[];
}
