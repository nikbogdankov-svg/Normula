import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Flex, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import { ArrowRightArrowLeft, Plus, TrashBin } from '@gravity-ui/icons';
import { useCreateTransfer, useOpenBatches, useUpdateTransfer } from '@/features/warehouse/api';
import {
  decimalToInput,
  formatDate,
  formatQuantity,
  isoToPicker,
  parseDecimal,
  pickerToIso,
  todayPicker,
} from '@/features/warehouse/format';
import { ObjectSelect, type ObjectOption } from '@/features/warehouse/object-select';
import {
  QUANTITY_DECIMALS,
  type Batch,
  type Transfer,
  type TransferRequest,
} from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import { errorText } from '@/shared/api/error-text';

/** Строка формы: накладная выбирается первой, товар — из её партий. */
interface DraftRow {
  receiptId: string;
  batchId: string;
  quantity: string;
}

const emptyRow = (): DraftRow => ({ receiptId: '', batchId: '', quantity: '' });

/** Накладная в селекте: номер и дата. */
interface ReceiptOption {
  value: string;
  content: string;
}

/**
 * Партии склада-отправителя. Бэкенд отдаёт только открытые партии, а при
 * редактировании строки этого же перемещения могли исчерпать партию до нуля —
 * тогда её нет в ответе. Собственные строки добавляются обратно, и их
 * количество прибавляется к остатку: бэкенд при замене строк считает так же.
 */
function availableBatches(open: Batch[], initial: Transfer | null, fromObjectId: string): Batch[] {
  const byId = new Map<string, Batch>();
  for (const batch of open) {
    byId.set(batch.id, { ...batch });
  }

  if (initial && initial.fromObjectId === fromObjectId) {
    for (const item of initial.items) {
      const existing = byId.get(item.batchId);
      if (existing) {
        existing.remaining += item.quantity;
        continue;
      }

      byId.set(item.batchId, {
        id: item.batchId,
        receiptId: item.receiptId,
        invoiceNumber: item.invoiceNumber,
        receiptDate: '',
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        unitPrice: 0,
        quantity: item.quantity,
        remaining: item.quantity,
      });
    }
  }

  return [...byId.values()];
}

/** Диалог создания и редактирования перемещения между складами. */
export function CreateTransferDialog({
  open,
  objectOptions,
  initial = null,
  onClose,
}: {
  open: boolean;
  objectOptions: ObjectOption[];
  initial?: Transfer | null;
  onClose: () => void;
}) {
  const create = useCreateTransfer();
  const update = useUpdateTransfer();
  const toaster = useToaster();
  const { t } = useTranslation();
  const [fromObjectId, setFromObjectId] = useState('');
  const [toObjectId, setToObjectId] = useState('');
  const [date, setDate] = useState(todayPicker());
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  const openBatches = useOpenBatches(fromObjectId);

  useEffect(() => {
    if (!open) return;

    if (initial) {
      setFromObjectId(initial.fromObjectId);
      setToObjectId(initial.toObjectId);
      setDate(isoToPicker(initial.date));
      setRows(
        initial.items.map((item) => ({
          receiptId: item.receiptId,
          batchId: item.batchId,
          quantity: decimalToInput(item.quantity),
        }))
      );
    } else {
      setFromObjectId('');
      setToObjectId('');
      setDate(todayPicker());
      setRows([emptyRow()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- форма заполняется при открытии
  }, [open, initial?.id]);

  const batches = useMemo(
    () => availableBatches(openBatches.data?.batches ?? [], initial, fromObjectId),
    [openBatches.data, initial, fromObjectId]
  );

  const batchById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches]);

  // Накладные, в которых есть что переносить: порядок — как у бэкенда.
  const receiptOptions = useMemo(() => {
    const out: ReceiptOption[] = [];
    const seen = new Set<string>();
    for (const batch of batches) {
      if (seen.has(batch.receiptId)) continue;
      seen.add(batch.receiptId);
      const date = batch.receiptDate
        ? ` ${t('transfer.fromDate', { date: formatDate(batch.receiptDate) })}`
        : '';
      out.push({ value: batch.receiptId, content: `${batch.invoiceNumber}${date}` });
    }
    return out;
  }, [batches, t]);

  const batchOptionsFor = (receiptId: string) =>
    batches
      .filter((batch) => batch.receiptId === receiptId)
      .map((batch) => ({
        value: batch.id,
        content: t('transfer.productRemaining', {
          name: batch.productName,
          remaining: formatQuantity(batch.remaining, batch.unit),
        }),
      }));

  // Склады не должны совпадать: каждый селект скрывает выбранный в другом.
  const fromOptions = useMemo(
    () => objectOptions.filter((option) => option.value !== toObjectId),
    [objectOptions, toObjectId]
  );

  const toOptions = useMemo(
    () => objectOptions.filter((option) => option.value !== fromObjectId),
    [objectOptions, fromObjectId]
  );

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  const changeFromObject = (next: string) => {
    setFromObjectId(next);
    setRows([emptyRow()]);
  };

  /** Проблема строки для подсветки; null — строка готова к отправке. */
  const rowProblem = (row: DraftRow, index: number): string | null => {
    const batch = batchById.get(row.batchId);
    if (!batch) return t('transfer.errorSelectReceiptProduct');

    if (rows.some((other, i) => i !== index && other.batchId === row.batchId)) {
      return t('transfer.errorDuplicateBatch');
    }

    const quantity = parseDecimal(row.quantity, QUANTITY_DECIMALS);
    if (quantity === null || quantity <= 0) return t('transfer.errorEnterQuantity');
    if (quantity > batch.remaining) {
      return t('transfer.errorNotMore', {
        max: formatQuantity(batch.remaining, batch.unit),
      });
    }

    return null;
  };

  const problems = rows.map(rowProblem);
  const isoDate = pickerToIso(date.trim());
  const canSubmit =
    fromObjectId !== '' &&
    toObjectId !== '' &&
    toObjectId !== fromObjectId &&
    isoDate !== '' &&
    problems.every((problem) => problem === null);

  const submit = () => {
    const body: TransferRequest = {
      fromObjectId,
      toObjectId,
      date: isoDate,
      items: rows.map((row) => ({
        batchId: row.batchId,
        quantity: parseDecimal(row.quantity, QUANTITY_DECIMALS) ?? 0,
      })),
    };

    const onSuccess = () => {
      toaster.add({
        name: initial ? 'transfer-updated' : 'transfer-created',
        title: initial ? t('transfer.toastUpdated') : t('transfer.toastCreated'),
        theme: 'success',
      });
      onClose();
    };
    const onError = (e: Error) =>
      toaster.add({
        name: initial ? 'transfer-update' : 'transfer-create',
        title: t('common.error'),
        content: errorText(e),
        theme: 'danger',
      });

    if (initial) {
      update.mutate({ id: initial.id, body }, { onSuccess, onError });
    } else {
      create.mutate(body, { onSuccess, onError });
    }
  };

  const noBatches = openBatches.isSuccess && batches.length === 0;

  return (
    <Dialog open={open} onClose={onClose} size="l">
      <Dialog.Header caption={initial ? t('transfer.editTitle') : t('transfer.addTitle')} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Flex gap={2} alignItems="flex-end" wrap>
            <div style={{ flex: 1, minWidth: 220 }}>
              <ObjectSelect
                value={fromObjectId}
                onUpdate={changeFromObject}
                options={fromOptions}
                label={t('transfer.fromLabel')}
                width="max"
              />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <ObjectSelect
                value={toObjectId}
                onUpdate={setToObjectId}
                options={toOptions}
                label={t('transfer.toLabel')}
                width="max"
              />
            </div>
          </Flex>

          {fromObjectId !== '' && toObjectId === fromObjectId && (
            <Text variant="body-2" color="danger">
              {t('transfer.sameObjectError')}
            </Text>
          )}

          <Flex gap={2} alignItems="flex-end" wrap>
            <div style={{ flex: 1, minWidth: 220 }}>
              <DatePicker
                size="l"
                view="normal"
                label={t('transfer.dateLabel')}
                placeholder={t('transfer.datePlaceholder')}
                value={date ? dateTime({ input: date, format: 'DD/MM/YYYY' }) : null}
                onUpdate={(next) => setDate(next ? next.format('DD/MM/YYYY') : '')}
                style={{ width: '100%' }}
              />
            </div>
          </Flex>

          {noBatches && (
            <Text variant="body-2" color="secondary">
              {t('transfer.noBatches')}
            </Text>
          )}

          <Flex direction="column" gap={3} style={{ marginTop: 4 }}>
            {rows.map((row, index) => {
              const batch = batchById.get(row.batchId);
              const problem = problems[index];
              const quantityInvalid =
                row.quantity.trim() !== '' && problem !== null && batch !== undefined;

              return (
                <Flex key={index} gap={2} alignItems="flex-end">
                  <div style={{ flex: 2, minWidth: 180 }}>
                    <Select
                      size="l"
                      label={t('transfer.receiptLabel')}
                      placeholder={t('transfer.receiptPlaceholder')}
                      value={row.receiptId ? [row.receiptId] : []}
                      onUpdate={(next) =>
                        updateRow(index, { receiptId: next[0] ?? '', batchId: '', quantity: '' })
                      }
                      options={receiptOptions}
                      disabled={openBatches.isPending || receiptOptions.length === 0}
                      width="max"
                    />
                  </div>
                  <div style={{ flex: 3, minWidth: 240 }}>
                    <Select
                      size="l"
                      label={t('transfer.productLabel')}
                      placeholder={t('transfer.productPlaceholder')}
                      value={row.batchId ? [row.batchId] : []}
                      onUpdate={(next) => updateRow(index, { batchId: next[0] ?? '' })}
                      options={batchOptionsFor(row.receiptId)}
                      disabled={!row.receiptId}
                      width="max"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <TextInput
                      size="l"
                      label={t('transfer.quantityLabel')}
                      placeholder="0"
                      value={row.quantity}
                      onUpdate={(value) => updateRow(index, { quantity: value })}
                      disabled={!row.batchId}
                      validationState={quantityInvalid ? 'invalid' : undefined}
                      errorMessage={quantityInvalid ? problem : undefined}
                      style={{ width: '100%' }}
                      endContent={
                        batch ? (
                          <span
                            style={{
                              color: 'var(--g-color-text-secondary)',
                              paddingInlineEnd: 4,
                            }}
                          >
                            {batch.unit}
                          </span>
                        ) : undefined
                      }
                    />
                  </div>
                  <Button
                    view="flat"
                    size="l"
                    onClick={() => removeRow(index)}
                    title={t('common.delete')}
                    aria-label={t('transfer.deleteRow')}
                    disabled={rows.length <= 1}
                  >
                    <Icon data={TrashBin} size={18} />
                  </Button>
                </Flex>
              );
            })}

            <Button
              view="normal"
              size="l"
              onClick={() => setRows((current) => [...current, emptyRow()])}
              style={{ alignSelf: 'flex-start' }}
              disabled={noBatches}
            >
              <Icon data={Plus} size={16} />
              {t('transfer.addProduct')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex alignItems="center" justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Flex gap={2}>
            <Button view="outlined" size="l" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              view="action"
              size="l"
              onClick={submit}
              disabled={!canSubmit}
              loading={initial ? update.isPending : create.isPending}
            >
              <Icon data={ArrowRightArrowLeft} size={16} />
              {initial ? t('common.save') : t('transfer.submit')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
