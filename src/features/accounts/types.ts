/**
 * Контракт раздела «Счета» — ListAccounts в warehouse.v1.WarehouseService
 * (api/warehouse/v1/warehouse.proto).
 *
 * Счёт выписывается подтверждением раскладки: на объект или подобъект
 * порционника и дату — сколько человек прошло и на сколько списано со
 * склада, по приёмам пищи и диетам.
 */

import type { MealId } from '@/features/menu/types';

export interface AccountDiet {
  dietId: string;
  dietName: string;
  passed: number;
  /** Списано, Kč. */
  charged: number;
}

export interface AccountMeal {
  mealId: MealId;
  passed: number;
  charged: number;
  diets: AccountDiet[];
}

export interface Account {
  id: string;
  /** Объект или подобъект порционника. */
  objectId: string;
  objectName: string;
  /** гггг-мм-дд. */
  date: string;
  /** Человек за день по всем диетам. */
  passed: number;
  /** Списано за день, Kč: сумма автосписания. */
  charged: number;
  writeOffId: string;
  meals: AccountMeal[];
}

export interface ListAccountsResponse {
  /** Все счета организации, свежие сверху. */
  accounts: Account[];
}
