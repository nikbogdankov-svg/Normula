import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
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
import { Magnifier, Printer, Receipt, TriangleExclamation } from '@gravity-ui/icons';
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
import { todayIso, shiftIso, type DishDistributionRow, type PortionsView } from './types';
import './portions-route.css';

const ALL_FACILITIES = '__all';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * «Порционник»: численность на дату и раздачу по блюдам.
 * ПОРЦ-01…03 + бывший «Выход на раздачу».
 */
export function PortionsRoute() {
  const { current } = useOrganizations();
  const kitchen = useKitchen();
  // Дата живёт в адресе страницы: перезагрузка или редирект (например,
  // обновление токена Logto) не сбрасывают выбор на сегодня.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDate = searchParams.get('date');
  const date = ISO_DATE_RE.test(rawDate ?? '') ? (rawDate as string) : todayIso();

  const setDate = (next: string) => {
    setSearchParams(next === todayIso() ? {} : { date: next }, { replace: true });
  };

  const [view, setView] = useState<PortionsView>('organizations');
  const [selectedId, setSelectedId] = useState<string>(ALL_FACILITIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [dishSearchQuery, setDishSearchQuery] = useState('');
  const portions = usePortionsDay(date);
  // Вчерашние данные нужны только на будущей дате — иначе запрос выключен.
  const yesterday = usePortionsDay(date > todayIso() ? shiftIso(date, -1) : '');
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();

  // Пищеблоки организации; селект готов к произвольному числу.
  const kitchens = useMemo(() => kitchen.data?.kitchens ?? [], [kitchen.data]);
  const [selectedKitchenId, setSelectedKitchenId] = useState<string | null>(null);
  const activeKitchenId = selectedKitchenId ?? kitchens[0]?.id ?? null;

  const dishes = useDishDistribution(date, activeKitchenId);

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

  const facilities = kitchen.data.kitchens.flatMap((unit) => unit.facilities);
  const filteredFacilities = searchQuery
    ? facilities.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : facilities;
  const showAll = selectedId === ALL_FACILITIES;
  const selected = showAll
    ? null
    : (facilities.find((facility) => facility.id === selectedId) ?? facilities[0] ?? null);

  const isFutureDate = date > todayIso();
  /** null — записи ещё нет (например, будущая дата): инпут показываем пустым. */
  const headcountOf = (facilityId: string, departmentId: string, tableId: string) => {
    const entry = portions.data?.entries.find(
      (item) =>
        item.facilityId === facilityId &&
        item.departmentId === departmentId &&
        item.tableId === tableId
    );
    return entry ? entry.headcount : null;
  };

  /** Копирует вчерашнюю численность на выбранную дату построчно. */
  const fillFromYesterday = () => {
    const entries = yesterday.data?.entries ?? [];
    for (const entry of entries) {
      update.mutate(
        {
          date,
          facilityId: entry.facilityId,
          departmentId: entry.departmentId,
          tableId: entry.tableId,
          headcount: entry.headcount,
        },
        {
          onError: (e) =>
            toaster.add({
              name: 'portions-fill',
              title: 'Не удалось заполнить',
              content: e.message,
              theme: 'danger',
            }),
        }
      );
    }
  };

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <Flex alignItems="center" gap={3} wrap>
        <DatePicker
          size="l"
          value={dateTime({ input: date })}
          onUpdate={(value) => setDate(value ? value.format('YYYY-MM-DD') : todayIso())}
          style={{ width: 180 }}
        />
        <SegmentedRadioGroup
          size="l"
          value={view}
          onUpdate={(value) => setView(value as PortionsView)}
        >
          <SegmentedRadioGroup.Option value="organizations" content="По ЛПУ" />
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
            <Text variant="subheader-2">{view === 'dishes' ? 'Порционник по блюдам' : 'Порционник по ЛПУ'}</Text>
          </Flex>
          <Flex alignItems="center" gap={2}>
            {view === 'organizations' && facilities.length > 0 && (
              <>
                <TextInput
                  size="m"
                  placeholder="Поиск по ЛПУ..."
                  value={searchQuery}
                  onUpdate={setSearchQuery}
                  hasClear
                  style={{ width: 240 }}
                  startContent={
                    <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                      <Icon data={Magnifier} size={16} />
                    </span>
                  }
                />
                <Select
                  size="m"
                  width={280}
                  label="ЛПУ:"
                  title="Организация:"
                  value={[showAll ? ALL_FACILITIES : (selected?.id ?? ALL_FACILITIES)]}
                  onUpdate={(value) => setSelectedId(value[0] ?? ALL_FACILITIES)}
                  placeholder="Выберите школу, например школа 5"
                  options={[
                    { value: ALL_FACILITIES, content: 'Все' },
                    ...filteredFacilities.map((facility) => ({
                      value: facility.id,
                      content: facility.name,
                    })),
                  ]}
                />
              </>
            )}
            {view === 'dishes' && kitchens.length > 0 && (
              <>
                <TextInput
                  size="m"
                  placeholder="Поиск по блюдам..."
                  value={dishSearchQuery}
                  onUpdate={setDishSearchQuery}
                  hasClear
                  style={{ width: 240 }}
                  startContent={
                    <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                      <Icon data={Magnifier} size={16} />
                    </span>
                  }
                />
                <Select
                  size="m"
                  width={280}
                  label="Пищеблок:"
                  title="Пищеблок:"
                  value={activeKitchenId ? [activeKitchenId] : []}
                  onUpdate={(value) => setSelectedKitchenId(value[0] ?? null)}
                  options={kitchens.map((unit) => ({
                    value: unit.id,
                    content: unit.name,
                  }))}
                />
              </>
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
          {view === 'organizations' && (
            <>
              {/* Баннер не зависит от состояния запроса: не мигает и не
                  пропадает на время рефретчей. */}
              {isFutureDate && (
                <Flex alignItems="center" gap={2} wrap style={{ padding: '8px 16px' }}>
                  <Icon data={TriangleExclamation} size={16} />
                  <Text variant="body-2" style={{ color: 'var(--g-color-text-secondary)' }}>
                    Эта дата в будущем
                  </Text>
                  <Button size="s" view="normal" onClick={() => setDate(todayIso())}>
                    Перейти на сегодня
                  </Button>
                  {/* Кнопку заполнения показываем, пока день пуст; после
                      заполнения остаются только надпись и переход на сегодня. */}
                  {facilities.length > 0 && (portions.data?.entries.length ?? 0) === 0 && (
                    <Button
                      size="s"
                      view="action"
                      style={{ marginLeft: 'auto' }}
                      loading={update.isPending}
                      disabled={!yesterday.data || yesterday.data.entries.length === 0}
                      onClick={fillFromYesterday}
                    >
                      Заполнить вчерашними данными
                    </Button>
                  )}
                </Flex>
              )}
              {portions.isPending && <LoadingState />}
              {portions.isError && (
                <ErrorState error={portions.error} onRetry={() => void portions.refetch()} />
              )}
              {!portions.isPending && !portions.isError && facilities.length === 0 && (
                <EmptyState text="Сначала добавьте ЛПУ в разделе «Объекты»" />
              )}
              {!portions.isPending && !portions.isError && facilities.length > 0 && showAll && (
                <SummaryPortionsTable
                  date={date}
                  facilities={facilities}
                  headcountOf={headcountOf}
                />
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
              onFill={() => setView('organizations')}
              rows={
                dishSearchQuery
                  ? (dishes.data?.rows ?? []).filter((r) =>
                      r.dishName.toLowerCase().includes(dishSearchQuery.toLowerCase())
                    )
                  : (dishes.data?.rows ?? [])
              }
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
  headcountOf: (facilityId: string, departmentId: string, tableId: string) => number | null;
}) {
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();

  const commit = (departmentId: string, tableId: string, headcount: number) => {
    update.mutate(
      {
        date,
        facilityId: facility.id,
        departmentId,
        tableId,
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
  };

  const rows = useMemo(() => {
    const flat = facility.departments.flatMap((department) =>
      department.tables.map((table) => ({
        id: table.id,
        departmentId: department.id,
        departmentName: department.name,
        tableName: table.name,
        headcount: headcountOf(facility.id, department.id, table.id),
        defaultHeadcount: table.headcount,
        isTotal: false as boolean,
      }))
    );
    const dataRows = flat.map((row, index) => ({
      ...row,
      showDepartment: index === 0 || flat[index - 1].departmentId !== row.departmentId,
      isLastInDepartment:
        index === flat.length - 1 || flat[index + 1].departmentId !== row.departmentId,
      isLastRow: index === flat.length - 1,
    }));
    const total = dataRows.reduce((sum, row) => sum + (row.headcount ?? 0), 0);
    if (dataRows.length === 0) return dataRows;
    return [
      ...dataRows,
      {
        id: '__total',
        departmentId: '__total',
        departmentName: 'Всего',
        tableName: '',
        headcount: total,
        defaultHeadcount: 0,
        isTotal: true,
        isLastRow: false,
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
          if (row.isLastRow) classes.push('portions-row_before-total');
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
            align: 'end',
            template: (row) =>
              row.isTotal ? (
                <span className="portions-total-headcount">{row.headcount}</span>
              ) : (
                <HeadcountInput
                  value={row.headcount}
                  defaultHeadcount={row.defaultHeadcount}
                  onCommit={(headcount) => commit(row.departmentId, row.id, headcount)}
                />
              ),
          },
        ]}
      />
    </div>
  );
}

function HeadcountInput({
  value,
  defaultHeadcount,
  onCommit,
}: {
  /** null — записи ещё нет: показываем пустое поле. */
  value: number | null;
  /** Сохранённая численность стола — плейсхолдер пустого поля. */
  defaultHeadcount: number;
  onCommit: (headcount: number) => void;
}) {
  // Черновик живёт, пока поле в фокусе: сохраняем по blur/Enter,
  // а не на каждое нажатие — иначе рефретчи сбрасывают недопечатанное.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextInput
      type="number"
      size="s"
      className="portions-headcount-input"
      value={draft ?? (value === null ? '' : String(value))}
      controlProps={{ min: 0 }}
      placeholder={String(defaultHeadcount)}
      style={{ width: 96 }}
      onUpdate={setDraft}
      onBlur={() => {
        if (draft === null) return;
        const parsed = Number(draft);
        setDraft(null);
        if (!Number.isFinite(parsed)) return;
        const headcount = Math.max(0, parsed);
        if (headcount !== value) onCommit(headcount);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function SummaryPortionsTable({
  date,
  facilities,
  headcountOf,
}: {
  date: string;
  facilities: Facility[];
  headcountOf: (facilityId: string, departmentId: string, tableId: string) => number | null;
}) {
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();

  const commit = (
    row: { facilityId: string; departmentId: string; tableId: string },
    headcount: number
  ) => {
    update.mutate(
      {
        date,
        facilityId: row.facilityId,
        departmentId: row.departmentId,
        tableId: row.tableId,
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
  };

  const rows = useMemo(() => {
    type Row = {
      id: string;
      facilityId: string;
      departmentId: string;
      tableId: string;
      facilityName: string;
      departmentName: string;
      tableName: string;
      headcount: number | null;
      defaultHeadcount: number;
      showFacility: boolean;
      showDepartment: boolean;
      isLastInFacility: boolean;
      isLastInDepartment: boolean;
      isTotal: boolean;
      isLastRow?: boolean;
    };

    const data: Row[] = [];
    let grand = 0;

    for (const facility of facilities) {
      const facilityRows: {
        id: string;
        facilityId: string;
        departmentId: string;
        tableId: string;
        facilityName: string;
        departmentName: string;
        tableName: string;
        headcount: number | null;
        defaultHeadcount: number;
      }[] = [];
      for (const department of facility.departments) {
        for (const table of department.tables) {
          const headcount = headcountOf(facility.id, department.id, table.id);
          grand += headcount ?? 0;
          facilityRows.push({
            id: `${facility.id}-${department.id}-${table.id}`,
            facilityId: facility.id,
            departmentId: department.id,
            tableId: table.id,
            facilityName: facility.name,
            departmentName: department.name,
            tableName: table.name,
            headcount,
            defaultHeadcount: table.headcount,
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
    data[data.length - 1].isLastRow = true;
    return [
      ...data,
      {
        id: '__grand',
        // Идентификаторов у итоговой строки нет — заглушки нужны, чтобы
        // объединение с обычными строками осталось однородным. Читаются
        // они только в ветке isTotal === false, то есть никогда.
        facilityId: '__grand',
        departmentId: '__grand',
        tableId: '__grand',
        facilityName: 'Всего',
        departmentName: '',
        tableName: '',
        headcount: grand,
        defaultHeadcount: 0,
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
          if (row.isLastRow) classes.push('portions-row_before-total');
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
                <Text variant="body-2" style={{ fontWeight: 600 }}>
                  Всего
                </Text>
              ) : row.showFacility ? (
                <Text variant="body-2" style={{ fontWeight: 600 }}>
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
            align: 'end',
            template: (row) =>
              row.isTotal ? (
                <span className="portions-total-headcount">{row.headcount}</span>
              ) : (
                <HeadcountInput
                  value={row.headcount}
                  defaultHeadcount={row.defaultHeadcount}
                  onCommit={(headcount) => commit(row, headcount)}
                />
              ),
          },
        ]}
      />
    </div>
  );
}

/** Пустое состояние раздачи: ведёт на вкладку заполнения порционника. */
function DishesEmptyState({ onFill }: { onFill: () => void }) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ padding: '16px 48px' }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--g-color-base-generic)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon data={TriangleExclamation} size={20} />
      </div>
      <Text variant="subheader-2" style={{ marginTop: 12 }}>
        Нет данных
      </Text>
      <Text variant="body-2" color="secondary" style={{ marginTop: 2 }}>
        Заполните порционник по организациям
      </Text>
      <Button view="action" style={{ marginTop: 12 }} onClick={onFill}>
        Заполнить порционник
      </Button>
    </Flex>
  );
}

function DishesDistributionTable({
  loading,
  error,
  onRetry,
  onFill,
  rows,
  totalPortions,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onFill: () => void;
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
      isFirstInDish: boolean;
      isLastInDish: boolean;
      isLastInFacility: boolean;
      isLastInDepartment: boolean;
      isBeforeTotal?: boolean;
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
          isFirstInDish: i === 0,
          isLastInDish: next === null,
          isLastInFacility: !sameFacilityAsNext,
          isLastInDepartment: !sameDepartmentAsNext,
        });
      }

      result.push({
        id: `__dish-total-${dishName}`,
        dishName,
        mealType: '',
        facilityName: '',
        departmentName: '',
        tableName: '',
        portions: dishPortions,
        isDishTotal: true,
        isGrandTotal: false,
        showDish: true,
        showFacility: false,
        showDepartment: false,
        isFirstInDish: false,
        isLastInDish: true,
        isLastInFacility: true,
        isLastInDepartment: true,
      });
    }

    if (result.length > 0) {
      result.push({
        id: '__grand-total',
        dishName: 'Общее количество всех блюд',
        mealType: '',
        facilityName: '',
        departmentName: '',
        tableName: '',
        portions: totalPortions,
        isDishTotal: false,
        isGrandTotal: true,
        showDish: true,
        showFacility: false,
        showDepartment: false,
        isFirstInDish: false,
        isLastInDish: true,
        isLastInFacility: true,
        isLastInDepartment: true,
      });
    }

    // Линия над «Всего» (по блюду и общим итогом) — заметнее остальных.
    for (let i = 0; i < result.length - 1; i += 1) {
      const next = result[i + 1];
      if (next.isDishTotal || next.isGrandTotal) {
        result[i].isBeforeTotal = true;
      }
    }

    return result;
  }, [rows, totalPortions]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <DishesEmptyState onFill={onFill} />;
  }

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table portions-group-table"
        data={tableRows}
        getRowClassNames={(row) => {
          const classes: string[] = [];
          if (row.isBeforeTotal) classes.push('portions-row_before-total');
          if (row.isDishTotal || row.isGrandTotal) {
            if (row.isDishTotal) classes.push('portions-row_dish-total');
            return classes;
          }
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
            width: '30%',
            template: (row) => {
              if (row.isGrandTotal) {
                return (
                  <Text variant="body-2" style={{ fontWeight: 600 }}>
                    {row.dishName}
                  </Text>
                );
              }
              if (row.isDishTotal) return 'Всего';
              if (!row.showDish) return null;
              return (
                <>
                  <Text variant="body-2" style={{ fontWeight: 600 }}>
                    {row.dishName}
                  </Text>
                  <br />
                  <Text variant="body-1" color="secondary">
                    {row.mealType}
                  </Text>
                </>
              );
            },
            placeholder: () => null,
          },
          {
            id: 'facilityName',
            name: 'ЛПУ',
            width: '20%',
            template: (row) =>
              row.isDishTotal || row.isGrandTotal ? null : row.showFacility ? (
                <Text variant="body-2" style={{ fontWeight: 400 }}>
                  {row.facilityName}
                </Text>
              ) : null,
            placeholder: () => null,
          },
          {
            id: 'departmentName',
            name: 'Отделение',
            width: '15%',
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
            width: '15%',
            template: (row) => (row.isDishTotal || row.isGrandTotal ? null : row.tableName),
            placeholder: () => null,
          },
          {
            id: 'portions',
            name: 'Порций',
            width: '10%',
            align: 'end',
            template: (row) => (
              <Text variant={row.isDishTotal || row.isGrandTotal ? 'subheader-2' : 'body-2'}>
                {row.portions}
              </Text>
            ),
          },
        ]}
      />
    </div>
  );
}
