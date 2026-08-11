import { useState } from 'react';
import { Button, Card, Flex, Icon, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Plus, Magnifier, Archive } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useBalances } from './api';
import type { WarehouseBalance } from './types';
import './warehouse-balances-route.css';

const MOCK_WAREHOUSE_ID = 'warehouse-central';

export function WarehouseBalancesRoute() {
  const api = useApi();
  const toaster = useToaster();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<WarehouseBalance | null>(null);

  const { data, isLoading, error } = useBalances(MOCK_WAREHOUSE_ID);

  const onCreateBalance = () => {
    toaster.add({
      name: 'balance-create',
      title: 'Функция пока в разработке',
      theme: 'info',
    });
  };

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-balances-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (isLoading) {
    return (
      <Flex justifyContent="center" style={{ padding: 48 }}>
        <Text variant="body-1">Загрузка...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Card view="filled" style={{ padding: 16 }}>
        <Text variant="body-1" color="danger">
          Ошибка: {error instanceof Error ? error.message : 'неизвестная ошибка'}
        </Text>
      </Card>
    );
  }

  if (!data?.balances.length) {
    return (
      <Flex direction="column" alignItems="center" gap={2} style={{ padding: '48px 24px' }}>
        <Text variant="body-1">Нет данных об остатках</Text>
      </Flex>
    );
  }

  const filteredRows = data.balances.filter((balance) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return balance.date.includes(query);
  });

  return (
    <div className="warehouse-balances-page">
      <Card view="filled" style={{ padding: 0, margin: 16 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={Archive} size={16} />
            <Text variant="subheader-2">Остатки товаров</Text>
          </Flex>
          <Flex alignItems="center" gap={2} wrap>
            <TextInput
              size="m"
              placeholder="Поиск по дате"
              value={search}
              onUpdate={setSearch}
              hasClear
              startContent={
                <span
                  style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                >
                  <Icon data={Magnifier} size={16} />
                </span>
              }
              style={{ width: 200 }}
            />
            <Button onClick={onCreateBalance} size="m">
              <Icon data={Plus} size={16} />
              Баланс
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
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Дата</th>
                  <th>Товары</th>
                  <th style={{ width: 140 }}>Кол-во позиций</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((balance, index) => (
                  <tr
                    key={balance.id}
                    className={index === filteredRows.length - 1 ? 'admin-table__row_last' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setOpened(balance)}
                  >
                    <td>{new Date(balance.date).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <Text variant="body-2" color="secondary">
                        {balance.items.map((i) => i.productName).join(', ')}
                      </Text>
                    </td>
                    <td>{balance.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {opened && (
        <Card view="filled" style={{ marginTop: 16, padding: 16 }}>
          <Flex direction="column" gap={3}>
            <Flex justifyContent="space-between" alignItems="center">
              <Text variant="subheader-2">Детали баланса</Text>
              <Button onClick={() => setOpened(null)} view="flat">
                Закрыть
              </Button>
            </Flex>

            <Text variant="body-2" color="secondary">
              Дата: <strong>{new Date(opened.date).toLocaleDateString('ru-RU')}</strong>
            </Text>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--g-color-line-generic)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Товар</th>
                  <th style={{ textAlign: 'right', width: 120, padding: 8 }}>На начало</th>
                  <th style={{ textAlign: 'right', width: 120, padding: 8 }}>Приходы</th>
                  <th style={{ textAlign: 'right', width: 120, padding: 8 }}>Списания</th>
                  <th style={{ textAlign: 'right', width: 120, padding: 8 }}>На конец</th>
                  <th style={{ textAlign: 'center', width: 80, padding: 8 }}>Ед.</th>
                </tr>
              </thead>
              <tbody>
                {opened.items.map((item) => (
                  <tr
                    key={item.productId}
                    style={{ borderBottom: '1px solid var(--g-color-line-generic)' }}
                  >
                    <td style={{ padding: 8 }}>{item.productName}</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>{item.beginningBalance}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: 8,
                        color: 'var(--g-color-text-positive)',
                      }}
                    >
                      +{item.receipts}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: 8,
                        color: 'var(--g-color-text-danger)',
                      }}
                    >
                      -{item.writeOff}
                    </td>
                    <td style={{ textAlign: 'right', padding: 8, fontWeight: 600 }}>
                      {item.endingBalance}
                    </td>
                    <td style={{ textAlign: 'center', padding: 8 }}>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Flex>
        </Card>
      )}
    </div>
  );
}
