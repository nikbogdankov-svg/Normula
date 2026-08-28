import { useMemo, useState } from 'react';
import { Button, Card, Flex, Icon, Select, Table, Text } from '@gravity-ui/uikit';
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
import { type Facility, type KitchenUnit } from './types';
import './objects-route.css';

function groupRowClassNames(row: {
  isLastInDepartment: boolean;
  isLastInFacility: boolean;
  nextShowDepartment: boolean;
  nextShowFacility: boolean;
}): string[] {
  const classes: string[] = [];
  // Внутри одного отделения — без линий.
  if (!row.isLastInDepartment) classes.push('objects-group-row_no-divider');
  // Последняя строка отделения, следующее — в том же ЛПУ → линия от «Отделение».
  if (row.isLastInDepartment && row.nextShowDepartment && !row.nextShowFacility) {
    classes.push('objects-group-row_department-divider');
  }
  // Последняя строка ЛПУ → полная линия (все колонки).
  if (row.isLastInFacility) {
    classes.push('objects-group-row_facility-divider');
  }
  return classes;
}

/**
 * «Объекты»: справочник пищеблок → ЛПУ → отделения → столы.
 * Численность на дату — в «Порционнике».
 */
export function ObjectsRoute() {
  const { current } = useOrganizations();
  const kitchen = useKitchen();
  const [selectedKitchenId, setSelectedKitchenId] = useState<string | null>(null);

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

  const kitchens = kitchen.data.kitchens;
  const activeKitchenId = selectedKitchenId ?? kitchens[0]?.id ?? null;
  const facilities = activeKitchenId
    ? kitchens.find((k) => k.id === activeKitchenId)?.facilities ?? []
    : kitchens.flatMap((k) => k.facilities);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <FacilitiesCard
        kitchens={kitchens}
        facilities={facilities}
        selectedKitchenId={activeKitchenId}
        onSelectKitchen={setSelectedKitchenId}
      />
    </Flex>
  );
}

function FacilitiesCard({
  kitchens,
  facilities,
  selectedKitchenId,
  onSelectKitchen,
}: {
  kitchens: KitchenUnit[];
  facilities: Facility[];
  selectedKitchenId: string | null;
  onSelectKitchen: (id: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedKitchen = kitchens.find((k) => k.id === selectedKitchenId) ?? kitchens[0] ?? null;

  const rows = useMemo(() => {
    const result: Array<{
      id: string;
      facilityId: string;
      facilityName: string;
      departmentId: string;
      departmentName: string;
      tableName: string;
      showFacility: boolean;
      showDepartment: boolean;
      isLastInDepartment: boolean;
      isLastInFacility: boolean;
      nextShowDepartment: boolean;
      nextShowFacility: boolean;
    }> = [];
    for (const facility of facilities) {
      for (const department of facility.departments) {
        for (const table of department.tables) {
          const prevRow = result[result.length - 1];
          const showFacility = !prevRow || prevRow.facilityId !== facility.id;
          const showDepartment =
            showFacility || !prevRow || prevRow.departmentId !== department.id;
          result.push({
            id: table.id,
            facilityId: facility.id,
            facilityName: facility.name,
            departmentId: department.id,
            departmentName: department.name,
            tableName: table.name,
            showFacility,
            showDepartment,
            isLastInDepartment: false,
            isLastInFacility: false,
            nextShowDepartment: false,
            nextShowFacility: false,
          });
        }
      }
    }
    // Mark last rows and propagate next-flags.
    for (let i = result.length - 1; i >= 0; i--) {
      const row = result[i];
      const next = result[i + 1];
      row.isLastInDepartment = !next || next.departmentId !== row.departmentId;
      row.isLastInFacility = !next || next.facilityId !== row.facilityId;
      row.nextShowDepartment = next?.showDepartment ?? false;
      row.nextShowFacility = next?.showFacility ?? false;
    }
    return result;
  }, [facilities]);

  return (
    <>
      <Flex alignItems="center" justifyContent="space-between" gap={2}>
        {kitchens.length > 0 && (
          <Select
            size="l"
            width={360}
            label="Пищеблок:"
            value={selectedKitchenId ? [selectedKitchenId] : []}
            onUpdate={(value) => onSelectKitchen(value[0] ?? null)}
            placeholder="Все пищеблоки"
            options={kitchens.map((unit) => ({
              value: unit.id,
              content: unit.name,
            }))}
          />
        )}
        <Button
          view="normal-contrast"
          size="l"
          onClick={() => setCreating(true)}
        >
          <Icon data={Plus} size={16} />
          Добавить пищеблок
        </Button>
      </Flex>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex alignItems="center" justifyContent="space-between" gap={2} style={{ padding: '12px 16px' }}>
          <Flex alignItems="center" gap={2}>
            <Icon data={House} size={16} />
            <Text variant="subheader-2">Пищеблок</Text>
          </Flex>
          {kitchens.length > 0 && (
            <Button
              view="normal"
              size="m"
              disabled={selectedKitchen === null}
              onClick={() => setEditing(true)}
            >
              <Icon data={Pencil} size={16} />
              Редактировать
            </Button>
          )}
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
        ) : rows.length === 0 ? (
          <EmptyState text="В этом пищеблоке нет отделений" />
        ) : (
          <div className="admin-table-wrap">
            <Table
              width="max"
              className="admin-table objects-group-table objects-facility-tables"
              data={rows}
              getRowClassNames={(row) =>
                groupRowClassNames({
                  isLastInDepartment: row.isLastInDepartment,
                  isLastInFacility: row.isLastInFacility,
                  nextShowDepartment: row.nextShowDepartment,
                  nextShowFacility: row.nextShowFacility,
                })
              }
              columns={[
                {
                  id: 'facilityName',
                  name: 'ЛПУ',
                  width: '35%',
                  template: (row) => (row.showFacility ? row.facilityName : null),
                  placeholder: () => null,
                },
                {
                  id: 'departmentName',
                  name: 'Отделение',
                  width: '35%',
                  template: (row) => (row.showDepartment ? row.departmentName : null),
                  placeholder: () => null,
                },
                {
                  id: 'tableName',
                  name: 'Стол',
                  width: '30%',
                },
              ]}
            />
          </div>
        )}
      </div>

    </Card>

      <EditFacilityDialog
        kitchen={editing ? selectedKitchen : null}
        mode={creating ? 'create' : 'edit'}
        onClose={() => { setEditing(false); setCreating(false); }}
      />
    </>
  );
}
