import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Flex, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import { Plus, TrashBin } from '@gravity-ui/icons';
import { useCreateWriteOff, useOpenBatches, useUpdateWriteOff } from '@/features/warehouse/api';
import {
  decimalToInput,
  formatDate,
  formatMoney,
  formatQuantity,
  isoToPicker,
  lineTotal,
  parseDecimal,
  pickerToIso,
  todayPicker,
} from '@/features/warehouse/format';
import { ObjectSelect, type ObjectOption } from '@/features/warehouse/object-select';
import {
  QUANTITY_DECIMALS,
  type Batch,
  type WriteOff,
  type WriteOffRequest,
} from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';

/** Строка формы: накладная выбирается первой, товар — из её партий. */
interface DraftRow {
  receiptId: string;
  batchId: string;
  quantity: string;
}

const emptyRow = (): DraftRow => ({ receiptId: '', batchId: '', quantity: '' });

/** В количестве разрешены только цифры и десятичный разделитель: минус и буквы отсекаются. */
function sanitizeNumber(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}

/** Накладная в селекте: номер и дата. */
interface ReceiptOption {
  value: string;
  content: string;
}

/**
 * Партии, доступные для списания. Бэкенд отдаёт только открытые партии, а
 * при редактировании строки этого же списания могли исчерпать партию до
 * нуля — тогда её нет в ответе. Собственные строки добавляются обратно, и
 * их количество прибавляется к остатку: бэкенд при замене строк считает так
 * же.
 */
function availableBatches(open: Batch[], initial: WriteOff | null, objectId: string): Batch[] {
  const byId = new Map<string, Batch>();
  for (const batch of open) {
    byId.set(batch.id, { ...batch });
  }

  if (initial && initial.objectId === objectId) {
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
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        remaining: item.quantity,
      });
    }
  }

  return [...byId.values()];
}

/** Диалог создания и редактирования списания. */
export function CreateWriteOffDialog({
  open,
  objectId,
  objectOptions,
  initial = null,
  onClose,
}: {
  open: boolean;
  /** Объект, выбранный на странице — подставляется в новое списание. */
  objectId: string;
  objectOptions: ObjectOption[];
  initial?: WriteOff | null;
  onClose: () => void;
}) {
  const create = useCreateWriteOff();
  const update = useUpdateWriteOff();
  const toaster = useToaster();
  const { t } = useTranslation();
  const [draftObjectId, setDraftObjectId] = useState('');
  const [date, setDate] = useState(todayPicker());
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  const openBatches = useOpenBatches(draftObjectId);

  useEffect(() => {
    if (!open) return;

    if (initial) {
      setDraftObjectId(initial.objectId);
      setDate(isoToPicker(initial.date));
      setReason(initial.reason);
      setRows(
        initial.items.map((item) => ({
          receiptId: item.receiptId,
          batchId: item.batchId,
          quantity: decimalToInput(item.quantity),
        }))
      );
    } else {
      setDraftObjectId(objectId);
      setDate(todayPicker());
      setReason('');
      setRows([emptyRow()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- форма заполняется при открытии
  }, [open, initial?.id]);

  const batches = useMemo(
    () => availableBatches(openBatches.data?.batches ?? [], initial, draftObjectId),
    [openBatches.data, initial, draftObjectId]
  );

  const batchById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches]);

  // Накладные, в которых есть что списать: порядок — как у бэкенда, свежие
  // сверху.
  const receiptOptions = useMemo(() => {
    const out: ReceiptOption[] = [];
    const seen = new Set<string>();
    for (const batch of batches) {
      if (seen.has(batch.receiptId)) continue;
      seen.add(batch.receiptId);
      const date = batch.receiptDate
        ? ` ${t('writeOff.fromDate', { date: formatDate(batch.receiptDate) })}`
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
        content: t('writeOff.productRemaining', {
          name: batch.productName,
          remaining: formatQuantity(batch.remaining, batch.unit),
          price: formatMoney(batch.unitPrice),
        }),
      }));

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  const changeObject = (next: string) => {
    setDraftObjectId(next);
    setRows([emptyRow()]);
  };

  /** Проблема строки для подсветки; null — строка готова к отправке. */
  const rowProblem = (row: DraftRow, index: number): string | null => {
    const batch = batchById.get(row.batchId);
    if (!batch) return t('writeOff.errorSelectReceiptProduct');

    if (rows.some((other, i) => i !== index && other.batchId === row.batchId)) {
      return t('writeOff.errorDuplicateBatch');
    }

    const quantity = parseDecimal(row.quantity, QUANTITY_DECIMALS);
    if (quantity === null || quantity <= 0) return t('writeOff.errorEnterQuantity');
    if (quantity > batch.remaining) {
      return t('writeOff.errorNotMore', {
        max: formatQuantity(batch.remaining, batch.unit),
      });
    }

    return null;
  };

  const problems = rows.map(rowProblem);
  const isoDate = pickerToIso(date.trim());
  const canSubmit =
    draftObjectId !== '' &&
    isoDate !== '' &&
    reason.trim() !== '' &&
    problems.every((problem) => problem === null);

  const total = rows.reduce((sum, row) => {
    const batch = batchById.get(row.batchId);
    const quantity = parseDecimal(row.quantity, QUANTITY_DECIMALS) ?? 0;
    return batch ? sum + lineTotal(quantity, batch.unitPrice) : sum;
  }, 0);

  const submit = () => {
    const body: WriteOffRequest = {
      objectId: draftObjectId,
      date: isoDate,
      reason: reason.trim(),
      items: rows.map((row) => ({
        batchId: row.batchId,
        quantity: parseDecimal(row.quantity, QUANTITY_DECIMALS) ?? 0,
      })),
    };

    const onSuccess = () => {
      toaster.add({
        name: initial ? 'write-off-updated' : 'write-off-created',
        title: initial ? t('writeOff.toastUpdated') : t('writeOff.toastCreated'),
        theme: 'success',
      });
      onClose();
    };
    const onError = (e: Error) =>
      toaster.add({
        name: initial ? 'write-off-update' : 'write-off-create',
        title: t('common.error'),
        content: e.message,
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
      <Dialog.Header caption={initial ? t('writeOff.editTitle') : t('writeOff.addTitle')} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Flex gap={2} alignItems="flex-end" wrap>
            <div style={{ flex: 1, minWidth: 220 }}>
              <ObjectSelect
                value={draftObjectId}
                onUpdate={changeObject}
                options={objectOptions}
                width="max"
              />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <DatePicker
                size="l"
                view="normal"
                label={t('writeOff.dateLabel')}
                placeholder={t('writeOff.datePlaceholder')}
                value={date ? dateTime({ input: date, format: 'DD/MM/YYYY' }) : null}
                onUpdate={(next) => setDate(next ? next.format('DD/MM/YYYY') : '')}
                style={{ width: '100%' }}
              />
            </div>
          </Flex>

          <TextInput
            size="l"
            label={t('writeOff.reasonLabel')}
            placeholder={t('writeOff.reasonPlaceholder')}
            value={reason}
            onUpdate={setReason}
            autoFocus
          />

          {noBatches && (
            <Text variant="body-2" color="secondary">
              {t('writeOff.noBatches')}
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
                      label={t('writeOff.receiptLabel')}
                      placeholder={t('writeOff.receiptPlaceholder')}
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
                      label={t('writeOff.productLabel')}
                      placeholder={t('writeOff.productPlaceholder')}
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
                      label={t('writeOff.quantityLabel')}
                      placeholder="0"
                      value={row.quantity}
                      onUpdate={(value) => updateRow(index, { quantity: sanitizeNumber(value) })}
                      disabled={!row.batchId}
                      validationState={quantityInvalid ? 'invalid' : undefined}
                      errorMessage={quantityInvalid ? problem : undefined}
                      errorPlacement="inside"
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
                    aria-label={t('writeOff.deleteRow')}
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
              {t('writeOff.addProduct')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex alignItems="center" justifyContent="space-between" gap={2} style={{ width: '100%' }}>
          <Text variant="subheader-2">{t('writeOff.total', { value: formatMoney(total) })}</Text>
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
              <Icon data={Plus} size={16} />
              {initial ? t('common.save') : t('writeOff.addTitle')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
