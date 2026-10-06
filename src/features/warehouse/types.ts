/**
 * Контракт склада — warehouse.v1.WarehouseService в onemore-admin
 * (api/warehouse/v1/warehouse.proto).
 *
 * Партия — строка приходной накладной. Остаток партии — приход минус
 * списания из неё. Списание привязано к объекту, его строки берут партии
 * только этого объекта; цена списания — цена партии.
 *
 * Количества — до трёх знаков после запятой, цены — до двух; больше знаков
 * бэкенд не принимает. Суммы считает бэкенд (копейка к копейке), фронт их
 * только показывает.
 */

/** Накладная в списке, без строк. */
export interface ReceiptSummary {
  id: string;
  objectId: string;
  /** гггг-мм-дд */
  date: string;
  invoiceNumber: string;
  itemsCount: number;
  /** Сумма накладной, ₽. */
  total: number;
}

/** Строка накладной, она же партия. */
export interface ReceiptItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  packaging: string;
  manufacturer: string;
  supplier: string;
  /** гггг-мм-дд */
  productionDate: string;
  documentType: string;
  documentNumber: string;
  organoleptic: string;
  storageConditions: string;
  /** гггг-мм-дд */
  expiryDate: string;
  note: string;
}

/** Накладная целиком. */
export interface Receipt {
  id: string;
  objectId: string;
  date: string;
  invoiceNumber: string;
  items: ReceiptItem[];
  total: number;
}

/** Строка накладной в запросе. Все поля, кроме id и note, обязательны. */
export interface ReceiptItemInput {
  /** id существующей строки при изменении; пусто — новая строка. */
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  packaging: string;
  manufacturer: string;
  supplier: string;
  productionDate: string;
  documentType: string;
  documentNumber: string;
  organoleptic: string;
  storageConditions: string;
  expiryDate: string;
  note: string;
}

/** Тело POST и PATCH /v1/warehouse/receipts. */
export interface ReceiptRequest {
  objectId: string;
  date: string;
  invoiceNumber: string;
  items: ReceiptItemInput[];
}

export interface ListReceiptsResponse {
  receipts: ReceiptSummary[];
  /** Курсор следующей страницы; пусто — страниц больше нет. */
  nextCursor: string;
}

export interface GetReceiptResponse {
  receipt: Receipt;
}

/** Списание в списке, без строк. */
export interface WriteOffSummary {
  id: string;
  objectId: string;
  date: string;
  reason: string;
  itemsCount: number;
  total: number;
}

/** Строка списания. */
export interface WriteOffItem {
  id: string;
  /** Партия — строка накладной. */
  batchId: string;
  receiptId: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

/** Списание целиком. */
export interface WriteOff {
  id: string;
  objectId: string;
  date: string;
  reason: string;
  items: WriteOffItem[];
  total: number;
}

export interface WriteOffItemInput {
  batchId: string;
  quantity: number;
}

/** Тело POST и PATCH /v1/warehouse/write-offs. */
export interface WriteOffRequest {
  objectId: string;
  date: string;
  reason: string;
  items: WriteOffItemInput[];
}

export interface ListWriteOffsResponse {
  writeOffs: WriteOffSummary[];
  nextCursor: string;
}

export interface GetWriteOffResponse {
  writeOff: WriteOff;
}

/** Перемещение в списке, без строк. */
export interface TransferSummary {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  date: string;
  itemsCount: number;
}

/** Строка перемещения. */
export interface TransferItem {
  id: string;
  /** Партия — строка накладной. */
  batchId: string;
  receiptId: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
}

/** Перемещение целиком. */
export interface Transfer {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  date: string;
  items: TransferItem[];
}

export interface TransferItemInput {
  batchId: string;
  quantity: number;
}

/** Тело POST и PATCH /v1/warehouse/transfers. */
export interface TransferRequest {
  fromObjectId: string;
  toObjectId: string;
  date: string;
  items: TransferItemInput[];
}

export interface ListTransfersResponse {
  transfers: TransferSummary[];
  nextCursor: string;
}

export interface GetTransferResponse {
  transfer: Transfer;
}

/** Партия с остатком — для экрана остатков и диалога списания. */
export interface Batch {
  id: string;
  receiptId: string;
  invoiceNumber: string;
  receiptDate: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  remaining: number;
}

export interface ListOpenBatchesResponse {
  batches: Batch[];
}

/** Параметры страницы списка документов. */
export interface ListParams {
  objectId: string;
  search: string;
}

/** Размер страницы списков; бэкенд по умолчанию отдаёт 50, потолок 10000. */
export const PAGE_SIZE = 50;

/** Знаков после запятой у количества и цены — как у бэкенда. */
export const QUANTITY_DECIMALS = 3;
export const PRICE_DECIMALS = 2;
