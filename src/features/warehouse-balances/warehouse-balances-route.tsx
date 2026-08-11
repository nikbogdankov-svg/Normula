import { useState } from 'react';
import { Button, Card, Flex, Icon, Text, TextInput } from '@gravity-ui/uikit';
import { Magnifier, Archive } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useBalances } from './api';
import type { WarehouseBalance } from './types';
import './warehouse-balances-route.css';

const MOCK_WAREHOUSE_ID = 'warehouse-central';

export function WarehouseBalancesRoute() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<WarehouseBalance | null>(null);

  const { data, isLoading, error } = useBalances(MOCK_WAREHOUSE_ID);

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

  const rows = data.balances.flatMap((balance) =>
    balance.items.flatMap((item) =>
      item.batches.map((batch, batchIndex) => ({
        id: batch.batchId,
        date: balance.date,
        productName: item.productName,
        batchNumber: batch.batchNumber,
        remaining: batch.remaining,
        price: batch.price,
        unit: item.unit,
        isFirstBatchOfProduct: batchIndex === 0,
        isLastBatchOfProduct: batchIndex === item.batches.length - 1,
      })),
    ),
  );

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      row.productName.toLowerCase().includes(query) ||
      row.batchNumber.toLowerCase().includes(query)
    );
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
              placeholder="Поиск по товару или партии"
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
              style={{ width: 320 }}
            />
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
                  <th>Товар</th>
                  <th>Партия</th>
                  <th style={{ width: 100 }}>Дата</th>
                  <th style={{ width: 120 }}>Цена</th>
                  <th style={{ width: 140 }}>Остаток</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={[
                      index === filteredRows.length - 1 ? 'admin-table__row_last' : '',
                      !row.isLastBatchOfProduct ? 'admin-table__row_no-border' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td>{row.isFirstBatchOfProduct ? row.productName : ''}</td>
                    <td>{row.batchNumber}</td>
                    <td>{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                    <td>{row.price} ₽</td>
                    <td>
                      {row.remaining} {row.unit}
                    </td>
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
                  <th style={{ textAlign: 'left', padding: 8 }}>Партия</th>
                  <th style={{ textAlign: 'right', width: 120, padding: 8 }}>Остаток</th>
                  <th style={{ textAlign: 'center', width: 80, padding: 8 }}>Ед.</th>
                </tr>
              </thead>
              <tbody>
                {opened.items.map((item) =>
                  item.batches.map((batch, batchIndex) => (
                    <tr
                      key={batch.batchId}
                      style={{ borderBottom: '1px solid var(--g-color-line-generic)' }}
                    >
                      <td style={{ padding: 8, fontWeight: batchIndex === 0 ? 600 : 400 }}>
                        {batchIndex === 0 ? item.productName : ''}
                      </td>
                      <td style={{ padding: 8 }}>{batch.batchNumber}</td>
                      <td style={{ textAlign: 'right', padding: 8, fontWeight: 600 }}>
                        {batch.remaining}
                      </td>
                      <td style={{ textAlign: 'center', padding: 8 }}>
                        {batchIndex === 0 ? item.unit : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Flex>
        </Card>
      )}
    </div>
  );
}
