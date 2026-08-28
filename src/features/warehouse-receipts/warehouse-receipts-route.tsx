import { useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  Text,
  TextInput,
  Table,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { Plus, Magnifier } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useReceipts } from './api';
import { ReceiptDrawer } from './warehouse-receipt-drawer';
import { CreateReceiptDrawer } from './create-receipt-drawer';
import type { WarehouseReceipt } from './types';
import './warehouse-receipts-route.css';

const MOCK_WAREHOUSE_ID = 'warehouse-central'; // пока захардкодили

/** Сумма позиций прихода. */
function receiptTotal(receipt: WarehouseReceipt): number {
  return receipt.items.reduce((sum, item) => sum + item.totalPrice, 0);
}

function ReceiptsTable({
  receipts,
  search,
  onOpen,
}: {
  receipts: WarehouseReceipt[];
  search: string;
  onOpen: (receipt: WarehouseReceipt) => void;
}) {
  const columns: TableColumnConfig<WarehouseReceipt>[] = [
    {
      id: 'date',
      name: 'Дата',
      template: (row) => (
        <Text variant="body-2">{new Date(row.date).toLocaleDateString('ru-RU')}</Text>
      ),
    },
    {
      id: 'invoiceNumber',
      name: 'Накладная',
      template: (row) => <Text variant="body-2">{row.invoiceNumber}</Text>,
    },
    {
      id: 'itemsCount',
      name: 'Кол-во товаров',
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {row.items.length}
        </Text>
      ),
    },
    {
      id: 'total',
      name: 'Сумма',
      align: 'end',
      template: (row) => <Text variant="body-2">{receiptTotal(row).toFixed(2)} ₽</Text>,
    },
  ];

  return (
    <>
      <div className="wr-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="wr-page__scroll">
        <div className="admin-table-wrap">
          <Table
            width="max"
            className="admin-table wr-page__table-body"
            data={receipts}
            onRowClick={onOpen}
            columns={columns}
          />
          {search.trim() !== '' && receipts.length === 0 && (
            <Text variant="body-2" color="secondary" style={{ display: 'block', padding: 16 }}>
              Ничего не нашли по запросу «{search}»
            </Text>
          )}
        </div>
      </div>
    </>
  );
}

export function WarehouseReceiptsRoute() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<WarehouseReceipt | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useReceipts(MOCK_WAREHOUSE_ID);

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-receipts-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  const filteredRows = (data?.receipts ?? []).filter((receipt) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return receipt.invoiceNumber.toLowerCase().includes(query) || receipt.date.includes(query);
  });

  return (
    <div className="wr-page">
      <Flex className="wr-page__toolbar" alignItems="center" justifyContent="space-between" gap={4}>
        <TextInput
          size="l"
          placeholder="Поиск по номеру накладной"
          value={search}
          onUpdate={setSearch}
          hasClear
          startContent={
            <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
              <Icon data={Magnifier} size={16} />
            </span>
          }
          style={{ width: 280 }}
        />
        <Button view="normal-contrast" size="l" onClick={() => setCreateOpen(true)}>
          <Icon data={Plus} size={16} />
          Приход
        </Button>
      </Flex>

      {isLoading && (
        <div className="wr-page__scroll">
          <div className="admin-table-wrap">
            <Text variant="body-1" style={{ display: 'block', padding: 16 }}>
              Загрузка...
            </Text>
          </div>
        </div>
      )}

      {error && (
        <div className="wr-page__scroll">
          <div className="admin-table-wrap">
            <Text variant="body-1" color="danger" style={{ display: 'block', padding: 16 }}>
              Ошибка: {error instanceof Error ? error.message : 'неизвестная ошибка'}
            </Text>
          </div>
        </div>
      )}

      {!isLoading && !error && data && data.receipts.length === 0 && (
        <div className="wr-page__scroll">
          <div className="admin-table-wrap">
            <Text variant="body-1" style={{ display: 'block', padding: 16 }}>
              Нет приходов
            </Text>
          </div>
        </div>
      )}

      {!isLoading && !error && data && data.receipts.length > 0 && (
        <ReceiptsTable
          receipts={filteredRows}
          search={search}
          onOpen={(receipt) => setOpened(receipt)}
        />
      )}

      <ReceiptDrawer receipt={opened} onClose={() => setOpened(null)} />
      <CreateReceiptDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        warehouseId={MOCK_WAREHOUSE_ID}
      />
    </div>
  );
}
