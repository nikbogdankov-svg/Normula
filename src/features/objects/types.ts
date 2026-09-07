/**
 * Контракт раздела «Объекты» (ОБЪЕКТ-01…04).
 * Один объект (CateringObject) → несколько подобъектов → группы/классы → рационы/численность.
 *
 * Объект имеет своё меню. Подобъект может либо использовать меню объекта
 * (menuSource = 'object'), либо иметь собственное меню (menuSource = 'own').
 * Количество приёмов пищи у объекта/подобъекта может отличаться
 * (например, у школ приёмов меньше, чем в больницах).
 */
import type { MealId } from '@/features/menu/types';

/** Тип подобъекта, например школа / детский сад / больница. */
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

/** Источник меню подобъекта: меню объекта или собственное. */
export type MenuSource = 'object' | 'own';

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
  /** Приёмы пищи, на которые приходится группа (пусто/undefined — все). */
  mealIds?: MealId[];
}

/** Подобъект (школа / детский сад / больница) внутри объекта. */
export interface SubObject {
  id: string;
  name: string;
  /** Короткий адрес или корпус — для списка. */
  address: string;
  type: FacilityType;
  departments: Department[];
  /**
   * Номер котла (ОБЪЕКТ-03). Одинаковый номер у разных подобъектов —
   * готовят в общем котле (Котел 1, Котел 2, …).
   */
  kettleNumber: number;
  /** Какой меню пользуется подобъект: меню объекта или своё. */
  menuSource: MenuSource;
  /** Своё меню подобъекта (id из справочника меню), если menuSource = 'own'. */
  menuId?: string;
  /** Приёмы пищи подобъекта; пусто — как у объекта. */
  mealIds?: MealId[];
}

/** Объект организации: имеет своё меню, свои группы/классы и подобъекты. */
export interface CateringObject {
  id: string;
  name: string;
  /** Приёмы пищи объекта (например, у школ меньше). */
  mealIds: MealId[];
  /** Своё меню объекта (id из справочника меню). */
  menuId?: string;
  /** Группы/классы самого объекта. */
  departments: Department[];
  subObjects: SubObject[];
}

export interface CateringObjectsResponse {
  objects: CateringObject[];
}

export interface UpdateTableHeadcountRequest {
  objectId: string;
  subObjectId: string;
  departmentId: string;
  tableId: string;
  headcount: number;
}

/** Тело PATCH /v1/objects/sub-objects/:id — структура подобъекта без численности. */
export interface UpdateSubObjectRequest {
  name: string;
  address: string;
  type: FacilityType;
  kettleNumber: number;
  menuSource: MenuSource;
  menuId?: string;
  mealIds?: MealId[];
  departments: Array<{
    id: string;
    name: string;
    mealIds: MealId[];
    tables: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

/** Обновление меню/приёмов объекта или подобъекта. */
export interface UpdateObjectMenuRequest {
  objectId?: string;
  subObjectId?: string;
  menuId?: string;
  mealIds: MealId[];
}

/** Группа/класс с рационами при создании/обновлении объекта. */
export interface ObjectDepartmentRequest {
  id: string;
  name: string;
  mealIds: MealId[];
  tables: Array<{
    id: string;
    name: string;
  }>;
}

/** Создание объекта: название + своё меню + приёмы пищи + группы/рационы. */
export interface CreateObjectRequest {
  name: string;
  menuId?: string;
  mealIds: MealId[];
  departments: ObjectDepartmentRequest[];
}

/** Обновление объекта. */
export type UpdateObjectRequest = CreateObjectRequest;

/** Строка выхода на раздачу (ОБЪЕКТ-04). */
export interface DistributionRow {
  dishName: string;
  objectName: string;
  subObjectName: string;
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
