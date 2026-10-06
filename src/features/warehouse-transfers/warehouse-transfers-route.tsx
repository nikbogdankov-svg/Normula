import { useMemo, useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  Text,
  TextInput,
  Table,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { ArrowRightArrowLeft, Magnifier } from '@gravity-ui/icons';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useTransfers } from '@/features/warehouse/api';
import { formatDate } from '@/features/warehouse/format';
import { objectName, objectOptions, type ObjectOption } from '@/features/warehouse/object-select';
import { useDebouncedValue } from '@/features/warehouse/use-debounced-value';
import { useObjects } from '@/features/objects/api';
import type { Transfer, TransferSummary } from '@/features/warehouse/types';
import { TransferDrawer } from './transfer-drawer';
import { CreateTransferDialog } from './create-transfer-dialog';
import './warehouse-transfers-route.css';

function TransfersTable({
  transfers,
  objectOptions,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
}: {
  transfers: TransferSummary[];
  objectOptions: ObjectOption[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (transfer: TransferSummary) => void;
}) {
  const columns: TableColumnConfig<TransferSummary>[] = [
    {
      id: 'date',
      name: 'Дата',
      template: (row) => <Text variant="body-2">{formatDate(row.date)}</Text>,
    },
    {
      id: 'from',
      name: 'Откуда',
      template: (row) => (
        <Text variant="body-2">{objectName(objectOptions, row.fromObjectId)}</Text>
      ),
    },
    {
      id: 'to',
      name: 'Куда',
      template: (row) => <Text variant="body-2">{objectName(objectOptions, row.toObjectId)}</Text>,
    },
    {
      id: 'itemsCount',
      name: 'Кол-во товаров',
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {row.itemsCount}
        </Text>
      ),
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
            data={transfers}
            onRowClick={onOpen}
            columns={columns}
          />
          {hasMore && (
            <Flex justifyContent="center" style={{ padding: 8 }}>
              <Button view="flat" size="l" loading={loadingMore} onClick={onLoadMore}>
                Загрузить ещё
              </Button>
            </Flex>
          )}
        </div>
      </div>
    </>
  );
}
/** Раздел «Склад → Перемещение»: перенос товаров между складами. */
export function WarehouseTransfersRoute() {
  const api = useApi();
  const objects = useObjects();
  const options = useMemo(() => objectOptions(objects.data?.objects ?? []), [objects.data]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);

  const transfers = useTransfers(debouncedSearch);
  const rows = transfers.data?.pages.flatMap((page) => page.transfers) ?? [];

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-transfers-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  return (
    <div className="wr-page">
      <Flex className="wr-page__toolbar" alignItems="center" justifyContent="space-between" gap={4}>
        <Flex alignItems="center" gap={2} wrap>
          <TextInput
            size="l"
            placeholder="Поиск по дате или объекту"
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
        </Flex>
        <Button view="normal-contrast" size="l" onClick={() => setCreateOpen(true)}>
          <Icon data={ArrowRightArrowLeft} size={16} />
          Добавить перемещение
        </Button>
      </Flex>

      {objects.isError && (
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      )}
      {!objects.isError && (objects.isPending || transfers.isPending) && <LoadingState />}
      {transfers.isError && (
        <ErrorState error={transfers.error} onRetry={() => void transfers.refetch()} />
      )}
      {transfers.isSuccess && rows.length === 0 && (
        <EmptyState
          text={
            debouncedSearch ? `Ничего не нашли по запросу «${debouncedSearch}»` : 'Нет перемещений'
          }
        />
      )}
      {transfers.isSuccess && rows.length > 0 && (
        <TransfersTable
          transfers={rows}
          objectOptions={options}
          hasMore={transfers.hasNextPage}
          loadingMore={transfers.isFetchingNextPage}
          onLoadMore={() => void transfers.fetchNextPage()}
          onOpen={(transfer) => setOpenedId(transfer.id)}
        />
      )}

      <TransferDrawer
        transferId={openedId}
        objectOptions={options}
        onClose={() => setOpenedId(null)}
        onEdit={(transfer) => {
          setEditing(transfer);
          setOpenedId(null);
        }}
      />
      <CreateTransferDialog
        open={createOpen || editing !== null}
        objectOptions={options}
        initial={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
