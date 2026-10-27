/**
 * Богатый набор моковых данных для прототипа без бэкенда.
 *
 * Здесь живут «исходные» сущности (справочники, склад, персонал) и генераторы
 * производных данных (расписание меню, порционник, раскладка, счета). Всё
 * детерминировано: один и тот же запрос всегда даёт один и тот же ответ, пока
 * данные не изменили мутацией.
 *
 * Модуль — общий для `handlers.ts`; наружу торчат только store-массивы,
 * генераторы и утилиты. Типы берём из фич (`import type`) — это стирается при
 * сборке и не тянет рантайм-зависимостей.
 *
 * Тексты данных — ЧЕШСКИЕ (язык прототипа). Идентификаторы и enum-значения
 * (типы объектов, приёмы пищи, статусы) остаются латиницей и НЕ переводятся:
 * по ним идёт логика и сопоставление в фичах.
 */

import type { Diet } from '@/features/diets/types';
import type { FacilityType, ObjectGroup, ObjectItem } from '@/features/objects/types';
import type { Product } from '@/features/products/types';
import type { Ingredient, Recipe, RecipeSummary } from '@/features/ttk/types';
import type { Employee, EmployeeStatus, StaffRole } from '@/features/staff/types';
import type { MealId, Menu, ScheduleDay, ScheduleSlot, Violation } from '@/features/menu/types';
import type { DishDistributionRow, PortionEntry } from '@/features/portions/types';
import type { ProductSpreadItem } from '@/features/products-spread/types';
import type { Account, AccountMeal } from '@/features/accounts/types';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationScope,
} from '@/features/organizations/types';
import type { Batch, Receipt, ReceiptItem, Transfer, WriteOff } from '@/features/warehouse/types';

/* ───────────────────────── утилиты ───────────────────────── */

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Детерминированное целое в диапазоне [min, max] по строковому сиду. */
export function seededInt(seed: string, min: number, max: number): number {
  if (max <= min) return min;
  return min + (hash(seed) % (max - min + 1));
}

/** Детерминированное число с плавающей точкой в [min, max). */
export function seededFloat(seed: string, min: number, max: number, decimals = 2): number {
  return round(min + (hash(seed) / 4294967296) * (max - min), decimals);
}

/** Выбор элемента массива по сиду. */
export function seededPick<T>(seed: string, list: T[]): T {
  return list[hash(seed) % list.length];
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function todayIso(): string {
  return iso(new Date());
}

export function shiftIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
}

export function datesBetween(from: string, to: string): string[] {
  if (!from || !to) return [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const out: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(iso(d));
  return out;
}

export const MEAL_IDS: MealId[] = ['breakfast', 'second_breakfast', 'lunch', 'snack', 'dinner'];

/** Порядок приёмов для генерации: сколько блюд кладём в каждый. */
const MEAL_DISH_COUNT: Record<MealId, number> = {
  breakfast: 2,
  second_breakfast: 1,
  lunch: 3,
  snack: 1,
  dinner: 2,
};

/* ───────────────────────── диеты ───────────────────────── */

export const diets: Diet[] = [
  {
    id: 'diet-main',
    name: 'Základní',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    mealIds: [],
    pricePerDay: 220,
    kcal: 2400,
    protein: 90,
    fat: 80,
    carbs: 330,
  },
  {
    id: 'diet-gentle',
    name: 'Šetrná',
    appliesTo: ['kindergarten', 'hospital'],
    mealIds: [],
    pricePerDay: 240,
    kcal: 2200,
    protein: 85,
    fat: 75,
    carbs: 300,
  },
  {
    id: 'diet-gluten',
    name: 'Bezlepková',
    appliesTo: ['school', 'kindergarten'],
    mealIds: [],
    pricePerDay: 260,
    kcal: 2300,
    protein: 88,
    fat: 78,
    carbs: 310,
  },
  {
    id: 'diet-lactose',
    name: 'Bezlaktozová',
    appliesTo: ['school', 'kindergarten'],
    mealIds: [],
    pricePerDay: 270,
    kcal: 2250,
    protein: 86,
    fat: 76,
    carbs: 305,
  },
  {
    id: 'diet-diabet',
    name: 'Diabetická',
    appliesTo: ['school', 'hospital'],
    mealIds: [],
    pricePerDay: 280,
    kcal: 2100,
    protein: 95,
    fat: 70,
    carbs: 250,
  },
  {
    id: 'diet-vegan',
    name: 'Vegetariánská',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    mealIds: [],
    pricePerDay: 210,
    kcal: 2000,
    protein: 75,
    fat: 65,
    carbs: 280,
  },
];

export function dietName(dietId: string): string {
  return diets.find((d) => d.id === dietId)?.name ?? dietId;
}

export function findDiet(dietId: string): Diet | undefined {
  return diets.find((d) => d.id === dietId);
}

/* ───────────────────────── объекты ───────────────────────── */

function group(id: string, name: string, dietIds: string[]): ObjectGroup {
  return { id, name, diets: dietIds.map((d) => ({ id: d, name: dietName(d) })) };
}

export const objects: ObjectItem[] = [
  {
    id: 'obj-school5',
    parentObjectId: '',
    name: 'Škola č. 5',
    type: 'school',
    groups: [
      group('grp-5a', '5.A', ['diet-main']),
      group('grp-5b', '5.B', ['diet-main', 'diet-gluten']),
      group('grp-1a', '1.A', ['diet-main', 'diet-diabet']),
      group('grp-11a', '11.A', ['diet-main']),
    ],
  },
  {
    id: 'sub-school5-2',
    parentObjectId: 'obj-school5',
    name: 'Škola č. 5 · Budova 2',
    type: 'school',
    groups: [
      group('grp-5-2a', '2.A', ['diet-main']),
      group('grp-5-2b', '2.B', ['diet-main', 'diet-lactose']),
    ],
  },
  {
    id: 'obj-gym12',
    parentObjectId: '',
    name: 'Gymnázium č. 12',
    type: 'school',
    groups: [
      group('grp-8a', '8.A', ['diet-main']),
      group('grp-8b', '8.B', ['diet-main', 'diet-vegan']),
      group('grp-9a', '9.A', ['diet-main', 'diet-gluten']),
    ],
  },
  {
    id: 'sub-gym12-new',
    parentObjectId: 'obj-gym12',
    name: 'Gymnázium č. 12 · Nová budova',
    type: 'school',
    groups: [group('grp-10a', '10.A', ['diet-main']), group('grp-10b', '10.B', ['diet-main'])],
  },
  {
    id: 'obj-ds-romashka',
    parentObjectId: '',
    name: 'Mateřská škola „Sedmikráska“',
    type: 'kindergarten',
    groups: [
      group('grp-ds-junior', 'Mladší třída', ['diet-main', 'diet-lactose']),
      group('grp-ds-senior', 'Starší třída', ['diet-main', 'diet-vegan']),
      group('grp-ds-middle', 'Střední třída', ['diet-main', 'diet-gentle']),
    ],
  },
  {
    id: 'obj-ds-solnce',
    parentObjectId: '',
    name: 'Mateřská škola „Sluníčko“',
    type: 'kindergarten',
    groups: [
      group('grp-sol-a', 'Třída „Včelky“', ['diet-main']),
      group('grp-sol-b', 'Třída „Sedmikrásky“', ['diet-main', 'diet-gluten']),
    ],
  },
  {
    id: 'obj-hospital3',
    parentObjectId: '',
    name: 'Městská nemocnice č. 3',
    type: 'hospital',
    groups: [
      group('grp-hosp-therapy', 'Interní oddělení', ['diet-gentle', 'diet-diabet']),
      group('grp-hosp-surgery', 'Chirurgické oddělení', ['diet-gentle']),
      group('grp-hosp-cardio', 'Kardiologické oddělení', ['diet-gentle', 'diet-main']),
    ],
  },
  {
    id: 'obj-warehouse-central',
    parentObjectId: '',
    name: 'Sklad · Centrální',
    type: 'warehouse',
    groups: [],
  },
];

export function findObject(id: string): ObjectItem | undefined {
  return objects.find((o) => o.id === id);
}

/** Объекты и подобъекты, у которых есть группы — «порционные единицы». */
export function planningUnits(): ObjectItem[] {
  return objects.filter((o) => o.type !== 'warehouse' && o.groups.length > 0);
}

/** Объекты верхнего уровня (склады включительно). */
export function topLevelObjects(): ObjectItem[] {
  return objects.filter((o) => !o.parentObjectId);
}

export function topLevelName(objectId: string): string {
  const object = findObject(objectId);
  if (!object) return objectId;
  return object.parentObjectId
    ? (findObject(object.parentObjectId)?.name ?? object.name)
    : object.name;
}

/** Единицы внутри объекта верхнего уровня (сам объект + его подобъекты). */
export function unitsUnder(objectId: string): ObjectItem[] {
  return planningUnits().filter((unit) => unit.id === objectId || unit.parentObjectId === objectId);
}

/* ───────────────────────── продукты ───────────────────────── */

interface ProductSeed {
  id: string;
  name: string;
  unit: string;
  price: number;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  { id: 'p-flour', name: 'Pšeničná mouka hladká', unit: 'kg', price: 42 },
  { id: 'p-sugar', name: 'Krupicový cukr', unit: 'kg', price: 78 },
  { id: 'p-rice', name: 'Rýže', unit: 'kg', price: 95 },
  { id: 'p-buckwheat', name: 'Pohanka', unit: 'kg', price: 110 },
  { id: 'p-pasta', name: 'Těstoviny', unit: 'kg', price: 88 },
  { id: 'p-semolina', name: 'Krupice', unit: 'kg', price: 70 },
  { id: 'p-barley', name: 'Kroupy', unit: 'kg', price: 60 },
  { id: 'p-milk', name: 'Mléko 3,2 %', unit: 'l', price: 72 },
  { id: 'p-kefir', name: 'Kefír 2,5 %', unit: 'l', price: 80 },
  { id: 'p-sourcream', name: 'Smetana 15 %', unit: 'kg', price: 260 },
  { id: 'p-cottage', name: 'Tvaroh 9 %', unit: 'kg', price: 320 },
  { id: 'p-yogurt', name: 'Bílý jogurt', unit: 'l', price: 150 },
  { id: 'p-butter', name: 'Máslo 72,5 %', unit: 'kg', price: 780 },
  { id: 'p-oil', name: 'Rostlinný olej', unit: 'l', price: 130 },
  { id: 'p-egg', name: 'Slepičí vejce', unit: 'ks', price: 9 },
  { id: 'p-chicken', name: 'Kuře (prsní filé)', unit: 'kg', price: 380 },
  { id: 'p-beef', name: 'Hovězí maso', unit: 'kg', price: 620 },
  { id: 'p-pork', name: 'Vepřové maso', unit: 'kg', price: 450 },
  { id: 'p-fish', name: 'Treska (filé)', unit: 'kg', price: 300 },
  { id: 'p-potato', name: 'Brambory', unit: 'kg', price: 45 },
  { id: 'p-carrot', name: 'Mrkev', unit: 'kg', price: 38 },
  { id: 'p-onion', name: 'Cibule', unit: 'kg', price: 36 },
  { id: 'p-cabbage', name: 'Bílé zelí', unit: 'kg', price: 30 },
  { id: 'p-beet', name: 'Řepa', unit: 'kg', price: 34 },
  { id: 'p-tomato', name: 'Rajčata', unit: 'kg', price: 160 },
  { id: 'p-cucumber', name: 'Okurky', unit: 'kg', price: 120 },
  { id: 'p-apple', name: 'Jablka', unit: 'kg', price: 110 },
  { id: 'p-banana', name: 'Banány', unit: 'kg', price: 130 },
  { id: 'p-orange', name: 'Pomeranče', unit: 'kg', price: 140 },
  { id: 'p-salt', name: 'Jedlá sůl', unit: 'kg', price: 20 },
  { id: 'p-yeast', name: 'Droždí', unit: 'kg', price: 210 },
  { id: 'p-cocoa', name: 'Kakaový prášek', unit: 'kg', price: 560 },
  { id: 'p-bread', name: 'Pšeničný chléb', unit: 'kg', price: 90 },
  { id: 'p-cheese', name: 'Tvrdý sýr', unit: 'kg', price: 680 },
];

export const products: Product[] = PRODUCT_SEEDS.map(({ id, name, unit }) => ({ id, name, unit }));

export const productPrices = new Map(PRODUCT_SEEDS.map((p) => [p.id, p.price]));

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function productPrice(id: string): number {
  return productPrices.get(id) ?? seededFloat(`price:${id}`, 40, 400);
}

/* ───────────────────────── ТТК ───────────────────────── */

interface RecipeSeed {
  id: string;
  name: string;
  collectionName: string;
  yieldNet: number;
  yieldLoss: number;
  technology: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Приёмы, в которые уместна карта. */
  meals: MealId[];
  ingredients: { productId: string; gross: number; net: number }[];
}

const RECIPE_SEEDS: RecipeSeed[] = [
  {
    id: 'rec-semolina',
    name: 'Krupicová kaše na mléce',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 200,
    yieldLoss: 3,
    technology: 'Krupici vsypeme do vroucího mléka, vaříme 7 minut, přidáme sůl a cukr.',
    kcal: 240,
    protein: 8,
    fat: 7,
    carbs: 38,
    meals: ['breakfast'],
    ingredients: [
      { productId: 'p-semolina', gross: 0.045, net: 0.045 },
      { productId: 'p-milk', gross: 0.16, net: 0.16 },
      { productId: 'p-sugar', gross: 0.008, net: 0.008 },
      { productId: 'p-butter', gross: 0.006, net: 0.006 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-rice-milk',
    name: 'Rýžová mléčná kaše',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 210,
    yieldLoss: 3,
    technology: 'Rýži propláchneme, vaříme v mléce do měkka, zjemníme máslem.',
    kcal: 265,
    protein: 7,
    fat: 8,
    carbs: 42,
    meals: ['breakfast'],
    ingredients: [
      { productId: 'p-rice', gross: 0.045, net: 0.045 },
      { productId: 'p-milk', gross: 0.16, net: 0.16 },
      { productId: 'p-sugar', gross: 0.008, net: 0.008 },
      { productId: 'p-butter', gross: 0.006, net: 0.006 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-buckwheat',
    name: 'Sypká pohanková kaše',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 180,
    yieldLoss: 2,
    technology: 'Pohanku orestujeme, zalijeme vodou, vaříme do měkka, zjemníme máslem.',
    kcal: 220,
    protein: 8,
    fat: 6,
    carbs: 35,
    meals: ['breakfast'],
    ingredients: [
      { productId: 'p-buckwheat', gross: 0.05, net: 0.05 },
      { productId: 'p-butter', gross: 0.006, net: 0.006 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-barley',
    name: 'Perličková mléčná kaše',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 210,
    yieldLoss: 3,
    technology: 'Kroupy namočíme, uvaříme v mléce, zjemníme máslem a cukrem.',
    kcal: 255,
    protein: 7,
    fat: 8,
    carbs: 40,
    meals: ['breakfast'],
    ingredients: [
      { productId: 'p-barley', gross: 0.05, net: 0.05 },
      { productId: 'p-milk', gross: 0.15, net: 0.15 },
      { productId: 'p-butter', gross: 0.006, net: 0.006 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-omelet',
    name: 'Přírodní omeleta',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 150,
    yieldLoss: 2,
    technology: 'Vejce rozšleháme s mlékem, zapečeme při 180 °C 10 minut.',
    kcal: 185,
    protein: 13,
    fat: 13,
    carbs: 3,
    meals: ['breakfast', 'second_breakfast'],
    ingredients: [
      { productId: 'p-egg', gross: 1.5, net: 1.5 },
      { productId: 'p-milk', gross: 0.06, net: 0.06 },
      { productId: 'p-butter', gross: 0.005, net: 0.005 },
      { productId: 'p-salt', gross: 0.001, net: 0.001 },
    ],
  },
  {
    id: 'rec-chicken-cutlet',
    name: 'Kuřecí karbanátky',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 120,
    yieldLoss: 5,
    technology: 'Kuře umeleme, přidáme chléb a mléko, vytvarujeme a zapečeme.',
    kcal: 230,
    protein: 22,
    fat: 12,
    carbs: 10,
    meals: ['lunch', 'dinner'],
    ingredients: [
      { productId: 'p-chicken', gross: 0.09, net: 0.08 },
      { productId: 'p-bread', gross: 0.02, net: 0.02 },
      { productId: 'p-milk', gross: 0.025, net: 0.025 },
      { productId: 'p-onion', gross: 0.01, net: 0.01 },
      { productId: 'p-salt', gross: 0.001, net: 0.001 },
    ],
  },
  {
    id: 'rec-plov',
    name: 'Pilaf s hovězím masem',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 250,
    yieldLoss: 6,
    technology: 'Maso orestujeme s cibulí a mrkví, přidáme rýži a vodu, dusíme do měkka.',
    kcal: 420,
    protein: 20,
    fat: 14,
    carbs: 55,
    meals: ['lunch'],
    ingredients: [
      { productId: 'p-beef', gross: 0.07, net: 0.07 },
      { productId: 'p-rice', gross: 0.06, net: 0.06 },
      { productId: 'p-carrot', gross: 0.03, net: 0.03 },
      { productId: 'p-onion', gross: 0.015, net: 0.015 },
      { productId: 'p-oil', gross: 0.01, net: 0.01 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-pasta',
    name: 'Vařené těstoviny',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 200,
    yieldLoss: 2,
    technology: 'Těstoviny uvaříme v osolené vodě, zjemníme máslem.',
    kcal: 300,
    protein: 10,
    fat: 8,
    carbs: 48,
    meals: ['lunch', 'dinner'],
    ingredients: [
      { productId: 'p-pasta', gross: 0.07, net: 0.07 },
      { productId: 'p-butter', gross: 0.005, net: 0.005 },
      { productId: 'p-salt', gross: 0.001, net: 0.001 },
    ],
  },
  {
    id: 'rec-schi',
    name: 'Zelná polévka',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 250,
    yieldLoss: 4,
    technology: 'Zelí a zeleninu nakrájíme, vaříme s masem do měkka.',
    kcal: 175,
    protein: 10,
    fat: 8,
    carbs: 14,
    meals: ['lunch'],
    ingredients: [
      { productId: 'p-cabbage', gross: 0.1, net: 0.1 },
      { productId: 'p-potato', gross: 0.06, net: 0.06 },
      { productId: 'p-carrot', gross: 0.02, net: 0.02 },
      { productId: 'p-onion', gross: 0.01, net: 0.01 },
      { productId: 'p-beef', gross: 0.04, net: 0.04 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-veg-salad',
    name: 'Salát z čerstvé zeleniny',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 120,
    yieldLoss: 8,
    technology: 'Zeleninu nakrájíme, zakapeme rostlinným olejem.',
    kcal: 95,
    protein: 2,
    fat: 8,
    carbs: 5,
    meals: ['lunch', 'dinner'],
    ingredients: [
      { productId: 'p-tomato', gross: 0.06, net: 0.06 },
      { productId: 'p-cucumber', gross: 0.06, net: 0.06 },
      { productId: 'p-oil', gross: 0.008, net: 0.008 },
      { productId: 'p-salt', gross: 0.001, net: 0.001 },
    ],
  },
  {
    id: 'rec-mashed',
    name: 'Bramborová kaše',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 200,
    yieldLoss: 3,
    technology: 'Brambory uvaříme, rozmačkáme s horkým mlékem a máslem.',
    kcal: 210,
    protein: 5,
    fat: 9,
    carbs: 30,
    meals: ['lunch', 'dinner'],
    ingredients: [
      { productId: 'p-potato', gross: 0.15, net: 0.15 },
      { productId: 'p-milk', gross: 0.06, net: 0.06 },
      { productId: 'p-butter', gross: 0.008, net: 0.008 },
      { productId: 'p-salt', gross: 0.0015, net: 0.0015 },
    ],
  },
  {
    id: 'rec-fish-cutlet',
    name: 'Rybí karbanátky',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 120,
    yieldLoss: 5,
    technology: 'Filé z tresky umeleme, přidáme chléb a mléko, zapečeme.',
    kcal: 190,
    protein: 18,
    fat: 9,
    carbs: 9,
    meals: ['lunch', 'dinner'],
    ingredients: [
      { productId: 'p-fish', gross: 0.09, net: 0.09 },
      { productId: 'p-bread', gross: 0.018, net: 0.018 },
      { productId: 'p-milk', gross: 0.02, net: 0.02 },
      { productId: 'p-onion', gross: 0.008, net: 0.008 },
      { productId: 'p-salt', gross: 0.001, net: 0.001 },
    ],
  },
  {
    id: 'rec-cottage-bake',
    name: 'Tvarohový nákyp',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 160,
    yieldLoss: 3,
    technology: 'Tvaroh protřeme, smícháme s vejcem, krupicí a cukrem, zapečeme.',
    kcal: 245,
    protein: 16,
    fat: 10,
    carbs: 24,
    meals: ['second_breakfast', 'snack'],
    ingredients: [
      { productId: 'p-cottage', gross: 0.09, net: 0.09 },
      { productId: 'p-egg', gross: 0.5, net: 0.5 },
      { productId: 'p-semolina', gross: 0.015, net: 0.015 },
      { productId: 'p-sugar', gross: 0.015, net: 0.015 },
      { productId: 'p-sourcream', gross: 0.01, net: 0.01 },
    ],
  },
  {
    id: 'rec-syrniki',
    name: 'Tvarohové lívance',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 150,
    yieldLoss: 4,
    technology: 'Tvaroh smícháme s moukou, vejcem a cukrem, opečeme.',
    kcal: 260,
    protein: 15,
    fat: 11,
    carbs: 26,
    meals: ['second_breakfast', 'snack'],
    ingredients: [
      { productId: 'p-cottage', gross: 0.1, net: 0.1 },
      { productId: 'p-flour', gross: 0.02, net: 0.02 },
      { productId: 'p-egg', gross: 0.5, net: 0.5 },
      { productId: 'p-sugar', gross: 0.01, net: 0.01 },
      { productId: 'p-oil', gross: 0.008, net: 0.008 },
    ],
  },
  {
    id: 'rec-compote',
    name: 'Jablečný kompot',
    collectionName: 'Sborník receptur pro školy',
    yieldNet: 200,
    yieldLoss: 0,
    technology: 'Jablka zalijeme vodou, přivedeme k varu, přidáme cukr, necháme vyluhovat.',
    kcal: 90,
    protein: 0,
    fat: 0,
    carbs: 22,
    meals: ['second_breakfast', 'lunch', 'snack'],
    ingredients: [
      { productId: 'p-apple', gross: 0.04, net: 0.04 },
      { productId: 'p-sugar', gross: 0.02, net: 0.02 },
    ],
  },
];

/** Карта «блюдо → приёмы пищи» (в самом контракте этого поля нет). */
export const recipeMeals = new Map<string, MealId[]>(
  RECIPE_SEEDS.map((seed) => [seed.id, seed.meals])
);

function buildIngredient(
  recipeId: string,
  index: number,
  seed: RecipeSeed['ingredients'][number]
): Ingredient {
  const product = findProduct(seed.productId);
  const unitPrice = productPrice(seed.productId);
  return {
    id: `${recipeId}-ing-${index}`,
    productId: seed.productId,
    productName: product?.name ?? seed.productId,
    unit: product?.unit ?? 'kg',
    gross: seed.gross,
    net: seed.net,
    unitPrice,
    total: round(unitPrice * seed.net, 2),
  };
}

function buildRecipe(seed: RecipeSeed): Recipe {
  const ingredients = seed.ingredients.map((item, index) => buildIngredient(seed.id, index, item));
  return {
    id: seed.id,
    name: seed.name,
    collectionName: seed.collectionName,
    yieldNet: seed.yieldNet,
    yieldLoss: seed.yieldLoss,
    technology: seed.technology,
    protein: seed.protein,
    fat: seed.fat,
    carbs: seed.carbs,
    kcal: seed.kcal,
    ingredients,
    price: round(
      ingredients.reduce((sum, item) => sum + item.total, 0),
      2
    ),
  };
}

export const recipes: Recipe[] = RECIPE_SEEDS.map(buildRecipe);

export function recipeSummary(recipe: Recipe): RecipeSummary {
  return {
    id: recipe.id,
    name: recipe.name,
    collectionName: recipe.collectionName,
    yieldNet: recipe.yieldNet,
    yieldLoss: recipe.yieldLoss,
    kcal: recipe.kcal,
    price: recipe.price,
  };
}

export function findRecipe(id: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === id);
}

function recipesForMeal(mealId: MealId): Recipe[] {
  const byMeal = recipes.filter((recipe) => recipeMeals.get(recipe.id)?.includes(mealId));
  return byMeal.length > 0 ? byMeal : recipes;
}

/* ───────────────────────── расписание меню ───────────────────────── */

const scheduleOverrides = new Map<string, string[]>();
const violationAllowed = new Set<string>();

function cellKey(objectId: string, dietId: string, date: string, mealId: MealId): string {
  return `${objectId}|${dietId}|${date}|${mealId}`;
}

function allowKey(objectId: string, dietId: string, date: string): string {
  return `${objectId}|${dietId}|${date}`;
}

function baseRecipeIds(objectId: string, dietId: string, date: string, mealId: MealId): string[] {
  const candidates = recipesForMeal(mealId);
  const count = Math.min(MEAL_DISH_COUNT[mealId], candidates.length);
  const chosen: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const picked = seededPick(`${objectId}:${dietId}:${date}:${mealId}:${i}`, candidates);
    if (!chosen.includes(picked.id)) chosen.push(picked.id);
  }
  return chosen;
}

function dish(recipe: Recipe): ScheduleDay['slots'][number]['dishes'][number] {
  return {
    recipeId: recipe.id,
    name: recipe.name,
    yieldNet: recipe.yieldNet,
    yieldLoss: recipe.yieldLoss,
    kcal: recipe.kcal,
    protein: recipe.protein,
    fat: recipe.fat,
    carbs: recipe.carbs,
    price: recipe.price,
  };
}

function activeMeals(diet: Diet): MealId[] {
  return diet.mealIds.length > 0 ? diet.mealIds : MEAL_IDS;
}

function buildViolations(slots: ScheduleSlot[], diet: Diet): Violation[] {
  const totals = slots
    .flatMap((slot) => slot.dishes)
    .reduce(
      (acc, item) => ({
        kcal: acc.kcal + item.kcal,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat,
        carbs: acc.carbs + item.carbs,
        price: acc.price + item.price,
      }),
      { kcal: 0, protein: 0, fat: 0, carbs: 0, price: 0 }
    );

  const metrics: { metric: Violation['metric']; actual: number; norm: number }[] = [
    { metric: 'kcal', actual: totals.kcal, norm: diet.kcal },
    { metric: 'protein', actual: totals.protein, norm: diet.protein },
    { metric: 'fat', actual: totals.fat, norm: diet.fat },
    { metric: 'carbs', actual: totals.carbs, norm: diet.carbs },
    { metric: 'price', actual: totals.price, norm: diet.pricePerDay },
  ];

  const violations: Violation[] = [];
  for (const { metric, actual, norm } of metrics) {
    if (norm <= 0) continue;
    if (actual < norm * 0.5) violations.push({ metric, actual, norm, status: 'low' });
    // Порог чуть выше нормы: строгий «> norm» давал бы нарушения почти каждый
    // день, и раздел выглядел бы сломанным.
    else if (actual > norm * 1.15) violations.push({ metric, actual, norm, status: 'high' });
  }
  return violations;
}

export function buildScheduleDay(objectId: string, dietId: string, date: string): ScheduleDay {
  const diet = findDiet(dietId) ?? diets[0];
  const slots: ScheduleSlot[] = [];

  for (const mealId of activeMeals(diet)) {
    const override = scheduleOverrides.get(cellKey(objectId, diet.id, date, mealId));
    const recipeIds = override ?? baseRecipeIds(objectId, diet.id, date, mealId);
    const dishes = recipeIds
      .map((id) => findRecipe(id))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
      .map(dish);
    if (dishes.length > 0) slots.push({ mealId, dishes });
  }

  const allowed = violationAllowed.has(allowKey(objectId, diet.id, date));

  return {
    date,
    violationAllowed: allowed,
    slots,
    violations: allowed ? [] : buildViolations(slots, diet),
  };
}

export function buildSchedule(
  objectId: string,
  dietId: string,
  from: string,
  to: string
): ScheduleDay[] {
  const diet = findDiet(dietId) ?? diets[0];
  return datesBetween(from, to).map((date) => buildScheduleDay(objectId, diet.id, date));
}

export function setScheduleSlot(
  objectId: string,
  dietId: string,
  date: string,
  mealId: MealId,
  recipeIds: string[]
): void {
  scheduleOverrides.set(cellKey(objectId, dietId, date, mealId), recipeIds);
}

export function allowViolationForDay(objectId: string, dietId: string, date: string): void {
  violationAllowed.add(allowKey(objectId, dietId, date));
}

/** Заполнение отрезка по сохранённому меню: паттерн зависит от menuId. */
export function fillScheduleFromMenu(
  objectId: string,
  dietId: string,
  menu: Menu,
  from: string,
  to: string,
  keepThrough?: string
): void {
  const diet = findDiet(dietId) ?? diets[0];
  const dates = datesBetween(from, to);
  dates.forEach((date, index) => {
    if (keepThrough && date <= keepThrough) return;
    // Хвост за пределами меню становится пустым.
    if (index >= menu.days) {
      for (const mealId of activeMeals(diet)) {
        scheduleOverrides.set(cellKey(objectId, diet.id, date, mealId), []);
      }
      return;
    }
    for (const mealId of activeMeals(diet)) {
      const candidates = recipesForMeal(mealId);
      const count = Math.min(MEAL_DISH_COUNT[mealId], candidates.length);
      const chosen: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const picked = seededPick(`${menu.id}:${index}:${mealId}:${i}`, candidates);
        if (!chosen.includes(picked.id)) chosen.push(picked.id);
      }
      scheduleOverrides.set(cellKey(objectId, diet.id, date, mealId), chosen);
    }
  });
}

/* ───────────────────────── сохранённые меню ───────────────────────── */

export const menus: Menu[] = [
  { id: 'menu-school-week', name: 'Jídelníček školního týdne', days: 5 },
  { id: 'menu-kindergarten-10', name: 'Jídelníček mateřské školy (10 dní)', days: 10 },
  { id: 'menu-summer', name: 'Letní jídelníček', days: 7 },
];

/* ───────────────────────── порционник ───────────────────────── */

const headcountOverrides = new Map<string, number>();

function portionKey(date: string, objectId: string, groupId: string, dietId: string): string {
  return `${date}|${objectId}|${groupId}|${dietId}`;
}

function baseHeadcount(date: string, objectId: string, groupId: string, dietId: string): number {
  return seededInt(`head:${objectId}:${groupId}:${dietId}:${date}`, 18, 32);
}

export function headcountFor(
  date: string,
  objectId: string,
  groupId: string,
  dietId: string
): number {
  return (
    headcountOverrides.get(portionKey(date, objectId, groupId, dietId)) ??
    baseHeadcount(date, objectId, groupId, dietId)
  );
}

export function setHeadcount(
  date: string,
  objectId: string,
  groupId: string,
  dietId: string,
  headcount: number
): void {
  headcountOverrides.set(portionKey(date, objectId, groupId, dietId), headcount);
}

/** Порции на дату: для будущих дат пусто (численность ещё не заполнена). */
export function portionsFor(date: string): PortionEntry[] {
  if (date > todayIso()) return [];

  const entries: PortionEntry[] = [];
  for (const unit of planningUnits()) {
    for (const grp of unit.groups) {
      for (const diet of grp.diets) {
        entries.push({
          objectId: unit.id,
          groupId: grp.id,
          dietId: diet.id,
          headcount: headcountFor(date, unit.id, grp.id, diet.id),
        });
      }
    }
  }
  return entries;
}

export function copyPortionsDay(from: string, to: string): void {
  for (const unit of planningUnits()) {
    for (const grp of unit.groups) {
      for (const diet of grp.diets) {
        const key = portionKey(to, unit.id, grp.id, diet.id);
        if (headcountOverrides.has(key)) continue;
        setHeadcount(to, unit.id, grp.id, diet.id, headcountFor(from, unit.id, grp.id, diet.id));
      }
    }
  }
}

export function dishDistributionFor(date: string, objectId: string | null): DishDistributionRow[] {
  if (date > todayIso()) return [];

  const units = objectId ? unitsUnder(objectId) : planningUnits();
  const rows: DishDistributionRow[] = [];

  for (const unit of units) {
    for (const grp of unit.groups) {
      for (const diet of grp.diets) {
        const day = buildScheduleDay(unit.id, diet.id, date);
        const portions = headcountFor(date, unit.id, grp.id, diet.id);
        for (const slot of day.slots) {
          for (const item of slot.dishes) {
            rows.push({
              dishName: item.name,
              mealId: slot.mealId,
              objectName: topLevelName(unit.id),
              subObjectName: unit.name,
              departmentName: grp.name,
              tableName: diet.name,
              portions,
              yieldNet: item.yieldNet,
            });
          }
        }
      }
    }
  }
  return rows;
}

/* ───────────────────────── раскладка продуктов ───────────────────────── */

const confirmedSpread = new Set<string>();

function spreadKey(date: string, objectId: string | null): string {
  return `${date}|${objectId ?? 'all'}`;
}

export function isSpreadConfirmed(date: string, objectId: string | null): boolean {
  if (confirmedSpread.has(spreadKey(date, objectId))) return true;
  // По умолчанию подтверждено всё, что старше двух дней — «история».
  if (objectId === null && date < shiftIso(todayIso(), -2)) return true;
  return false;
}

export function confirmSpread(date: string, objectId: string | null): void {
  confirmedSpread.add(spreadKey(date, objectId));
}

export function productSpreadFor(
  date: string,
  objectId: string | null
): { items: ProductSpreadItem[]; confirmed: boolean } {
  const units = objectId ? unitsUnder(objectId) : planningUnits();
  const acc = new Map<string, ProductSpreadItem>();

  for (const unit of units) {
    for (const grp of unit.groups) {
      for (const diet of grp.diets) {
        const day = buildScheduleDay(unit.id, diet.id, date);
        const portions = headcountFor(date, unit.id, grp.id, diet.id);
        for (const slot of day.slots) {
          for (const item of slot.dishes) {
            const recipe = findRecipe(item.recipeId);
            if (!recipe) continue;
            for (const ingredient of recipe.ingredients) {
              const quantity = round(ingredient.net * portions, 3);
              if (quantity <= 0) continue;
              const existing = acc.get(ingredient.productId) ?? {
                productId: ingredient.productId,
                productName: ingredient.productName,
                unit: ingredient.unit,
                total: 0,
                byMeal: {},
                dishes: [],
              };
              existing.total = round(existing.total + quantity, 3);
              existing.byMeal[slot.mealId] = round(
                (existing.byMeal[slot.mealId] ?? 0) + quantity,
                3
              );
              existing.dishes.push({
                mealId: slot.mealId,
                dishName: item.name,
                portions,
                quantity,
              });
              acc.set(ingredient.productId, existing);
            }
          }
        }
      }
    }
  }

  return { items: [...acc.values()], confirmed: isSpreadConfirmed(date, objectId) };
}

/* ───────────────────────── склад ───────────────────────── */

/** Строка прихода = партия. */
export const receipts: Receipt[] = [];
export const writeOffs: WriteOff[] = [];
export const transfers: Transfer[] = [];

let receiptSeq = 0;
let writeOffSeq = 0;
let transferSeq = 0;

function makeReceiptItem(
  receiptId: string,
  productId: string,
  date: string,
  index: number
): ReceiptItem {
  const product = findProduct(productId);
  const quantity = seededFloat(`qty:${receiptId}:${productId}:${index}`, 20, 140, 3);
  const unitPrice = round(
    productPrice(productId) * seededFloat(`coef:${receiptId}:${productId}`, 0.9, 1.15),
    2
  );
  return {
    id: `${receiptId}-item-${index}`,
    productId,
    productName: product?.name ?? productId,
    unit: product?.unit ?? 'kg',
    quantity,
    unitPrice,
    total: round(quantity * unitPrice, 2),
    packaging: seededPick(`pack:${receiptId}:${productId}`, [
      'pytel',
      'krabice',
      'sáček',
      'demižón',
    ]),
    manufacturer: seededPick(`man:${receiptId}:${productId}`, [
      'Mlýny a.s.',
      'Potraviny s.r.o.',
      'Mlékárna a.s.',
      'AgroFood s.r.o.',
    ]),
    supplier: seededPick(`sup:${receiptId}:${productId}`, [
      'Velkoobchod s.r.o.',
      'Petr Svoboda (OSVČ)',
      'Dodávky potravin s.r.o.',
    ]),
    productionDate: shiftIso(date, -seededInt(`prod:${receiptId}:${productId}`, 1, 10)),
    documentType: 'Certifikát shody',
    documentNumber: `ČSN-${seededInt(`doc:${receiptId}:${productId}`, 10000, 99999)}`,
    organoleptic: 'Vzhled a vůně odpovídají normě',
    storageConditions: 'Suchá větraná místnost, +2…+25 °C',
    expiryDate: shiftIso(date, seededInt(`exp:${receiptId}:${productId}`, 20, 180)),
    note: '',
  };
}

function addReceipt(objectId: string, date: string, productIds: string[]): Receipt {
  receiptSeq += 1;
  const id = `rcpt-${receiptSeq}`;
  const invoiceNumber = `DL-${String(1000 + receiptSeq)}`;
  const items = productIds.map((productId, index) => makeReceiptItem(id, productId, date, index));
  const receipt: Receipt = {
    id,
    objectId,
    date,
    invoiceNumber,
    items,
    total: round(
      items.reduce((sum, item) => sum + item.total, 0),
      2
    ),
  };
  receipts.push(receipt);
  return receipt;
}

function seedWarehouse(): void {
  const today = todayIso();
  const productIds = PRODUCT_SEEDS.map((p) => p.id);
  for (const object of topLevelObjects()) {
    addReceipt(object.id, shiftIso(today, -14), productIds.slice(0, 8));
    addReceipt(object.id, shiftIso(today, -7), productIds.slice(8, 16));
    addReceipt(object.id, shiftIso(today, -3), productIds.slice(16, 24));
  }
}

seedWarehouse();

export function allBatches(): Batch[] {
  const consumed = new Map<string, number>();
  for (const writeOff of writeOffs) {
    for (const item of writeOff.items) {
      consumed.set(item.batchId, (consumed.get(item.batchId) ?? 0) + item.quantity);
    }
  }
  for (const transfer of transfers) {
    for (const item of transfer.items) {
      consumed.set(item.batchId, (consumed.get(item.batchId) ?? 0) + item.quantity);
    }
  }

  const batches: Batch[] = [];
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      const remaining = round(item.quantity - (consumed.get(item.id) ?? 0), 3);
      if (remaining <= 0) continue;
      batches.push({
        id: item.id,
        receiptId: receipt.id,
        invoiceNumber: receipt.invoiceNumber,
        receiptDate: receipt.date,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        remaining,
      });
    }
  }
  return batches;
}

export function findBatch(batchId: string): Batch | undefined {
  return allBatches().find((batch) => batch.id === batchId);
}

export function nextReceiptId(): string {
  receiptSeq += 1;
  return `rcpt-${receiptSeq}`;
}

export function nextWriteOffId(): string {
  writeOffSeq += 1;
  return `wo-${writeOffSeq}`;
}

export function nextTransferId(): string {
  transferSeq += 1;
  return `xf-${transferSeq}`;
}

export function receiptSummary(receipt: Receipt): {
  id: string;
  objectId: string;
  date: string;
  invoiceNumber: string;
  itemsCount: number;
  total: number;
} {
  return {
    id: receipt.id,
    objectId: receipt.objectId,
    date: receipt.date,
    invoiceNumber: receipt.invoiceNumber,
    itemsCount: receipt.items.length,
    total: receipt.total,
  };
}

export function writeOffSummary(writeOff: WriteOff): {
  id: string;
  objectId: string;
  date: string;
  reason: string;
  itemsCount: number;
  total: number;
  kind: WriteOff['kind'];
} {
  return {
    id: writeOff.id,
    objectId: writeOff.objectId,
    date: writeOff.date,
    reason: writeOff.reason,
    itemsCount: writeOff.items.length,
    total: writeOff.total,
    kind: writeOff.kind,
  };
}

export function transferSummary(transfer: Transfer): {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  date: string;
  itemsCount: number;
} {
  return {
    id: transfer.id,
    fromObjectId: transfer.fromObjectId,
    toObjectId: transfer.toObjectId,
    date: transfer.date,
    itemsCount: transfer.items.length,
  };
}

function seedWarehouseDocs(): void {
  const today = todayIso();
  const objectsWithStock = topLevelObjects();
  if (objectsWithStock.length === 0) return;

  // Ручные списания: по одному на объект, строки берём из его же партий.
  objectsWithStock.forEach((object, index) => {
    const batches = allBatches()
      .filter((batch) => {
        const receipt = receipts.find((r) => r.id === batch.receiptId);
        return receipt?.objectId === object.id;
      })
      .slice(0, 2);
    if (batches.length === 0) return;
    const id = nextWriteOffId();
    const items = batches.map((batch) => {
      const quantity = round(batch.remaining * 0.1, 3);
      return {
        id: `${id}-item-${batch.id}`,
        batchId: batch.id,
        receiptId: batch.receiptId,
        invoiceNumber: batch.invoiceNumber,
        productId: batch.productId,
        productName: batch.productName,
        unit: batch.unit,
        unitPrice: batch.unitPrice,
        quantity,
        total: round(quantity * batch.unitPrice, 2),
      };
    });
    writeOffs.push({
      id,
      objectId: object.id,
      date: shiftIso(today, -(index + 1)),
      reason: seededPick(`wo-reason:${object.id}`, [
        'Zkažení při skladování',
        'Rozbití obalu',
        'Odepis dle inventarizace',
        'Přirozený úbytek',
      ]),
      items,
      total: round(
        items.reduce((sum, item) => sum + item.total, 0),
        2
      ),
      kind: 'manual',
    });
  });

  // Автосписания (подтверждённые раскладки) — по одному на объект, за 3 дня назад.
  objectsWithStock.forEach((object, index) => {
    const batches = allBatches()
      .filter((batch) => {
        const receipt = receipts.find((r) => r.id === batch.receiptId);
        return receipt?.objectId === object.id;
      })
      .slice(0, 3);
    if (batches.length === 0) return;
    const id = nextWriteOffId();
    const items = batches.map((batch) => {
      const quantity = round(batch.remaining * 0.05, 3);
      return {
        id: `${id}-item-${batch.id}`,
        batchId: batch.id,
        receiptId: batch.receiptId,
        invoiceNumber: batch.invoiceNumber,
        productId: batch.productId,
        productName: batch.productName,
        unit: batch.unit,
        unitPrice: batch.unitPrice,
        quantity,
        total: round(quantity * batch.unitPrice, 2),
      };
    });
    writeOffs.push({
      id,
      objectId: object.id,
      date: shiftIso(today, -3 - index),
      reason: 'Automatický odpis dle potvrzené kalkulace',
      items,
      total: round(
        items.reduce((sum, item) => sum + item.total, 0),
        2
      ),
      kind: 'auto',
    });
  });

  // Одно перемещение между первыми двумя объектами.
  if (objectsWithStock.length >= 2) {
    const from = objectsWithStock[0];
    const to = objectsWithStock[1];
    const batches = allBatches()
      .filter((batch) => {
        const receipt = receipts.find((r) => r.id === batch.receiptId);
        return receipt?.objectId === from.id;
      })
      .slice(0, 2);
    if (batches.length > 0) {
      const id = nextTransferId();
      const items = batches.map((batch) => {
        const quantity = round(batch.remaining * 0.08, 3);
        return {
          id: `${id}-item-${batch.id}`,
          batchId: batch.id,
          receiptId: batch.receiptId,
          invoiceNumber: batch.invoiceNumber,
          productId: batch.productId,
          productName: batch.productName,
          unit: batch.unit,
          quantity,
        };
      });
      transfers.push({
        id,
        fromObjectId: from.id,
        toObjectId: to.id,
        date: shiftIso(today, -2),
        items,
      });
    }
  }
}

seedWarehouseDocs();

/* ───────────────────────── счета ───────────────────────── */

export function buildAccounts(): Account[] {
  const today = todayIso();
  const accounts: Account[] = [];
  const autoWriteOffs = writeOffs.filter((w) => w.kind === 'auto');

  for (const unit of planningUnits()) {
    for (let back = 0; back < 5; back += 1) {
      const date = shiftIso(today, -back);
      const units = planningUnits();
      const meals: AccountMeal[] = [];
      let totalPassed = 0;
      let totalCharged = 0;

      for (const mealId of MEAL_IDS) {
        const dietRows = unit.groups.flatMap((grp) =>
          grp.diets.map((diet) => {
            const dietDef = findDiet(diet.id);
            const headcount = headcountFor(date, unit.id, grp.id, diet.id);
            const charged = round((headcount * (dietDef?.pricePerDay ?? 200)) / 5, 2);
            return { dietId: diet.id, dietName: diet.name, passed: headcount, charged };
          })
        );
        const passed = dietRows.reduce((sum, row) => sum + row.passed, 0);
        const charged = round(
          dietRows.reduce((sum, row) => sum + row.charged, 0),
          2
        );
        if (passed === 0) continue;
        totalPassed += passed;
        totalCharged = round(totalCharged + charged, 2);
        meals.push({ mealId, passed, charged, diets: dietRows });
      }

      if (meals.length === 0) continue;
      const writeOff =
        autoWriteOffs[units.findIndex((u) => u.id === unit.id) % Math.max(autoWriteOffs.length, 1)];
      accounts.push({
        id: `acc-${unit.id}-${date}`,
        objectId: unit.id,
        objectName: unit.name,
        date,
        passed: totalPassed,
        charged: totalCharged,
        writeOffId: writeOff?.id ?? '',
        meals,
      });
    }
  }

  return accounts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ───────────────────────── персонал ───────────────────────── */

export const staffRoles: StaffRole[] = [
  {
    id: 'role-admin',
    name: 'Administrátor',
    description: 'Plný přístup ke všem sekcím organizace.',
    sections: [],
    fullAccess: true,
  },
  {
    id: 'role-nutritionist',
    name: 'Dietolog',
    description: 'Jídelníček, diety, technologické karty a porce.',
    sections: [
      { id: 'menu', title: 'Jídelníček' },
      { id: 'diets', title: 'Diety' },
      { id: 'ttk', title: 'Technologické karty' },
      { id: 'portions', title: 'Porce' },
    ],
    fullAccess: false,
  },
  {
    id: 'role-storekeeper',
    name: 'Skladník',
    description: 'Sklad: příjemky, odpisy, přesuny a zůstatky.',
    sections: [
      { id: 'warehouse-receipts', title: 'Příjemky' },
      { id: 'warehouse-balances', title: 'Zůstatky' },
      { id: 'write-offs', title: 'Odpisy' },
      { id: 'warehouse-transfers', title: 'Přesuny' },
    ],
    fullAccess: false,
  },
  {
    id: 'role-accountant',
    name: 'Účetní',
    description: 'Fakturace, kalkulace a sklad.',
    sections: [
      { id: 'accounts', title: 'Fakturace' },
      { id: 'products-spread', title: 'Kalkulace surovin' },
      { id: 'warehouse-balances', title: 'Zůstatky' },
    ],
    fullAccess: false,
  },
  {
    id: 'role-employee',
    name: 'Zaměstnanec',
    description: 'Náhled jídelníčku a porcí.',
    sections: [
      { id: 'menu', title: 'Jídelníček' },
      { id: 'portions', title: 'Porce' },
    ],
    fullAccess: false,
  },
];

interface EmployeeSeed {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  orgEmail: string;
  roleId: string;
  status: EmployeeStatus;
}

const EMPLOYEE_SEEDS: EmployeeSeed[] = [
  {
    id: 'emp-1',
    firstName: 'Anna',
    lastName: 'Nováková',
    email: 'a.novakova@styleu.cz',
    orgEmail: 'novakova@skola5.cz',
    roleId: 'role-admin',
    status: 'EMPLOYEE_STATUS_ACTIVE',
  },
  {
    id: 'emp-2',
    firstName: 'Petr',
    lastName: 'Svoboda',
    email: 'p.svoboda@styleu.cz',
    orgEmail: 'svoboda@skola5.cz',
    roleId: 'role-nutritionist',
    status: 'EMPLOYEE_STATUS_ACTIVE',
  },
  {
    id: 'emp-3',
    firstName: 'Olga',
    lastName: 'Kučerová',
    email: 'o.kucerova@styleu.cz',
    orgEmail: '',
    roleId: 'role-storekeeper',
    status: 'EMPLOYEE_STATUS_INVITED',
  },
  {
    id: 'emp-4',
    firstName: 'David',
    lastName: 'Vlček',
    email: 'd.vlcek@styleu.cz',
    orgEmail: '',
    roleId: 'role-accountant',
    status: 'EMPLOYEE_STATUS_EXPIRED',
  },
  {
    id: 'emp-5',
    firstName: 'Kateřina',
    lastName: 'Mrázová',
    email: 'k.mrazova@styleu.cz',
    orgEmail: 'mrazova@gymnazium12.cz',
    roleId: 'role-nutritionist',
    status: 'EMPLOYEE_STATUS_ACTIVE',
  },
  {
    id: 'emp-6',
    firstName: 'Štěpán',
    lastName: 'Polák',
    email: 's.polak@styleu.cz',
    orgEmail: '',
    roleId: 'role-storekeeper',
    status: 'EMPLOYEE_STATUS_ACTIVE',
  },
  {
    id: 'emp-7',
    firstName: 'Marie',
    lastName: 'Sokolová',
    email: 'm.sokolova@styleu.cz',
    orgEmail: 'sokolova@ms-sedmikraska.cz',
    roleId: 'role-employee',
    status: 'EMPLOYEE_STATUS_ACTIVE',
  },
  {
    id: 'emp-8',
    firstName: 'Aleš',
    lastName: 'Lebeda',
    email: 'a.lebeda@styleu.cz',
    orgEmail: '',
    roleId: 'role-accountant',
    status: 'EMPLOYEE_STATUS_INVITED',
  },
];

export const employees: Employee[] = EMPLOYEE_SEEDS.map((seed, index) => ({
  id: seed.id,
  firstName: seed.firstName,
  lastName: seed.lastName,
  email: seed.email,
  orgEmail: seed.orgEmail,
  roleId: seed.roleId,
  status: seed.status,
  registeredAt:
    seed.status === 'EMPLOYEE_STATUS_ACTIVE'
      ? String(Date.now() - (index + 1) * 86400000 * 20)
      : seed.status === 'EMPLOYEE_STATUS_EXPIRED'
        ? '0'
        : '0',
  createdAt: String(Date.now() - (index + 1) * 86400000 * 40),
}));

export function findEmployee(id: string): Employee | undefined {
  return employees.find((employee) => employee.id === id);
}

/* ───────────────────────── администрирование организаций ───────────────────────── */

const SCOPE_SEEDS: OrganizationScope[] = [
  {
    id: 'read:ttk',
    name: 'Čtení technologických karet',
    description: 'Náhled technologických karet',
  },
  {
    id: 'manage:organization',
    name: 'Správa organizace',
    description: 'Členové, role a pozvánky vlastní organizace',
  },
  {
    id: 'manage:platform',
    name: 'Správa platformy',
    description: 'Administrace všech organizací platformy',
  },
];

function scopes(...ids: string[]): OrganizationScope[] {
  return SCOPE_SEEDS.filter((scope) => ids.includes(scope.id));
}

export const organizationRoles: OrganizationRole[] = [
  {
    id: 'orole-owner',
    name: 'Vlastník platformy',
    description: 'Plný přístup k platformě a všem organizacím.',
    scopes: scopes('manage:platform', 'manage:organization', 'read:ttk'),
  },
  {
    id: 'orole-admin',
    name: 'Administrátor organizace',
    description: 'Spravuje členy a nastavení organizace.',
    scopes: scopes('manage:organization', 'read:ttk'),
  },
  {
    id: 'orole-editor',
    name: 'Editor',
    description: 'Spravuje jídelníček, technologické karty a číselníky.',
    scopes: scopes('read:ttk'),
  },
  {
    id: 'orole-viewer',
    name: 'Pozorovatel',
    description: 'Pouze náhled.',
    scopes: scopes(),
  },
];

const ORGANIZATION_SEEDS: {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  disabled: boolean;
}[] = [
  {
    id: 'org-styleu',
    name: 'StyleU s.r.o.',
    description: 'Hlavní organizace platformy.',
    memberCount: 8,
    disabled: false,
  },
  {
    id: 'org-gym12',
    name: 'Gymnázium č. 12',
    description: 'Stravování studentů gymnázia.',
    memberCount: 5,
    disabled: false,
  },
  {
    id: 'org-school5',
    name: 'Škola č. 5',
    description: 'Stravování žáků.',
    memberCount: 4,
    disabled: false,
  },
  {
    id: 'org-ds-romashka',
    name: 'Mateřská škola „Sedmikráska“',
    description: 'Stravování dětí.',
    memberCount: 6,
    disabled: false,
  },
  {
    id: 'org-hospital3',
    name: 'Městská nemocnice č. 3',
    description: 'Léčebná výživa.',
    memberCount: 3,
    disabled: true,
  },
  {
    id: 'org-test',
    name: 'Testovací organizace',
    description: 'Pro testování scénářů.',
    memberCount: 1,
    disabled: false,
  },
];

export const organizations: Organization[] = ORGANIZATION_SEEDS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  description: seed.description,
  memberCount: seed.memberCount,
  disabled: seed.disabled,
  createdAt: String(Date.now() - (index + 1) * 86400000 * 60),
  /** Модули по умолчанию: у StyleU включены оба, у остальных — выкл. */
  features: {
    warehouseEnabled: seed.id === 'org-styleu',
    financeEnabled: seed.id === 'org-styleu',
    objectsEnabled: false,
  },
}));

function buildMember(
  userId: string,
  email: string,
  name: string,
  suspended: boolean,
  roleIds: string[]
): OrganizationMember {
  return {
    userId,
    primaryEmail: email,
    name,
    suspended,
    roles: organizationRoles.filter((role) => roleIds.includes(role.id)),
  };
}

export const organizationMembers = new Map<string, OrganizationMember[]>([
  [
    'org-styleu',
    [
      buildMember('user-001', 'a.novakova@styleu.cz', 'Nováková Anna', false, [
        'orole-owner',
        'orole-admin',
      ]),
      buildMember('user-002', 'p.svoboda@styleu.cz', 'Svoboda Petr', false, ['orole-editor']),
      buildMember('user-003', 'o.kucerova@styleu.cz', 'Kučerová Olga', false, ['orole-viewer']),
      buildMember('user-004', 'd.vlcek@styleu.cz', 'Vlček David', true, ['orole-viewer']),
    ],
  ],
  [
    'org-gym12',
    [
      buildMember('user-005', 'k.mrazova@styleu.cz', 'Mrázová Kateřina', false, ['orole-admin']),
      buildMember('user-006', 's.polak@styleu.cz', 'Polák Štěpán', false, ['orole-editor']),
    ],
  ],
  [
    'org-school5',
    [
      buildMember('user-007', 'm.sokolova@styleu.cz', 'Sokolová Marie', false, ['orole-admin']),
      buildMember('user-008', 'a.lebeda@styleu.cz', 'Lebeda Aleš', false, ['orole-viewer']),
    ],
  ],
  [
    'org-ds-romashka',
    [
      buildMember('user-009', 'n.fialova@styleu.cz', 'Fialová Natálie', false, ['orole-admin']),
      buildMember('user-010', 'i.tichy@styleu.cz', 'Tichý Igor', false, ['orole-editor']),
    ],
  ],
]);

export const organizationInvitations = new Map<string, Invitation[]>([
  [
    'org-styleu',
    [
      {
        id: 'inv-001',
        invitee: 'n.fialova@styleu.cz',
        status: 'INVITATION_STATUS_PENDING',
        createdAt: String(Date.now() - 86400000 * 2),
        expiresAt: String(Date.now() + 86400000 * 5),
        roles: organizationRoles.filter((role) => role.id === 'orole-editor'),
      },
      {
        id: 'inv-002',
        invitee: 'k.orlik@styleu.cz',
        status: 'INVITATION_STATUS_EXPIRED',
        createdAt: String(Date.now() - 86400000 * 20),
        expiresAt: String(Date.now() - 86400000 * 13),
        roles: organizationRoles.filter((role) => role.id === 'orole-viewer'),
      },
    ],
  ],
]);

export const FACILITY_TYPES: FacilityType[] = ['school', 'kindergarten', 'hospital', 'warehouse'];
