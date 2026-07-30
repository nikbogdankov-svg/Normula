/**
 * Контракт раздела ТТК (технологические карты).
 *
 * Бэкенда под него ещё нет: формы взяты из макета, эндпоинты описаны здесь
 * и реализованы в mock-handlers.
 */

/** Строка раскладки продуктов внутри карты. */
export interface Ingredient {
  name: string;
  /** Пустая строка — значит в макете ячейка пустая (например «масса готового»). */
  grossPerPortion: string;
  netPerPortion: string;
  grossPer100: string;
  netPer100: string;
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
  /** Приёмы пищи: «Завтрак/Ужин», «Обед», «Полдник». */
  meals: string;
  temperature: string;
  shelfLife: string;
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
}

export interface ListCollectionsResponse {
  collections: Collection[];
}

export interface CreateRecipeRequest {
  name: string;
  collectionId: string;
  portionYield: string;
  price: number;
  kcal: number;
  meals: string;
  temperature: string;
  shelfLife: string;
  recipe: string;
}

export interface ImportCollectionsRequest {
  /** Имена файлов: настоящую загрузку добавим вместе с бэкендом. */
  fileNames: string[];
}

export interface ImportCollectionsResponse {
  imported: number;
}
