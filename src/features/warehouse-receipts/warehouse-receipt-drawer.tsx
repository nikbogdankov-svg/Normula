import { useEffect, useState } from 'react';
import { Button, Drawer, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, Xmark } from '@gravity-ui/icons';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import { useReceipt } from '@/features/warehouse/api';
import { formatDate, formatMoney, formatQuantity } from '@/features/warehouse/format';
import { objectName, type ObjectOption } from '@/features/warehouse/object-select';
import type { Receipt, ReceiptItem } from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import { receiptOptionLabel } from './receipt-options';
import './warehouse-receipt-drawer.css';

function Cell({
  value,
  color = 'primary',
  className,
}: {
  value?: string;
  color?: 'primary' | 'secondary' | 'complementary';
  className?: string;
}) {
  return (
    <Text variant="body-2" color={value ? color : 'secondary'} className={className}>
      {value || '—'}
    </Text>
  );
}

/** Приёмочный контроль строки, раскрывается шевроном. */
function ItemDetails({ item }: { item: ReceiptItem }) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t('receipt.detailManufacturer'), item.manufacturer],
    [t('receipt.detailPackaging'), item.packaging],
    [t('receipt.detailProductionDate'), formatDate(item.productionDate)],
    [t('receipt.detailDocumentType'), receiptOptionLabel(item.documentType, t)],
    [t('receipt.detailOrganoleptic'), receiptOptionLabel(item.organoleptic, t)],
    [t('receipt.detailStorageConditions'), receiptOptionLabel(item.storageConditions, t)],
    [t('receipt.detailUnitPrice'), formatMoney(item.unitPrice)],
    [t('receipt.detailTotal'), formatMoney(item.total)],
    [t('receipt.detailNote'), item.note],
  ];

  return (
    <div className="warehouse-receipt-drawer__details">
      {rows.map(([label, value]) => (
        <div key={label} className="warehouse-receipt-drawer__details-row">
          <Text variant="body-1" color="secondary">
            {label}
          </Text>
          <Cell value={value} />
        </div>
      ))}
    </div>
  );
}

function ReceiptView({
  receipt,
  objectOptions,
}: {
  receipt: Receipt;
  objectOptions: ObjectOption[];
}) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Flex direction="column" gap={4}>
      <Flex direction="column">
        <div className="warehouse-receipt-drawer__unit" style={{ marginBottom: 12 }}>
          <Flex alignItems="center" gap={4}>
            <Flex alignItems="center" gap={1}>
              <Text variant="body-3" color="secondary">
                {t('receipt.objectLabel')}
              </Text>
              <Text variant="body-3">{objectName(objectOptions, receipt.objectId)}</Text>
            </Flex>
            <Flex alignItems="center" gap={1}>
              <Text variant="body-3" color="secondary">
                {t('receipt.amountLabel')}
              </Text>
              <Text variant="body-3">{formatMoney(receipt.total)}</Text>
            </Flex>
          </Flex>
        </div>
        <div className="warehouse-receipt-drawer__items">
          <div className="warehouse-receipt-drawer__items-head">
            <Text variant="body-2">{t('receipt.colProduct')}</Text>
            <Text variant="body-2">{t('receipt.colQuantity')}</Text>
            <Text variant="body-2">{t('receipt.colSupplier')}</Text>
            <Text variant="body-2">{t('receipt.colDocumentNumber')}</Text>
            <Text variant="body-2" className="warehouse-receipt-drawer__cell-right">
              {t('receipt.colExpiry')}
            </Text>
            <span></span>
          </div>

          {receipt.items.map((item) => {
            const expanded = expandedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`warehouse-receipt-drawer__card${
                  expanded ? ' warehouse-receipt-drawer__card_expanded' : ''
                }`}
              >
                <div className="warehouse-receipt-drawer__card-main">
                  <div className="warehouse-receipt-drawer__card-name">
                    <Text variant="body-2">{item.productName}</Text>
                  </div>
                  <Text variant="body-2">{formatQuantity(item.quantity, item.unit)}</Text>
                  <Cell value={item.supplier} color="secondary" />
                  <Cell value={item.documentNumber} color="secondary" />
                  <Cell
                    value={formatDate(item.expiryDate)}
                    className="warehouse-receipt-drawer__cell-right"
                  />
                  <Button
                    view="flat"
                    size="m"
                    className="warehouse-receipt-drawer__toggle"
                    onClick={() => toggleItem(item.id)}
                    aria-label={t('receipt.moreInfo')}
                  >
                    <Icon data={expanded ? ChevronUp : ChevronDown} size={16} />
                  </Button>
                </div>
                {expanded && <ItemDetails item={item} />}
              </div>
            );
          })}
        </div>
      </Flex>
    </Flex>
  );
}

/**
 * Детали накладной в нижнем drawer. Накладная грузится по id: список отдаёт
 * только шапки, строки с приёмочным контролем — отдельным запросом.
 */
export function ReceiptDrawer({
  receiptId,
  objectOptions,
  onClose,
  onEdit,
}: {
  receiptId: string | null;
  objectOptions: ObjectOption[];
  onClose: () => void;
  onEdit: (receipt: Receipt) => void;
}) {
  const height = useDrawerHeight();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const receipt = useReceipt(viewId);

  // Открытие — после монтирования, чтобы сработала анимация; закрытие —
  // с задержкой, чтобы содержимое не пропало раньше панели.
  useEffect(() => {
    if (receiptId) {
      setViewId(receiptId);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => setViewId(null), 220);
    return () => window.clearTimeout(timer);
  }, [receiptId]);

  if (!viewId) return null;

  const view = receipt.data?.receipt;

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
      className="warehouse-receipt-drawer"
      contentClassName="warehouse-receipt-drawer__panel"
    >
      <div className="warehouse-receipt-drawer__card">
        <div className="warehouse-receipt-drawer__header">
          <div className="warehouse-receipt-drawer__header-inner">
            <Flex alignItems="center" gap={2}>
              <Text variant="subheader-3">
                {view
                  ? t('receipt.viewTitle', { number: view.invoiceNumber })
                  : t('receipt.viewTitlePlain')}
              </Text>
              {view && (
                <Label theme="normal" size="m">
                  {formatDate(view.date)}
                </Label>
              )}
            </Flex>
            <Button view="flat" size="l" onClick={onClose} aria-label={t('receipt.close')}>
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="warehouse-receipt-drawer__body">
          {receipt.isPending && <LoadingState />}
          {receipt.isError && (
            <ErrorState error={receipt.error} onRetry={() => void receipt.refetch()} />
          )}
          {view && <ReceiptView receipt={view} objectOptions={objectOptions} />}
        </div>

        <div className="warehouse-receipt-drawer__footer">
          <div className="warehouse-receipt-drawer__footer-inner">
            <Button view="outlined" size="l" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button view="normal" size="l" disabled={!view} onClick={() => view && onEdit(view)}>
              {t('common.edit')}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
