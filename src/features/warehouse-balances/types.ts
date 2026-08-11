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
  beginningBalance: number;
  receipts: number;
  writeOff: number;
  endingBalance: number;
  unit: string; // "кг", "л", "шт"
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
