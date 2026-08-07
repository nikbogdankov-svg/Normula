import type { MenuDishRef } from './types';

/** Суточная норма на 1 человека (мок, пока нет справочника «Нормы»). */
export interface DayNorm {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  price: number;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  price: number;
}

export type NormStatus = 'ok' | 'low' | 'high';

/** Допуск относительно нормы, в долях (10%). */
const TOLERANCE = 0.1;

export const DAILY_NORMS: Record<string, DayNorm> = {
  Основная: { kcal: 1800, protein: 90, fat: 60, carbs: 250, price: 450 },
  Щадящая: { kcal: 1600, protein: 80, fat: 50, carbs: 220, price: 480 },
  Диабетическая: { kcal: 1500, protein: 85, fat: 45, carbs: 180, price: 500 },
};

export function normForDiet(dietName: string): DayNorm {
  return DAILY_NORMS[dietName] ?? DAILY_NORMS['Основная'];
}

export function parseRuNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(
    String(value)
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sumDishes(dishes: MenuDishRef[]): DayTotals {
  return dishes.reduce(
    (sum, dish) => ({
      kcal: sum.kcal + (dish.kcal || 0),
      protein: sum.protein + (dish.protein || 0),
      fat: sum.fat + (dish.fat || 0),
      carbs: sum.carbs + (dish.carbs || 0),
      price: sum.price + (dish.price || 0),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, price: 0 }
  );
}

export function compareToNorm(actual: number, norm: number): NormStatus {
  if (norm <= 0) return 'ok';
  if (actual < norm * (1 - TOLERANCE)) return 'low';
  if (actual > norm * (1 + TOLERANCE)) return 'high';
  return 'ok';
}

/**
 * Цена — жёсткий потолок: превышение лимита недопустимо (без +10%).
 * Ниже лимита более чем на допуск — «мало», иначе ок.
 */
export function comparePriceToLimit(actual: number, limit: number): NormStatus {
  if (limit <= 0) return 'ok';
  if (actual > limit) return 'high';
  if (actual < limit * (1 - TOLERANCE)) return 'low';
  return 'ok';
}

/** Можно ли добавить блюдо, не превысив суточный лимит цены. */
export function canAddWithinPriceLimit(
  dayPriceWithoutSlot: number,
  slotDraftPrice: number,
  dishPrice: number,
  limit: number
): boolean {
  return dayPriceWithoutSlot + slotDraftPrice + dishPrice <= limit;
}

export function formatMetric(value: number, digits = 0): string {
  if (digits === 0) return String(Math.round(value));
  return value.toFixed(digits).replace('.', ',');
}
