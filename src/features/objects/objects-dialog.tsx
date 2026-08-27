import { useEffect, useState } from 'react';
import { Button, Drawer, Icon, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Check, FloppyDisk, Plus, TrashBin, Xmark } from '@gravity-ui/icons';
import { useCreateKitchen, useUpdateFacility } from './api';
import type { Facility, KitchenUnit, UpdateFacilityRequest } from './types';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './kitchen-drawer.css';

const TABLE_TYPES = [
  { id: 'main', label: 'Основной', storageName: 'Основная' },
  { id: 'gentle', label: 'Щадящий', storageName: 'Щадящая' },
  { id: 'diet', label: 'Диетический', storageName: 'Диабетическая' },
] as const;

type TableTypeId = (typeof TABLE_TYPES)[number]['id'];

type DepartmentForm = {
  id: string;
  name: string;
  selectedTypes: TableTypeId[];
  tableIds: Partial<Record<TableTypeId, string>>;
};

type FacilityForm = {
  id: string;
  name: string;
  departments: DepartmentForm[];
};

type KitchenForm = {
  name: string;
  facilities: FacilityForm[];
};

function tableNameToTypeId(name: string): TableTypeId | null {
  const normalized = name.toLowerCase();
  if (normalized.includes('основ')) return 'main';
  if (normalized.includes('щад')) return 'gentle';
  if (normalized.includes('диет')) return 'diet';
  return null;
}

const emptyDepartment = (): DepartmentForm => ({
  id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  selectedTypes: ['main'],
  tableIds: {},
});

const emptyFacility = (): FacilityForm => ({
  id: `fac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  departments: [emptyDepartment()],
});

function facilityToForm(facility: Facility): FacilityForm {
  return {
    id: facility.id,
    name: facility.name,
    departments: facility.departments.map((department) => {
      const tableIds: Partial<Record<TableTypeId, string>> = {};
      const selectedTypes: TableTypeId[] = [];

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
    }),
  };
}

function kitchenToForm(kitchen: KitchenUnit): KitchenForm {
  return {
    name: kitchen.name,
    facilities: kitchen.facilities.map(facilityToForm),
  };
}

function facilityFormToPatch(form: FacilityForm, original: Facility): UpdateFacilityRequest {
  return {
    name: form.name.trim(),
    address: original.address,
    kettleNumber: original.kettleNumber,
    departments: form.departments.map((department) => ({
      id: department.id,
      name: department.name.trim(),
      tables: department.selectedTypes.map((typeId) => {
        const type = TABLE_TYPES.find((item) => item.id === typeId)!;
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

function isFormReady(form: KitchenForm): boolean {
  if (!form.name.trim()) return false;
  if (form.facilities.length === 0) return false;
  return form.facilities.every(
    (facility) =>
      facility.name.trim() !== '' &&
      facility.departments.length > 0 &&
      facility.departments.every(
        (department) => department.name.trim() !== '' && department.selectedTypes.length > 0
      )
  );
}

function hasChanges(form: KitchenForm, original: KitchenUnit): boolean {
  if (form.name.trim() !== original.name) return true;
  if (form.facilities.length !== original.facilities.length) return true;

  for (let i = 0; i < form.facilities.length; i++) {
    const facForm = form.facilities[i];
    const facOrig = original.facilities.find((f) => f.id === facForm.id);
    if (!facOrig) return true;
    if (facForm.name.trim() !== facOrig.name) return true;
    if (facForm.departments.length !== facOrig.departments.length) return true;

    for (let j = 0; j < facForm.departments.length; j++) {
      const deptForm = facForm.departments[j];
      const deptOrig = facOrig.departments.find((d) => d.id === deptForm.id);
      if (!deptOrig) return true;
      if (deptForm.name.trim() !== deptOrig.name) return true;
      if (deptForm.selectedTypes.length !== deptOrig.tables.length) return true;
    }
  }

  return false;
}

function TableTypeChip({
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
      className={`objects-table-chip${selected ? ' objects-table-chip_selected' : ''}`}
      onClick={onClick}
    >
      {selected && <Icon data={Check} size={14} />}
      {label}
    </button>
  );
}

function FacilityBlock({
  facility,
  facilityIndex,
  onUpdate,
  onRemove,
  canRemove,
}: {
  facility: FacilityForm;
  facilityIndex: number;
  onUpdate: (index: number, patch: Partial<FacilityForm>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const updateDepartment = (deptIndex: number, patch: Partial<DepartmentForm>) => {
    onUpdate(facilityIndex, {
      departments: facility.departments.map((d, i) => (i === deptIndex ? { ...d, ...patch } : d)),
    });
  };

  const toggleTableType = (deptIndex: number, typeId: TableTypeId) => {
    const department = facility.departments[deptIndex];
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

  return (
    <Flex direction="column" gap={2} className="kitchen-drawer__facility-block">
      <Flex gap={2} alignItems="flex-end">
        <TextInput
          size="l"
          label="Название ЛПУ:"
          placeholder="Больница №1"
          value={facility.name}
          onUpdate={(value) => onUpdate(facilityIndex, { name: value })}
          style={{ flex: 1 }}
        />
        {canRemove && (
          <Button
            view="flat"
            size="l"
            title="Удалить ЛПУ"
            aria-label="Удалить ЛПУ"
            onClick={() => onRemove(facilityIndex)}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        )}
      </Flex>

      {facility.departments.map((department, deptIndex) => (
        <Flex
          key={department.id}
          direction="column"
          gap={2}
          className="kitchen-drawer__department"
        >
          <Flex gap={2} alignItems="flex-end">
            <TextInput
              size="l"
              label="Отделение:"
              placeholder="Терапия"
              value={department.name}
              onUpdate={(value) => updateDepartment(deptIndex, { name: value })}
              style={{ flex: 1 }}
            />
            {facility.departments.length > 1 && (
              <Button
                view="flat"
                size="l"
                title="Удалить отделение"
                aria-label="Удалить отделение"
                onClick={() =>
                  onUpdate(facilityIndex, {
                    departments: facility.departments.filter((_, i) => i !== deptIndex),
                  })
                }
              >
                <Icon data={TrashBin} size={18} />
              </Button>
            )}
          </Flex>

          <Text variant="body-1" className="kitchen-drawer__table-hint">
            Стол (должен быть выбран хотя бы один)
          </Text>

          <Flex gap={2} wrap>
            {TABLE_TYPES.map((type) => (
              <TableTypeChip
                key={type.id}
                label={type.label}
                selected={department.selectedTypes.includes(type.id)}
                onClick={() => toggleTableType(deptIndex, type.id)}
              />
            ))}
          </Flex>
        </Flex>
      ))}

      <Button
        view="flat"
        size="m"
        onClick={() =>
          onUpdate(facilityIndex, {
            departments: [...facility.departments, emptyDepartment()],
          })
        }
        style={{ alignSelf: 'flex-start' }}
      >
        <Icon data={Plus} size={16} />
        Добавить отделение
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

/** Редактирование / создание пищеблока в нижнем drawer. */
export function EditFacilityDialog({
  kitchen,
  mode = 'edit',
  onClose,
}: {
  kitchen: KitchenUnit | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const update = useUpdateFacility();
  const create = useCreateKitchen();
  const toaster = useToaster();
  const [form, setForm] = useState<KitchenForm | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && !kitchen) {
      setVisible(false);
      return;
    }
    if (mode === 'create') {
      setForm({ name: '', facilities: [emptyFacility()] });
    } else if (kitchen) {
      setForm(kitchenToForm(kitchen));
    }
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [kitchen, mode]);

  useEffect(() => {
    if (visible || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const updateFacility = (index: number, patch: Partial<FacilityForm>) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        facilities: current.facilities.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      };
    });
  };

  const removeFacility = (index: number) => {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        facilities: current.facilities.filter((_, i) => i !== index),
      };
    });
  };

  const submit = () => {
    if (!form || !isFormReady(form)) return;

    if (mode === 'create') {
      create.mutate(form.name, {
        onSuccess: () => {
          toaster.add({ name: 'kitchen-created', title: 'Пищеблок создан', theme: 'success' });
          requestClose();
        },
        onError: (e) =>
          toaster.add({ name: 'kitchen-create', title: 'Не удалось создать', content: e.message, theme: 'danger' }),
      });
      return;
    }

    if (!kitchen) return;

    const facilityUpdates = form.facilities.map((facilityForm) => {
      const original = kitchen.facilities.find((f) => f.id === facilityForm.id);
      if (!original) return Promise.resolve();
      return update.mutateAsync({
        id: original.id,
        patch: facilityFormToPatch(facilityForm, original),
      });
    });

    Promise.all(facilityUpdates)
      .then(() => {
        toaster.add({
          name: 'kitchen-updated',
          title: 'Пищеблок обновлён',
          theme: 'success',
        });
        requestClose();
      })
      .catch((e: Error) =>
        toaster.add({
          name: 'kitchen-edit',
          title: 'Не удалось сохранить',
          content: e.message,
          theme: 'danger',
        }),
      );
  };

  if (!mounted || !form) return null;

  const ready = isFormReady(form);
  const changed = kitchen ? hasChanges(form, kitchen) : false;

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
              {mode === 'create' ? 'Создать пищеблок' : 'Редактирование пищеблока'}
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
              label="Название пищеблока:"
              placeholder="Центральный пищеблок"
              value={form.name}
              onUpdate={(value) =>
                setForm((current) => (current ? { ...current, name: value } : current))
              }
              autoFocus
            />

            {form.facilities.map((facility, facilityIndex) => (
              <FacilityBlock
                key={facility.id}
                facility={facility}
                facilityIndex={facilityIndex}
                onUpdate={updateFacility}
                onRemove={removeFacility}
                canRemove={form.facilities.length > 1}
              />
            ))}

            <Button
              view="normal-contrast"
              size="l"
              onClick={() =>
                setForm((current) =>
                  current
                    ? { ...current, facilities: [...current.facilities, emptyFacility()] }
                    : current
                )
              }
              style={{ alignSelf: 'flex-start' }}
            >
              <Icon data={Plus} size={16} />
              Добавить ЛПУ
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
