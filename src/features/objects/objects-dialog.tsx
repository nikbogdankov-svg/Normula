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
import { useTranslation } from 'react-i18next';
import { useDiets } from '@/features/diets/api';
import type { Diet } from '@/features/diets/types';
import { useCreateObject, useDeleteObject, useUpdateObject, type ObjectDeleteMode } from './api';
import {
  type FacilityType,
  type ObjectGroup,
  type ObjectGroupInput,
  type ObjectItem,
} from './types';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './kitchen-drawer.css';
import { errorText } from '@/shared/api/error-text';

type DepartmentForm = {
  /** Ключ для React: id группы или временный для новой. */
  key: string;
  name: string;
  dietIds: string[];
};

type SubObjectForm = {
  type: FacilityType;
  name: string;
  departments: DepartmentForm[];
};

type ObjectForm = {
  name: string;
  type: FacilityType;
  departments: DepartmentForm[];
};

/** Диета для выбора рационом: из справочника или уже выбранная в группе. */
type DietOption = {
  id: string;
  name: string;
  /** Для каких учреждений доступна; null — диеты уже нет в справочнике. */
  appliesTo: FacilityType[] | null;
};

/**
 * Диеты справочника плюс выбранные в группах объекта, которых в справочнике
 * уже нет: иначе такой рацион не был бы виден в форме.
 */
function dietOptions(diets: Diet[], groups: ObjectGroup[]): DietOption[] {
  const options: DietOption[] = diets.map((diet) => ({
    id: diet.id,
    name: diet.name,
    appliesTo: diet.appliesTo,
  }));
  for (const diet of groups.flatMap((group) => group.diets)) {
    if (!options.some((option) => option.id === diet.id)) {
      options.push({ id: diet.id, name: diet.name, appliesTo: null });
    }
  }
  return options;
}

const emptyDepartment = (): DepartmentForm => ({
  key: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  dietIds: [],
});

const emptySubObject = (): SubObjectForm => ({
  type: 'school',
  name: '',
  departments: [emptyDepartment()],
});

function groupsToForm(groups: ObjectGroup[]): DepartmentForm[] {
  return groups.map((group) => ({
    key: group.id,
    name: group.name,
    dietIds: group.diets.map((diet) => diet.id),
  }));
}

function formToGroups(departments: DepartmentForm[]): ObjectGroupInput[] {
  return departments.map((department) => ({
    name: department.name.trim(),
    dietIds: department.dietIds,
  }));
}

function toForm(object: ObjectItem): ObjectForm {
  return {
    name: object.name,
    type: object.type,
    departments: groupsToForm(object.groups),
  };
}

function isObjectFormReady(form: ObjectForm): boolean {
  if (!form.name.trim()) return false;
  // Склад — без групп и отделений: заполнять их не нужно.
  if (form.type === 'warehouse') return true;
  return form.departments.every(
    (department) => department.name.trim() !== '' && department.dietIds.length > 0
  );
}

function isSubObjectFormReady(form: SubObjectForm): boolean {
  return isObjectFormReady(form) && (form.type === 'warehouse' || form.departments.length > 0);
}

/** Одинаковые ли группы: порядок диет в группе значения не имеет. */
function sameGroups(form: DepartmentForm[], original: ObjectGroup[]): boolean {
  if (form.length !== original.length) return false;
  return form.every((department, i) => {
    const group = original[i];
    const formDiets = [...department.dietIds].sort().join();
    const groupDiets = group.diets
      .map((diet) => diet.id)
      .sort()
      .join();
    return department.name.trim() === group.name && formDiets === groupDiets;
  });
}

function hasChanges(form: ObjectForm, original: ObjectItem): boolean {
  if (form.name.trim() !== original.name) return true;
  if (form.type !== original.type) return true;
  return !sameGroups(form.departments, original.groups);
}

function DepartmentBlock({
  variant,
  facilityType,
  department,
  diets,
  dietsLoaded,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  variant: FacilityType | 'object';
  facilityType: FacilityType;
  department: DepartmentForm;
  diets: DietOption[];
  dietsLoaded: boolean;
  index: number;
  onUpdate: (index: number, patch: Partial<DepartmentForm>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const { t } = useTranslation();
  const isObject = variant === 'object';
  const nameLabel = isObject
    ? t('objects.groupNameObject')
    : variant === 'school'
      ? t('objects.groupNameClass')
      : variant === 'kindergarten'
        ? t('objects.groupNameGroup')
        : t('objects.groupNameDept');
  const namePlaceholder = isObject
    ? t('objects.namePlaceholderObject')
    : variant === 'school'
      ? t('objects.namePlaceholderClass')
      : variant === 'kindergarten'
        ? t('objects.namePlaceholderGroup')
        : t('objects.namePlaceholderDept');

  // Выбранные видны всегда; невыбранные — только доступные этому типу объекта.
  const visibleDiets = diets.filter(
    (diet) =>
      department.dietIds.includes(diet.id) ||
      (diet.appliesTo !== null && diet.appliesTo.includes(facilityType))
  );

  const toggleDiet = (dietId: string) => {
    const selected = department.dietIds.includes(dietId);

    if (selected) {
      if (department.dietIds.length <= 1) return;
      onUpdate(index, {
        dietIds: department.dietIds.filter((item) => item !== dietId),
      });
      return;
    }

    onUpdate(index, {
      dietIds: [...department.dietIds, dietId],
    });
  };

  return (
    <Flex key={department.key} direction="column" gap={2} className="kitchen-drawer__department">
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
            title={t('objects.removeGroup')}
            aria-label={t('objects.removeGroup')}
            onClick={() => onRemove(index)}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        )}
      </Flex>

      <Text variant="body-1" className="kitchen-drawer__table-hint">
        {t('objects.dietHint')}
      </Text>

      {dietsLoaded && visibleDiets.length === 0 && (
        <Text variant="body-1" color="secondary">
          {t('objects.noDiets')}
        </Text>
      )}

      <Flex gap={2} wrap>
        {visibleDiets.map((diet) => (
          <button
            key={diet.id}
            type="button"
            className={`objects-table-chip${
              department.dietIds.includes(diet.id) ? ' objects-table-chip_selected' : ''
            }`}
            onClick={() => toggleDiet(diet.id)}
          >
            {department.dietIds.includes(diet.id) && <Icon data={Check} size={14} />}
            {diet.name}
          </button>
        ))}
      </Flex>
    </Flex>
  );
}

function SubObjectBlock({
  subObject,
  subObjectIndex,
  diets,
  dietsLoaded,
  onUpdate,
  onRemove,
  canRemove,
}: {
  subObject: SubObjectForm;
  subObjectIndex: number;
  diets: DietOption[];
  dietsLoaded: boolean;
  onUpdate: (index: number, patch: Partial<SubObjectForm>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const { t } = useTranslation();
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
    <Flex direction="column" gap={3}>
      <Flex gap={2} alignItems="flex-end">
        <TextInput
          size="l"
          label={t('objects.subNameLabel')}
          placeholder={t('objects.subNamePlaceholder')}
          value={subObject.name}
          onUpdate={(value) => onUpdate(subObjectIndex, { name: value })}
          autoFocus
          style={{ flex: 1 }}
        />
        <Flex direction="column" gap={1}>
          <Select
            size="l"
            width={240}
            value={[subObject.type]}
            options={[
              { value: 'school', content: 'Школа' },
              { value: 'kindergarten', content: 'Детский сад' },
              { value: 'hospital', content: 'Больница' },
              { value: 'warehouse', content: 'Склад' },
            ]}
            onUpdate={(newValue) => {
              const nextType = newValue[0] as FacilityType;
              onUpdate(subObjectIndex, {
                type: nextType,
                // У склада нет групп и отделений.
                departments:
                  nextType === 'warehouse'
                    ? []
                    : subObject.departments.map((department) => ({
                        ...department,
                        dietIds: department.dietIds.filter((id) =>
                          diets.find((item) => item.id === id)?.appliesTo?.includes(nextType)
                        ),
                      })),
              });
            }}
          />
        </Flex>
        {canRemove && subObjectIndex !== 0 && (
          <Button
            view="flat"
            size="l"
            title={t('objects.removeSubObject')}
            aria-label={t('objects.removeSubObject')}
            onClick={() => onRemove(subObjectIndex)}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        )}
      </Flex>

      {subObject.type !== 'warehouse' && (
        <>
          {subObject.departments.map((department, deptIndex) => (
            <DepartmentBlock
              key={department.key}
              variant={subObject.type}
              facilityType={subObject.type}
              department={department}
              diets={diets}
              dietsLoaded={dietsLoaded}
              index={deptIndex}
              onUpdate={updateDepartment}
              onRemove={removeDepartment}
              canRemove={subObject.departments.length > 1}
            />
          ))}

          <Button
            view="normal-contrast"
            size="l"
            onClick={() =>
              onUpdate(subObjectIndex, {
                departments: [...subObject.departments, emptyDepartment()],
              })
            }
            style={{ alignSelf: 'flex-start' }}
          >
            <Icon data={Plus} size={16} />
            {subObject.type === 'school'
              ? t('objects.addClass')
              : subObject.type === 'kindergarten'
                ? t('objects.addGroup')
                : t('objects.addDepartment')}
          </Button>
        </>
      )}
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onCancel} size="s">
      <Dialog.Header caption={title} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-2">{description}</Text>
          <Flex direction="column" gap={2}>
            <Button view="outlined-danger" size="l" onClick={onAfterPeriod} loading={pending}>
              {t('objects.deleteAfterPeriod')}
            </Button>
            <Text variant="body-1" color="secondary">
              {afterPeriodHint}
            </Text>
          </Flex>
          <Flex direction="column" gap={2}>
            <Button view="outlined" size="l" onClick={onImmediate} loading={pending}>
              {t('objects.deleteNow')}
            </Button>
            <Text variant="body-1" color="secondary">
              {t('objects.deleteNowHint')}
            </Text>
          </Flex>
          <Button view="flat" size="l" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
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
  onCreated,
}: {
  object: ObjectItem | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
  /** Вызывается с id созданного объекта — чтобы страница сразу его открыла. */
  onCreated?: (id: string) => void;
}) {
  const height = useDrawerHeight();
  const create = useCreateObject();
  const update = useUpdateObject();
  const removeObject = useDeleteObject();
  const dietsQuery = useDiets();
  const diets = dietOptions(dietsQuery.data?.diets ?? [], object?.groups ?? []);
  const toaster = useToaster();
  const { t } = useTranslation();
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
        departments: [emptyDepartment()],
      });
    } else if (object) {
      setForm(toForm(object));
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

    const payload = {
      name: form.name.trim(),
      type: form.type,
      groups: formToGroups(form.departments),
    };

    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: (data) => {
          toaster.add({ name: 'object-created', title: t('objects.created'), theme: 'success' });
          onCreated?.(data.id);
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'object-create',
            title: t('objects.createFailed'),
            content: errorText(e),
            theme: 'danger',
          }),
      });
      return;
    }

    if (!object) return;

    update.mutate(
      { id: object.id, body: payload },
      {
        onSuccess: () => {
          toaster.add({
            name: 'object-updated',
            title: t('objects.updated'),
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'object-edit',
            title: t('objects.saveFailed'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  if (!mounted || !form) return null;

  const ready = isObjectFormReady(form);
  const changed = object ? hasChanges(form, object) : false;

  const runDelete = (deletionMode: ObjectDeleteMode) => {
    if (!object) return;

    removeObject.mutate(
      { id: object.id, mode: deletionMode },
      {
        onSuccess: () => {
          // Режим уходит на бэкенд, но пока не различается.
          toaster.add({ name: 'object-deleted', title: t('objects.deleted'), theme: 'success' });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'object-delete',
            title: t('common.error'),
            content: errorText(e),
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
              {mode === 'create' ? t('objects.createTitle') : t('objects.editTitle')}
            </Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label={t('common.close')}>
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="kitchen-drawer__body">
          <Flex direction="column" gap={3}>
            <Flex gap={2} alignItems="flex-end">
              <TextInput
                size="l"
                label={t('objects.nameLabel')}
                placeholder={t('objects.namePlaceholder')}
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
                    { value: 'school', content: t('facility.school') },
                    { value: 'kindergarten', content: t('facility.kindergarten') },
                    { value: 'hospital', content: t('facility.hospital') },
                    { value: 'warehouse', content: t('facility.warehouse') },
                  ]}
                  onUpdate={(newValue) => {
                    const nextType = newValue[0] as FacilityType;
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            type: nextType,
                            // У склада нет групп и отделений.
                            departments: nextType === 'warehouse' ? [] : current.departments,
                          }
                        : current
                    );
                  }}
                />
              </Flex>
            </Flex>

            {form.type !== 'warehouse' && (
              <>
                {form.departments.map((department, departmentIndex) => (
                  <DepartmentBlock
                    key={department.key}
                    variant="object"
                    facilityType={form.type}
                    department={department}
                    diets={diets}
                    dietsLoaded={dietsQuery.data !== undefined}
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
                  {t('objects.addGroupDept')}
                </Button>
              </>
            )}
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
                {t('common.delete')}
              </Button>
            )}
            <Flex gap={2}>
              <Button view="outlined" size="l" onClick={requestClose}>
                {t('common.cancel')}
              </Button>
              <Button
                view="action"
                size="l"
                loading={mode === 'create' ? create.isPending : update.isPending}
                disabled={!ready || (mode === 'edit' && !changed)}
                onClick={submit}
              >
                <Icon data={mode === 'create' ? Plus : FloppyDisk} size={16} />
                {mode === 'create' ? t('common.create') : t('common.save')}
              </Button>
            </Flex>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmingDelete}
        title={t('objects.deleteTitle', { name: object?.name ?? '' })}
        description={t('objects.deleteDescription')}
        afterPeriodHint={t('objects.deleteAfterPeriodHint')}
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
  parent,
  subObject,
  onClose,
}: {
  /** Объект, которому принадлежит подобъект; null — окно закрыто. */
  parent: ObjectItem | null;
  subObject: ObjectItem | null;
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const createSubObject = useCreateObject();
  const update = useUpdateObject();
  const deleteSubObject = useDeleteObject();
  const dietsQuery = useDiets();
  const diets = dietOptions(dietsQuery.data?.diets ?? [], subObject?.groups ?? []);
  const toaster = useToaster();
  const { t } = useTranslation();
  const [form, setForm] = useState<SubObjectForm | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isCreate = subObject === null;
  const subtitle = subObject
    ? t('objects.subSubtitle', { name: subObject.name })
    : t('objects.subNewSubtitle');

  useEffect(() => {
    if (!parent) {
      setVisible(false);
      return;
    }
    // Подобъект всегда наследует тип родительского объекта: выбрать нельзя.
    setForm(
      subObject
        ? { ...toForm(subObject), type: parent.type }
        : { ...emptySubObject(), type: parent.type }
    );
    setConfirmingDelete(false);
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [parent, subObject]);

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
    if (!form || !parent || !isSubObjectFormReady(form)) return;
    createSubObject.mutate(
      {
        parentObjectId: parent.id,
        name: form.name.trim(),
        type: form.type,
        groups: formToGroups(form.departments),
      },
      {
        onSuccess: () => {
          toaster.add({
            name: 'subobject-created',
            title: t('objects.subCreated'),
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'subobject-create',
            title: t('objects.subCreateFailed'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  const submitEdit = () => {
    if (!form || !subObject || !isSubObjectFormReady(form)) return;

    update.mutate(
      {
        id: subObject.id,
        body: { name: form.name.trim(), type: form.type, groups: formToGroups(form.departments) },
      },
      {
        onSuccess: () => {
          toaster.add({
            name: 'subobject-updated',
            title: t('objects.subUpdated'),
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'subobject-edit',
            title: t('objects.saveFailed'),
            content: errorText(e),
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
          // Режим уходит на бэкенд, но пока не различается.
          toaster.add({
            name: 'subobject-deleted',
            title: t('objects.subDeleted'),
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'subobject-delete',
            title: t('common.error'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  if (!mounted || !form || !parent) return null;

  const ready = isSubObjectFormReady(form);
  const changed = subObject ? hasChanges(form, subObject) : false;

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
            <Text variant="subheader-3">{isCreate ? t('objects.subCreateTitle') : subtitle}</Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label={t('common.close')}>
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="kitchen-drawer__body">
          <SubObjectBlock
            subObject={form}
            subObjectIndex={0}
            diets={diets}
            dietsLoaded={dietsQuery.data !== undefined}
            onUpdate={updateSubObject}
            onRemove={removeDepartment}
            canRemove={!isCreate}
          />
        </div>

        <div className="kitchen-drawer__footer">
          <div
            className="kitchen-drawer__footer-inner"
            style={{ justifyContent: isCreate ? 'flex-end' : 'space-between' }}
          >
            {!isCreate && (
              <Button view="outlined-danger" size="l" onClick={() => setConfirmingDelete(true)}>
                <Icon data={TrashBin} size={16} />
                {t('common.delete')}
              </Button>
            )}
            <Flex gap={2}>
              <Button view="outlined" size="l" onClick={requestClose}>
                {t('common.cancel')}
              </Button>
              <Button
                view="action"
                size="l"
                loading={isCreate ? createSubObject.isPending : update.isPending}
                disabled={!ready || (!isCreate && !changed)}
                onClick={isCreate ? create : submitEdit}
              >
                <Icon data={isCreate ? Plus : FloppyDisk} size={16} />
                {isCreate ? t('common.add') : t('common.save')}
              </Button>
            </Flex>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmingDelete}
        title={subObject ? t('objects.subDeleteTitle', { name: subObject.name }) : ''}
        description={t('objects.subDeleteDescription')}
        afterPeriodHint={t('objects.subDeleteAfterPeriodHint')}
        onAfterPeriod={() => runDelete('soft')}
        onImmediate={() => runDelete('immediate')}
        onCancel={() => setConfirmingDelete(false)}
        pending={deleteSubObject.isPending}
      />
    </Drawer>
  );
}
