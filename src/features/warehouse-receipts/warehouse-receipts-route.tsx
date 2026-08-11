import { useState } from 'react';
import { Button, Card, Flex, Icon, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Plus, Magnifier, ArrowRightToLine } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useReceipts } from './api';
import { ReceiptDrawer } from './warehouse-receipt-drawer';
import type { WarehouseReceipt } from './types';
import './warehouse-receipts-route.css';

const MOCK_WAREHOUSE_ID = 'warehouse-central'; // пока захардкодили

export function WarehouseReceiptsRoute() {
  const api = useApi();
  const toaster = useToaster();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<WarehouseReceipt | null>(null);

  const { data, isLoading, error } = useReceipts(MOCK_WAREHOUSE_ID);

  const onCreateReceipt = () => {
    toaster.add({
      name: 'receipt-create',
      title: 'Функция пока в разработке',
      theme: 'info',
    });
  };

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-receipts-page">
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

  if (!data?.receipts.length) {
    return (
      <Flex direction="column" alignItems="center" gap={2} style={{ padding: '48px 24px' }}>
        <Text variant="body-1">Нет приходов</Text>
      </Flex>
    );
  }

  const filteredRows = data.receipts.filter((receipt) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return receipt.invoiceNumber.toLowerCase().includes(query) || receipt.date.includes(query);
  });

  return (
    <div className="warehouse-receipts-page">
      <Card view="filled" style={{ padding: 0, margin: 16 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={ArrowRightToLine} size={16} />
            <Text variant="subheader-2">Приходы по накладным</Text>
          </Flex>
          <Flex alignItems="center" gap={2} wrap>
            <TextInput
              size="m"
              placeholder="Поиск по номеру накладной"
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
              style={{ width: 280 }}
            />
            <Button onClick={onCreateReceipt} size="m">
              <Icon data={Plus} size={16} />
              Приход
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
                  <th style={{ width: 150 }}>Накладная</th>
                  <th>Товары</th>
                  <th style={{ width: 120 }}>Кол-во позиций</th>
                  <th style={{ width: 140 }}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((receipt, index) => {
                  const totalSum = receipt.items.reduce((sum, item) => sum + item.totalPrice, 0);
                  return (
                    <tr
                      key={receipt.id}
                      className={index === filteredRows.length - 1 ? 'admin-table__row_last' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpened(receipt)}
                    >
                      <td>{new Date(receipt.date).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <Text variant="body-1" style={{ fontWeight: 600 }}>
                          {receipt.invoiceNumber}
                        </Text>
                      </td>
                      <td>
                        <Text variant="body-2" color="secondary">
                          {receipt.items.map((i) => i.productName).join(', ')}
                        </Text>
                      </td>
                      <td>{receipt.items.length}</td>
                      <td>{totalSum.toFixed(2)} ₽</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <ReceiptDrawer receipt={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
