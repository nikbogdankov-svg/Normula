import { useEffect, useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  SegmentedRadioGroup,
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
import { useWriteOffs } from './api';
import { WriteOffDrawer } from './write-off-drawer';
import { CreateWriteOffDialog } from './create-write-off-dialog';
import type { WriteOff, WriteOffType } from './types';
import './write-offs-route.css';

const MOCK_WAREHOUSE_ID = 'warehouse-central'; // пока захардкодили

/** Сумма позиций списания. */
function writeOffTotal(writeOff: WriteOff): number {
  return writeOff.items.reduce((sum, item) => sum + item.totalPrice, 0);
}

function WriteOffsTable({
  writeOffs,
  filterActive,
  dateSort,
  onDateSortToggle,
  onOpen,
}: {
  writeOffs: WriteOff[];
  filterActive: boolean;
  dateSort: 'asc' | 'desc';
  onDateSortToggle: () => void;
  onOpen: (writeOff: WriteOff) => void;
}) {
  const columns: TableColumnConfig<WriteOff>[] = [
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
      id: 'reason',
      name: 'Причина',
      template: (row) => <Text variant="body-2">{row.reason}</Text>,
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
      template: (row) => <Text variant="body-2">{writeOffTotal(row).toFixed(2)} ₽</Text>,
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
            data={writeOffs}
            onRowClick={onOpen}
            columns={columns}
          />
          {filterActive && writeOffs.length === 0 && (
            <Text variant="body-2" color="secondary" style={{ display: 'block', padding: 16 }}>
              Списания по выбранным фильтрам не найдены
            </Text>
          )}
        </div>
      </div>
    </>
  );
}

export function WriteOffsRoute() {
  const api = useApi();
  const objects = useMockCateringObjects();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<WriteOffType>('exceptional');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [opened, setOpened] = useState<WriteOff | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useWriteOffs(MOCK_WAREHOUSE_ID, type);

  const objectsList = objects.data?.objects ?? [];

  useEffect(() => {
    const first = objects.data?.objects[0];
    if (first) setSelectedObjectId((current) => current || first.id);
  }, [objects.data]);

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="write-offs-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  const filterActive = search.trim() !== '';

  const filteredRows = (data?.writeOffs ?? [])
    .filter((writeOff) => {
      if (selectedObjectId && writeOff.unitId !== selectedObjectId) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return writeOff.reason.toLowerCase().includes(query) || writeOff.date.includes(query);
    })
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateSort === 'asc' ? diff : -diff;
    });

  return (
    <div className="wr-page">
      <Flex className="wr-page__toolbar" alignItems="center" justifyContent="space-between" gap={4}>
        <Flex alignItems="center" gap={2} wrap>
          <TextInput
            size="l"
            placeholder="Поиск по причине"
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
          <SegmentedRadioGroup
            size="l"
            value={type}
            onUpdate={(value) => setType(value as WriteOffType)}
          >
            <SegmentedRadioGroup.Option value="exceptional" content="Исключительные" />
            <SegmentedRadioGroup.Option value="daily" content="Автоматические" />
          </SegmentedRadioGroup>
        </Flex>
        <Button view="normal-contrast" size="l" onClick={() => setCreateOpen(true)}>
          <Icon data={Plus} size={16} />
          Списание
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

      {!isLoading && !error && data && data.writeOffs.length === 0 && (
        <div className="wr-page__scroll">
          <div className="admin-table-wrap">
            <Text variant="body-1" style={{ display: 'block', padding: 16 }}>
              Нет списаний
            </Text>
          </div>
        </div>
      )}

      {!isLoading && !error && data && data.writeOffs.length > 0 && (
        <WriteOffsTable
          writeOffs={filteredRows}
          filterActive={filterActive}
          dateSort={dateSort}
          onDateSortToggle={() => setDateSort(dateSort === 'desc' ? 'asc' : 'desc')}
          onOpen={(writeOff) => setOpened(writeOff)}
        />
      )}

      <WriteOffDrawer writeOff={opened} onClose={() => setOpened(null)} />
      <CreateWriteOffDialog
        open={createOpen}
        warehouseId={MOCK_WAREHOUSE_ID}
        onClose={() => setCreateOpen(false)}
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
