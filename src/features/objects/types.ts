/**
 * Контракт раздела «Объекты» (ОБЪЕКТ-01…04).
 * Один пищеблок → несколько учреждений → группы/классы → рационы/численность.
 */

/** Тип учреждения, на которое готовит пищеблок. */
export const FACILITY_TYPES = ['school', 'kindergarten', 'hospital'] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export function isFacilityType(value: string): value is FacilityType {
  return (FACILITY_TYPES as readonly string[]).includes(value);
}

/** Каталог рационов (диет) питания. */
export const DIET_CATALOG = [
  {
    id: 'main',
    label: 'Основной',
    storageName: 'Основная',
    appliesTo: ['school', 'kindergarten', 'hospital'],
  },
  {
    id: 'gentle',
    label: 'Щадящий',
    storageName: 'Щадящая',
    appliesTo: ['school', 'kindergarten', 'hospital'],
  },
  {
    id: 'glutenFree',
    label: 'Безглютеновый',
    storageName: 'Безглютеновая',
    appliesTo: ['school', 'kindergarten', 'hospital'],
  },
  {
    id: 'lactoseFree',
    label: 'Безлактозный',
    storageName: 'Безлактозная',
    appliesTo: ['school', 'kindergarten', 'hospital'],
  },
  {
    id: 'diabetic',
    label: 'Диабетический',
    storageName: 'Диабетическая',
    appliesTo: ['school', 'kindergarten', 'hospital'],
  },
  {
    id: 'vegetarian',
    label: 'Вегетарианский',
    storageName: 'Вегетарианская',
    appliesTo: ['school', 'kindergarten'],
  },
] as const;

export type DietTypeId = (typeof DIET_CATALOG)[number]['id'];

/** Рацион питания внутри группы/класса с численностью. */
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

/** Учреждение (школа / детский сад / больница), на которое готовит пищеблок. */
export interface Facility {
  id: string;
  name: string;
  /** Короткий адрес или корпус — для списка. */
  address: string;
  type: FacilityType;
  departments: Department[];
  /**
   * Номер котла (ОБЪЕКТ-03). Одинаковый номер у разных учреждений —
   * готовят в общем котле (Котел 1, Котел 2, …).
   */
  kettleNumber: number;
}

/** Пищеблок организации: один готовит на несколько учреждений. */
export interface KitchenUnit {
  id: string;
  name: string;
  facilities: Facility[];
}

export interface KitchenResponse {
  kitchens: KitchenUnit[];
}

export interface UpdateTableHeadcountRequest {
  facilityId: string;
  departmentId: string;
  tableId: string;
  headcount: number;
}

/** Тело PATCH /v1/objects/facilities/:id — структура учреждения без численности. */
export interface UpdateFacilityRequest {
  name: string;
  address: string;
  type: FacilityType;
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
