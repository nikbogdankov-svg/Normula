/** Тип списания: исключительное (разовое) или обычное (ежедневное). */
export type WriteOffType = 'exceptional' | 'daily';

/** Списание товара со склада (СКЛАД-03). */
export interface WriteOff {
  id: string;
  type: WriteOffType;
  date: string; // ISO 8601
  warehouseId: string;
  reason: string; // причина списания
  items: WriteOffItem[];
  createdAt: string;
  updatedAt: string;
}

/** Товар в списании. */
export interface WriteOffItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string; // "кг", "л", "шт"
  unitPrice: number;
  totalPrice: number;
}

/** Запрос создания списания. */
export interface CreateWriteOffRequest {
  type: WriteOffType;
  date: string;
  warehouseId: string;
  reason: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/** Ответ списка списаний. */
export interface GetWriteOffsResponse {
  writeOffs: WriteOff[];
  total: number;
}
