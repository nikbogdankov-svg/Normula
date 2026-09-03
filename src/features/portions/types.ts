/**
 * Контракт раздела «Порционник» (ПОРЦ-01…03).
 * Численность на дату по ЛПУ → отделениям → столам.
 */

export interface PortionEntry {
  subObjectId: string;
  departmentId: string;
  tableId: string;
  headcount: number;
}

export interface PortionsDayResponse {
  date: string;
  entries: PortionEntry[];
}

export interface UpdatePortionHeadcountRequest {
  date: string;
  subObjectId: string;
  departmentId: string;
  tableId: string;
  headcount: number;
}

/** Верхний переключатель экрана. */
export type PortionsView = 'organizations' | 'dishes';

/** Строка раздачи по блюдам. */
export interface DishDistributionRow {
  dishName: string;
  mealType: string;
  subObjectName: string;
  departmentName: string;
  tableName: string;
  portions: number;
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
