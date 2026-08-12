import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Icon, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Check, Pencil, Plus, TrashBin } from '@gravity-ui/icons';
import { useUpdateFacility } from './api';
import type { Facility, UpdateFacilityRequest } from './types';
import './objects-dialog.css';

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
  name: string;
  departments: DepartmentForm[];
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

function facilityToForm(facility: Facility): FacilityForm {
  return {
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

function formToPatch(form: FacilityForm, facility: Facility): UpdateFacilityRequest {
  return {
    name: form.name.trim(),
    address: facility.address,
    kettleNumber: facility.kettleNumber,
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

function isFormReady(form: FacilityForm): boolean {
  if (!form.name.trim()) return false;
  if (form.departments.length === 0) return false;
  return form.departments.every(
    (department) => department.name.trim() !== '' && department.selectedTypes.length > 0
  );
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

/** Редактирование ЛПУ по макету: название, отделения и выбор столов. */
export function EditFacilityDialog({
  facility,
  onClose,
}: {
  facility: Facility | null;
  onClose: () => void;
}) {
  const update = useUpdateFacility();
  const toaster = useToaster();
  const [form, setForm] = useState<FacilityForm | null>(null);

  useEffect(() => {
    if (!facility) {
      setForm(null);
      return;
    }
    setForm(facilityToForm(facility));
  }, [facility]);

  if (!facility || !form) return null;

  const updateDepartment = (index: number, patch: Partial<DepartmentForm>) => {
    setForm((value) => {
      if (!value) return value;
      return {
        ...value,
        departments: value.departments.map((department, i) =>
          i === index ? { ...department, ...patch } : department
        ),
      };
    });
  };

  const toggleTableType = (departmentIndex: number, typeId: TableTypeId) => {
    const department = form.departments[departmentIndex];
    const selected = department.selectedTypes.includes(typeId);

    if (selected) {
      if (department.selectedTypes.length <= 1) return;
      updateDepartment(departmentIndex, {
        selectedTypes: department.selectedTypes.filter((item) => item !== typeId),
      });
      return;
    }

    updateDepartment(departmentIndex, {
      selectedTypes: [...department.selectedTypes, typeId],
    });
  };

  const close = () => {
    setForm(null);
    onClose();
  };

  const submit = () => {
    if (!isFormReady(form)) return;

    update.mutate(
      {
        id: facility.id,
        patch: formToPatch(form, facility),
      },
      {
        onSuccess: () => {
          toaster.add({
            name: 'facility-updated',
            title: 'ЛПУ обновлено',
            theme: 'success',
          });
          close();
        },
        onError: (e) =>
          toaster.add({
            name: 'facility-edit',
            title: 'Не удалось сохранить',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Dialog open onClose={close} size="m">
      <Dialog.Header caption="Редактирование организацию" />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <TextInput
            size="l"
            label="Название:"
            placeholder="Больница №1"
            value={form.name}
            onUpdate={(value) =>
              setForm((current) => (current ? { ...current, name: value } : current))
            }
            autoFocus
          />

          {form.departments.map((department, departmentIndex) => (
            <Flex
              key={department.id}
              direction="column"
              gap={2}
              className="objects-facility-dialog__department"
            >
              <Flex gap={2} alignItems="flex-end">
                <TextInput
                  size="l"
                  label="Отделение:"
                  placeholder="Терапия"
                  value={department.name}
                  onUpdate={(value) => updateDepartment(departmentIndex, { name: value })}
                  style={{ flex: 1 }}
                />
                {form.departments.length > 1 && (
                  <Button
                    view="flat"
                    size="l"
                    title="Удалить отделение"
                    aria-label="Удалить отделение"
                    onClick={() =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              departments: current.departments.filter(
                                (_, index) => index !== departmentIndex
                              ),
                            }
                          : current
                      )
                    }
                  >
                    <Icon data={TrashBin} size={18} />
                  </Button>
                )}
              </Flex>

              <Text variant="body-1" className="objects-facility-dialog__table-hint">
                Стол (должен быть выбран хотя бы один)
              </Text>

              <Flex gap={2} wrap>
                {TABLE_TYPES.map((type) => (
                  <TableTypeChip
                    key={type.id}
                    label={type.label}
                    selected={department.selectedTypes.includes(type.id)}
                    onClick={() => toggleTableType(departmentIndex, type.id)}
                  />
                ))}
              </Flex>
            </Flex>
          ))}

          <Button
            view="normal"
            size="m"
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
            Добавить отделение
          </Button>
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="flat" size="l" onClick={close}>
            Отмена
          </Button>
          <Button
            view="action"
            size="l"
            loading={update.isPending}
            disabled={!isFormReady(form)}
            onClick={submit}
          >
            <Icon data={Pencil} size={16} />
            Изменить
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
