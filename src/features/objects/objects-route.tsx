import { useMemo, useState } from 'react';
import { Button, Card, Flex, Icon, Select, Table, Text, useToaster } from '@gravity-ui/uikit';
import { House, Pencil, Plus } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useKitchen } from './api';
import { EditFacilityDialog } from './objects-dialog';
import { formatKettle, type Facility } from './types';
import './objects-route.css';

function groupRowClassNames(opts: { isLastInGroup: boolean; isContinuation: boolean }): string[] {
  const classes: string[] = [];
  if (!opts.isLastInGroup) classes.push('objects-group-row_no-divider');
  if (opts.isContinuation) classes.push('objects-group-row_continuation');
  return classes;
}

/**
 * «Объекты»: справочник пищеблок → ЛПУ → отделения → столы / котлы (ОБЪЕКТ-01…03).
 * Численность на дату — в «Порционнике».
 */
export function ObjectsRoute() {
  const { current } = useOrganizations();
  const kitchen = useKitchen();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (kitchen.isPending) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <LoadingState />
      </Flex>
    );
  }

  if (kitchen.isError || !kitchen.data) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <ErrorState error={kitchen.error} onRetry={() => void kitchen.refetch()} />
      </Flex>
    );
  }

  const facilities = kitchen.data.kitchen.facilities;
  const selected =
    facilities.find((facility) => facility.id === selectedId) ?? facilities[0] ?? null;

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <FacilitiesCard
        facilities={facilities}
        selected={selected}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
      />
    </Flex>
  );
}

function FacilitiesCard({
  facilities,
  selected,
  selectedId,
  onSelect,
}: {
  facilities: Facility[];
  selected: Facility | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const toaster = useToaster();
  const [editing, setEditing] = useState<Facility | null>(null);
  const kettle = selected ? formatKettle(selected.kettleNumber) : '';

  const rows = useMemo(() => {
    if (!selected) return [];
    const flat = selected.departments.flatMap((department) =>
      department.tables.map((table) => ({
        id: table.id,
        departmentId: department.id,
        departmentName: department.name,
        tableName: table.name,
      }))
    );
    return flat.map((row, index) => ({
      ...row,
      showDepartment: index === 0 || flat[index - 1].departmentId !== row.departmentId,
      isLastInDepartment:
        index === flat.length - 1 || flat[index + 1].departmentId !== row.departmentId,
    }));
  }, [selected]);

  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        gap={4}
        style={{ padding: '12px 16px' }}
      >
        <Flex alignItems="center" gap={2}>
          <Icon data={House} size={16} />
          <Text variant="subheader-2">ЛПУ</Text>
        </Flex>
        <Flex alignItems="center" gap={2}>
          {facilities.length > 0 && (
            <Select
              size="m"
              width={260}
              label="Организация:"
              value={selectedId ? [selectedId] : []}
              onUpdate={(value) => onSelect(value[0] ?? '')}
              placeholder="Выберите ЛПУ"
              options={facilities.map((facility) => ({
                value: facility.id,
                content: facility.name,
              }))}
            />
          )}
          <Button
            view="normal"
            onClick={() =>
              toaster.add({
                name: 'objects-add-facility',
                title: 'Добавление организации',
                content: 'Скоро будет доступно',
                theme: 'info',
              })
            }
          >
            <Icon data={Plus} size={16} />
            Добавить организацию
          </Button>
        </Flex>
      </Flex>

      <div
        style={{
          borderTop: '1px solid var(--g-color-line-generic)',
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        {facilities.length === 0 ? (
          <EmptyState text="ЛПУ пока не добавлены" />
        ) : !selected || rows.length === 0 ? (
          <EmptyState text="В этом ЛПУ нет отделений" />
        ) : (
          <div className="admin-table-wrap">
            <Table
              width="max"
              className="admin-table objects-group-table objects-facility-tables"
              data={rows}
              getRowClassNames={(row) =>
                groupRowClassNames({
                  isLastInGroup: row.isLastInDepartment,
                  isContinuation: !row.showDepartment,
                })
              }
              columns={[
                {
                  id: 'departmentName',
                  name: 'Отделение',
                  width: '40%',
                  template: (row) => (row.showDepartment ? row.departmentName : null),
                  placeholder: () => null,
                },
                {
                  id: 'tableName',
                  name: 'Стол',
                  width: '35%',
                },
                {
                  id: 'kettle',
                  name: 'Котел',
                  width: '25%',
                  align: 'end',
                  template: () => kettle,
                },
              ]}
            />
          </div>
        )}
      </div>

      {selected && (
        <>
          <div style={{ borderTop: '1px solid var(--g-color-line-generic)' }} />
          <Flex justifyContent="flex-end" style={{ padding: '12px 16px' }}>
            <Button
              view="normal"
              onClick={() => setEditing(selected)}
              title="Редактировать организацию"
            >
              <Icon data={Pencil} size={16} />
              Редактировать организацию
            </Button>
          </Flex>
        </>
      )}

      <EditFacilityDialog facility={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}
