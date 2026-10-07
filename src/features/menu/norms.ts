import type { Diet } from '@/features/diets/types';
import type { Violation, ViolationMetric } from './types';

/** Суточная норма на 1 человека — из выбранной диеты: показывается рядом с итогом. */
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

/** Статус метрики дня по нарушениям с бэкенда; нет в списке — «ок». */
export function statusOf(violations: Violation[], metric: ViolationMetric): NormStatus {
  return violations.find((item) => item.metric === metric)?.status ?? 'ok';
}

/**
 * Норма дня из диеты — для показа «итог / норма» и лимита цены в диалоге
 * блюд. Без диеты (ещё не выбрана или удалена из справочника) — нули.
 */
export function dietNorm(diet: Diet | undefined): DayNorm {
  if (!diet) return { kcal: 0, protein: 0, fat: 0, carbs: 0, price: 0 };
  return {
    kcal: diet.kcal,
    protein: diet.protein,
    fat: diet.fat,
    carbs: diet.carbs,
    price: diet.pricePerDay,
  };
}

export function sumDishes(dishes: DayTotals[]): DayTotals {
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

/** Сумма цен — для диалога выбора блюд, где у карт из списка ТТК нет БЖУ. */
export function sumPrice(items: { price: number }[]): number {
  return items.reduce((sum, item) => sum + (item.price || 0), 0);
}

export function formatMetric(value: number, digits = 0): string {
  if (digits === 0) return String(Math.round(value));
  return value.toFixed(digits).replace('.', ',');
}
