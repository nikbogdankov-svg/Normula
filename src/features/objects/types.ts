/**
 * Контракт раздела «Объекты» (ОБЪЕКТ-01…04).
 * Один пищеблок → несколько ЛПУ → отделения → столы/численность.
 */

/** Стол питания внутри отделения (диетический стол). */
export interface DietTable {
  id: string;
  /** Например «Основная», «Щадящая». */
  name: string;
  headcount: number;
}

export interface Department {
  id: string;
  name: string;
  tables: DietTable[];
}

/** ЛПУ — больница / учреждение, на которое готовит пищеблок. */
export interface Facility {
  id: string;
  name: string;
  /** Короткий адрес или корпус — для списка. */
  address: string;
  departments: Department[];
  /**
   * Номер котла (ОБЪЕКТ-03). Одинаковый номер у разных ЛПУ —
   * готовят в общем котле (Котел 1, Котел 2, …).
   */
  kettleNumber: number;
}

/** Пищеблок текущей организации. */
export interface KitchenUnit {
  id: string;
  name: string;
  facilities: Facility[];
}

export interface KitchenResponse {
  kitchen: KitchenUnit;
}

export interface UpdateTableHeadcountRequest {
  facilityId: string;
  departmentId: string;
  tableId: string;
  headcount: number;
}

/** Тело PATCH /v1/objects/facilities/:id — структура ЛПУ без численности. */
export interface UpdateFacilityRequest {
  name: string;
  address: string;
  kettleNumber: number;
  departments: Array<{
    id: string;
    name: string;
    tables: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

/** Строка выхода на раздачу (ОБЪЕКТ-04). */
export interface DistributionRow {
  dishName: string;
  facilityName: string;
  departmentName: string;
  tableName: string;
  kettleLabel: string;
  portions: number;
}

export interface DistributionPreviewResponse {
  rows: DistributionRow[];
  totalPortions: number;
}

export function formatKettle(kettleNumber: number): string {
  return `Котел ${kettleNumber}`;
}
