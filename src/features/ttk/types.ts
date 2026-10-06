/**
 * Контракт раздела ТТК — ttk.v1.TtkService в onemore-admin
 * (api/ttk/v1/ttk.proto).
 *
 * Список отдаёт все карты организации кратко; поиск, сортировка и фильтр по
 * сборнику — на клиенте. Карта целиком грузится отдельным запросом.
 *
 * Брутто и нетто — в единице продукта из справочника, до трёх знаков.
 * Цена порции считается бэкендом по средним ценам открытых партий склада;
 * продукт без остатков даёт ноль.
 */

/** Карта в списке, без ингредиентов и технологии. */
export interface RecipeSummary {
  id: string;
  /** Название блюда. */
  name: string;
  /** Название сборника; пусто — карта без сборника. */
  collectionName: string;
  /** Выход порции: чистый выход и потери, целые. */
  yieldNet: number;
  yieldLoss: number;
  kcal: number;
  /** Цена порции, ₽. */
  price: number;
}

/** Ингредиент карты. */
export interface Ingredient {
  id: string;
  productId: string;
  productName: string;
  /** Единица продукта из справочника; в ней заданы брутто и нетто. */
  unit: string;
  gross: number;
  net: number;
  /** Средняя цена единицы продукта по складу, ₽; 0 без остатков. */
  unitPrice: number;
  /** Сумма строки, ₽. */
  total: number;
}

/** Карта целиком. */
export interface Recipe {
  id: string;
  name: string;
  collectionName: string;
  yieldNet: number;
  yieldLoss: number;
  technology: string;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  ingredients: Ingredient[];
  price: number;
}

export interface IngredientInput {
  productId: string;
  gross: number;
  net: number;
}

/** Тело POST и PATCH /v1/ttk. */
export interface RecipeRequest {
  name: string;
  collectionName: string;
  yieldNet: number;
  yieldLoss: number;
  technology: string;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  ingredients: IngredientInput[];
}

export interface ListRecipesResponse {
  recipes: RecipeSummary[];
}

export interface GetRecipeResponse {
  recipe: Recipe;
}

/** Знаков после запятой у брутто, нетто и пищевой ценности — как у бэкенда. */
export const RECIPE_DECIMALS = 3;

/*
 * Ниже — то, что ещё не на бэкенде.
 *
 * 1. Мок-двойник карт для разделов на моках (меню, порционник, раскладка
 *    продуктов): их мок-данные завязаны на мок-карты. См. useMockRecipes.
 *    Удаляется вместе с их моками.
 * 2. Разбор файлов сборников в браузере: результат пока никуда не
 *    отправляется, импорт на бэкенде — отдельная задача.
 */

/** Ингредиент мок-карты и разобранного из файла блюда. */
export interface CreateRecipeIngredient {
  name: string;
  /** id продукта из общего справочника; пусто — не связан. */
  productId?: string;
  grossPerPortion: string;
  netPerPortion: string;
  /** Единица измерения закупки (кг, л, шт). */
  unit?: string;
}

/** Строка раскладки мок-карты. */
export interface MockIngredient extends CreateRecipeIngredient {
  grossPer100: string;
  netPer100: string;
  pricePerUnit: string;
}

export interface MockNutrition {
  protein: string;
  fat: string;
  carbs: string;
  kcal: string;
}

/** Мок-сборник для мок-карт. */
export interface MockCollection {
  id: string;
  name: string;
}

/** Мок-сборник для мок-карт. */
export interface MockCollection {
  id: string;
  name: string;
}

/** Мок-карта в прежней форме макета — для меню и порционника. */
export interface MockRecipe {
  id: string;
  name: string;
  collectionName: string;
  collectionId: string;
  /** Выход порции, например «90/50». */
  portionYield: string;
  price: number;
  kcal: number;
  recipe: string;
  ingredients: MockIngredient[];
  outputPerPortion: string;
  outputPer100: string;
  nutrition: MockNutrition;
}

export interface ListMockRecipesResponse {
  recipes: MockRecipe[];
  total: number;
  /** Текущая страница (1-based). */
  page: number;
  pageSize: number;
}
