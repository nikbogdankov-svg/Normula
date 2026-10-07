/**
 * Контракт раздела «Порционник» — portions.v1.PortionsService в
 * onemore-admin (api/portions/v1/portions.proto).
 *
 * Численность задаётся на дату по объекту (или подобъекту) → его группе →
 * диете группы. Ноль хранится: «заполнили нулём» отличается от «не
 * заполняли». Раздача по блюдам считается бэкендом из численности,
 * расписания меню того же объекта и диеты и карт ТТК.
 */
import type { MealId } from '@/features/menu/types';

export interface PortionEntry {
  /** Объект или подобъект, которому принадлежит группа. */
  objectId: string;
  groupId: string;
  dietId: string;
  headcount: number;
}

export interface PortionsDayResponse {
  date: string;
  entries: PortionEntry[];
}

/** Тело PATCH /v1/portions/headcount. */
export interface UpdatePortionHeadcountRequest {
  date: string;
  objectId: string;
  groupId: string;
  dietId: string;
  headcount: number;
}

/** Тело POST /v1/portions/copy: уже заполненные строки дня `to` не трогаются. */
export interface CopyPortionsDayRequest {
  from: string;
  to: string;
}

/** Верхний переключатель экрана. */
export type PortionsView = 'organizations' | 'dishes';

/** Строка раздачи по блюдам. */
export interface DishDistributionRow {
  dishName: string;
  mealId: MealId;
  /** Объект верхнего уровня. */
  objectName: string;
  /** Объект или подобъект, которому принадлежит группа. */
  subObjectName: string;
  /** Группа. */
  departmentName: string;
  /** Диета группы. */
  tableName: string;
  portions: number;
  /** Чистый выход порции из карты ТТК, граммы; 0 — не задан. */
  yieldNet: number;
}

export interface DishDistributionResponse {
  date: string;
  rows: DishDistributionRow[];
  totalPortions: number;
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Дата, смещённая на days дней (может быть отрицательным). */
export function shiftIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
