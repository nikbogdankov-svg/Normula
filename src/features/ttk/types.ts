/**
 * Контракт раздела ТТК (технологические карты).
 *
 * Бэкенда под него ещё нет: формы взяты из макета, эндпоинты описаны здесь
 * и реализованы в mock-handlers.
 */

/** Строка раскладки продуктов внутри карты. */
export interface Ingredient {
  name: string;
  /** id продукта из общего справочника (features/products); пусто — не связан. */
  productId?: string;
  /** Пустая строка — значит в макете ячейка пустая (например «масса готового»). */
  grossPerPortion: string;
  netPerPortion: string;
  grossPer100: string;
  netPer100: string;
  /** Цена за 1 кг; пустая строка — ячейка пустая. */
  pricePerKg: string;
}

export interface Nutrition {
  protein: string;
  fat: string;
  carbs: string;
  kcal: string;
  vitaminC: string;
}

/** Сборник рецептур, из которого пришла карта. */
export interface Collection {
  id: string;
  name: string;
}

export interface Recipe {
  id: string;
  name: string;
  /** Название сборника; пусто у карт, заведённых вручную. */
  collectionName: string;
  collectionId: string;
  /** Выход порции, например «90/50». */
  portionYield: string;
  price: number;
  kcal: number;
  recipe: string;
  ingredients: Ingredient[];
  /** Итоговая строка «Выход»: на порцию и на 100 порций. */
  outputPerPortion: string;
  outputPer100: string;
  nutrition: Nutrition;
}

export interface ListRecipesResponse {
  recipes: Recipe[];
  total: number;
  /** Текущая страница (1-based). */
  page: number;
  /** Количество карт на странице. */
  pageSize: number;
}

export interface ListCollectionsResponse {
  collections: Collection[];
}

/** Строка ингредиента в форме создания ТТК (макет «Создать ТТК»). */
export interface CreateRecipeIngredient {
  name: string;
  /** id продукта из общего справочника (features/products); пусто — не связан. */
  productId?: string;
  grossPerPortion: string;
  netPerPortion: string;
}

/** Поля пищевой ценности, которые заполняет форма ТТК (витамин С приходит из импорта). */
export type CreateRecipeNutrition = Omit<Nutrition, 'vitaminC'>;

export interface CreateRecipeRequest {
  name: string;
  portionYield: string;
  /** Технология приготовления. */
  recipe: string;
  ingredients: CreateRecipeIngredient[];
  /** Белки/жиры/углеводы и калории (на 100 г готового блюда). */
  nutrition?: CreateRecipeNutrition;
}

/** Тело обновления ТТК — те же поля, что и при создании. */
export type UpdateRecipeRequest = CreateRecipeRequest;

export interface ImportCollectionsRequest {
  /** Имена файлов: настоящую загрузку добавим вместе с бэкендом. */
  fileNames: string[];
}

export interface ImportCollectionsResponse {
  imported: number;
}
