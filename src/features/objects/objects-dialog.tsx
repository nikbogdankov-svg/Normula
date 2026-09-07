import { useEffect, useState } from 'react';
import { Button, Drawer, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Check, FloppyDisk, Plus, TrashBin, Xmark } from '@gravity-ui/icons';
import { useCreateObject, useUpdateObject, useUpdateSubObject } from './api';
import { MEALS, type MealId } from '@/features/menu/types';
import {
  DIET_CATALOG,
  type CateringObject,
  type DietTypeId,
  type FacilityType,
  type SubObject,
  type UpdateSubObjectRequest,
} from './types';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './kitchen-drawer.css';

type DepartmentForm = {
  id: string;
  name: string;
  selectedTypes: DietTypeId[];
  tableIds: Partial<Record<DietTypeId, string>>;
  mealIds: MealId[];
};

type SubObjectForm = {
  id: string;
  type: FacilityType;
  name: string;
  departments: DepartmentForm[];
};

type ObjectForm = {
  name: string;
  menuId?: string;
  mealIds: MealId[];
  departments: DepartmentForm[];
};

type SubObjectsForm = {
  subObjects: SubObjectForm[];
};

function tableNameToTypeId(name: string): DietTypeId | null {
  const normalized = name.toLowerCase();
  const match = DIET_CATALOG.find((item) => normalized.includes(item.storageName.toLowerCase()));
  return match?.id ?? null;
}

/** Пустой mealIds в контракте означает «все» — в форме приводим к явному списку. */
function normalizeMealIds(mealIds?: MealId[]): MealId[] {
  return mealIds && mealIds.length > 0 ? [...mealIds] : MEALS.map((meal) => meal.id);
}

const emptyDepartment = (): DepartmentForm => ({
  id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  selectedTypes: ['main'],
  tableIds: {},
  mealIds: normalizeMealIds(),
});

const emptySubObject = (): SubObjectForm => ({
  id: `sobj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'school',
  name: '',
  departments: [emptyDepartment()],
});

function departmentsToForm(departments: CateringObject['departments']): DepartmentForm[] {
  return departments.map((department) => {
    const tableIds: Partial<Record<DietTypeId, string>> = {};
    const selectedTypes: DietTypeId[] = [];

    for (const table of department.tables) {
      const typeId = tableNameToTypeId(table.name);
      if (typeId && !selectedTypes.includes(typeId)) {
        selectedTypes.push(typeId);
        tableIds[typeId] = table.id;
      }
    }

    if (selectedTypes.length === 0 && department.tables.length > 0) {
      selectedTypes.push('main');
      tableIds.main = department.tables[0].id;
    }

    return {
      id: department.id,
      name: department.name,
      selectedTypes,
      tableIds,
      mealIds: normalizeMealIds(department.mealIds),
    };
  });
}

function subObjectToForm(subObject: SubObject): SubObjectForm {
  return {
    id: subObject.id,
    type: subObject.type,
    name: subObject.name,
    departments: departmentsToForm(subObject.departments),
  };
}

function objectToForm(object: CateringObject): ObjectForm {
  return {
    name: object.name,
    menuId: object.menuId,
    mealIds: object.mealIds ? [...object.mealIds] : [],
    departments: departmentsToForm(object.departments),
  };
}

function departmentsFormHasChanges(
  formDepartments: DepartmentForm[],
  originalDepartments: CateringObject['departments']
): boolean {
  if (formDepartments.length !== originalDepartments.length) return true;

  for (let i = 0; i < formDepartments.length; i++) {
    const formDept = formDepartments[i];
    const origDept = originalDepartments.find((d) => d.id === formDept.id);
    if (!origDept) return true;
    if (formDept.name.trim() !== origDept.name) return true;
    if (formDept.selectedTypes.length !== origDept.tables.length) return true;
    if (
      JSON.stringify(normalizeMealIds(formDept.mealIds)) !==
      JSON.stringify(normalizeMealIds(origDept.mealIds))
    )
      return true;
  }

  return false;
}

function subObjectFormToPatch(form: SubObjectForm, original: SubObject): UpdateSubObjectRequest {
  return {
    name: form.name.trim(),
    address: original.address,
    type: form.type,
    kettleNumber: original.kettleNumber,
    menuSource: original.menuSource,
    menuId: original.menuId,
    mealIds: original.mealIds ?? [],
    departments: form.departments.map((department) => ({
      id: department.id,
      name: department.name.trim(),
      mealIds: department.mealIds,
      tables: department.selectedTypes.map((typeId) => {
        const type = DIET_CATALOG.find((item) => item.id === typeId)!;
        return {
          id:
            department.tableIds[typeId] ??
            `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: type.storageName,
        };
      }),
    })),
  };
}

function isObjectFormReady(form: ObjectForm): boolean {
  if (!form.name.trim()) return false;
  return form.departments.every(
    (department) =>
      department.name.trim() !== '' &&
      department.selectedTypes.length > 0 &&
      department.mealIds.length > 0
  );
}

function isSubObjectsFormReady(subObjects: SubObjectForm[]): boolean {
  return subObjects.every(
    (subObject) =>
      subObject.name.trim() !== '' &&
      subObject.departments.length > 0 &&
      subObject.departments.every(
        (department) =>
          department.name.trim() !== '' &&
          department.selectedTypes.length > 0 &&
          department.mealIds.length > 0
      )
  );
}

function hasObjectChanges(form: ObjectForm, original: CateringObject): boolean {
  if (form.name.trim() !== original.name) return true;
  if (JSON.stringify(form.mealIds) !== JSON.stringify(original.mealIds ?? [])) return true;
  return departmentsFormHasChanges(form.departments, original.departments);
}

function hasSubObjectsChanges(subObjects: SubObjectForm[], original: CateringObject): boolean {
  if (subObjects.length !== original.subObjects.length) return true;

  for (let i = 0; i < subObjects.length; i++) {
    const sobjForm = subObjects[i];
    const sobjOrig = original.subObjects.find((s) => s.id === sobjForm.id);
    if (!sobjOrig) return true;
    if (sobjForm.name.trim() !== sobjOrig.name) return true;
    if (sobjForm.type !== sobjOrig.type) return true;
    if (sobjForm.departments.length !== sobjOrig.departments.length) return true;

    for (let j = 0; j < sobjForm.departments.length; j++) {
      const deptForm = sobjForm.departments[j];
      const deptOrig = sobjOrig.departments.find((d) => d.id === deptForm.id);
      if (!deptOrig) return true;
      if (deptForm.name.trim() !== deptOrig.name) return true;
      if (deptForm.selectedTypes.length !== deptOrig.tables.length) return true;
      if (
        JSON.stringify(normalizeMealIds(deptForm.mealIds)) !==
        JSON.stringify(normalizeMealIds(deptOrig.mealIds))
      )
        return true;
    }
  }

  return false;
}

function MealChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`objects-meal-chip${selected ? ' objects-meal-chip_selected' : ''}`}
      onClick={onClick}
    >
      {selected && <Icon data={Check} size={14} />}
      {label}
    </button>
  );
}

function DepartmentBlock({
  variant,
  department,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  variant: FacilityType | 'object';
  department: DepartmentForm;
  index: number;
  onUpdate: (index: number, patch: Partial<DepartmentForm>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const isObject = variant === 'object';
  const nameLabel = isObject
    ? 'Название группы/отделения:'
    : variant === 'school'
      ? 'Класс (параллель):'
      : variant === 'kindergarten'
        ? 'Группа:'
        : 'Отделение:';
  const namePlaceholder = isObject
    ? 'Корпус / отделение'
    : variant === 'school'
      ? '1–4 классы'
      : variant === 'kindergarten'
        ? 'Старшая группа'
        : 'Терапия';

  const toggleTableType = (typeId: DietTypeId) => {
    const selected = department.selectedTypes.includes(typeId);

    if (selected) {
      if (department.selectedTypes.length <= 1) return;
      onUpdate(index, {
        selectedTypes: department.selectedTypes.filter((item) => item !== typeId),
      });
      return;
    }

    onUpdate(index, {
      selectedTypes: [...department.selectedTypes, typeId],
    });
  };

  const toggleMeal = (meal: MealId) => {
    const selected = department.mealIds.includes(meal);

    if (selected) {
      if (department.mealIds.length <= 1) return;
      onUpdate(index, {
        mealIds: department.mealIds.filter((item) => item !== meal),
      });
      return;
    }

    onUpdate(index, {
      mealIds: [...department.mealIds, meal],
    });
  };

  return (
    <Flex key={department.id} direction="column" gap={2} className="kitchen-drawer__department">
      <Flex gap={2} alignItems="flex-end">
        <TextInput
          size="l"
          label={nameLabel}
          placeholder={namePlaceholder}
          value={department.name}
          onUpdate={(value) => onUpdate(index, { name: value })}
          style={{ flex: 1 }}
        />
        {canRemove && (
          <Button
            view="flat"
            size="l"
            title="Удалить группу"
            aria-label="Удалить группу"
            onClick={() => onRemove(index)}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        )}
      </Flex>

      <Text variant="body-1" className="kitchen-drawer__table-hint">
        Рацион (должен быть выбран хотя бы один)
      </Text>

      <Flex gap={2} wrap>
        {DIET_CATALOG.filter((item) =>
          isObject ? true : (item.appliesTo as readonly string[]).includes(variant)
        ).map((type) => (
          <button
            key={type.id}
            type="button"
            className={`objects-table-chip${
              department.selectedTypes.includes(type.id) ? ' objects-table-chip_selected' : ''
            }`}
            onClick={() => toggleTableType(type.id)}
          >
            {department.selectedTypes.includes(type.id) && <Icon data={Check} size={14} />}
            {type.label}
          </button>
        ))}
      </Flex>

      <Text variant="body-1" className="kitchen-drawer__table-hint">
        Приёмы пищи группы (минимум один)
      </Text>

      <Flex gap={2} wrap>
        {MEALS.map((meal) => (
          <MealChip
            key={meal.id}
            label={meal.label}
            selected={department.mealIds.includes(meal.id)}
            onClick={() => toggleMeal(meal.id)}
          />
        ))}
      </Flex>
    </Flex>
  );
}

function SubObjectBlock({
  subObject,
  subObjectIndex,
  onUpdate,
  onRemove,
  canRemove,
}: {
  subObject: SubObjectForm;
  subObjectIndex: number;
  onUpdate: (index: number, patch: Partial<SubObjectForm>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const updateDepartment = (deptIndex: number, patch: Partial<DepartmentForm>) => {
    onUpdate(subObjectIndex, {
      departments: subObject.departments.map((d, i) => (i === deptIndex ? { ...d, ...patch } : d)),
    });
  };

  const removeDepartment = (deptIndex: number) => {
    onUpdate(subObjectIndex, {
      departments: subObject.departments.filter((_, i) => i !== deptIndex),
    });
  };

  return (
    <Flex direction="column" gap={2} className="kitchen-drawer__facility-block">
      <Flex gap={2} alignItems="flex-end">
        <TextInput
          size="l"
          label="Название подобъекта:"
          placeholder="Школа №1"
          value={subObject.name}
          onUpdate={(value) => onUpdate(subObjectIndex, { name: value })}
          style={{ flex: 1 }}
        />
        <Flex direction="column" gap={1}>
          <Select
            size="l"
            width={200}
            value={[subObject.type]}
            options={[
              { value: 'school', content: 'Школа' },
              { value: 'kindergarten', content: 'Детский сад' },
              { value: 'hospital', content: 'Больница' },
            ]}
            onUpdate={(newValue) => {
              const nextType = newValue[0] as FacilityType;
              onUpdate(subObjectIndex, {
                type: nextType,
                departments: subObject.departments.map((department) => ({
                  ...department,
                  selectedTypes: department.selectedTypes.filter((id) =>
                    (
                      DIET_CATALOG.find((item) => item.id === id)?.appliesTo as
                        readonly string[] | undefined
                    )?.includes(nextType)
                  ),
                })),
              });
            }}
          />
        </Flex>
        {canRemove && (
          <Button
            view="flat"
            size="l"
            title="Удалить подобъект"
            aria-label="Удалить подобъект"
            onClick={() => onRemove(subObjectIndex)}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        )}
      </Flex>

      {subObject.departments.map((department, deptIndex) => (
        <DepartmentBlock
          key={department.id}
          variant={subObject.type}
          department={department}
          index={deptIndex}
          onUpdate={updateDepartment}
          onRemove={removeDepartment}
          canRemove={subObject.departments.length > 1}
        />
      ))}

      <Button
        view="flat"
        size="m"
        onClick={() =>
          onUpdate(subObjectIndex, {
            departments: [...subObject.departments, emptyDepartment()],
          })
        }
        style={{ alignSelf: 'flex-start' }}
      >
        <Icon data={Plus} size={16} />
        {subObject.type === 'school'
          ? 'Добавить класс'
          : subObject.type === 'kindergarten'
            ? 'Добавить группу'
            : 'Добавить отделение'}
      </Button>
    </Flex>
  );
}

function Flex({
  direction,
  gap,
  alignItems,
  justifyContent,
  wrap,
  style,
  className,
  children,
}: {
  direction?: string;
  gap?: number;
  alignItems?: string;
  justifyContent?: string;
  wrap?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction as React.CSSProperties['flexDirection'],
        gap: gap ? `${gap * 4}px` : undefined,
        alignItems: alignItems as React.CSSProperties['alignItems'],
        justifyContent: justifyContent as React.CSSProperties['justifyContent'],
        flexWrap: wrap ? 'wrap' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Drawer редактирования / создания объекта (название, собственные группы/отделения). */
export function ObjectDrawer({
  object,
  mode = 'edit',
  onClose,
}: {
  object: CateringObject | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const create = useCreateObject();
  const update = useUpdateObject();
  const toaster = useToaster();
  const [form, setForm] = useState<ObjectForm | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && !object) {
      setVisible(false);
      return;
    }
    if (mode === 'create') {
      setForm({ name: '', menuId: undefined, mealIds: [], departments: [emptyDepartment()] });
    } else if (object) {
      setForm(objectToForm(object));
    }
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [object, mode]);

  useEffect(() => {
    if (visible || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const updateDepartment = (index: number, patch: Partial<DepartmentForm>) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        departments: current.departments.map((d, i) => (i === index ? { ...d, ...patch } : d)),
      };
    });
  };

  const removeDepartment = (index: number) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        departments: current.departments.filter((_, i) => i !== index),
      };
    });
  };

  const submit = () => {
    if (!form || !isObjectFormReady(form)) return;

    const payload = {
      name: form.name.trim(),
      menuId: form.menuId ?? undefined,
      mealIds: form.mealIds,
      departments: form.departments.map((department) => ({
        id: department.id,
        name: department.name.trim(),
        mealIds: department.mealIds,
        tables: department.selectedTypes.map((typeId) => {
          const type = DIET_CATALOG.find((item) => item.id === typeId)!;
          return {
            id:
              department.tableIds[typeId] ??
              `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: type.storageName,
          };
        }),
      })),
    };

    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: () => {
          toaster.add({ name: 'object-created', title: 'Объект создан', theme: 'success' });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'object-create',
            title: 'Не удалось создать',
            content: e.message,
            theme: 'danger',
          }),
      });
      return;
    }

    if (!object) return;

    update.mutate(
      { id: object.id, patch: payload },
      {
        onSuccess: () => {
          toaster.add({
            name: 'object-updated',
            title: 'Объект обновлён',
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'object-edit',
            title: 'Не удалось сохранить',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  if (!mounted || !form) return null;

  const ready = isObjectFormReady(form);
  const changed = object ? hasObjectChanges(form, object) : false;

  return (
    <Drawer
      open={visible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) requestClose();
      }}
      placement="bottom"
      size={height}
      maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
      contentOverflow="auto"
      className="kitchen-drawer"
      contentClassName="kitchen-drawer__panel"
    >
      <div className="kitchen-drawer__card">
        <div className="kitchen-drawer__header">
          <div className="kitchen-drawer__header-inner">
            <Text variant="subheader-3">
              {mode === 'create' ? 'Создать объект' : 'Редактирование объекта'}
            </Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="kitchen-drawer__body">
          <Flex direction="column" gap={3}>
            <TextInput
              size="l"
              label="Название объекта:"
              placeholder="Центральный объект"
              value={form.name}
              onUpdate={(value) =>
                setForm((current) => (current ? { ...current, name: value } : current))
              }
              autoFocus
            />

            {form.departments.map((department, departmentIndex) => (
              <DepartmentBlock
                key={department.id}
                variant="object"
                department={department}
                index={departmentIndex}
                onUpdate={updateDepartment}
                onRemove={removeDepartment}
                canRemove={form.departments.length > 1}
              />
            ))}

            <Button
              view="normal-contrast"
              size="l"
              onClick={() =>
                setForm((current) =>
                  current
                    ? { ...current, departments: [...current.departments, emptyDepartment()] }
                    : current
                )
              }
              style={{ alignSelf: 'flex-start' }}
            >
              <Icon data={Plus} size={16} />
              Добавить группу/отделение
            </Button>
          </Flex>
        </div>

        <div className="kitchen-drawer__footer">
          <div className="kitchen-drawer__footer-inner">
            <Button view="outlined" size="l" onClick={requestClose}>
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              loading={mode === 'create' ? create.isPending : update.isPending}
              disabled={!ready || (mode === 'edit' && !changed)}
              onClick={submit}
            >
              <Icon data={mode === 'create' ? Plus : FloppyDisk} size={16} />
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/** Drawer редактирования подобъектов: название, тип, группы/отделения с рационами и приёмами. */
export function SubObjectsDrawer({
  object,
  onClose,
}: {
  object: CateringObject | null;
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const update = useUpdateSubObject();
  const toaster = useToaster();
  const [form, setForm] = useState<SubObjectsForm | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!object) {
      setVisible(false);
      return;
    }
    setForm({ subObjects: object.subObjects.map(subObjectToForm) });
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [object]);

  useEffect(() => {
    if (visible || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const updateSubObject = (index: number, patch: Partial<SubObjectForm>) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        subObjects: current.subObjects.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      };
    });
  };

  const removeSubObject = (index: number) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        subObjects: current.subObjects.filter((_, i) => i !== index),
      };
    });
  };

  const submit = () => {
    if (!form || !object || !isSubObjectsFormReady(form.subObjects)) return;

    const steps: Promise<unknown>[] = [];

    for (const subObjectForm of form.subObjects) {
      const original = object.subObjects.find((s) => s.id === subObjectForm.id);
      if (!original) continue;
      steps.push(
        update.mutateAsync({
          id: original.id,
          patch: subObjectFormToPatch(subObjectForm, original),
        })
      );
    }

    Promise.all(steps)
      .then(() => {
        toaster.add({
          name: 'sub-objects-updated',
          title: 'Подобъекты обновлены',
          theme: 'success',
        });
        requestClose();
      })
      .catch((e: Error) =>
        toaster.add({
          name: 'sub-objects-edit',
          title: 'Не удалось сохранить',
          content: e.message,
          theme: 'danger',
        })
      );
  };

  if (!mounted || !form || !object) return null;

  const ready = isSubObjectsFormReady(form.subObjects);
  const changed = hasSubObjectsChanges(form.subObjects, object);

  return (
    <Drawer
      open={visible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) requestClose();
      }}
      placement="bottom"
      size={height}
      maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
      contentOverflow="auto"
      className="kitchen-drawer"
      contentClassName="kitchen-drawer__panel"
    >
      <div className="kitchen-drawer__card">
        <div className="kitchen-drawer__header">
          <div className="kitchen-drawer__header-inner">
            <Text variant="subheader-3">Редактирование подобъектов</Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="kitchen-drawer__body">
          <Flex direction="column" gap={3}>
            {form.subObjects.map((subObject, subObjectIndex) => (
              <SubObjectBlock
                key={subObject.id}
                subObject={subObject}
                subObjectIndex={subObjectIndex}
                onUpdate={updateSubObject}
                onRemove={removeSubObject}
                canRemove={form.subObjects.length > 1}
              />
            ))}

            <Button
              view="normal"
              size="l"
              onClick={() =>
                setForm((current) =>
                  current
                    ? { ...current, subObjects: [...current.subObjects, emptySubObject()] }
                    : current
                )
              }
              style={{ alignSelf: 'flex-start' }}
            >
              <Icon data={Plus} size={16} />
              Добавить подобъект
            </Button>
          </Flex>
        </div>

        <div className="kitchen-drawer__footer">
          <div className="kitchen-drawer__footer-inner">
            <Button view="outlined" size="l" onClick={requestClose}>
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              loading={update.isPending}
              disabled={!ready || !changed}
              onClick={submit}
            >
              <Icon data={FloppyDisk} size={16} />
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
