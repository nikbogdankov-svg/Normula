import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, Xmark } from '@gravity-ui/icons';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import type { ReceiptItem, WarehouseReceipt } from './types';
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
  if (!value) {
    return (
      <Text variant="body-2" color="secondary" className={className}>
        —
      </Text>
    );
  }
  return (
    <Text variant="body-2" color={color} className={className}>
      {value}
    </Text>
  );
}

/** Дополнительная информация о товаре, раскрываемая шевроном. */
function ItemDetails({ item }: { item: ReceiptItem }) {
  const rows: [string, string?][] = [
    ['Изготовитель', item.manufacturer],
    ['Фасовка', item.packaging],
    ['Дата выработки', item.productionDate],
    ['Тип документа', item.documentType],
    ['Органолептика', item.organoleptic],
    ['Условия хранения', item.storageConditions],
    ['Примечание', item.note],
  ];

  return (
    <div className="warehouse-receipt-drawer__details">
      {rows.map(([label, value]) => (
        <div key={label} className="warehouse-receipt-drawer__details-row">
          <Text variant="body-1" color="secondary">
            {label}
          </Text>
          {value ? (
            <Cell value={value} />
          ) : (
            <Text variant="body-2" color="secondary">
              —
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Детали накладной как нижний Drawer (desktop).
 * Просмотр в нижней панели: приёмочный контроль продукции по каждому товару.
 */
export function ReceiptDrawer({
  receipt,
  onClose,
}: {
  receipt: WarehouseReceipt | null;
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WarehouseReceipt | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const allowCloseRef = useRef(false);

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

  useEffect(() => {
    if (!receipt) {
      setOpen(false);
      return;
    }

    setView(receipt);
  }, [receipt]);

  useEffect(() => {
    if (!receipt) return;

    allowCloseRef.current = false;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открытие по id накладной
  }, [receipt?.id]);

  useEffect(() => {
    if (open || !view || receipt) return;
    const timer = window.setTimeout(() => {
      setView(null);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, receipt]);

  const requestClose = () => {
    allowCloseRef.current = true;
    setOpen(false);
    onClose();
  };

  if (!view) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen, _event, reason) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }

        // Явное закрытие (крестик / Escape).
        if (allowCloseRef.current || reason === 'outside-press' || reason === 'escape-key') {
          setOpen(false);
          onClose();
        }
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
              <Text variant="subheader-3">Накладная {view.invoiceNumber}</Text>
              <Label theme="normal" size="m">
                {new Date(view.date).toLocaleDateString('ru-RU').replaceAll('.', '/')}
              </Label>
            </Flex>
            <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="warehouse-receipt-drawer__body">
          <Flex direction="column" gap={4}>
            <Flex direction="column" gap={2}>
              <div className="warehouse-receipt-drawer__items">
                <div className="warehouse-receipt-drawer__items-head">
                  <Text variant="body-2">Товар</Text>
                  <Text variant="body-2">Кол-во</Text>
                  <Text variant="body-2">Поставщик</Text>
                  <Text variant="body-2">Номер документа</Text>
                  <Text variant="body-2" className="warehouse-receipt-drawer__cell-right">
                    Срок реал.
                  </Text>
                  <span></span>
                </div>

                {view.items.map((item) => {
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
                        <Text variant="body-2">
                          {item.quantity} {item.unit}
                        </Text>
                        <Cell value={item.supplier} color="secondary" />
                        <Cell value={item.documentNumber} color="secondary" />
                        <Cell
                          value={item.expiryDate}
                          className="warehouse-receipt-drawer__cell-right"
                        />
                        <Button
                          view="flat"
                          size="m"
                          className="warehouse-receipt-drawer__toggle"
                          onClick={() => toggleItem(item.id)}
                          aria-label="Больше информации"
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
        </div>
      </div>
    </Drawer>
  );
}
