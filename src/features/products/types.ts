/**
 * Контракт раздела «Продукты» — справочник продуктов/ингредиентов.
 *
 * Справочник служит источником КБЖУ: из него меню и ТТК берут пищевую ценность.
 * Бэкенда под него пока нет — эндпоинты описаны здесь и реализованы
 * в mock-handlers, как и у других справочников.
 */

/** Категория продукта (бакалея, овощи, мясо и т.п.). */
export interface ProductCategory {
  id: string;
  name: string;
}

/** Продукт с пищевой ценностью на 100 г. */
export interface Product {
  id: string;
  name: string;
  categoryId: string;
  /** Калорийность на 100 г, ккал. */
  kcal: number;
  /** Белки на 100 г, г. */
  protein: number;
  /** Жиры на 100 г, г. */
  fat: number;
  /** Углеводы на 100 г, г. */
  carbs: number;
  /** Витамин С на 100 г, мг. */
  vitaminC: number;
}

export interface ListProductsResponse {
  products: Product[];
  total: number;
  /** Текущая страница (1-based). */
  page: number;
  /** Количество продуктов на странице. */
  pageSize: number;
}

export interface ListProductCategoriesResponse {
  categories: ProductCategory[];
}

export interface CreateProductRequest {
  name: string;
  categoryId: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  vitaminC: number;
}

/** Тело обновления продукта — те же поля, что и при создании. */
export type UpdateProductRequest = CreateProductRequest;
