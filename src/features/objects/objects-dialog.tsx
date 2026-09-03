import { useEffect, useState } from 'react';
import { Button, Drawer, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Check, FloppyDisk, Plus, TrashBin, Xmark } from '@gravity-ui/icons';
import { useCreateKitchen, useUpdateFacility } from './api';
import {
  DIET_CATALOG,
  type DietTypeId,
  type Facility,
  type FacilityType,
  type KitchenUnit,
  type UpdateFacilityRequest,
} from './types';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './kitchen-drawer.css';

type DepartmentForm = {
  id: string;
  name: string;
  selectedTypes: DietTypeId[];
  tableIds: Partial<Record<DietTypeId, string>>;
};

type FacilityForm = {
  id: string;
  type: FacilityType;
  name: string;
  departments: DepartmentForm[];
};

type KitchenForm = {
  name: string;
  facilities: FacilityForm[];
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

const emptyFacility = (): FacilityForm => ({
  id: `fac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'school',
  name: '',
  departments: [emptyDepartment()],
});

function facilityToForm(facility: Facility): FacilityForm {
  return {
    id: facility.id,
    type: facility.type,
    name: facility.name,
    departments: facility.departments.map((department) => {
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
    type: form.type,
    kettleNumber: original.kettleNumber,
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
    if (facForm.type !== facOrig.type) return true;
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

  const toggleTableType = (deptIndex: number, typeId: DietTypeId) => {
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
          label="Название учреждения:"
          placeholder="Школа №1"
          value={facility.name}
          onUpdate={(value) => onUpdate(facilityIndex, { name: value })}
          style={{ flex: 1 }}
        />
        <Flex direction="column" gap={1}>
          <Select
            size="l"
            width={200}
            value={[facility.type]}
            options={[
              { value: 'school', content: 'Школа' },
              { value: 'kindergarten', content: 'Детский сад' },
              { value: 'hospital', content: 'Больница' },
            ]}
            onUpdate={(newValue) => {
              const nextType = newValue[0] as FacilityType;
              onUpdate(facilityIndex, {
                type: nextType,
                departments: facility.departments.map((department) => ({
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
            title="Удалить учреждение"
            aria-label="Удалить учреждение"
            onClick={() => onRemove(facilityIndex)}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        )}
      </Flex>

      {facility.departments.map((department, deptIndex) => (
        <Flex key={department.id} direction="column" gap={2} className="kitchen-drawer__department">
          <Flex gap={2} alignItems="flex-end">
            <TextInput
              size="l"
              label={
                facility.type === 'school'
                  ? 'Класс (параллель):'
                  : facility.type === 'kindergarten'
                    ? 'Группа:'
                    : 'Отделение:'
              }
              placeholder={
                facility.type === 'school'
                  ? '1–4 классы'
                  : facility.type === 'kindergarten'
                    ? 'Старшая группа'
                    : 'Терапия'
              }
              value={department.name}
              onUpdate={(value) => updateDepartment(deptIndex, { name: value })}
              style={{ flex: 1 }}
            />
            {facility.departments.length > 1 && (
              <Button
                view="flat"
                size="l"
                title="Удалить группу"
                aria-label="Удалить группу"
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
            Рацион (должен быть выбран хотя бы один)
          </Text>

          <Flex gap={2} wrap>
            {DIET_CATALOG.filter((item) =>
              (item.appliesTo as readonly string[]).includes(facility.type)
            ).map((type) => (
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
        {facility.type === 'school'
          ? 'Добавить класс'
          : facility.type === 'kindergarten'
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
          toaster.add({
            name: 'kitchen-create',
            title: 'Не удалось создать',
            content: e.message,
            theme: 'danger',
          }),
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
        })
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
              Добавить учреждение
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
