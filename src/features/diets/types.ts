import type { MealId } from '@/features/menu/types';
import type { FacilityType } from '@/features/objects/types';

/**
 * Контракт раздела «Диеты» — справочник рационов питания организации.
 *
 * Диеты создаются здесь и используются в других местах (объекты и меню):
 * там ссылаются на диету по id, а название берут из этого справочника.
 * Бэкенда под него пока нет — эндпоинты описаны здесь и реализованы
 * в mock-handlers, как и у других справочников.
 */

/** Диета (рацион питания) организации. */
export interface Diet {
  id: string;
  /** Название рациона, например «Основной», «Безглютеновый». */
  name: string;
  /** Типы учреждений, для которых доступна диета. */
  appliesTo: FacilityType[];
  /** Приёмы пищи, для которых доступна диета (пусто — все). */
  mealIds: MealId[];
  /** Норма цены на день на человека, ₽. */
  pricePerDay: number;
  /** Норма калорийности на день, ккал. */
  kcal: number;
  /** Норма белков на день, г. */
  protein: number;
  /** Норма жиров на день, г. */
  fat: number;
  /** Норма углеводов на день, г. */
  carbs: number;
}

export interface ListDietsResponse {
  diets: Diet[];
  /** Используется ли диета в объектах/меню (для подсказки при удалении). */
  usedIn: Record<string, boolean>;
}

export interface CreateDietRequest {
  name: string;
  appliesTo: FacilityType[];
  mealIds: MealId[];
  pricePerDay: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Тело обновления диеты — те же поля, что и при создании. */
export type UpdateDietRequest = CreateDietRequest;
