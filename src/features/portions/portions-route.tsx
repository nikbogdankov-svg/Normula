import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  SegmentedRadioGroup,
  Select,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { Printer, Receipt } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useKitchen } from '@/features/objects/api';
import type { Facility } from '@/features/objects/types';
import { useDishDistribution, usePortionsDay, useUpdatePortionHeadcount } from './api';
import { todayIso, type DishDistributionRow, type PortionsView } from './types';
import './portions-route.css';

const ALL_FACILITIES = '__all';

/**
 * «Порционник»: численность на дату и раздача по блюдам.
 * ПОРЦ-01…03 + бывший «Выход на раздачу».
 */
export function PortionsRoute() {
  const { current } = useOrganizations();
  const kitchen = useKitchen();
  const [date, setDate] = useState(todayIso);
  const [view, setView] = useState<PortionsView>('headcount');
  const [selectedId, setSelectedId] = useState<string>(ALL_FACILITIES);
  const portions = usePortionsDay(date);
  const dishes = useDishDistribution(date);

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
  const showAll = selectedId === ALL_FACILITIES;
  const selected = showAll
    ? null
    : (facilities.find((facility) => facility.id === selectedId) ?? facilities[0] ?? null);

  const headcountOf = (facilityId: string, departmentId: string, tableId: string) => {
    const entry = portions.data?.entries.find(
      (item) =>
        item.facilityId === facilityId &&
        item.departmentId === departmentId &&
        item.tableId === tableId
    );
    return entry?.headcount ?? 0;
  };

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <Flex alignItems="center" gap={3} wrap>
        <TextInput
          size="l"
          value={date}
          onUpdate={setDate}
          style={{ width: 180 }}
          controlProps={{ type: 'date' }}
        />
        <SegmentedRadioGroup
          size="l"
          value={view}
          onUpdate={(value) => setView(value as PortionsView)}
        >
          <SegmentedRadioGroup.Option value="headcount" content="Численность" />
          <SegmentedRadioGroup.Option value="dishes" content="По блюдам" />
        </SegmentedRadioGroup>
      </Flex>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          wrap
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={Receipt} size={16} />
            <Text variant="subheader-2">{view === 'dishes' ? 'По блюдам' : 'Порционник'}</Text>
          </Flex>
          <Flex alignItems="center" gap={2}>
            {view === 'headcount' && facilities.length > 0 && (
              <Select
                size="m"
                width={260}
                label="Организация:"
                value={[showAll ? ALL_FACILITIES : (selected?.id ?? ALL_FACILITIES)]}
                onUpdate={(value) => setSelectedId(value[0] ?? ALL_FACILITIES)}
                placeholder="Выберите ЛПУ"
                options={[
                  { value: ALL_FACILITIES, content: 'Все' },
                  ...facilities.map((facility) => ({
                    value: facility.id,
                    content: facility.name,
                  })),
                ]}
              />
            )}
            <Button view="normal" onClick={() => window.print()} title="Печать">
              <Icon data={Printer} size={16} />
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
          {view === 'headcount' && (
            <>
              {portions.isPending && <LoadingState />}
              {portions.isError && (
                <ErrorState error={portions.error} onRetry={() => void portions.refetch()} />
              )}
              {!portions.isPending && !portions.isError && facilities.length === 0 && (
                <EmptyState text="Сначала добавьте ЛПУ в разделе «Объекты»" />
              )}
              {!portions.isPending && !portions.isError && facilities.length > 0 && showAll && (
                <SummaryPortionsTable facilities={facilities} headcountOf={headcountOf} />
              )}
              {!portions.isPending &&
                !portions.isError &&
                facilities.length > 0 &&
                !showAll &&
                selected && (
                  <DepartmentPortionsTable
                    date={date}
                    facility={selected}
                    headcountOf={headcountOf}
                  />
                )}
            </>
          )}

          {view === 'dishes' && (
            <DishesDistributionTable
              loading={dishes.isPending}
              error={dishes.isError ? dishes.error : null}
              onRetry={() => void dishes.refetch()}
              rows={dishes.data?.rows ?? []}
              totalPortions={dishes.data?.totalPortions ?? 0}
            />
          )}
        </div>
      </Card>
    </Flex>
  );
}

function DepartmentPortionsTable({
  date,
  facility,
  headcountOf,
}: {
  date: string;
  facility: Facility;
  headcountOf: (facilityId: string, departmentId: string, tableId: string) => number;
}) {
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();

  const rows = useMemo(() => {
    const flat = facility.departments.flatMap((department) =>
      department.tables.map((table) => ({
        id: table.id,
        departmentId: department.id,
        departmentName: department.name,
        tableName: table.name,
        headcount: headcountOf(facility.id, department.id, table.id),
        isTotal: false as boolean,
      }))
    );
    const dataRows = flat.map((row, index) => ({
      ...row,
      showDepartment: index === 0 || flat[index - 1].departmentId !== row.departmentId,
      isLastInDepartment:
        index === flat.length - 1 || flat[index + 1].departmentId !== row.departmentId,
    }));
    const total = dataRows.reduce((sum, row) => sum + row.headcount, 0);
    if (dataRows.length === 0) return dataRows;
    return [
      ...dataRows,
      {
        id: '__total',
        departmentId: '__total',
        departmentName: 'Всего',
        tableName: '',
        headcount: total,
        isTotal: true,
        showDepartment: true,
        isLastInDepartment: true,
      },
    ];
  }, [facility, headcountOf]);

  if (rows.length === 0) {
    return <EmptyState text="В этом ЛПУ нет отделений" />;
  }

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table portions-group-table"
        data={rows}
        getRowClassNames={(row) => {
          const classes: string[] = [];
          if (row.isTotal) return classes;
          if (!row.isLastInDepartment) {
            classes.push('objects-group-row_no-divider');
            if (!row.showDepartment) classes.push('objects-group-row_continuation');
          }
          return classes;
        }}
        columns={[
          {
            id: 'departmentName',
            name: 'Отделение',
            width: '40%',
            template: (row) =>
              row.isTotal ? 'Всего' : row.showDepartment ? row.departmentName : null,
            placeholder: () => null,
          },
          {
            id: 'tableName',
            name: 'Стол',
            width: '35%',
            template: (row) => (row.isTotal ? null : row.tableName),
            placeholder: () => null,
          },
          {
            id: 'headcount',
            name: 'Человек',
            width: '25%',
            template: (row) =>
              row.isTotal ? (
                <span className="portions-total-headcount">{row.headcount}</span>
              ) : (
                <TextInput
                  type="number"
                  size="s"
                  value={String(row.headcount)}
                  controlProps={{ min: 0 }}
                  style={{ width: 96 }}
                  onUpdate={(value) => {
                    const headcount = Math.max(0, Number(value) || 0);
                    update.mutate(
                      {
                        date,
                        facilityId: facility.id,
                        departmentId: row.departmentId,
                        tableId: row.id,
                        headcount,
                      },
                      {
                        onError: (e) =>
                          toaster.add({
                            name: 'portions-headcount',
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
  );
}

function SummaryPortionsTable({
  facilities,
  headcountOf,
}: {
  facilities: Facility[];
  headcountOf: (facilityId: string, departmentId: string, tableId: string) => number;
}) {
  const rows = useMemo(() => {
    type Row = {
      id: string;
      facilityName: string;
      departmentName: string;
      tableName: string;
      headcount: number;
      showFacility: boolean;
      showDepartment: boolean;
      isLastInFacility: boolean;
      isLastInDepartment: boolean;
      isTotal: boolean;
    };

    const data: Row[] = [];
    let grand = 0;

    for (const facility of facilities) {
      const facilityRows: {
        id: string;
        facilityName: string;
        departmentName: string;
        tableName: string;
        headcount: number;
      }[] = [];
      for (const department of facility.departments) {
        for (const table of department.tables) {
          const headcount = headcountOf(facility.id, department.id, table.id);
          grand += headcount;
          facilityRows.push({
            id: `${facility.id}-${department.id}-${table.id}`,
            facilityName: facility.name,
            departmentName: department.name,
            tableName: table.name,
            headcount,
          });
        }
      }
      facilityRows.forEach((row, index) => {
        const prev = index > 0 ? facilityRows[index - 1] : null;
        const next = index < facilityRows.length - 1 ? facilityRows[index + 1] : null;
        data.push({
          ...row,
          showFacility: index === 0,
          showDepartment: !prev || prev.departmentName !== row.departmentName,
          isLastInFacility: next === null,
          isLastInDepartment: !next || next.departmentName !== row.departmentName,
          isTotal: false,
        });
      });
    }

    if (data.length === 0) return data;
    return [
      ...data,
      {
        id: '__grand',
        facilityName: 'Всего',
        departmentName: '',
        tableName: '',
        headcount: grand,
        showFacility: true,
        showDepartment: false,
        isLastInFacility: true,
        isLastInDepartment: true,
        isTotal: true,
      },
    ];
  }, [facilities, headcountOf]);

  if (rows.length === 0) {
    return <EmptyState text="Нет данных для сводного порционника" />;
  }

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table portions-group-table"
        data={rows}
        getRowClassNames={(row) => {
          const classes: string[] = [];
          if (row.isTotal) return classes;
          if (!row.isLastInDepartment) {
            classes.push('objects-group-row_no-divider');
            if (!row.showDepartment) classes.push('objects-group-row_continuation');
          } else if (!row.isLastInFacility) {
            classes.push('objects-group-row_facility-divider');
          }
          return classes;
        }}
        columns={[
          {
            id: 'facilityName',
            name: 'ЛПУ',
            width: '28%',
            template: (row) =>
              row.isTotal ? (
                <Text variant="body-1" style={{ fontWeight: 600 }}>
                  Всего
                </Text>
              ) : row.showFacility ? (
                <Text variant="body-1" style={{ fontWeight: 600 }}>
                  {row.facilityName}
                </Text>
              ) : null,
            placeholder: () => null,
          },
          {
            id: 'departmentName',
            name: 'Отделение',
            width: '28%',
            template: (row) =>
              row.isTotal ? null : row.showDepartment ? row.departmentName : null,
            placeholder: () => null,
          },
          {
            id: 'tableName',
            name: 'Стол',
            width: '24%',
            template: (row) => (row.isTotal ? null : row.tableName),
            placeholder: () => null,
          },
          {
            id: 'headcount',
            name: 'Человек',
            width: '20%',
            template: (row) =>
              row.isTotal ? (
                <span className="portions-total-headcount">{row.headcount}</span>
              ) : (
                row.headcount
              ),
          },
        ]}
      />
    </div>
  );
}

function DishesDistributionTable({
  loading,
  error,
  onRetry,
  rows,
  totalPortions,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  rows: DishDistributionRow[];
  totalPortions: number;
}) {
  const tableRows = useMemo(() => {
    type DistRow = DishDistributionRow & {
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
      const dishRows = rows.slice(dishStart, index);
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <EmptyState text="Нет данных для раздачи — заполните меню и численность" />;
  }

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table portions-group-table"
        data={tableRows}
        getRowClassNames={(row) => {
          const classes: string[] = [];
          if (row.isDishTotal || row.isGrandTotal) return classes;
          if (!row.isLastInDepartment) {
            classes.push('objects-group-row_no-divider');
            if (!row.showDepartment) classes.push('objects-group-row_continuation');
          } else if (!row.isLastInFacility) {
            classes.push('objects-group-row_department-divider');
          } else if (!row.isLastInDish) {
            classes.push('objects-group-row_facility-divider');
          } else {
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
  );
}
