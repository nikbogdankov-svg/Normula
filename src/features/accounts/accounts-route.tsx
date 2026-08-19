import { useEffect, useRef, useState } from 'react';
import { Button, Card, Drawer, Flex, Icon, Text } from '@gravity-ui/uikit';
import { Printer, Xmark, Wallet } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './accounts-drawer.css';

const ACCOUNT_ROWS = [
  {
    date: '12.08.2026',
    organization: 'Школа №5',
    passed: 312,
    charged: 124800,
    invoiced: 132000,
    departments: [
      {
        name: 'Столовая 1',
        passed: 120,
        charged: 48000,
        invoiced: 51000,
        meals: [
          {
            name: 'Завтрак',
            passed: 40,
            charged: 16000,
            invoiced: 17000,
            diets: [
              { name: 'Обычная', passed: 24, charged: 9600, invoiced: 10200 },
              { name: 'Диета 5', passed: 16, charged: 6400, invoiced: 6800 },
            ],
          },
          {
            name: 'Обед',
            passed: 45,
            charged: 18000,
            invoiced: 19000,
            diets: [
              { name: 'Диета 5', passed: 25, charged: 10000, invoiced: 10500 },
              { name: 'Безмолочная', passed: 20, charged: 8000, invoiced: 8500 },
            ],
          },
        ],
      },
      {
        name: 'Столовая 2',
        passed: 98,
        charged: 39200,
        invoiced: 42000,
        meals: [
          {
            name: 'Завтрак',
            passed: 32,
            charged: 12800,
            invoiced: 13600,
            diets: [
              { name: 'Обычная', passed: 18, charged: 7200, invoiced: 7600 },
              { name: 'Диета 5', passed: 14, charged: 5600, invoiced: 6000 },
            ],
          },
          {
            name: 'Обед',
            passed: 38,
            charged: 15200,
            invoiced: 16400,
            diets: [
              { name: 'Диета 5', passed: 20, charged: 8000, invoiced: 8600 },
              { name: 'Белковая', passed: 18, charged: 7200, invoiced: 7800 },
            ],
          },
        ],
      },
    ],
  },
  {
    date: '12.08.2026',
    organization: 'Детский сад №3',
    passed: 198,
    charged: 79200,
    invoiced: 84600,
    departments: [
      {
        name: 'Группа ясельная',
        passed: 68,
        charged: 27200,
        invoiced: 29000,
        meals: [
          {
            name: 'Завтрак',
            passed: 24,
            charged: 9600,
            invoiced: 10200,
            diets: [
              { name: 'Обычная', passed: 14, charged: 5600, invoiced: 6000 },
              { name: 'Пюревая', passed: 10, charged: 4000, invoiced: 4200 },
            ],
          },
          {
            name: 'Обед',
            passed: 24,
            charged: 9600,
            invoiced: 10200,
            diets: [{ name: 'Пюревая', passed: 24, charged: 9600, invoiced: 10200 }],
          },
        ],
      },
    ],
  },
];

type AccountRow = (typeof ACCOUNT_ROWS)[number];

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
    <div className="accounts-page">
      <Card view="filled" style={{ padding: 0, margin: 16 }}>
        <Flex
          alignItems="center"
          // justifyContent="space-between"
          gap={2}
          style={{ padding: '12px 16px' }}
        >
          <Icon data={Wallet} size={16} />
          <Text variant="subheader-2">Счета</Text>
        </Flex>

        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Дата
                    </Text>
                  </th>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Организация
                    </Text>
                  </th>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Прошли
                    </Text>
                  </th>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Списано
                    </Text>
                  </th>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Выставлено
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNT_ROWS.map((row, index) => (
                  <tr
                    key={`${row.date}-${row.organization}`}
                    className={index === ACCOUNT_ROWS.length - 1 ? 'admin-table__row_last' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(row)}
                  >
                    <td>{row.date}</td>
                    <td>{row.organization}</td>
                    <td>{row.passed} чел.</td>
                    <td>{row.charged.toLocaleString('ru-RU')} ₽</td>
                    <td>{row.invoiced.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

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
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Категория</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Прошли</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Списано</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Выставлено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.departments.flatMap((department, deptIndex) => {
                      const rows = [
                        <tr
                          key={`department-${department.name}`}
                          className={[
                            deptIndex === view.departments.length - 1 &&
                            (!department.meals || department.meals.length === 0)
                              ? 'admin-table__row_last'
                              : '',
                            deptIndex > 0 ? 'accounts-drawer__department-row' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <td>
                            <Text variant="body-1" style={{ fontWeight: 600 }}>
                              {department.name}
                            </Text>
                          </td>
                          <td style={{ textAlign: 'right' }}>{department.passed} чел.</td>
                          <td style={{ textAlign: 'right' }}>
                            {department.charged.toLocaleString('ru-RU')} ₽
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {department.invoiced.toLocaleString('ru-RU')} ₽
                          </td>
                        </tr>,
                      ];

                      if (department.meals?.length) {
                        department.meals.forEach((meal) => {
                          rows.push(
                            <tr
                              key={`meal-${department.name}-${meal.name}`}
                              className="accounts-drawer__meal-row"
                            >
                              <td style={{ paddingLeft: 24 }}>
                                <Text variant="body-1" style={{ fontWeight: 600 }}>
                                  {meal.name}
                                </Text>
                              </td>
                              <td style={{ textAlign: 'right' }}>{meal.passed} чел.</td>
                              <td style={{ textAlign: 'right' }}>
                                {meal.charged.toLocaleString('ru-RU')} ₽
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {meal.invoiced.toLocaleString('ru-RU')} ₽
                              </td>
                            </tr>
                          );

                          rows.push(
                            ...meal.diets.map((diet, dietIndex) => {
                              const dietName = typeof diet === 'string' ? diet : diet.name;
                              const isObjectDiet = typeof diet !== 'string' && diet !== null;
                              const dietPassed =
                                isObjectDiet && diet.passed != null ? `${diet.passed} чел.` : '';
                              const dietCharged =
                                isObjectDiet && diet.charged != null
                                  ? `${diet.charged.toLocaleString('ru-RU')} ₽`
                                  : '';
                              const dietInvoiced =
                                isObjectDiet && diet.invoiced != null
                                  ? `${diet.invoiced.toLocaleString('ru-RU')} ₽`
                                  : '';

                              return (
                                <tr
                                  key={`diet-${department.name}-${meal.name}-${dietName}-${dietIndex}`}
                                  className="accounts-drawer__diet-row"
                                >
                                  <td style={{ paddingLeft: 40 }}>
                                    <Text variant="body-2" color="secondary">
                                      Диета: {dietName}
                                    </Text>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>{dietPassed}</td>
                                  <td style={{ textAlign: 'right' }}>{dietCharged}</td>
                                  <td style={{ textAlign: 'right' }}>{dietInvoiced}</td>
                                </tr>
                              );
                            })
                          );
                        });
                      }

                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
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
