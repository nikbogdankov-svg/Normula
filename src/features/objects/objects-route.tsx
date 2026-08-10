import { useMemo, useState } from 'react';
import { Button, Card, Flex, Icon, Table, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Layers3Diagonal, Printer, SquareListUl } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useDistributionPreview, useKitchen, useUpdateTableHeadcount } from './api';
import { formatKettle, type Department, type Facility } from './types';
import './objects-route.css';

function groupRowClassNames(opts: { isLastInGroup: boolean; isContinuation: boolean }): string[] {
  const classes: string[] = [];
  if (!opts.isLastInGroup) classes.push('objects-group-row_no-divider');
  if (opts.isContinuation) classes.push('objects-group-row_continuation');
  return classes;
}

/**
 * «Объекты»: пищеблок → ЛПУ → отделения/столы/численность + выход на раздачу.
 * ОБЪЕКТ-01…04.
 */
export function ObjectsRoute() {
  const { current } = useOrganizations();
  const kitchen = useKitchen();
  const distribution = useDistributionPreview();
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

  const unit = kitchen.data.kitchen;
  const facilities = unit.facilities;
  const selected =
    facilities.find((facility) => facility.id === selectedId) ?? facilities[0] ?? null;

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      {facilities.length === 0 ? (
        <EmptyState text="ЛПУ пока не добавлены" />
      ) : (
        <>
          <FacilitiesBar
            facilities={facilities}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
          />
          {selected && <FacilityDetails facility={selected} />}
        </>
      )}

      <DistributionCard
        loading={distribution.isPending}
        error={distribution.isError ? distribution.error : null}
        onRetry={() => void distribution.refetch()}
        rows={distribution.data?.rows ?? []}
        totalPortions={distribution.data?.totalPortions ?? 0}
      />
    </Flex>
  );
}

function FacilitiesBar({
  facilities,
  selectedId,
  onSelect,
}: {
  facilities: Facility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="objects-facility-bar-scroll">
      <div className="objects-facility-bar" role="tablist" aria-label="ЛПУ">
        {facilities.map((facility) => {
          const people = totalHeadcount(facility);
          const active = facility.id === selectedId;
          return (
            <button
              key={facility.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={
                active
                  ? 'objects-facility-card objects-facility-card_active'
                  : 'objects-facility-card'
              }
              onClick={() => onSelect(facility.id)}
            >
              <Text variant="subheader-2">{facility.name}</Text>
              <Text variant="caption-2" color="secondary">
                {facility.departments.length} отд • {people} чел •{' '}
                {formatKettle(facility.kettleNumber)}
              </Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FacilityDetails({ facility }: { facility: Facility }) {
  const updateHeadcount = useUpdateTableHeadcount();
  const toaster = useToaster();
  const kettle = formatKettle(facility.kettleNumber);

  const rows = useMemo(() => {
    const flat = facility.departments.flatMap((department) =>
      department.tables.map((table) => ({
        id: table.id,
        departmentId: department.id,
        departmentName: department.name,
        tableName: table.name,
        headcount: table.headcount,
        isTotal: false as boolean,
      }))
    );
    const dataRows = flat.map((row, index) => ({
      ...row,
      showDepartment: index === 0 || flat[index - 1].departmentId !== row.departmentId,
      isLastInDepartment:
        index === flat.length - 1 || flat[index + 1].departmentId !== row.departmentId,
    }));
    if (dataRows.length === 0) return dataRows;
    return [
      ...dataRows,
      {
        id: '__total',
        departmentId: '__total',
        departmentName: 'Всего',
        tableName: '',
        headcount: totalHeadcount(facility),
        isTotal: true,
        showDepartment: true,
        isLastInDepartment: true,
      },
    ];
  }, [facility]);

  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex alignItems="center" gap={2} style={{ padding: '12px 16px' }}>
        <Icon data={Layers3Diagonal} size={16} />
        <Text variant="subheader-2">{facility.name}</Text>
      </Flex>

      {/* Разделитель шапки и таблицы — как в «Персонал». */}
      <div
        style={{
          borderTop: '1px solid var(--g-color-line-generic)',
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        {rows.length === 0 ? (
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
                  width: '32%',
                  template: (row) =>
                    row.isTotal ? 'Всего' : row.showDepartment ? row.departmentName : null,
                  placeholder: () => null,
                },
                {
                  id: 'tableName',
                  name: 'Стол',
                  width: '28%',
                  template: (row) => (row.isTotal ? null : row.tableName),
                  placeholder: () => null,
                },
                {
                  id: 'kettle',
                  name: 'Котел',
                  width: '20%',
                  template: (row) => (row.isTotal ? null : kettle),
                  placeholder: () => null,
                },
                {
                  id: 'headcount',
                  name: 'Человек',
                  width: '20%',
                  template: (row) =>
                    row.isTotal ? (
                      <span className="objects-total-headcount">{row.headcount}</span>
                    ) : (
                      <TextInput
                        type="number"
                        size="s"
                        value={String(row.headcount)}
                        controlProps={{ min: 0 }}
                        style={{ width: 96 }}
                        onUpdate={(value) => {
                          const headcount = Math.max(0, Number(value) || 0);
                          updateHeadcount.mutate(
                            {
                              facilityId: facility.id,
                              departmentId: row.departmentId,
                              tableId: row.id,
                              headcount,
                            },
                            {
                              onError: (e) =>
                                toaster.add({
                                  name: 'objects-headcount',
                                  title: 'Не удалось сохранить',
                                  content: e.message,
                                  theme: 'danger',
                                }),
                            }
                          );
                        }}
                      />
                    ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function DistributionCard({
  loading,
  error,
  onRetry,
  rows,
  totalPortions,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  rows: {
    dishName: string;
    facilityName: string;
    departmentName: string;
    tableName: string;
    kettleLabel: string;
    portions: number;
  }[];
  totalPortions: number;
}) {
  const tableRows = useMemo(() => {
    type DistRow = (typeof rows)[number] & {
      id: string;
      isDishTotal: boolean;
      isGrandTotal: boolean;
      showDish: boolean;
      showFacility: boolean;
      showDepartment: boolean;
      isLastInDish: boolean;
      isLastInFacility: boolean;
      isLastInDepartment: boolean;
    };

    const result: DistRow[] = [];
    let index = 0;
    while (index < rows.length) {
      const dishName = rows[index].dishName;
      const dishStart = index;
      while (index < rows.length && rows[index].dishName === dishName) index += 1;
      const dishEnd = index;
      const dishRows = rows.slice(dishStart, dishEnd);
      let dishPortions = 0;

      for (let i = 0; i < dishRows.length; i += 1) {
        const row = dishRows[i];
        const prev = i > 0 ? dishRows[i - 1] : null;
        const next = i < dishRows.length - 1 ? dishRows[i + 1] : null;
        const sameFacilityAsPrev = prev !== null && prev.facilityName === row.facilityName;
        const sameDepartmentAsPrev =
          sameFacilityAsPrev && prev !== null && prev.departmentName === row.departmentName;
        const sameFacilityAsNext = next !== null && next.facilityName === row.facilityName;
        const sameDepartmentAsNext =
          sameFacilityAsNext && next !== null && next.departmentName === row.departmentName;
        dishPortions += row.portions;
        result.push({
          ...row,
          id: String(dishStart + i),
          isDishTotal: false,
          isGrandTotal: false,
          showDish: i === 0,
          showFacility: !sameFacilityAsPrev,
          showDepartment: !sameDepartmentAsPrev,
          isLastInDish: next === null,
          isLastInFacility: !sameFacilityAsNext,
          isLastInDepartment: !sameDepartmentAsNext,
        });
      }

      result.push({
        id: `__dish-total-${dishName}`,
        dishName,
        facilityName: '',
        departmentName: '',
        tableName: '',
        kettleLabel: '',
        portions: dishPortions,
        isDishTotal: true,
        isGrandTotal: false,
        showDish: true,
        showFacility: false,
        showDepartment: false,
        isLastInDish: true,
        isLastInFacility: true,
        isLastInDepartment: true,
      });
    }

    if (result.length > 0) {
      result.push({
        id: '__grand-total',
        dishName: 'Общее количество всех блюд',
        facilityName: '',
        departmentName: '',
        tableName: '',
        kettleLabel: '',
        portions: totalPortions,
        isDishTotal: false,
        isGrandTotal: true,
        showDish: true,
        showFacility: false,
        showDepartment: false,
        isLastInDish: true,
        isLastInFacility: true,
        isLastInDepartment: true,
      });
    }

    return result;
  }, [rows, totalPortions]);

  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        wrap
        style={{ padding: '12px 16px' }}
      >
        <Flex alignItems="center" gap={2}>
          <Icon data={SquareListUl} size={16} />
          <Text variant="subheader-2">Выход на раздачу</Text>
        </Flex>
        <Button view="normal" onClick={() => window.print()} title="Печать">
          <Icon data={Printer} size={16} />
        </Button>
      </Flex>
      <div
        style={{
          borderTop: '1px solid var(--g-color-line-generic)',
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        {loading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={onRetry} />}
        {!loading && !error && rows.length === 0 && (
          <EmptyState text="Нет данных для раздачи — заполните меню и численность" />
        )}
        {!loading && !error && tableRows.length > 0 && (
          <div className="admin-table-wrap">
            <Table
              width="max"
              className="admin-table objects-group-table"
              data={tableRows}
              getRowClassNames={(row) => {
                const classes: string[] = [];
                if (row.isDishTotal || row.isGrandTotal) return classes;
                if (!row.isLastInDepartment) {
                  classes.push('objects-group-row_no-divider');
                  if (!row.showDepartment) classes.push('objects-group-row_continuation');
                } else if (!row.isLastInFacility) {
                  // Между отделениями внутри ЛПУ — линия со столбца «Отделение».
                  classes.push('objects-group-row_department-divider');
                } else if (!row.isLastInDish) {
                  // Между ЛПУ внутри блюда — линия со столбца «ЛПУ».
                  classes.push('objects-group-row_facility-divider');
                } else {
                  // Перед «Всего» по блюду — без линии.
                  classes.push('objects-group-row_no-divider');
                }
                return classes;
              }}
              columns={[
                {
                  id: 'dishName',
                  name: 'Блюдо',
                  template: (row) => {
                    if (row.isGrandTotal) {
                      return (
                        <Text variant="body-1" style={{ fontWeight: 600 }}>
                          {row.dishName}
                        </Text>
                      );
                    }
                    if (row.isDishTotal) return 'Всего';
                    if (!row.showDish) return null;
                    return (
                      <Text variant="body-1" style={{ fontWeight: 600 }}>
                        {row.dishName}
                      </Text>
                    );
                  },
                  placeholder: () => null,
                },
                {
                  id: 'facilityName',
                  name: 'ЛПУ',
                  template: (row) =>
                    row.isDishTotal || row.isGrandTotal ? null : row.showFacility ? (
                      <Text variant="body-1" style={{ fontWeight: 600 }}>
                        {row.facilityName}
                      </Text>
                    ) : null,
                  placeholder: () => null,
                },
                {
                  id: 'departmentName',
                  name: 'Отделение',
                  template: (row) =>
                    row.isDishTotal || row.isGrandTotal
                      ? null
                      : row.showDepartment
                        ? row.departmentName
                        : null,
                  placeholder: () => null,
                },
                {
                  id: 'tableName',
                  name: 'Стол',
                  template: (row) => (row.isDishTotal || row.isGrandTotal ? null : row.tableName),
                  placeholder: () => null,
                },
                {
                  id: 'kettleLabel',
                  name: 'Котел',
                  template: (row) => (row.isDishTotal || row.isGrandTotal ? null : row.kettleLabel),
                  placeholder: () => null,
                },
                {
                  id: 'portions',
                  name: 'Порций',
                  align: 'end',
                  template: (row) => <Text variant="body-1">{row.portions}</Text>,
                },
              ]}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function totalHeadcount(facility: Facility): number {
  return facility.departments.reduce(
    (sum, department: Department) =>
      sum + department.tables.reduce((inner, table) => inner + table.headcount, 0),
    0
  );
}
