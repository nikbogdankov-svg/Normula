/** Остатки товара (СКЛАД-02). */
export interface WarehouseBalance {
  id: string;
  date: string; // ISO 8601
  warehouseId: string;
  items: BalanceItem[];
  createdAt: string;
  updatedAt: string;
}

/** Товар в балансе. */
export interface BalanceItem {
  productId: string;
  productName: string;
  unit: string; // "кг", "л", "шт"
  batches: BalanceBatch[];
}

/** Партия товара в балансе. */
export interface BalanceBatch {
  batchId: string;
  batchNumber: string; // номер накладной/партии
  remaining: number; // оставшееся количество
  price: number; // цена за единицу
}

/** Запрос создания баланса. */
export interface CreateBalanceRequest {
  date: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    endingBalance: number;
  }>;
}

/** Ответ списка балансов. */
export interface GetBalancesResponse {
  balances: WarehouseBalance[];
  total: number;
}