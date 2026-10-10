import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Drawer,
  Flex,
  Icon,
  Select,
  Table,
  Text,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { Printer, Xmark } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { usePageObjectChoice } from '@/shared/object-selection';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useObjects } from '@/features/objects/api';
import { MEALS } from '@/features/menu/types';
import { formatDate } from '@/features/warehouse/format';
import { useAccounts } from './api';
import type { Account } from './types';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './accounts-route.css';
import './accounts-drawer.css';

/** Значение фильтра «Все объекты». */
const ALL_OBJECTS = 'all';

const ACCOUNT_ROWS = [
  {
    objectId: 'sub-2-1',
    date: '12.08.2026',
    organization: 'Школа №5',
    passed: 312,
    charged: 124800,
    meals: [
      {
        name: 'Завтрак',
        passed: 72,
        charged: 28800,
        diets: [
          { name: 'Обычная', passed: 42, charged: 16800 },
          { name: 'Диета 5', passed: 30, charged: 12000 },
        ],
      },
      {
        name: 'Обед',
        passed: 83,
        charged: 33200,
        diets: [
          { name: 'Диета 5', passed: 45, charged: 18000 },
          { name: 'Безмолочная', passed: 20, charged: 8000 },
          { name: 'Белковая', passed: 18, charged: 7200 },
        ],
      },
    ],
  },
  {
    objectId: 'sub-2-5',
    date: '10.08.2026',
    organization: 'Детский сад №3',
    passed: 198,
    charged: 79200,
    meals: [
      {
        name: 'Завтрак',
        passed: 24,
        charged: 9600,
        diets: [
          { name: 'Обычная', passed: 14, charged: 5600 },
          { name: 'Пюревая', passed: 10, charged: 4000 },
        ],
      },
      {
        name: 'Обед',
        passed: 24,
        charged: 9600,
        diets: [{ name: 'Пюревая', passed: 24, charged: 9600 }],
      },
    ],
  },
];

function toRow(account: Account): AccountRow {
  return {
    objectId: account.objectId,
    date: formatDate(account.date),
    organization: account.objectName,
    passed: account.passed,
    charged: account.charged,
    meals: (account.meals ?? []).map((meal) => ({
      name: MEALS.find((item) => item.id === meal.mealId)?.label ?? meal.mealId,
      passed: meal.passed,
      charged: meal.charged,
      diets: (meal.diets ?? []).map((diet) => ({
        name: diet.dietName,
        passed: diet.passed,
        charged: diet.charged,
      })),
    })),
  };
}

export function AccountsRoute() {
  const { current } = useOrganizations();
  const height = useDrawerHeight();
  const [selected, setSelected] = useState<AccountRow | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AccountRow | null>(null);
  const allowCloseRef = useRef(false);

  // Фильтр живёт на клиенте: счета приходят целиком.
  const objects = useObjects();
  const accounts = useAccounts();

  const objectOptions = useMemo(() => {
    const all = objects.data?.objects ?? [];
    return all.map((object) => ({ value: object.id, content: object.name }));
  }, [objects.data]);
  const { objectId, setObjectIdLocal: setObjectId } = usePageObjectChoice(
    objectOptions,
    ALL_OBJECTS
  );

  const objectFilterOptions = useMemo(
    () => [{ value: ALL_OBJECTS, content: 'Все объекты' }, ...objectOptions],
    [objectOptions]
  );

  const rows = useMemo(() => {
    const byId = new Map((objects.data?.objects ?? []).map((object) => [object.id, object]));

    return (accounts.data?.accounts ?? [])
      .map(toRow)
      .filter((row) => {
        if (objectId === ALL_OBJECTS) return true;
        // Счёт выписан подобъекту; выбор родительского объекта показывает
        // все его счета.
        const rowObject = byId.get(row.objectId);
        return row.objectId === objectId || rowObject?.parentObjectId === objectId;
      })
      .sort((a, b) => (parseAccountDate(a.date) - parseAccountDate(b.date)) * direction);
  }, [objectId, ascending, objects.data, accounts.data]);

  const onSort = (column: AccountSort) => {
    if (sort === column) {
      setAscending((value) => !value);
    } else {
      setSort(column);
      setAscending(true);
    }
  };

  useEffect(() => {
    if (!selected) {
      setOpen(false);
      return;
    }

    setView(selected);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    allowCloseRef.current = false;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
    // Зависимость сужена намеренно: панель раскрывается при смене
    // организации, а не на каждое обновление объекта selected — иначе
    // анимация проигрывалась бы заново на ровном месте.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.organization]);

  useEffect(() => {
    if (open || !view || selected) return;
    const timer = window.setTimeout(() => {
      setView(null);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, selected]);

  const requestClose = () => {
    allowCloseRef.current = true;
    setOpen(false);
    setSelected(null);
  };

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  return (
    <div className="ac-page">
      <Flex className="ac-page__toolbar" alignItems="center" gap={2} wrap>
        <Select
          size="l"
          width={280}
          label="Объект:"
          value={[objectId]}
          onUpdate={(value) => setObjectId(value[0] ?? ALL_OBJECTS)}
          options={objectFilterOptions}
          disabled={objects.isPending}
        />
        <Text variant="body-1" color="secondary">
          {objectId === ALL_OBJECTS ? `Всего счетов: ${rows.length}` : `Найдено: ${rows.length}`}
        </Text>
      </Flex>
      <div className="ac-page__scroll">
        {accounts.isPending && <LoadingState />}
        {accounts.isError && (
          <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
        )}
        {accounts.isSuccess && (
          <AccountsTable
            rows={rows}
            sort={sort}
            ascending={ascending}
            onSort={onSort}
            onOpen={(row) => setSelected(row)}
          />
        )}
      </div>

      <Drawer
        open={open}
        onOpenChange={(nextOpen, _event, reason) => {
          if (nextOpen) {
            setOpen(true);
            return;
          }

          if (allowCloseRef.current || reason === 'outside-press' || reason === 'escape-key') {
            setOpen(false);
            setSelected(null);
          }
        }}
        placement="bottom"
        size={height}
        maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
        contentOverflow="auto"
        className="accounts-drawer"
        contentClassName="accounts-drawer__panel"
      >
        {view && (
          <div className="accounts-drawer__card">
            <div className="accounts-drawer__header">
              <Text variant="subheader-2">{view.organization}</Text>
              <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
                <Icon data={Xmark} size={20} />
              </Button>
            </div>
            <div className="accounts-drawer__body">
              {view.meals.map((meal) => (
                <div key={meal.name} className="accounts-drawer__meal-card">
                  <div className="accounts-drawer__meal-head">
                    <Text variant="subheader-2">{meal.name}</Text>
                    <div className="accounts-drawer__meal-totals">
                      <Text variant="body-2">Прошли: {meal.passed} чел.</Text>
                      <Text variant="body-2">
                        Списано: {meal.charged.toLocaleString('ru-RU')} ₽
                      </Text>
                    </div>
                  </div>
                  <table className="admin-table accounts-drawer__diets" aria-label="Диеты">
                    <tbody>
                      {meal.diets.map((diet) => (
                        <tr key={diet.name}>
                          <td>{diet.name}</td>
                          <td style={{ textAlign: 'right' }}>{diet.passed} чел.</td>
                          <td style={{ textAlign: 'right' }}>
                            {diet.charged.toLocaleString('ru-RU')} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="accounts-drawer__footer">
              <div className="accounts-drawer__footer-inner">
                <Button view="normal" size="l" onClick={() => window.print()}>
                  <Icon data={Printer} size={16} />
                  Печать
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/** Шапка таблицы закреплена, скроллится только список строк. */
function AccountsTable({
  rows,
  onOpen,
}: {
  rows: AccountRow[];
  onOpen: (row: AccountRow) => void;
}) {
  const columns: TableColumnConfig<AccountRow>[] = [
    {
      id: 'date',
      name: 'Дата',
      template: (row) => <Text variant="body-2">{row.date}</Text>,
    },
    {
      id: 'organization',
      name: 'Организация',
      template: (row) => <Text variant="body-2">{row.organization}</Text>,
    },
    {
      id: 'passed',
      name: 'Прошли',
      align: 'end',
      template: (row) => <Text variant="body-2">{row.passed} чел.</Text>,
    },
    {
      id: 'charged',
      name: 'Списано',
      align: 'end',
      template: (row) => <Text variant="body-2">{row.charged.toLocaleString('ru-RU')} ₽</Text>,
    },
  ];

  return (
    <>
      <div className="ac-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap">
        <Table
          width="max"
          className="admin-table ac-page__table-body"
          data={rows}
          onRowClick={onOpen}
          columns={columns}
        />
      </div>
    </>
  );
}
