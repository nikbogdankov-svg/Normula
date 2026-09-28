import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Flex, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import { Plus, TrashBin } from '@gravity-ui/icons';
import { ProductPicker } from '@/features/products/product-picker';
import { useBalances } from '@/features/warehouse-balances/api';
import { useCreateWriteOff } from './api';
import type { CreateWriteOffRequest } from './types';

interface DraftItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  series: string;
}

const emptyItem = (): DraftItem => ({
  productId: '',
  productName: '',
  unit: '',
  quantity: '',
  series: '',
});

/** Сегодня в формате дд/мм/гггг. */
function todayLocal(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

/** дд/мм/гггг → гггг-мм-дд (формат хранения/бэка). */
function toIsoDate(value: string): string {
  const [dd, mm, yyyy] = value.split('/');
  if (!dd || !mm || yyyy?.length !== 4) return '';
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Попап создания исключительного списания (СКЛАД-03). Обычные списания
 * создаются автоматически по нормам — вручную заводят только исключительные,
 * поэтому тип здесь не выбирается.
 */
export function CreateWriteOffDialog({
  open,
  warehouseId,
  onClose,
}: {
  open: boolean;
  warehouseId: string;
  onClose: () => void;
}) {
  const create = useCreateWriteOff();
  const toaster = useToaster();
  const [date, setDate] = useState(todayLocal());
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const { data: balances } = useBalances(warehouseId);

  // Номера и цены партий по продукту — источники для селекта «Серия» и для
  // автоподсчёта суммы списания.
  const batchesByProduct = useMemo(() => {
    const map = new Map<string, Array<{ number: string; price: number }>>();
    for (const balance of balances?.balances ?? []) {
      for (const item of balance.items) {
        const list = map.get(item.productId) ?? [];
        for (const batch of item.batches) {
          if (!list.some((entry) => entry.number === batch.batchNumber)) {
            list.push({ number: batch.batchNumber, price: batch.price });
          }
        }
        map.set(item.productId, list);
      }
    }
    return map;
  }, [balances]);

  useEffect(() => {
    if (!open) return;
    setDate(todayLocal());
    setReason('');
    setItems([emptyItem()]);
  }, [open]);

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeItem = (index: number) => {
    setItems((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };
  const allItemsComplete =
    items.length > 0 && items.every((row) => row.productName.trim() && row.quantity.trim());

  // Автоподсчёт итога: количество × цена выбранной партии.
  const totalSum = items.reduce((sum, row) => {
    const qty = Number(row.quantity);
    if (!qty) return sum;
    const batch = (batchesByProduct.get(row.productId) ?? []).find(
      (entry) => entry.number === row.series
    );
    return sum + (batch?.price ?? 0) * qty;
  }, 0);

  const canSubmit = toIsoDate(date.trim()) !== '' && reason.trim() !== '' && allItemsComplete;

  const submit = () => {
    const body: CreateWriteOffRequest = {
      type: 'exceptional',
      date: toIsoDate(date.trim()),
      warehouseId,
      reason: reason.trim(),
      items: items.map((row) => {
        const qty = Number(row.quantity);
        const batch = (batchesByProduct.get(row.productId) ?? []).find(
          (entry) => entry.number === row.series
        );
        return {
          productId: row.productId,
          quantity: qty,
          unitPrice: batch?.price ?? 0,
          series: row.series.trim() || undefined,
        };
      }),
    };

    create.mutate(body, {
      onSuccess: () => {
        toaster.add({
          name: 'write-off-created',
          title: 'Списание создано',
          theme: 'success',
        });
        onClose();
      },
      onError: (e) =>
        toaster.add({
          name: 'write-off-create',
          title: 'Ошибка',
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="l">
      <Dialog.Header caption="Добавить списание" />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Flex gap={2} alignItems="flex-end" wrap>
            <div style={{ flex: 1, minWidth: 220 }}>
              <DatePicker
                size="l"
                view="normal"
                label="Дата:"
                placeholder="дд/мм/гггг"
                value={date ? dateTime({ input: date, format: 'DD/MM/YYYY' }) : null}
                onUpdate={(next) => setDate(next ? next.format('DD/MM/YYYY') : '')}
                style={{ width: '100%' }}
              />
            </div>
          </Flex>

          <TextInput
            size="l"
            label="Причина списания:"
            placeholder="Например, просрочка продукции"
            value={reason}
            onUpdate={setReason}
            autoFocus
          />

          <Flex direction="column" gap={3} style={{ marginTop: 4 }}>
            {items.map((row, index) => (
              <Flex key={index} gap={2} alignItems="flex-end">
                <div style={{ flex: 2 }}>
                  <ProductPicker
                    value={row.productId}
                    valueLabel={row.productName}
                    placeholder="Название товара"
                    size="l"
                    onChange={(product) =>
                      updateItem(index, {
                        productId: product?.id ?? '',
                        productName: product?.name ?? '',
                        unit: product?.unit ?? '',
                        series: '',
                      })
                    }
                  />
                </div>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <Select
                    size="l"
                    label="Серия:"
                    placeholder="Выберите партию"
                    value={row.series ? [row.series] : []}
                    onUpdate={(next) => updateItem(index, { series: next[0] ?? '' })}
                    options={(batchesByProduct.get(row.productId) ?? []).map((batch) => ({
                      value: batch.number,
                      content: batch.number,
                    }))}
                    disabled={!row.productId}
                    hasClear
                    width="max"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <TextInput
                    size="l"
                    label="Кол-во:"
                    placeholder="0"
                    value={row.quantity}
                    onUpdate={(value) => updateItem(index, { quantity: value })}
                    style={{ width: '100%' }}
                    endContent={
                      row.unit ? (
                        <span
                          style={{
                            color: 'var(--g-color-text-secondary)',
                            paddingInlineEnd: 4,
                          }}
                        >
                          {row.unit}
                        </span>
                      ) : undefined
                    }
                  />
                </div>
                <Button
                  view="flat"
                  size="l"
                  onClick={() => removeItem(index)}
                  title="Удалить"
                  aria-label="Удалить товар"
                  disabled={items.length <= 1}
                >
                  <Icon data={TrashBin} size={18} />
                </Button>
              </Flex>
            ))}

            <Button
              view="normal"
              size="l"
              onClick={() => setItems((rows) => [...rows, emptyItem()])}
              style={{ alignSelf: 'flex-start' }}
            >
              <Icon data={Plus} size={16} />
              Добавить товар
            </Button>
          </Flex>
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex alignItems="center" justifyContent="space-between" gap={2} style={{ width: '100%' }}>
          <Text variant="subheader-2">Итого: {totalSum.toFixed(2)} ₽</Text>
          <Flex gap={2}>
            <Button view="outlined" size="l" onClick={onClose}>
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              onClick={submit}
              disabled={!canSubmit}
              loading={create.isPending}
            >
              <Icon data={Plus} size={16} />
              Добавить списание
            </Button>
          </Flex>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
