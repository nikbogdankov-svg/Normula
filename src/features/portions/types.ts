/**
 * Контракт раздела «Порционник» (ПОРЦ-01…03).
 * Численность на дату по ЛПУ → отделениям → столам.
 */

export interface PortionEntry {
  facilityId: string;
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
  facilityId: string;
  departmentId: string;
  tableId: string;
  headcount: number;
}

/** Верхний переключатель экрана. */
export type PortionsView = 'organizations' | 'dishes';

/** Строка раздачи по блюдам. */
export interface DishDistributionRow {
  dishName: string;
  facilityName: string;
  departmentName: string;
  tableName: string;
  kettleLabel: string;
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
