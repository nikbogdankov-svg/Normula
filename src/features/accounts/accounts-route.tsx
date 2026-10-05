import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Flex, Icon, Table, Text, type TableColumnConfig } from '@gravity-ui/uikit';
import { Printer, Xmark } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './accounts-route.css';
import './accounts-drawer.css';

const ACCOUNT_ROWS = [
  {
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
    date: '12.08.2026',
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

type AccountRow = (typeof ACCOUNT_ROWS)[number];

/** Колонки списка счетов — те же, что у таблицы ТТК. */
const ACCOUNT_COLUMNS: TableColumnConfig<AccountRow>[] = [
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

export function AccountsRoute() {
  const { current } = useOrganizations();
  const height = useDrawerHeight();
  const [selected, setSelected] = useState<AccountRow | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AccountRow | null>(null);
  const allowCloseRef = useRef(false);

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
      <div className="ac-page__scroll">
        <div className="ac-page__header">
          <Table width="max" className="admin-table" data={[]} columns={ACCOUNT_COLUMNS} />
        </div>
        <div className="admin-table-wrap">
          <Table
            width="max"
            className="admin-table ac-page__table-body"
            data={ACCOUNT_ROWS}
            onRowClick={(row) => setSelected(row)}
            columns={ACCOUNT_COLUMNS}
          />
        </div>
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
