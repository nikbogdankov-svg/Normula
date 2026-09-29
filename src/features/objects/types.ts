/**
 * Контракт раздела «Объекты» — objects.v1.ObjectsService в onemore-admin.
 *
 * Объект и подобъект — одна структура (ObjectItem): у подобъекта заполнен
 * parentObjectId. У каждого есть группы, у группы — рационы (диеты из
 * справочника «Диеты»).
 */
import type { MealId } from '@/features/menu/types';

/** Тип подобъекта, например школа / детский сад / больница. */
export const FACILITY_TYPES = ['school', 'kindergarten', 'hospital'] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

/** Диета, выбранная рационом группы. */
export interface GroupDiet {
  id: string;
  name: string;
}

/** Группа/класс объекта. */
export interface ObjectGroup {
  id: string;
  name: string;
  diets: GroupDiet[];
}

/** Объект или подобъект: у подобъекта заполнен parentObjectId, у объекта — пусто. */
export interface ObjectItem {
  id: string;
  parentObjectId: string;
  name: string;
  type: FacilityType;
  groups: ObjectGroup[];
}

export interface ListObjectsResponse {
  objects: ObjectItem[];
}

/** Группа в запросе сохранения: группы заменяются целиком. */
export interface ObjectGroupInput {
  name: string;
  dietIds: string[];
}

/** Тело PATCH /v1/objects/:id. */
export interface UpdateObjectRequest {
  name: string;
  type: FacilityType;
  groups: ObjectGroupInput[];
}

/** Тело POST /v1/objects; с parentObjectId создаётся подобъект. */
export interface CreateObjectRequest extends UpdateObjectRequest {
  parentObjectId?: string;
}

/*
 * Ниже — форма мок-объектов для разделов, которые ещё на моках (меню,
 * порционник, склад, раскладка продуктов): см. useMockCateringObjects.
 * Удаляется вместе с их моками.
 */

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
  /** Тип объекта: школа / детский сад / больница. */
  type: FacilityType;
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
