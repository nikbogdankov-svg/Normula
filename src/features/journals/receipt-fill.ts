import { formatDate, formatQuantity } from '@/features/warehouse/format';
import type { Receipt, ReceiptItem } from '@/features/warehouse/types';
import { receiptOptionLabel } from '@/features/warehouse-receipts/receipt-options';

/** Значение ячейки журнала приёмки: суффикс поля (journals.field.*) → текст. */
export type ReceiptRowValues = Record<string, string>;

/**
 * Строка бракеражного журнала из одной строки накладной. Всё, что бэкенд
 * знает о партии, журнал получает готовым; дата фактической реализации и
 * подпись ответственного остаются под руку и печатаются пустыми.
 */
export function receiptRowValues(
  receipt: Receipt,
  item: ReceiptItem,
  t: (key: string) => string
): ReceiptRowValues {
  const expiry = item.expiryDate ? `${t('receipt.until')} ${formatDate(item.expiryDate)}` : '';
  const storage = [receiptOptionLabel(item.storageConditions, t), expiry]
    .filter(Boolean)
    .join('; ');

  return {
    arrivalDateTime: formatDate(receipt.date),
    productName: item.productName,
    packaging: item.packaging,
    productionDate: formatDate(item.productionDate),
    manufacturer: item.manufacturer,
    supplier: item.supplier,
    arrivalQuantity: formatQuantity(item.quantity, item.unit),
    safetyDocument: item.documentNumber || receiptOptionLabel(item.documentType, t),
    organoleptic: receiptOptionLabel(item.organoleptic, t),
    storageConditions: storage,
    note: item.note,
  };
}

/** Документ попал в период печати журнала: [from..to] включительно, гггг-мм-дд. */
export function receiptInPeriod(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/** Накладные в журнал идут по возрастанию даты — так их и подписывают. */
export function byReceiptDate(a: Receipt, b: Receipt): number {
  return a.date.localeCompare(b.date) || a.invoiceNumber.localeCompare(b.invoiceNumber);
}
