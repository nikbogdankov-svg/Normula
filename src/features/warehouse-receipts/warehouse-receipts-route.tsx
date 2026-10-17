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
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useReceipts } from '@/features/warehouse/api';
import { formatDate, formatMoney } from '@/features/warehouse/format';
import { ObjectSelect, useObjectChoice } from '@/features/warehouse/object-select';
import { useDebouncedValue } from '@/features/warehouse/use-debounced-value';
import type { Receipt, ReceiptSummary } from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import { ReceiptDrawer } from './warehouse-receipt-drawer';
import { CreateReceiptDrawer } from './create-receipt-drawer';
import './warehouse-receipts-route.css';

function ReceiptsTable({
  receipts,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
}: {
  receipts: ReceiptSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (receipt: ReceiptSummary) => void;
}) {
  const { t } = useTranslation();
  const columns: TableColumnConfig<ReceiptSummary>[] = [
    {
      id: 'date',
      name: t('common.date'),
      template: (row) => <Text variant="body-2">{formatDate(row.date)}</Text>,
    },
    {
      id: 'invoiceNumber',
      name: t('receipt.viewTitlePlain'),
      template: (row) => <Text variant="body-2">{row.invoiceNumber}</Text>,
    },
    {
      id: 'itemsCount',
      name: t('receipt.listColItemsCount'),
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {row.itemsCount}
        </Text>
      ),
    },
    {
      id: 'total',
      name: t('common.amount'),
      align: 'end',
      template: (row) => <Text variant="body-2">{formatMoney(row.total)}</Text>,
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
          {hasMore && (
            <Flex justifyContent="center" style={{ padding: 8 }}>
              <Button view="flat" size="l" loading={loadingMore} onClick={onLoadMore}>
                {t('common.loadMore')}
              </Button>
            </Flex>
          )}
        </div>
      </div>
    </>
  );
}

/** Раздел «Склад → Приход»: накладные выбранного объекта. */
export function WarehouseReceiptsRoute() {
  const api = useApi();
  const { t } = useTranslation();
  const [objectId, setObjectId] = useState('');
  const { options, objects, changeObjectId } = useObjectChoice(objectId, setObjectId);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);

  const receipts = useReceipts({ objectId, search: debouncedSearch });
  const rows = receipts.data?.pages.flatMap((page) => page.receipts) ?? [];

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-receipts-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  const noObjects = objects.isSuccess && options.length === 0;

  return (
    <div className="wr-page">
      <Flex className="wr-page__toolbar" alignItems="center" justifyContent="space-between" gap={4}>
        <Flex alignItems="center" gap={2} wrap>
          <ObjectSelect
            value={objectId}
            onUpdate={changeObjectId}
            options={options}
            disabled={objects.isPending}
          />
          <TextInput
            size="l"
            placeholder={t('receipt.searchPlaceholder')}
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
        <Button
          view="normal-contrast"
          size="l"
          onClick={() => setCreateOpen(true)}
          disabled={!objectId}
        >
          <Icon data={Plus} size={16} />
          {t('receipt.addButton')}
        </Button>
      </Flex>

      {objects.isError && (
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      )}
      {noObjects && <EmptyState text={t('receipt.emptyNoObjects')} />}
      {!noObjects && !objects.isError && (objects.isPending || receipts.isPending) && (
        <LoadingState />
      )}
      {receipts.isError && (
        <ErrorState error={receipts.error} onRetry={() => void receipts.refetch()} />
      )}
      {receipts.isSuccess && rows.length === 0 && (
        <EmptyState
          text={
            debouncedSearch
              ? t('receipt.emptySearch', { query: debouncedSearch })
              : t('receipt.emptyNone')
          }
        />
      )}
      {receipts.isSuccess && rows.length > 0 && (
        <ReceiptsTable
          receipts={rows}
          hasMore={receipts.hasNextPage}
          loadingMore={receipts.isFetchingNextPage}
          onLoadMore={() => void receipts.fetchNextPage()}
          onOpen={(receipt) => setOpenedId(receipt.id)}
        />
      )}

      <ReceiptDrawer
        receiptId={openedId}
        objectOptions={options}
        onClose={() => setOpenedId(null)}
        onEdit={(receipt) => {
          setEditing(receipt);
          setOpenedId(null);
        }}
      />
      <CreateReceiptDrawer
        open={createOpen || editing !== null}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        objectId={objectId}
        objectOptions={options}
        initial={editing}
      />
    </div>
  );
}
