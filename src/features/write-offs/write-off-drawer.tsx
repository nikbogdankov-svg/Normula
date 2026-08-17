import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Flex, Icon, Text } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import type { WriteOff } from './types';
import './write-off-drawer.css';

/**
 * Детали списания как нижний Drawer (desktop).
 * Просмотр в нижней панели.
 */
export function WriteOffDrawer({
  writeOff,
  onClose,
}: {
  writeOff: WriteOff | null;
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WriteOff | null>(null);
  const allowCloseRef = useRef(false);

  useEffect(() => {
    if (!writeOff) {
      setOpen(false);
      return;
    }

    setView(writeOff);
  }, [writeOff]);

  useEffect(() => {
    if (!writeOff) return;

    allowCloseRef.current = false;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открытие по id списания
  }, [writeOff?.id]);

  useEffect(() => {
    if (open || !view || writeOff) return;
    const timer = window.setTimeout(() => {
      setView(null);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, writeOff]);

  const requestClose = () => {
    allowCloseRef.current = true;
    setOpen(false);
    onClose();
  };

  if (!view) return null;

  const totalSum = view.items.reduce((sum, item) => sum + item.totalPrice, 0);

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
      className="write-off-drawer"
      contentClassName="write-off-drawer__panel"
    >
      <div className="write-off-drawer__card">
        <div className="write-off-drawer__header">
          <Text variant="subheader-2">Списание: {view.reason}</Text>
          <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
            <Icon data={Xmark} size={20} />
          </Button>
        </div>

        <div className="write-off-drawer__body">
          <Flex direction="column" gap={3}>
            <Flex direction="column" gap={1}>
              <Text variant="body-2" color="secondary">
                Причина: <strong>{view.reason}</strong>
              </Text>
              <Text variant="body-2" color="secondary">
                Дата: <strong>{new Date(view.date).toLocaleDateString('ru-RU')}</strong>
              </Text>
              <Text variant="body-2" color="secondary">
                Тип: <strong>{view.type === 'exceptional' ? 'Исключительное' : 'Обычное'}</strong>
              </Text>
            </Flex>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Кол-во</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Ед.</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Цена</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {view.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{item.unit}</td>
                      <td style={{ textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="admin-table__row_total">
                    <td>
                      <strong>Всего</strong>
                    </td>
                    <td />
                    <td />
                    <td />
                    <td style={{ textAlign: 'right' }}>
                      <strong>{totalSum.toFixed(2)} ₽</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Flex>
        </div>
      </div>
    </Drawer>
  );
}
