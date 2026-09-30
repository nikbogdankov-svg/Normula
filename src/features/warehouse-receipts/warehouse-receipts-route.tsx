import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  Text,
  TextInput,
  Select,
  Table,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { Plus, Magnifier, ArrowUp, ArrowDown, ArrowUpArrowDown } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useMockCateringObjects } from '@/features/objects/api';
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
  filterActive,
  dateSort,
  onDateSortToggle,
  onOpen,
}: {
  receipts: WarehouseReceipt[];
  filterActive: boolean;
  dateSort: 'asc' | 'desc';
  onDateSortToggle: () => void;
  onOpen: (receipt: WarehouseReceipt) => void;
}) {
  const columns: TableColumnConfig<WarehouseReceipt>[] = [
    {
      id: 'date',
      name: () => (
        <SortableHeader
          label="Дата"
          active
          ascending={dateSort === 'asc'}
          onToggle={onDateSortToggle}
        />
      ),
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
          {filterActive && receipts.length === 0 && (
            <Text variant="body-2" color="secondary" style={{ display: 'block', padding: 16 }}>
              Приходы по выбранным фильтрам не найдены
            </Text>
          )}
        </div>
      </div>
    </>
  );
}

export function WarehouseReceiptsRoute() {
  const api = useApi();
  const objects = useMockCateringObjects();
  const [search, setSearch] = useState('');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [opened, setOpened] = useState<WarehouseReceipt | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseReceipt | null>(null);
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useReceipts(MOCK_WAREHOUSE_ID);

  const objectsList = useMemo(() => objects.data?.objects ?? [], [objects.data]);

  useEffect(() => {
    const first = objects.data?.objects[0];
    if (first) setSelectedObjectId((current) => current || first.id);
  }, [objects.data]);

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-receipts-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  const filterActive = search.trim() !== '';

  const filteredRows = (data?.receipts ?? [])
    .filter((receipt) => {
      if (selectedObjectId && receipt.unitId !== selectedObjectId) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return receipt.invoiceNumber.toLowerCase().includes(query) || receipt.date.includes(query);
    })
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateSort === 'asc' ? diff : -diff;
    });

  return (
    <div className="wr-page">
      <Flex className="wr-page__toolbar" alignItems="center" justifyContent="space-between" gap={4}>
        <Flex alignItems="center" gap={2}>
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
          {objectsList.length > 0 && (
            <Select
              size="l"
              width={280}
              title="Объект"
              value={[selectedObjectId]}
              onUpdate={(value) => setSelectedObjectId(value[0] ?? '')}
              options={objectsList.map((unit) => ({ value: unit.id, content: unit.name }))}
            />
          )}
        </Flex>
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
          filterActive={filterActive}
          dateSort={dateSort}
          onDateSortToggle={() => setDateSort(dateSort === 'desc' ? 'asc' : 'desc')}
          onOpen={(receipt) => setOpened(receipt)}
        />
      )}

      <ReceiptDrawer
        receipt={opened}
        onClose={() => setOpened(null)}
        onEdit={(receipt) => {
          setEditing(receipt);
          setOpened(null);
        }}
      />
      <CreateReceiptDrawer
        open={createOpen || Boolean(editing)}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        warehouseId={MOCK_WAREHOUSE_ID}
        initial={editing}
      />
    </div>
  );
}

function SortableHeader({
  label,
  active,
  ascending,
  onToggle,
}: {
  label: string;
  active: boolean;
  ascending: boolean;
  onToggle: () => void;
}) {
  const icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpArrowDown;

  return (
    <Flex
      alignItems="center"
      justifyContent="flex-start"
      gap={1}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={onToggle}
      title={
        active
          ? ascending
            ? 'По возрастанию — нажмите для убывания'
            : 'По убыванию — нажмите для возрастания'
          : `Сортировать по: ${label}`
      }
    >
      {label}
      <span
        style={{
          display: 'inline-flex',
          color: active ? 'var(--g-color-text-primary)' : 'var(--g-color-text-secondary)',
        }}
      >
        <Icon data={icon} size={14} />
      </span>
    </Flex>
  );
}
