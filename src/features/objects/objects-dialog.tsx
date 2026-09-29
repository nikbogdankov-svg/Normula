import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Drawer,
  Icon,
  Select,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { Check, FloppyDisk, Plus, TrashBin, Xmark } from '@gravity-ui/icons';
import {
  useCreateObject,
  useCreateSubObject,
  useDeleteObject,
  useDeleteSubObject,
  useUpdateObject,
  useUpdateSubObject,
  type ObjectDeleteMode,
} from './api';
import {
  DIET_CATALOG,
  type CateringObject,
  type CreateObjectRequest,
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
};

type SubObjectForm = {
  id: string;
  type: FacilityType;
  name: string;
  departments: DepartmentForm[];
};

type ObjectForm = {
  name: string;
  type: FacilityType;
  menuId?: string;
  departments: DepartmentForm[];
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
    type: object.type,
    menuId: object.menuId,
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
    departments: form.departments.map((department) => ({
      id: department.id,
      name: department.name.trim(),
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
    (department) => department.name.trim() !== '' && department.selectedTypes.length > 0
  );
}

function isSubObjectsFormReady(subObjects: SubObjectForm[]): boolean {
  return subObjects.every(
    (subObject) =>
      subObject.name.trim() !== '' &&
      subObject.departments.length > 0 &&
      subObject.departments.every(
        (department) => department.name.trim() !== '' && department.selectedTypes.length > 0
      )
  );
}

function hasObjectChanges(form: ObjectForm, original: CateringObject): boolean {
  if (form.name.trim() !== original.name) return true;
  if (form.type !== original.type) return true;
  return departmentsFormHasChanges(form.departments, original.departments);
}

function hasSubObjectChanges(form: SubObjectForm, original: SubObject): boolean {
  if (form.name.trim() !== original.name) return true;
  if (form.type !== original.type) return true;
  if (form.departments.length !== original.departments.length) return true;

  for (let j = 0; j < form.departments.length; j++) {
    const deptForm = form.departments[j];
    const deptOrig = original.departments.find((d) => d.id === deptForm.id);
    if (!deptOrig) return true;
    if (deptForm.name.trim() !== deptOrig.name) return true;
    if (deptForm.selectedTypes.length !== deptOrig.tables.length) return true;
  }

  return false;
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

/** Попап подтверждения удаления: отложенно / сразу / отмена. */
function DeleteConfirmDialog({
  open,
  title,
  description,
  afterPeriodHint,
  onAfterPeriod,
  onImmediate,
  onCancel,
  pending,
}: {
  open: boolean;
  title: string;
  description: string;
  afterPeriodHint: string;
  onAfterPeriod: () => void;
  onImmediate: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onClose={onCancel} size="s">
      <Dialog.Header caption={title} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-2">{description}</Text>
          <Flex direction="column" gap={2}>
            <Button view="outlined-danger" size="l" onClick={onAfterPeriod} loading={pending}>
              Удалить после конца периода
            </Button>
            <Text variant="body-1" color="secondary">
              {afterPeriodHint}
            </Text>
          </Flex>
          <Flex direction="column" gap={2}>
            <Button view="outlined" size="l" onClick={onImmediate} loading={pending}>
              Удалить сейчас
            </Button>
            <Text variant="body-1" color="secondary">
              Будет убран из всех разделов немедленно
            </Text>
          </Flex>
          <Button view="flat" size="l" onClick={onCancel} disabled={pending}>
            Отмена
          </Button>
        </Flex>
      </Dialog.Body>
    </Dialog>
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
  const removeObject = useDeleteObject();
  const toaster = useToaster();
  const [form, setForm] = useState<ObjectForm | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && !object) {
      setVisible(false);
      return;
    }
    if (mode === 'create') {
      setForm({
        name: '',
        type: 'school',
        menuId: undefined,
        departments: [emptyDepartment()],
      });
    } else if (object) {
      setForm(objectToForm(object));
    }
    setConfirmingDelete(false);
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

    const payload: CreateObjectRequest = {
      name: form.name.trim(),
      type: form.type,
      menuId: form.menuId ?? undefined,
      departments: form.departments.map((department) => ({
        id: department.id,
        name: department.name.trim(),
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

  const runDelete = (deletionMode: ObjectDeleteMode) => {
    if (!object) return;

    removeObject.mutate(
      { id: object.id, mode: deletionMode },
      {
        onSuccess: () => {
          toaster.add(
            deletionMode === 'immediate'
              ? { name: 'object-deleted', title: 'Объект удалён', theme: 'success' }
              : {
                  name: 'object-deleted',
                  title: 'Объект удалён',
                  content: 'Останется в порционнике и меню до конца периода',
                  theme: 'success',
                }
          );
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'object-delete',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

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
            <Flex gap={2} alignItems="flex-end">
              <TextInput
                size="l"
                label="Название объекта:"
                placeholder="Центральный объект"
                value={form.name}
                onUpdate={(value) =>
                  setForm((current) => (current ? { ...current, name: value } : current))
                }
                autoFocus
                style={{ flex: 1 }}
              />
              <Flex direction="column" gap={1}>
                <Select
                  size="l"
                  width={240}
                  value={[form.type]}
                  options={[
                    { value: 'school', content: 'Школа' },
                    { value: 'kindergarten', content: 'Детский сад' },
                    { value: 'hospital', content: 'Больница' },
                  ]}
                  onUpdate={(newValue) => {
                    const nextType = newValue[0] as FacilityType;
                    setForm((current) => (current ? { ...current, type: nextType } : current));
                  }}
                />
              </Flex>
            </Flex>

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
          <div
            className="kitchen-drawer__footer-inner"
            style={{ justifyContent: mode === 'create' ? 'flex-end' : 'space-between' }}
          >
            {mode === 'edit' && (
              <Button view="outlined-danger" size="l" onClick={() => setConfirmingDelete(true)}>
                <Icon data={TrashBin} size={16} />
                Удалить
              </Button>
            )}
            <Flex gap={2}>
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
            </Flex>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmingDelete}
        title={`Удалить «${object?.name ?? ''}»?`}
        description="Объект используется в порционнике и меню. Выберите, как его удалить."
        afterPeriodHint="До конца периода объект останется в порционнике и меню"
        onAfterPeriod={() => runDelete('soft')}
        onImmediate={() => runDelete('immediate')}
        onCancel={() => setConfirmingDelete(false)}
        pending={removeObject.isPending}
      />
    </Drawer>
  );
}

/** Drawer одного подобъекта: создание по одному (имя + тип) или редактирование
 *  выбранного (название, тип, группы/отделения с рационами, удаление). */
export function SubObjectDrawer({
  object,
  subObject,
  onClose,
}: {
  object: CateringObject | null;
  subObject: SubObject | null;
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const createSubObject = useCreateSubObject();
  const update = useUpdateSubObject();
  const deleteSubObject = useDeleteSubObject();
  const toaster = useToaster();
  const [form, setForm] = useState<SubObjectForm | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isCreate = subObject === null;
  const subtitle = subObject ? `Подобъект «${subObject.name}»` : 'Новый подобъект';

  useEffect(() => {
    if (!object) {
      setVisible(false);
      return;
    }
    setForm(subObject ? subObjectToForm(subObject) : emptySubObject());
    setConfirmingDelete(false);
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [object, subObject]);

  useEffect(() => {
    if (visible || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const updateSubObject = (_index: number, patch: Partial<SubObjectForm>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
  };

  const removeDepartment = (deptIndex: number) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        departments: current.departments.filter((_, i) => i !== deptIndex),
      };
    });
  };

  const create = () => {
    if (!form || !object || !form.name.trim()) return;
    createSubObject.mutate(
      { objectId: object.id, name: form.name, type: form.type },
      {
        onSuccess: () => {
          toaster.add({ name: 'subobject-created', title: 'Подобъект добавлен', theme: 'success' });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'subobject-create',
            title: 'Не удалось добавить',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  const submitEdit = () => {
    if (!form || !subObject || !isSubObjectsFormReady([form])) return;

    update.mutate(
      { id: subObject.id, patch: subObjectFormToPatch(form, subObject) },
      {
        onSuccess: () => {
          toaster.add({
            name: 'subobject-updated',
            title: 'Подобъект обновлён',
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'subobject-edit',
            title: 'Не удалось сохранить',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  const runDelete = (deletionMode: ObjectDeleteMode) => {
    if (!subObject) return;

    deleteSubObject.mutate(
      { id: subObject.id, mode: deletionMode },
      {
        onSuccess: () => {
          toaster.add(
            deletionMode === 'immediate'
              ? { name: 'subobject-deleted', title: 'Подобъект удалён', theme: 'success' }
              : {
                  name: 'subobject-deleted',
                  title: 'Подобъект удалён',
                  content: 'Останется в порционнике и меню до конца периода',
                  theme: 'success',
                }
          );
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'subobject-delete',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  if (!mounted || !form || !object) return null;

  const nameReady = form.name.trim() !== '';
  const ready = isCreate ? nameReady : isSubObjectsFormReady([form]);
  const changed = subObject ? hasSubObjectChanges(form, subObject) : false;

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
            <Text variant="subheader-3">{isCreate ? 'Добавить подобъект' : subtitle}</Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="kitchen-drawer__body">
          {isCreate ? (
            <Flex gap={2} alignItems="flex-end">
              <TextInput
                size="l"
                label="Название подобъекта:"
                placeholder="Школа №1"
                value={form.name}
                onUpdate={(value) =>
                  setForm((current) => (current ? { ...current, name: value } : current))
                }
                autoFocus
                style={{ flex: 1 }}
              />
              <Select
                size="l"
                width={200}
                value={[form.type]}
                options={[
                  { value: 'school', content: 'Школа' },
                  { value: 'kindergarten', content: 'Детский сад' },
                  { value: 'hospital', content: 'Больница' },
                ]}
                onUpdate={(newValue) => {
                  const nextType = newValue[0] as FacilityType;
                  setForm((current) => (current ? { ...current, type: nextType } : current));
                }}
              />
            </Flex>
          ) : (
            <Flex direction="column" gap={3}>
              <SubObjectBlock
                subObject={form}
                subObjectIndex={0}
                onUpdate={updateSubObject}
                onRemove={removeDepartment}
                canRemove
              />
            </Flex>
          )}
        </div>

        <div className="kitchen-drawer__footer">
          <div
            className="kitchen-drawer__footer-inner"
            style={{ justifyContent: isCreate ? 'flex-end' : 'space-between' }}
          >
            {!isCreate && (
              <Button view="outlined-danger" size="l" onClick={() => setConfirmingDelete(true)}>
                <Icon data={TrashBin} size={16} />
                Удалить
              </Button>
            )}
            <Flex gap={2}>
              <Button view="outlined" size="l" onClick={requestClose}>
                Отмена
              </Button>
              <Button
                view="action"
                size="l"
                loading={isCreate ? createSubObject.isPending : update.isPending}
                disabled={!ready || (!isCreate && !changed)}
                onClick={isCreate ? create : submitEdit}
              >
                <Icon data={isCreate ? Plus : FloppyDisk} size={16} />
                {isCreate ? 'Добавить' : 'Сохранить'}
              </Button>
            </Flex>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmingDelete}
        title={subObject ? `Удалить «${subObject.name}»?` : ''}
        description="Подобъект используется в порционнике и меню. Выберите, как его удалить."
        afterPeriodHint="До конца периода подобъект останется в порционнике и меню"
        onAfterPeriod={() => runDelete('soft')}
        onImmediate={() => runDelete('immediate')}
        onCancel={() => setConfirmingDelete(false)}
        pending={deleteSubObject.isPending}
      />
    </Drawer>
  );
}
