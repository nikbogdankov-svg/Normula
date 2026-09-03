import { useEffect, useState } from 'react';
import { Button, Drawer, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Check, FloppyDisk, Plus, TrashBin, Xmark } from '@gravity-ui/icons';
import { useCreateObject, useUpdateSubObject } from './api';
import { MEALS, type MealId } from '@/features/menu/types';
import {
  DIET_CATALOG,
  type CateringObject,
  type DietTypeId,
  type FacilityType,
  type MenuSource,
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
  menuSource: MenuSource;
  mealIds: MealId[];
  departments: DepartmentForm[];
};

type ObjectForm = {
  name: string;
  subObjects: SubObjectForm[];
};

function tableNameToTypeId(name: string): DietTypeId | null {
  const normalized = name.toLowerCase();
  const match = DIET_CATALOG.find((item) => normalized.includes(item.storageName.toLowerCase()));
  return match?.id ?? null;
}

const emptyDepartment = (): DepartmentForm => ({
  id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  selectedTypes: ['main'],
  tableIds: {},
  mealIds: [],
});

const emptySubObject = (): SubObjectForm => ({
  id: `sobj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'school',
  name: '',
  menuSource: 'object',
  mealIds: [],
  departments: [emptyDepartment()],
});

function subObjectToForm(subObject: SubObject): SubObjectForm {
  return {
    id: subObject.id,
    type: subObject.type,
    name: subObject.name,
    menuSource: subObject.menuSource,
    mealIds: subObject.mealIds ? [...subObject.mealIds] : [],
    departments: subObject.departments.map((department) => {
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
        mealIds: department.mealIds ? [...department.mealIds] : [],
      };
    }),
  };
}

function objectToForm(object: CateringObject): ObjectForm {
  return {
    name: object.name,
    subObjects: object.subObjects.map(subObjectToForm),
  };
}

function subObjectFormToPatch(form: SubObjectForm, original: SubObject): UpdateSubObjectRequest {
  return {
    name: form.name.trim(),
    address: original.address,
    type: form.type,
    kettleNumber: original.kettleNumber,
    menuSource: form.menuSource,
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
}

function isFormReady(form: ObjectForm): boolean {
  if (!form.name.trim()) return false;
  if (form.subObjects.length === 0) return false;
  return form.subObjects.every(
    (subObject) =>
      subObject.name.trim() !== '' &&
      subObject.departments.length > 0 &&
      subObject.departments.every(
        (department) => department.name.trim() !== '' && department.selectedTypes.length > 0
      )
  );
}

function hasChanges(form: ObjectForm, original: CateringObject): boolean {
  if (form.name.trim() !== original.name) return true;
  if (form.subObjects.length !== original.subObjects.length) return true;

  for (let i = 0; i < form.subObjects.length; i++) {
    const sobjForm = form.subObjects[i];
    const sobjOrig = original.subObjects.find((s) => s.id === sobjForm.id);
    if (!sobjOrig) return true;
    if (sobjForm.name.trim() !== sobjOrig.name) return true;
    if (sobjForm.type !== sobjOrig.type) return true;
    if (sobjForm.menuSource !== sobjOrig.menuSource) return true;
    if (sobjForm.departments.length !== sobjOrig.departments.length) return true;

    for (let j = 0; j < sobjForm.departments.length; j++) {
      const deptForm = sobjForm.departments[j];
      const deptOrig = sobjOrig.departments.find((d) => d.id === deptForm.id);
      if (!deptOrig) return true;
      if (deptForm.name.trim() !== deptOrig.name) return true;
      if (deptForm.selectedTypes.length !== deptOrig.tables.length) return true;
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

  const toggleTableType = (deptIndex: number, typeId: DietTypeId) => {
    const department = subObject.departments[deptIndex];
    const selected = department.selectedTypes.includes(typeId);

    if (selected) {
      if (department.selectedTypes.length <= 1) return;
      updateDepartment(deptIndex, {
        selectedTypes: department.selectedTypes.filter((item) => item !== typeId),
      });
      return;
    }

    updateDepartment(deptIndex, {
      selectedTypes: [...department.selectedTypes, typeId],
    });
  };

  const toggleMeal = (deptIndex: number, meal: MealId) => {
    const department = subObject.departments[deptIndex];
    const selected = department.mealIds.includes(meal);
    updateDepartment(deptIndex, {
      mealIds: selected
        ? department.mealIds.filter((item) => item !== meal)
        : [...department.mealIds, meal],
    });
  };

  const toggleSubObjectMeal = (meal: MealId) => {
    const selected = subObject.mealIds.includes(meal);
    onUpdate(subObjectIndex, {
      mealIds: selected
        ? subObject.mealIds.filter((item) => item !== meal)
        : [...subObject.mealIds, meal],
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

      <Flex direction="column" gap={1}>
        <Text variant="body-2" className="kitchen-drawer__table-hint">
          Меню подобъекта:
        </Text>
        <Select
          size="m"
          width={280}
          value={[subObject.menuSource]}
          options={[
            { value: 'object', content: 'Меню объекта' },
            { value: 'own', content: 'Своё меню' },
          ]}
          onUpdate={(newValue) =>
            onUpdate(subObjectIndex, { menuSource: newValue[0] as MenuSource })
          }
        />
      </Flex>

      <Flex direction="column" gap={1}>
        <Text variant="body-2" className="kitchen-drawer__table-hint">
          Приёмы пищи подобъекта (не выбрано — как у объекта):
        </Text>
        <Flex gap={2} wrap>
          {MEALS.map((meal) => (
            <MealChip
              key={meal.id}
              label={meal.label}
              selected={subObject.mealIds.includes(meal.id)}
              onClick={() => toggleSubObjectMeal(meal.id)}
            />
          ))}
        </Flex>
      </Flex>

      {subObject.departments.map((department, deptIndex) => (
        <Flex key={department.id} direction="column" gap={2} className="kitchen-drawer__department">
          <Flex gap={2} alignItems="flex-end">
            <TextInput
              size="l"
              label={
                subObject.type === 'school'
                  ? 'Класс (параллель):'
                  : subObject.type === 'kindergarten'
                    ? 'Группа:'
                    : 'Отделение:'
              }
              placeholder={
                subObject.type === 'school'
                  ? '1–4 классы'
                  : subObject.type === 'kindergarten'
                    ? 'Старшая группа'
                    : 'Терапия'
              }
              value={department.name}
              onUpdate={(value) => updateDepartment(deptIndex, { name: value })}
              style={{ flex: 1 }}
            />
            {subObject.departments.length > 1 && (
              <Button
                view="flat"
                size="l"
                title="Удалить группу"
                aria-label="Удалить группу"
                onClick={() =>
                  onUpdate(subObjectIndex, {
                    departments: subObject.departments.filter((_, i) => i !== deptIndex),
                  })
                }
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
              (item.appliesTo as readonly string[]).includes(subObject.type)
            ).map((type) => (
              <button
                key={type.id}
                type="button"
                className={`objects-table-chip${
                  department.selectedTypes.includes(type.id) ? ' objects-table-chip_selected' : ''
                }`}
                onClick={() => toggleTableType(deptIndex, type.id)}
              >
                {department.selectedTypes.includes(type.id) && <Icon data={Check} size={14} />}
                {type.label}
              </button>
            ))}
          </Flex>

          <Text variant="body-1" className="kitchen-drawer__table-hint">
            Приёмы пищи группы (не выбрано — все)
          </Text>

          <Flex gap={2} wrap>
            {MEALS.map((meal) => (
              <MealChip
                key={meal.id}
                label={meal.label}
                selected={department.mealIds.includes(meal.id)}
                onClick={() => toggleMeal(deptIndex, meal.id)}
              />
            ))}
          </Flex>
        </Flex>
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

/** Редактирование / создание объекта в нижнем drawer. */
export function EditSubObjectDialog({
  object,
  mode = 'edit',
  onClose,
}: {
  object: CateringObject | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const update = useUpdateSubObject();
  const create = useCreateObject();
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
      setForm({ name: '', subObjects: [emptySubObject()] });
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
    if (!form || !isFormReady(form)) return;

    if (mode === 'create') {
      create.mutate(form.name, {
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

    const subObjectUpdates = form.subObjects.map((subObjectForm) => {
      const original = object.subObjects.find((s) => s.id === subObjectForm.id);
      if (!original) return Promise.resolve();
      return update.mutateAsync({
        id: original.id,
        patch: subObjectFormToPatch(subObjectForm, original),
      });
    });

    Promise.all(subObjectUpdates)
      .then(() => {
        toaster.add({
          name: 'object-updated',
          title: 'Объект обновлён',
          theme: 'success',
        });
        requestClose();
      })
      .catch((e: Error) =>
        toaster.add({
          name: 'object-edit',
          title: 'Не удалось сохранить',
          content: e.message,
          theme: 'danger',
        })
      );
  };

  if (!mounted || !form) return null;

  const ready = isFormReady(form);
  const changed = object ? hasChanges(form, object) : false;

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
              view="normal-contrast"
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
