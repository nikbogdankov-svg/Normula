import { useEffect, useState } from 'react';
import { Button, Drawer, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import { useWriteOff } from '@/features/warehouse/api';
import { formatDate, formatMoney, formatQuantity } from '@/features/warehouse/format';
import { objectName, type ObjectOption } from '@/features/warehouse/object-select';
import type { WriteOff } from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import './write-off-drawer.css';

function WriteOffView({
  writeOff,
  objectOptions,
}: {
  writeOff: WriteOff;
  objectOptions: ObjectOption[];
}) {
  const { t } = useTranslation();
  return (
    <Flex direction="column" gap={3}>
      <Flex direction="column" gap={1}>
        <Text variant="body-2" color="secondary">
          {t('writeOff.objectLabel')}{' '}
          <strong>{objectName(objectOptions, writeOff.objectId)}</strong>
        </Text>
        <Text variant="body-2" color="secondary">
          {t('writeOff.dateLabel')} <strong>{formatDate(writeOff.date)}</strong>
        </Text>
        <Text variant="body-2" color="secondary">
          {t('writeOff.typeLabel')}{' '}
          <strong>
            {writeOff.kind === 'auto' ? t('writeOff.kindAuto') : t('writeOff.kindManual')}
          </strong>
        </Text>
      </Flex>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('writeOff.invoiceCol')}</th>
              <th>{t('writeOff.productCol')}</th>
              <th style={{ width: 120, textAlign: 'right' }}>{t('writeOff.qtyCol')}</th>
              <th style={{ width: 120, textAlign: 'right' }}>{t('writeOff.priceCol')}</th>
              <th style={{ width: 140, textAlign: 'right' }}>{t('writeOff.sumCol')}</th>
            </tr>
          </thead>
          <tbody>
            {writeOff.items.map((item) => (
              <tr key={item.id}>
                <td>{item.invoiceNumber}</td>
                <td>{item.productName}</td>
                <td style={{ textAlign: 'right' }}>{formatQuantity(item.quantity, item.unit)}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(item.total)}</td>
              </tr>
            ))}
            <tr className="admin-table__row_total">
              <td>
                <strong>{t('writeOff.grandTotal')}</strong>
              </td>
              <td />
              <td />
              <td />
              <td style={{ textAlign: 'right' }}>
                <strong>{formatMoney(writeOff.total)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Flex>
  );
}

/** Детали списания в нижнем drawer; списание грузится по id. */
export function WriteOffDrawer({
  writeOffId,
  objectOptions,
  onClose,
  onEdit,
}: {
  writeOffId: string | null;
  objectOptions: ObjectOption[];
  onClose: () => void;
  onEdit: (writeOff: WriteOff) => void;
}) {
  const height = useDrawerHeight();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const writeOff = useWriteOff(viewId);
  const { t } = useTranslation();

  useEffect(() => {
    if (writeOffId) {
      setViewId(writeOffId);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => setViewId(null), 220);
    return () => window.clearTimeout(timer);
  }, [writeOffId]);

  if (!viewId) return null;

  const view = writeOff.data?.writeOff;

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
      className="write-off-drawer"
      contentClassName="write-off-drawer__panel"
    >
      <div className="write-off-drawer__card">
        <div className="write-off-drawer__header">
          <Flex alignItems="center" gap={2}>
            <Text variant="subheader-2">
              {view
                ? t('writeOff.viewTitleWith', { reason: view.reason })
                : t('writeOff.viewTitle')}
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

        <div className="write-off-drawer__body">
          {writeOff.isPending && <LoadingState />}
          {writeOff.isError && (
            <ErrorState error={writeOff.error} onRetry={() => void writeOff.refetch()} />
          )}
          {view && <WriteOffView writeOff={view} objectOptions={objectOptions} />}
        </div>

        <div className="write-off-drawer__footer">
          <Button view="outlined" size="l" onClick={onClose}>
            {t('writeOff.close')}
          </Button>
          <Button
            view="normal"
            size="l"
            disabled={!view || view.kind === 'auto'}
            onClick={() => view && onEdit(view)}
          >
            {t('writeOff.edit')}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
