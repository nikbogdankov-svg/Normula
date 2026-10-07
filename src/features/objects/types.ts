/**
 * Контракт раздела «Объекты» — objects.v1.ObjectsService в onemore-admin.
 *
 * Объект и подобъект — одна структура (ObjectItem): у подобъекта заполнен
 * parentObjectId. У каждого есть группы, у группы — рационы (диеты из
 * справочника «Диеты»).
 */
/** Тип объекта, например школа / детский сад / больница / склад. */
export const FACILITY_TYPES = ['school', 'kindergarten', 'hospital', 'warehouse'] as const;
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
