import { useEffect, useState } from 'react';
import { Button, Drawer, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import { useTransfer } from '@/features/warehouse/api';
import { formatDate, formatQuantity } from '@/features/warehouse/format';
import { objectName, type ObjectOption } from '@/features/warehouse/object-select';
import type { Transfer } from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import './transfer-drawer.css';

function TransferView({
  transfer,
  objectOptions,
}: {
  transfer: Transfer;
  objectOptions: ObjectOption[];
}) {
  const { t } = useTranslation();
  return (
    <Flex direction="column" gap={3}>
      <Flex direction="column" gap={1}>
        <Text variant="body-2" color="secondary">
          {t('transfer.fromShort')}{' '}
          <strong>{objectName(objectOptions, transfer.fromObjectId)}</strong>
        </Text>
        <Text variant="body-2" color="secondary">
          {t('transfer.toShort')} <strong>{objectName(objectOptions, transfer.toObjectId)}</strong>
        </Text>
        <Text variant="body-2" color="secondary">
          {t('transfer.dateLabel')} <strong>{formatDate(transfer.date)}</strong>
        </Text>
      </Flex>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('transfer.invoiceCol')}</th>
              <th>{t('transfer.productCol')}</th>
              <th style={{ width: 120, textAlign: 'right' }}>{t('transfer.qtyCol')}</th>
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((item) => (
              <tr key={item.id}>
                <td>{item.invoiceNumber}</td>
                <td>{item.productName}</td>
                <td style={{ textAlign: 'right' }}>{formatQuantity(item.quantity, item.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Flex>
  );
}

/** Детали перемещения в нижнем drawer; перемещение грузится по id. */
export function TransferDrawer({
  transferId,
  objectOptions,
  onClose,
  onEdit,
}: {
  transferId: string | null;
  objectOptions: ObjectOption[];
  onClose: () => void;
  onEdit: (transfer: Transfer) => void;
}) {
  const height = useDrawerHeight();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const transfer = useTransfer(viewId);
  const { t } = useTranslation();

  useEffect(() => {
    if (transferId) {
      setViewId(transferId);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => setViewId(null), 220);
    return () => window.clearTimeout(timer);
  }, [transferId]);

  if (!viewId) return null;

  const view = transfer.data?.transfer;

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      placement="bottom"
      size={height}
      maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
      contentOverflow="auto"
      className="transfer-drawer"
      contentClassName="transfer-drawer__panel"
    >
      <div className="transfer-drawer__card">
        <div className="transfer-drawer__header">
          <Flex alignItems="center" gap={2}>
            <Text variant="subheader-2">
              {view
                ? t('transfer.viewTitleWith', {
                    from: objectName(objectOptions, view.fromObjectId),
                    to: objectName(objectOptions, view.toObjectId),
                  })
                : t('transfer.viewTitle')}
            </Text>
            {view && (
              <Label theme="normal" size="m">
                {formatDate(view.date)}
              </Label>
            )}
          </Flex>
          <Button view="flat" size="l" onClick={onClose} aria-label={t('common.close')}>
            <Icon data={Xmark} size={20} />
          </Button>
        </div>

        <div className="transfer-drawer__body">
          {transfer.isPending && <LoadingState />}
          {transfer.isError && (
            <ErrorState error={transfer.error} onRetry={() => void transfer.refetch()} />
          )}
          {view && <TransferView transfer={view} objectOptions={objectOptions} />}
        </div>

        <div className="transfer-drawer__footer">
          <Button view="outlined" size="l" onClick={onClose}>
            {t('transfer.close')}
          </Button>
          <Button view="normal" size="l" disabled={!view} onClick={() => view && onEdit(view)}>
            {t('transfer.edit')}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
