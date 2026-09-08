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
import {
  ChevronLeft,
  ChevronRight,
  Magnifier,
  Printer,
  Receipt,
  TriangleExclamation,
} from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useCateringObjects } from '@/features/objects/api';
import type { SubObject } from '@/features/objects/types';
import { useDishDistribution, usePortionsDay, useUpdatePortionHeadcount } from './api';
import { todayIso, shiftIso, type DishDistributionRow, type PortionsView } from './types';
import './portions-route.css';

const ALL_SUBOBJECTS = '__all';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * «Порционник»: численность на дату и раздачу по блюдам.
 * ПОРЦ-01…03 + бывший «Выход на раздачу».
 */
export function PortionsRoute() {
  const { current } = useOrganizations();
  const objects = useCateringObjects();
  // Дата живёт в адресе страницы: перезагрузка или редирект (например,
  // обновление токена Logto) не сбрасывают выбор на сегодня.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDate = searchParams.get('date');
  const date = ISO_DATE_RE.test(rawDate ?? '') ? (rawDate as string) : todayIso();

  const setDate = (next: string) => {
    setSearchParams(next === todayIso() ? {} : { date: next }, { replace: true });
  };

  const [view, setView] = useState<PortionsView>('organizations');
  const [selectedId, setSelectedId] = useState<string>(ALL_SUBOBJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [dishSearchQuery, setDishSearchQuery] = useState('');
  const portions = usePortionsDay(date);
  // Вчерашние данные нужны только на будущей дате — иначе запрос выключен.
  const yesterday = usePortionsDay(date > todayIso() ? shiftIso(date, -1) : '');
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();

  // Объекты организации; селект готов к произвольному числу.
  const objectsList = useMemo(() => objects.data?.objects ?? [], [objects.data]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const activeObjectId = selectedObjectId ?? objectsList[0]?.id ?? null;

  const dishes = useDishDistribution(date, activeObjectId);

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (objects.isPending) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <LoadingState />
      </Flex>
    );
  }

  if (objects.isError || !objects.data) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      </Flex>
    );
  }

  const subObjects = objects.data.objects.flatMap((unit) => unit.subObjects);
  const query = searchQuery.trim().toLowerCase();
  const objectOptions = objects.data.objects
    .filter((unit) => !query || unit.name.toLowerCase().includes(query))
    .map((unit) => ({ value: `object:${unit.id}`, content: unit.name }));
  const selectedUnit = selectedId.startsWith('object:')
    ? (objects.data.objects.find((unit) => `object:${unit.id}` === selectedId) ?? null)
    : null;
  const scopeSubObjects = selectedUnit ? selectedUnit.subObjects : subObjects;
  // Подобъект → его главный объект (для подписи в таблице).
  const parentObjectName: Record<string, string> = {};
  for (const unit of objects.data.objects) {
    for (const subObject of unit.subObjects) parentObjectName[subObject.id] = unit.name;
  }

  const isFutureDate = date > todayIso();
  /** null — записи ещё нет (например, будущая дата): инпут показываем пустым. */
  const headcountOf = (subObjectId: string, departmentId: string, tableId: string) => {
    const entry = portions.data?.entries.find(
      (item) =>
        item.subObjectId === subObjectId &&
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
          subObjectId: entry.subObjectId,
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
        <Flex alignItems="center" gap={1}>
          <Button
            view="outlined"
            size="l"
            title="Предыдущий день"
            onClick={() => setDate(shiftIso(date, -1))}
          >
            <Icon data={ChevronLeft} size={16} />
          </Button>
          <DatePicker
            size="l"
            value={dateTime({ input: date })}
            onUpdate={(value) => setDate(value ? value.format('YYYY-MM-DD') : todayIso())}
            style={{ width: 180 }}
          />
          <Button
            view="outlined"
            size="l"
            title="Следующий день"
            onClick={() => setDate(shiftIso(date, 1))}
          >
            <Icon data={ChevronRight} size={16} />
          </Button>
        </Flex>
        <SegmentedRadioGroup
          size="l"
          value={view}
          onUpdate={(value) => setView(value as PortionsView)}
        >
          <SegmentedRadioGroup.Option value="organizations" content="По объектам" />
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
            <Text variant="subheader-2">
              {view === 'dishes' ? 'Порционник по блюдам' : 'Порционник по объектам'}
            </Text>
          </Flex>
          <Flex alignItems="center" gap={2}>
            {view === 'organizations' && subObjects.length > 0 && (
              <>
                <TextInput
                  size="m"
                  placeholder="Поиск по объектам..."
                  value={searchQuery}
                  onUpdate={setSearchQuery}
                  hasClear
                  style={{ width: 240 }}
                  startContent={
                    <span
                      style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                    >
                      <Icon data={Magnifier} size={16} />
                    </span>
                  }
                />
                <Select
                  size="m"
                  width={280}
                  label="Объект:"
                  title="Объект:"
                  value={[selectedId]}
                  onUpdate={(value) => setSelectedId(value[0] ?? ALL_SUBOBJECTS)}
                  placeholder="Выберите объект или подобъект"
                  options={[{ value: ALL_SUBOBJECTS, content: 'Все' }, ...objectOptions]}
                />
              </>
            )}
            {view === 'dishes' && objectsList.length > 0 && (
              <>
                <TextInput
                  size="m"
                  placeholder="Поиск по блюдам..."
                  value={dishSearchQuery}
                  onUpdate={setDishSearchQuery}
                  hasClear
                  style={{ width: 240 }}
                  startContent={
                    <span
                      style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                    >
                      <Icon data={Magnifier} size={16} />
                    </span>
                  }
                />
                <Select
                  size="m"
                  width={280}
                  label="Объект:"
                  title="Объект:"
                  value={activeObjectId ? [activeObjectId] : []}
                  onUpdate={(value) => setSelectedObjectId(value[0] ?? null)}
                  options={objectsList.map((unit) => ({
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
                  {subObjects.length > 0 && (portions.data?.entries.length ?? 0) === 0 && (
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
              {!portions.isPending && !portions.isError && subObjects.length === 0 && (
                <EmptyState text="Сначала добавьте подобъекты в разделе «Объекты»" />
              )}
              {!portions.isPending && !portions.isError && subObjects.length > 0 && (
                <SummaryPortionsTable
                  date={date}
                  subObjects={scopeSubObjects}
                  parentObjectName={parentObjectName}
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
  subObjects,
  parentObjectName,
  headcountOf,
}: {
  date: string;
  subObjects: SubObject[];
  parentObjectName: Record<string, string>;
  headcountOf: (subObjectId: string, departmentId: string, tableId: string) => number | null;
}) {
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();

  const commit = (
    row: { subObjectId: string; departmentId: string; tableId: string },
    headcount: number
  ) => {
    update.mutate(
      {
        date,
        subObjectId: row.subObjectId,
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
      subObjectId: string;
      departmentId: string;
      tableId: string;
      subObjectName: string;
      departmentName: string;
      tableName: string;
      headcount: number | null;
      defaultHeadcount: number;
      showSubObject: boolean;
      showDepartment: boolean;
      isLastInSubObject: boolean;
      isLastInDepartment: boolean;
      isTotal: boolean;
      isLastRow?: boolean;
    };

    const data: Row[] = [];
    let grand = 0;

    for (const subObject of subObjects) {
      const subObjectRows: {
        id: string;
        subObjectId: string;
        departmentId: string;
        tableId: string;
        subObjectName: string;
        departmentName: string;
        tableName: string;
        headcount: number | null;
        defaultHeadcount: number;
      }[] = [];
      for (const department of subObject.departments) {
        for (const table of department.tables) {
          const headcount = headcountOf(subObject.id, department.id, table.id);
          grand += headcount ?? 0;
          subObjectRows.push({
            id: `${subObject.id}-${department.id}-${table.id}`,
            subObjectId: subObject.id,
            departmentId: department.id,
            tableId: table.id,
            subObjectName: subObject.name,
            departmentName: department.name,
            tableName: table.name,
            headcount,
            defaultHeadcount: table.headcount,
          });
        }
      }
      subObjectRows.forEach((row, index) => {
        const prev = index > 0 ? subObjectRows[index - 1] : null;
        const next = index < subObjectRows.length - 1 ? subObjectRows[index + 1] : null;
        data.push({
          ...row,
          showSubObject: index === 0,
          showDepartment: !prev || prev.departmentName !== row.departmentName,
          isLastInSubObject: next === null,
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
        subObjectId: '__grand',
        departmentId: '__grand',
        tableId: '__grand',
        subObjectName: 'Всего',
        departmentName: '',
        tableName: '',
        headcount: grand,
        defaultHeadcount: 0,
        showSubObject: true,
        showDepartment: false,
        isLastInSubObject: true,
        isLastInDepartment: true,
        isTotal: true,
      },
    ];
  }, [subObjects, headcountOf]);

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
          } else if (!row.isLastInSubObject) {
            classes.push('objects-group-row_facility-divider');
          }
          return classes;
        }}
        columns={[
          {
            id: 'subObjectName',
            name: 'Подобъект',
            width: '28%',
            template: (row) =>
              row.isTotal ? (
                <Text variant="body-2" style={{ fontWeight: 600 }}>
                  Всего
                </Text>
              ) : row.showSubObject ? (
                <Flex direction="column">
                  <Text variant="body-2" style={{ fontWeight: 600 }}>
                    {row.subObjectName}
                  </Text>
                  <Text variant="body-1" color="secondary">
                    {parentObjectName[row.subObjectId]}
                  </Text>
                </Flex>
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
      showSubObject: boolean;
      showDepartment: boolean;
      isFirstInDish: boolean;
      isLastInDish: boolean;
      isLastInSubObject: boolean;
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
        const sameSubObjectAsPrev = prev !== null && prev.subObjectName === row.subObjectName;
        const sameDepartmentAsPrev =
          sameSubObjectAsPrev && prev !== null && prev.departmentName === row.departmentName;
        const sameSubObjectAsNext = next !== null && next.subObjectName === row.subObjectName;
        const sameDepartmentAsNext =
          sameSubObjectAsNext && next !== null && next.departmentName === row.departmentName;
        dishPortions += row.portions;
        result.push({
          ...row,
          id: String(dishStart + i),
          isDishTotal: false,
          isGrandTotal: false,
          showDish: i === 0,
          showSubObject: !sameSubObjectAsPrev,
          showDepartment: !sameDepartmentAsPrev,
          isFirstInDish: i === 0,
          isLastInDish: next === null,
          isLastInSubObject: !sameSubObjectAsNext,
          isLastInDepartment: !sameDepartmentAsNext,
        });
      }

      result.push({
        id: `__dish-total-${dishName}`,
        dishName,
        mealType: '',
        objectName: '',
        subObjectName: '',
        departmentName: '',
        tableName: '',
        portions: dishPortions,
        isDishTotal: true,
        isGrandTotal: false,
        showDish: true,
        showSubObject: false,
        showDepartment: false,
        isFirstInDish: false,
        isLastInDish: true,
        isLastInSubObject: true,
        isLastInDepartment: true,
      });
    }

    if (result.length > 0) {
      result.push({
        id: '__grand-total',
        dishName: 'Общее количество всех блюд',
        mealType: '',
        objectName: '',
        subObjectName: '',
        departmentName: '',
        tableName: '',
        portions: totalPortions,
        isDishTotal: false,
        isGrandTotal: true,
        showDish: true,
        showSubObject: false,
        showDepartment: false,
        isFirstInDish: false,
        isLastInDish: true,
        isLastInSubObject: true,
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
          } else if (!row.isLastInSubObject) {
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
            id: 'subObjectName',
            name: 'Подобъект',
            width: '20%',
            template: (row) =>
              row.isDishTotal || row.isGrandTotal ? null : row.showSubObject ? (
                <Flex direction="column">
                  <Text variant="body-2" style={{ fontWeight: 400 }}>
                    {row.subObjectName}
                  </Text>
                  <Text variant="body-1" color="secondary">
                    {row.objectName}
                  </Text>
                </Flex>
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
