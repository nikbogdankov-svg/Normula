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
}

/** Ответ на создание прихода. */
export interface CreateReceiptRequest {
  date: string;
  invoiceNumber: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/** Ответ списка приходов. */
export interface GetReceiptsResponse {
  receipts: WarehouseReceipt[];
  total: number;
}
