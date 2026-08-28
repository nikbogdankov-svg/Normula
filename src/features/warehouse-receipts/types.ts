/** Приход товара по накладной/УПД (СКЛАД-01). */
export interface WarehouseReceipt {
  id: string;
  date: string; // ISO 8601
  invoiceNumber: string;
  warehouseId: string;
  items: ReceiptItem[];
  createdAt: string;
  updatedAt: string;
}

/** Товар в приходе. */
export interface ReceiptItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string; // "кг", "л", "шт"
  unitPrice: number;
  totalPrice: number;
  // Приёмочный контроль (бракераж сырья): заполняется на уровне товара.
  packaging?: string;
  productionDate?: string; // yyyy-MM-dd
  manufacturer?: string;
  supplier?: string;
  documentNumber?: string; // декларация/свидетельство/ветсанэкспертиза
  documentType?: string;
  organoleptic?: string;
  storageConditions?: string;
  expiryDate?: string; // yyyy-MM-dd
  note?: string;
}

/** Ответ на создание прихода. */
export interface CreateReceiptRequest {
  date: string;
  invoiceNumber: string;
  warehouseId: string;
  items: Array<{
    productId?: string;
    productName?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    // Приёмочный контроль (бракераж сырья): заполняется на уровне товара.
    packaging?: string;
    productionDate?: string; // yyyy-MM-dd
    manufacturer?: string;
    supplier?: string;
    documentNumber?: string;
    documentType?: string;
    organoleptic?: string;
    storageConditions?: string;
    expiryDate?: string; // yyyy-MM-dd
    note?: string;
  }>;
}

/** Ответ списка приходов. */
export interface GetReceiptsResponse {
  receipts: WarehouseReceipt[];
  total: number;
}
