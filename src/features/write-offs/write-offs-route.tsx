import { useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  SegmentedRadioGroup,
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
import { useWriteOffs } from '@/features/warehouse/api';
import { formatDate, formatMoney } from '@/features/warehouse/format';
import { ObjectSelect, useObjectChoice } from '@/features/warehouse/object-select';
import { useDebouncedValue } from '@/features/warehouse/use-debounced-value';
import type { WriteOff, WriteOffKind, WriteOffSummary } from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import { WriteOffDrawer } from './write-off-drawer';
import { CreateWriteOffDialog } from './create-write-off-dialog';
import './write-offs-route.css';

function WriteOffsTable({
  writeOffs,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
}: {
  writeOffs: WriteOffSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (writeOff: WriteOffSummary) => void;
}) {
  const { t } = useTranslation();
  const columns: TableColumnConfig<WriteOffSummary>[] = [
    {
      id: 'date',
      name: t('writeOff.colDate'),
      template: (row) => <Text variant="body-2">{formatDate(row.date)}</Text>,
    },
    {
      id: 'reason',
      name: t('writeOff.colReason'),
      template: (row) => <Text variant="body-2">{row.reason}</Text>,
    },
    {
      id: 'itemsCount',
      name: t('writeOff.colItemsCount'),
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {row.itemsCount}
        </Text>
      ),
    },
    {
      id: 'total',
      name: t('writeOff.sumCol'),
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
            data={writeOffs}
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

/** Раздел «Склад → Списание»: списания выбранного объекта. */
export function WriteOffsRoute() {
  const api = useApi();
  const [objectId, setObjectId] = useState('');
  const { options, objects, changeObjectId } = useObjectChoice(objectId, setObjectId);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<WriteOffKind>('manual');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WriteOff | null>(null);
  const { t } = useTranslation();

  const writeOffs = useWriteOffs({ objectId, search: debouncedSearch }, kind);
  const rows = writeOffs.data?.pages.flatMap((page) => page.writeOffs) ?? [];

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="write-offs-page">
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
            placeholder={t('writeOff.searchPlaceholder')}
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
          <SegmentedRadioGroup
            size="l"
            value={kind}
            onUpdate={(value) => setKind(value as WriteOffKind)}
          >
            <SegmentedRadioGroup.Option value="manual" content={t('writeOff.kindManualPlural')} />
            <SegmentedRadioGroup.Option value="auto" content={t('writeOff.kindAutoPlural')} />
          </SegmentedRadioGroup>
        </Flex>
        <Button
          view="normal-contrast"
          size="l"
          onClick={() => setCreateOpen(true)}
          disabled={!objectId}
        >
          <Icon data={Plus} size={16} />
          {t('writeOff.viewTitle')}
        </Button>
      </Flex>

      {objects.isError && (
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      )}
      {noObjects && <EmptyState text={t('writeOff.noObjects')} />}
      {!noObjects && !objects.isError && (objects.isPending || writeOffs.isPending) && (
        <LoadingState />
      )}
      {writeOffs.isError && (
        <ErrorState error={writeOffs.error} onRetry={() => void writeOffs.refetch()} />
      )}
      {writeOffs.isSuccess && rows.length === 0 && (
        <EmptyState
          text={
            debouncedSearch
              ? t('writeOff.noResultsSearch', { query: debouncedSearch })
              : t('writeOff.empty')
          }
        />
      )}
      {writeOffs.isSuccess && rows.length > 0 && (
        <WriteOffsTable
          writeOffs={rows}
          hasMore={writeOffs.hasNextPage}
          loadingMore={writeOffs.isFetchingNextPage}
          onLoadMore={() => void writeOffs.fetchNextPage()}
          onOpen={(writeOff) => setOpenedId(writeOff.id)}
        />
      )}

      <WriteOffDrawer
        writeOffId={openedId}
        objectOptions={options}
        onClose={() => setOpenedId(null)}
        onEdit={(writeOff) => {
          setEditing(writeOff);
          setOpenedId(null);
        }}
      />
      <CreateWriteOffDialog
        open={createOpen || editing !== null}
        objectId={objectId}
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
