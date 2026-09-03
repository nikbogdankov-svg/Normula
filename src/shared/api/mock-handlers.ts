import type { RequestOptions } from './client';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/features/organizations/types';
import type { Employee, EmployeeDocuments, StaffRole } from '@/features/staff/types';
import { EMPTY_DOCUMENTS } from '@/features/staff/types';
import type { Collection, Recipe } from '@/features/ttk/types';
import type { Product, ProductCategory } from '@/features/products/types';
import type { Diet } from '@/features/diets/types';
import type { CycleMenu, MealId, MenuDishRef } from '@/features/menu/types';
import { MEALS } from '@/features/menu/types';
import {
  formatKettle,
  isFacilityType,
  type DistributionRow,
  type Facility,
  type FacilityType,
  type KitchenUnit,
} from '@/features/objects/types';
import { todayIso, type DishDistributionRow, type PortionEntry } from '@/features/portions/types';
import type { WarehouseReceipt } from '@/features/warehouse-receipts/types';

/**
 * In-memory обработчики для mock-режима: фронт полностью работает без бэка.
 *
 * Добавляя фичу, регистрируй её эндпоинты здесь по образцу ниже —
 * тогда фича сразу работает в `npm run dev:mock` без Logto и бэкенда.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Разделы, у которых бэкенда ещё нет.
 *
 * При config.mockUnimplemented такие пути обслуживаются из памяти, даже если
 * вход настоящий — иначе с реальным Logto эти экраны отдавали бы 404 с бэка.
 * Как только ручка появится на сервере, префикс отсюда убирается — и запросы
 * сразу пойдут по сети, без правок в фичах.
 */
export const MOCKED_PREFIXES = [
  '/v1/ttk',
  '/v1/menus',
  '/v1/objects',
  '/v1/portions',
  '/v1/warehouse',
  '/v1/write-offs',
  '/v1/products',
  '/v1/product-categories',
  '/v1/diets',
];

/** Обслуживается ли путь моками, пока бэкенда под него нет. */
export function isMocked(path: string): boolean {
  return MOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const SCOPE_PLATFORM = {
  id: 'sc-1',
  name: 'manage:platform',
  description: 'Управление платформой',
};
const SCOPE_ORG = {
  id: 'sc-2',
  name: 'manage:organization',
  description: 'Управление организацией',
};
const SCOPE_TTK = { id: 'sc-3', name: 'read:ttk', description: 'Чтение ТТК' };

const roles: OrganizationRole[] = [
  {
    id: 'role-platform',
    name: 'onemore-admin',
    description: 'Администратор платформы',
    scopes: [SCOPE_PLATFORM, SCOPE_ORG, SCOPE_TTK],
  },
  {
    id: 'role-org',
    name: 'org-admin',
    description: 'Администратор организации',
    scopes: [SCOPE_ORG, SCOPE_TTK],
  },
];

const day = 24 * 60 * 60 * 1000;

const organizations: Organization[] = [
  {
    id: '7flpuvsid5cb',
    name: 'onemore',
    description: 'Служебная организация платформы',
    memberCount: 1,
    disabled: false,
    createdAt: String(Date.now() - 90 * day),
  },
  {
    id: 'org-school-12',
    name: 'Школа №12',
    description: 'Пищеблок школы',
    memberCount: 3,
    disabled: false,
    createdAt: String(Date.now() - 30 * day),
  },
  {
    id: 'org-kindergarten-5',
    name: 'Детский сад №5',
    description: '',
    memberCount: 0,
    disabled: true,
    createdAt: String(Date.now() - 5 * day),
  },
];

const members: Record<string, OrganizationMember[]> = {
  '7flpuvsid5cb': [
    {
      userId: 'r6uhcv4ivr0o',
      primaryEmail: 'e.gerasimov@mail.com',
      name: 'Евгений Герасимов',
      suspended: false,
      roles: [roles[0]],
    },
  ],
  'org-school-12': [
    {
      userId: 'u-1',
      primaryEmail: 'director@school12.ru',
      name: 'Никита Богданков',
      suspended: false,
      roles: [roles[1]],
    },
    {
      userId: 'u-2',
      primaryEmail: 'cook@school12.ru',
      name: 'Мария Иванова',
      suspended: false,
      roles: [],
    },
    {
      userId: 'u-3',
      primaryEmail: 'buh@school12.ru',
      name: '',
      suspended: true,
      roles: [],
    },
  ],
};

const invitations: Record<string, Invitation[]> = {
  'org-school-12': [
    {
      id: 'inv-1',
      invitee: 'newcook@school12.ru',
      status: 'INVITATION_STATUS_PENDING',
      createdAt: String(Date.now() - day),
      expiresAt: String(Date.now() + 6 * day),
      roles: [roles[1]],
    },
  ],
};

// --- Администрирование: роли и персонал ---

const section = (id: string, title: string) => ({ id, title });

const ALL_SECTIONS = [
  section('planning', 'Планирование'),
  section('production', 'Производство'),
  section('warehouse', 'Склад'),
  section('finance', 'Финансы'),
  section('documents', 'Документы'),
  section('reference', 'Справочники'),
  section('administration', 'Администрирование'),
];

const staffRoles: StaffRole[] = [
  {
    id: 'r-admin',
    name: 'org-admin',
    description: 'Администратор организации',
    sections: ALL_SECTIONS,
    fullAccess: true,
  },
  {
    id: 'r-cook',
    name: 'Повар',
    description: 'Планирование и производство',
    sections: [ALL_SECTIONS[0], ALL_SECTIONS[1], ALL_SECTIONS[5]],
    fullAccess: false,
  },
  {
    id: 'r-store',
    name: 'Складовщик',
    description: 'Склад',
    sections: [ALL_SECTIONS[2]],
    fullAccess: false,
  },
  {
    id: 'r-book',
    name: 'Бухгалтер',
    description: 'Финансы',
    sections: [ALL_SECTIONS[3]],
    fullAccess: false,
  },
];

const employees: Employee[] = [
  'Иванов;Иван;r-cook',
  'Петрова;Мария;r-cook',
  'Сидоров;Пётр;r-cook',
  'Кузнецова;Анна;r-book',
  'Богданков;Никита;r-admin',
].map((row, index) => {
  const [lastName, firstName, roleId] = row.split(';');
  // Последний ещё не заходил: пусть в моках будет виден и такой случай.
  const registered = index < 4;

  return {
    id: `e-${index + 1}`,
    firstName,
    lastName,
    email: `${lastName.toLowerCase()}${firstName.toLowerCase()}@mail.ru`,
    orgEmail: `${lastName.toLowerCase()}${firstName.toLowerCase()}@pitaniye.ru`,
    roleId,
    status: registered ? ('EMPLOYEE_STATUS_ACTIVE' as const) : ('EMPLOYEE_STATUS_INVITED' as const),
    registeredAt: registered ? String(Date.UTC(2019, 1, 1 + index)) : '0',
    createdAt: String(Date.UTC(2019, 0, 1 + index)),
  };
});

/** Документы отдаются только в карточке — в списке их нет, как и на бэке. */
const employeeDocuments: Record<string, EmployeeDocuments> = Object.fromEntries(
  employees.map((employee, index) => [
    employee.id,
    {
      snils: `1122334459${index}`,
      inn: `50010073225${index}`,
      passportSeries: `012${index}`,
      passportNumber: `45678${index}`,
      otherDoc: `DOC-${index + 1}`,
    },
  ])
);

// --- ТТК ---

const collections: Collection[] = [
  { id: 'c-1', name: 'Сборник рецептур на продукцию для обучающихся, Москва 2017' },
  { id: 'c-2', name: 'Сборник технических нормативов, 2020' },
];

const DISH_NAMES = [
  'Бефстроганов из мяса',
  'Каша рисовая молочная',
  'Омлет натуральный',
  'Суп картофельный с мясом',
  'Котлета куриная паровая',
  'Компот из сухофруктов',
  'Салат из свежих овощей',
  'Пюре картофельное',
  'Рыба запечённая',
  'Чай с сахаром',
  'Бутерброд с сыром',
  'Борщ со сметаной',
  'Гуляш из говядины',
  'Каша гречневая',
  'Сок яблочный',
  'Запеканка творожная',
  'Щи из свежей капусты',
  'Котлета рыбная',
  'Макароны отварные',
  'Кисель ягодный',
  'Яйцо варёное',
  'Суп гороховый',
  'Рагу овощное',
  'Какао с молоком',
];

const sampleRecipe = (index: number): Recipe => {
  const inCollection = index % 3 !== 0;
  const protein = (12 + (index % 8) * 2.4).toFixed(1).replace('.', ',');
  const fat = (8 + (index % 6) * 1.7).toFixed(1).replace('.', ',');
  const carbs = (18 + (index % 10) * 3.2).toFixed(1).replace('.', ',');
  const kcal = 180 + (index % 9) * 35;

  return {
    id: `t-${index}`,
    name: DISH_NAMES[(index - 1) % DISH_NAMES.length],
    collectionName: inCollection ? collections[index % 2].name : '',
    collectionId: inCollection ? collections[index % 2].id : '',
    portionYield: index % 2 === 0 ? '150/50' : '90/50',
    price: 95 + (index % 7) * 18,
    kcal,
    temperature: 'Отпуск не ниже 65°С',
    shelfLife: 'Не более 2х часов с момента реализации',
    recipe:
      'Подготовленное мясо, нарезанное широкими кусками, отбивают до толщины 5-8 мм и нарезают ' +
      'брусочками длиной 3-4 см массой 5-7 г. Затем кладут ровным слоем на сковороду, посыпают ' +
      'солью и запекают. Из пассерованной муки и сметаны приготавливают соус.',
    ingredients: [
      {
        name: 'Говядина',
        grossPerPortion: '193',
        netPerPortion: '142',
        grossPer100: '19,3',
        netPer100: '14,2',
        pricePerKg: '450 ₽',
      },
      {
        name: 'Масса готового мяса',
        grossPerPortion: '',
        netPerPortion: '90',
        grossPer100: '',
        netPer100: '9,0',
        pricePerKg: '',
      },
      {
        name: 'Лук репчатый',
        grossPerPortion: '29',
        netPerPortion: '24',
        grossPer100: '2,9',
        netPer100: '2,4',
        pricePerKg: '80 ₽',
      },
      {
        name: 'Масло растительное',
        grossPerPortion: '7',
        netPerPortion: '7',
        grossPer100: '0,7',
        netPer100: '0,7',
        pricePerKg: '200 ₽',
      },
      {
        name: 'Мука пшеничная',
        grossPerPortion: '4',
        netPerPortion: '4',
        grossPer100: '0,4',
        netPer100: '0,4',
        pricePerKg: '70 ₽',
      },
      {
        name: 'Сметана',
        grossPerPortion: '23',
        netPerPortion: '23',
        grossPer100: '2,3',
        netPer100: '2,3',
        pricePerKg: '320 ₽',
      },
      {
        name: 'Соль',
        grossPerPortion: '1,8',
        netPerPortion: '1,8',
        grossPer100: '0,18',
        netPer100: '0,18',
        pricePerKg: '25 ₽',
      },
    ],
    outputPerPortion: index % 2 === 0 ? '150/50' : '90/50',
    outputPer100: '9,0/5,0',
    nutrition: {
      protein,
      fat,
      carbs,
      kcal: String(kcal),
      vitaminC: (0.4 + (index % 5) * 0.2).toFixed(2).replace('.', ','),
    },
  };
};

const recipes: Recipe[] = Array.from({ length: 24 }, (_, index) => sampleRecipe(index + 1));

// --- Продукты (справочник КБЖУ) ---

const PRODUCT_NAMES = [
  'Мука пшеничная',
  'Сахар-песок',
  'Масло растительное',
  'Молоко 3,2%',
  'Яйцо куриное',
  'Говядина',
  'Курица',
  'Рыба',
  'Картофель',
  'Морковь',
  'Лук репчатый',
  'Сметана',
  'Творог 9%',
  'Соль',
  'Хлеб пшеничный',
  'Рис',
  'Гречка',
  'Макароны',
  'Сыр твёрдый',
  'Яблоки',
];

// Категории продуктов — справочник внутри справочника.
const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'c-1', name: 'Бакалея' },
  { id: 'c-2', name: 'Овощи' },
  { id: 'c-3', name: 'Фрукты и ягоды' },
  { id: 'c-4', name: 'Молочные продукты и яйца' },
  { id: 'c-5', name: 'Мясо и птица' },
  { id: 'c-6', name: 'Рыба' },
  { id: 'c-7', name: 'Крупы и макаронные изделия' },
  { id: 'c-8', name: 'Хлебобулочные изделия' },
];

const PRODUCT_NAME_CATEGORY: Record<string, string> = {
  'Мука пшеничная': 'c-1',
  'Сахар-песок': 'c-1',
  'Масло растительное': 'c-1',
  Соль: 'c-1',
  Картофель: 'c-2',
  Морковь: 'c-2',
  'Лук репчатый': 'c-2',
  Яблоки: 'c-3',
  'Молоко 3,2%': 'c-4',
  'Яйцо куриное': 'c-4',
  Сметана: 'c-4',
  'Творог 9%': 'c-4',
  'Сыр твёрдый': 'c-4',
  Говядина: 'c-5',
  Курица: 'c-5',
  Рыба: 'c-6',
  Рис: 'c-7',
  Гречка: 'c-7',
  Макароны: 'c-7',
  'Хлеб пшеничный': 'c-8',
};

const sampleProduct = (index: number): Product => {
  const kcal = 80 + (index % 15) * 27;

  return {
    id: `p-${index}`,
    name: PRODUCT_NAMES[(index - 1) % PRODUCT_NAMES.length],
    categoryId: PRODUCT_NAME_CATEGORY[PRODUCT_NAMES[(index - 1) % PRODUCT_NAMES.length]] ?? 'c-1',
    kcal,
    protein: Number(((2 + (index % 9) * 1.7) / 1.7).toFixed(1)),
    fat: Number(((1 + (index % 8) * 1.5) / 1.5).toFixed(1)),
    carbs: Number(((8 + (index % 12) * 3.1) / 3.1).toFixed(1)),
    vitaminC: Number((0.4 + (index % 7) * 2.3).toFixed(1)),
  };
};

const products: Product[] = Array.from({ length: 20 }, (_, index) => sampleProduct(index + 1));

// Soft-удалённые продукты: ушли из справочника, но остаются в меню и других
// разделах до конца недели, поэтому из products не вырезаются.
const deletedProductIds = new Set<string>();
// Soft-удалённые ТТК: аналогично продуктам — остаются в меню до конца периода.
const deletedRecipeIds = new Set<string>();

const mockedDiets: Diet[] = [
  {
    id: 'diet-main',
    name: 'Основной',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    pricePerDay: 450,
    kcal: 1800,
    protein: 90,
    fat: 60,
    carbs: 250,
  },
  {
    id: 'diet-gentle',
    name: 'Щадящий',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    pricePerDay: 430,
    kcal: 1750,
    protein: 85,
    fat: 55,
    carbs: 240,
  },
  {
    id: 'diet-gluten-free',
    name: 'Безглютеновый',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    pricePerDay: 460,
    kcal: 1800,
    protein: 90,
    fat: 60,
    carbs: 240,
  },
  {
    id: 'diet-lactose-free',
    name: 'Безлактозный',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    pricePerDay: 455,
    kcal: 1800,
    protein: 90,
    fat: 55,
    carbs: 250,
  },
  {
    id: 'diet-diabetic',
    name: 'Диабетический',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    pricePerDay: 440,
    kcal: 1600,
    protein: 85,
    fat: 50,
    carbs: 200,
  },
  {
    id: 'diet-vegetarian',
    name: 'Вегетарианский',
    appliesTo: ['school', 'kindergarten'],
    pricePerDay: 420,
    kcal: 1700,
    protein: 70,
    fat: 55,
    carbs: 250,
  },
];
// Soft-удалённые диеты: скрыты из справочника, но остаются в объектах/меню.
const deletedDietIds = new Set<string>();

function emptySlots(cycleDays: number): CycleMenu['slots'] {
  const slots: CycleMenu['slots'] = [];
  for (let day = 1; day <= cycleDays; day += 1) {
    for (const meal of MEALS) {
      slots.push({ day, mealId: meal.id, dishes: [] });
    }
  }
  return slots;
}

/**
 * Пищевая ценность блюд по приёмам: в сумме за день ≈ норма «Основная»
 * (1800 ккал / Б 90 / Ж 60 / У 250 / 450 ₽) с допуском ±10%.
 */
const MEAL_NUTRITION: Record<
  MealId,
  Array<{ kcal: number; protein: number; fat: number; carbs: number; price: number }>
> = {
  breakfast: [
    { kcal: 250, protein: 12, fat: 8, carbs: 35, price: 55 },
    { kcal: 200, protein: 10, fat: 7, carbs: 30, price: 50 },
  ],
  second_breakfast: [{ kcal: 180, protein: 8, fat: 5, carbs: 28, price: 40 }],
  lunch: [
    { kcal: 220, protein: 14, fat: 8, carbs: 28, price: 55 },
    { kcal: 250, protein: 16, fat: 10, carbs: 30, price: 70 },
    { kcal: 160, protein: 8, fat: 6, carbs: 24, price: 40 },
  ],
  snack: [{ kcal: 180, protein: 6, fat: 4, carbs: 30, price: 40 }],
  dinner: [
    { kcal: 200, protein: 10, fat: 7, carbs: 25, price: 50 },
    { kcal: 160, protein: 6, fat: 5, carbs: 20, price: 50 },
  ],
};

/** Небольшой сдвиг ккал/БЖУ по дням; цена не масштабируется вверх выше лимита. */
function dayScale(day: number): number {
  return 1 + (((day - 1) % 5) - 2) * 0.02;
}

const PRICE_LIMIT = 450;

function scaleNutrition(
  value: { kcal: number; protein: number; fat: number; carbs: number; price: number },
  scale: number
) {
  return {
    kcal: Math.round(value.kcal * scale),
    protein: Math.round(value.protein * scale * 10) / 10,
    fat: Math.round(value.fat * scale * 10) / 10,
    carbs: Math.round(value.carbs * scale * 10) / 10,
    // Цену можно только снижать относительно базы — лимит нельзя превышать.
    price: Math.round(value.price * Math.min(scale, 1)),
  };
}

/** Заполняет сетку блюдами из ТТК так, чтобы итог дня закрывал норму. */
function filledSlots(cycleDays: number): CycleMenu['slots'] {
  const slots = emptySlots(cycleDays).map((slot) => {
    const mealIndex = MEALS.findIndex((meal) => meal.id === slot.mealId);
    const templates = MEAL_NUTRITION[slot.mealId];
    const scale = dayScale(slot.day);
    const dishes = templates.map((template, offset) => {
      const recipe = recipes[(slot.day * 3 + mealIndex + offset * 5) % recipes.length];
      const nutrition = scaleNutrition(template, scale);
      return {
        ...dishRef(recipe),
        name: recipe.name,
        ...nutrition,
      };
    });
    return { ...slot, dishes };
  });

  // Страховка: если из‑за округления цена дня > лимита — пропорционально ужимаем.
  for (let day = 1; day <= cycleDays; day += 1) {
    const daySlots = slots.filter((slot) => slot.day === day);
    const totalPrice = daySlots.reduce(
      (sum, slot) => sum + slot.dishes.reduce((s, dish) => s + dish.price, 0),
      0
    );
    if (totalPrice <= PRICE_LIMIT) continue;
    const factor = PRICE_LIMIT / totalPrice;
    for (const slot of daySlots) {
      slot.dishes = slot.dishes.map((dish) => ({
        ...dish,
        price: Math.max(1, Math.floor(dish.price * factor)),
      }));
    }
  }

  return slots;
}

function parseRuNumber(value: string): number {
  const parsed = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dishRef(recipe: Recipe): MenuDishRef {
  return {
    recipeId: recipe.id,
    name: recipe.name,
    kcal: recipe.kcal,
    price: recipe.price,
    protein: parseRuNumber(recipe.nutrition.protein),
    fat: parseRuNumber(recipe.nutrition.fat),
    carbs: parseRuNumber(recipe.nutrition.carbs),
    portionYield: recipe.portionYield,
  };
}

function mondayOfWeek(iso: string = todayIso()): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  const weekday = date.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const menus: CycleMenu[] = [
  {
    id: 'menu-1',
    name: 'Меню',
    dietName: 'Основная',
    startDate: mondayOfWeek(),
    cycleDays: 14,
    status: 'draft',
    createdAt: new Date().toISOString(),
    slots: filledSlots(14),
  },
];

/**
 * Слоты по периоду (понедельник начала 14 дней).
 * Текущий период — с расписанием, остальные при первом заходе пустые.
 */
const menuSlotsByPeriod = new Map<string, Record<string, CycleMenu['slots']>>();

function periodSlots(menuId: string): Record<string, CycleMenu['slots']> {
  let periods = menuSlotsByPeriod.get(menuId);
  if (!periods) {
    periods = {};
    menuSlotsByPeriod.set(menuId, periods);
  }
  return periods;
}

for (const menu of menus) {
  periodSlots(menu.id)[menu.startDate] = menu.slots;
}

// --- Склад: приходы и остатки ---

const warehouseReceipts = [
  {
    id: 'rec-1',
    date: new Date(Date.now() - 2 * day).toISOString(),
    invoiceNumber: 'НАК-2025-001',
    warehouseId: 'warehouse-central',
    items: [
      {
        id: 'rec-1-item-1',
        productId: 'prod-1',
        productName: 'Мука пшеничная',
        quantity: 50,
        unit: 'кг',
        unitPrice: 45,
        totalPrice: 2250,
        packaging: 'Мешок 25 кг',
        productionDate: '2025-06-10',
        manufacturer: 'ООО «Зерно»',
        supplier: 'ООО «ОптПродукт»',
        documentType: 'Декларация о соответствии',
        documentNumber: 'ЕАЭС N RU Д-RU.АВ90.В.01234',
        organoleptic: 'Соответствует',
        storageConditions: 'Сухое проветриваемое помещение',
        expiryDate: '2025-12-10',
      },
      {
        id: 'rec-1-item-2',
        productId: 'prod-2',
        productName: 'Масло подсолнечное',
        quantity: 20,
        unit: 'л',
        unitPrice: 120,
        totalPrice: 2400,
        packaging: 'ПЭТ бутылка 1 л',
        productionDate: '2025-05-20',
        manufacturer: 'ООО «МаслоДом»',
        supplier: 'ООО «ОптПродукт»',
        documentType: 'Декларация о соответствии',
        documentNumber: 'ЕАЭС N RU Д-RU.АВ90.В.05678',
        organoleptic: 'Соответствует',
        storageConditions: 'Тёмное прохладное место',
        expiryDate: '2026-05-20',
      },
    ],
    createdAt: new Date(Date.now() - 2 * day).toISOString(),
    updatedAt: new Date(Date.now() - 2 * day).toISOString(),
  },
  {
    id: 'rec-2',
    date: new Date(Date.now() - 1 * day).toISOString(),
    invoiceNumber: 'НАК-2025-002',
    warehouseId: 'warehouse-central',
    items: [
      {
        id: 'rec-2-item-1',
        productId: 'prod-3',
        productName: 'Молоко коровье',
        quantity: 100,
        unit: 'л',
        unitPrice: 65,
        totalPrice: 6500,
        packaging: 'Пакет 1 л',
        productionDate: '2025-06-14',
        manufacturer: 'АО «Молзавод»',
        supplier: 'ООО «Молочный мир»',
        documentType: 'Декларация о соответствии',
        documentNumber: 'ЕАЭС N RU Д-RU.АВ90.В.08901',
        organoleptic: 'Соответствует',
        storageConditions: 'Холодильная камера 0…+4 °C',
        expiryDate: '2025-06-18',
      },
      {
        id: 'rec-2-item-2',
        productId: 'prod-4',
        productName: 'Яйцо куриное',
        quantity: 300,
        unit: 'шт',
        unitPrice: 12,
        totalPrice: 3600,
        packaging: 'Коробка 30 шт',
        productionDate: '2025-06-13',
        manufacturer: 'АО «Птицефабрика»',
        supplier: 'ООО «Молочный мир»',
        documentType: 'Ветеринарное свидетельство',
        documentNumber: 'ВСД № 12345678',
        organoleptic: 'Соответствует',
        storageConditions: 'Холодильная камера до +6 °C',
        expiryDate: '2025-06-27',
      },
    ],
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
    updatedAt: new Date(Date.now() - 1 * day).toISOString(),
  },
];

const warehouseBalances = [
  {
    id: 'bal-1',
    date: new Date(Date.now() - 2 * day).toISOString(),
    warehouseId: 'warehouse-central',
    items: [
      {
        productId: 'prod-1',
        productName: 'Мука пшеничная',
        unit: 'кг',
        batches: [
          { batchId: 'batch-1-1', batchNumber: 'НАК-2025-001', remaining: 70, price: 45 },
          { batchId: 'batch-1-2', batchNumber: 'НАК-2025-003', remaining: 50, price: 48 },
        ],
      },
      {
        productId: 'prod-2',
        productName: 'Масло подсолнечное',
        unit: 'л',
        batches: [
          { batchId: 'batch-2-1', batchNumber: 'НАК-2025-001', remaining: 30, price: 120 },
          { batchId: 'batch-2-2', batchNumber: 'НАК-2025-004', remaining: 15, price: 125 },
        ],
      },
    ],
    createdAt: new Date(Date.now() - 2 * day).toISOString(),
    updatedAt: new Date(Date.now() - 2 * day).toISOString(),
  },
  {
    id: 'bal-2',
    date: new Date(Date.now() - 1 * day).toISOString(),
    warehouseId: 'warehouse-central',
    items: [
      {
        productId: 'prod-3',
        productName: 'Молоко коровье',
        unit: 'л',
        batches: [
          { batchId: 'batch-3-1', batchNumber: 'НАК-2025-002', remaining: 80, price: 65 },
          { batchId: 'batch-3-2', batchNumber: 'НАК-2025-005', remaining: 40, price: 68 },
        ],
      },
      {
        productId: 'prod-4',
        productName: 'Яйцо куриное',
        unit: 'шт',
        batches: [
          { batchId: 'batch-4-1', batchNumber: 'НАК-2025-002', remaining: 400, price: 12 },
          { batchId: 'batch-4-2', batchNumber: 'НАК-2025-006', remaining: 200, price: 13 },
        ],
      },
    ],
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
    updatedAt: new Date(Date.now() - 1 * day).toISOString(),
  },
];

const writeOffs = [
  {
    id: 'wo-1',
    type: 'exceptional',
    date: new Date(Date.now() - 2 * day).toISOString(),
    warehouseId: 'warehouse-central',
    reason: 'Истёк срок годности',
    items: [
      {
        id: 'wo-1-item-1',
        productId: 'prod-3',
        productName: 'Молоко коровье',
        quantity: 12,
        unit: 'л',
        unitPrice: 65,
        totalPrice: 780,
      },
      {
        id: 'wo-1-item-2',
        productId: 'prod-4',
        productName: 'Яйцо куриное',
        quantity: 40,
        unit: 'шт',
        unitPrice: 12,
        totalPrice: 480,
      },
    ],
    createdAt: new Date(Date.now() - 2 * day).toISOString(),
    updatedAt: new Date(Date.now() - 2 * day).toISOString(),
  },
  {
    id: 'wo-2',
    type: 'exceptional',
    date: new Date(Date.now() - 1 * day).toISOString(),
    warehouseId: 'warehouse-central',
    reason: 'Бой при транспортировке',
    items: [
      {
        id: 'wo-2-item-1',
        productId: 'prod-2',
        productName: 'Масло подсолнечное',
        quantity: 3,
        unit: 'л',
        unitPrice: 120,
        totalPrice: 360,
      },
    ],
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
    updatedAt: new Date(Date.now() - 1 * day).toISOString(),
  },
  {
    id: 'wo-3',
    type: 'daily',
    date: new Date(Date.now() - 1 * day).toISOString(),
    warehouseId: 'warehouse-central',
    reason: 'Ежедневное списание',
    items: [
      {
        id: 'wo-3-item-1',
        productId: 'prod-1',
        productName: 'Мука пшеничная',
        quantity: 5,
        unit: 'кг',
        unitPrice: 45,
        totalPrice: 225,
      },
      {
        id: 'wo-3-item-2',
        productId: 'prod-3',
        productName: 'Молоко коровье',
        quantity: 8,
        unit: 'л',
        unitPrice: 65,
        totalPrice: 520,
      },
    ],
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
    updatedAt: new Date(Date.now() - 1 * day).toISOString(),
  },
  {
    id: 'wo-4',
    type: 'daily',
    date: new Date(Date.now() - 3 * day).toISOString(),
    warehouseId: 'warehouse-central',
    reason: 'Ежедневное списание',
    items: [
      {
        id: 'wo-4-item-1',
        productId: 'prod-4',
        productName: 'Яйцо куриное',
        quantity: 60,
        unit: 'шт',
        unitPrice: 12,
        totalPrice: 720,
      },
    ],
    createdAt: new Date(Date.now() - 3 * day).toISOString(),
    updatedAt: new Date(Date.now() - 3 * day).toISOString(),
  },
];

/** Достаёт сегменты пути по шаблону вида /v1/admin/organizations/:id/members. */
function match(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(pathParts[index]);
      continue;
    }

    if (part !== pathParts[index]) return null;
  }

  return params;
}

export async function handleMockRequest<T>(path: string, options: RequestOptions): Promise<T> {
  await delay(250); // имитация сети, чтобы были видны лоадеры

  const method = options.method ?? 'GET';
  const [route, search] = path.split('?');
  const params = new URLSearchParams(search);

  // ТТК
  if (route === '/v1/ttk-collections' && method === 'GET') {
    return { collections } as T;
  }

  if (route === '/v1/ttk-collections/import' && method === 'POST') {
    const body = options.body as { fileNames: string[] };

    return { imported: body.fileNames.length * 12 } as T;
  }

  if (route === '/v1/ttk' && method === 'GET') {
    const query = (params.get('search') ?? '').trim().toLowerCase();
    const collectionId = params.get('collectionId') ?? '';
    const sort = params.get('sort') ?? 'name';
    const ascending = (params.get('order') ?? 'asc') !== 'desc';

    let found = recipes.filter((r) => !deletedRecipeIds.has(r.id));
    if (query) found = found.filter((r) => r.name.toLowerCase().includes(query));
    if (collectionId) found = found.filter((r) => r.collectionId === collectionId);

    const sorted = [...found].sort((a, b) => {
      const dir = ascending ? 1 : -1;
      if (sort === 'price') return (a.price - b.price) * dir;

      return a.name.localeCompare(b.name, 'ru') * dir;
    });

    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.max(1, Number(params.get('pageSize')) || 10);
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const pageRecipes = sorted.slice(start, start + pageSize);

    return { recipes: pageRecipes, total, page, pageSize } as T;
  }

  if (route === '/v1/ttk' && method === 'POST') {
    const body = options.body as {
      name: string;
      portionYield: string;
      temperature: string;
      shelfLife: string;
      recipe: string;
      ingredients: Array<{ name: string; grossPerPortion: string; netPerPortion: string }>;
    };
    const base = sampleRecipe(recipes.length + 1);
    const recipe: Recipe = {
      ...base,
      id: `t-${Date.now()}`,
      name: body.name,
      collectionId: '',
      collectionName: '',
      portionYield: body.portionYield,
      temperature: body.temperature,
      shelfLife: body.shelfLife,
      recipe: body.recipe,
      ingredients: (body.ingredients ?? [])
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name,
          grossPerPortion: row.grossPerPortion,
          netPerPortion: row.netPerPortion,
          grossPer100: '',
          netPer100: '',
          pricePerKg: '',
        })),
    };
    recipes.unshift(recipe);

    return { recipe } as T;
  }

  const ttkRecipe = match('/v1/ttk/:id', route);
  if (ttkRecipe && method === 'PATCH') {
    const found = recipes.find((r) => r.id === ttkRecipe.id);
    if (!found) throw new Error('mock: ТТК не найдена');

    const body = options.body as {
      name: string;
      portionYield: string;
      temperature: string;
      shelfLife: string;
      recipe: string;
      ingredients: Array<{ name: string; grossPerPortion: string; netPerPortion: string }>;
    };

    Object.assign(found, {
      name: body.name,
      portionYield: body.portionYield,
      temperature: body.temperature,
      shelfLife: body.shelfLife,
      recipe: body.recipe,
      ingredients: (body.ingredients ?? [])
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name,
          grossPerPortion: row.grossPerPortion,
          netPerPortion: row.netPerPortion,
          grossPer100: '',
          netPer100: '',
          pricePerKg: '',
        })),
    });

    return { recipe: found } as T;
  }

  if (ttkRecipe && method === 'DELETE') {
    const found = recipes.find((r) => r.id === ttkRecipe.id);
    if (!found) throw new Error('mock: ТТК не найдена');

    const mode = params.get('mode') ?? 'soft';
    if (mode === 'immediate') {
      const index = recipes.indexOf(found);
      recipes.splice(index, 1);
    } else {
      deletedRecipeIds.add(ttkRecipe.id);
    }

    return {} as T;
  }

  // Продукты (справочник КБЖУ)
  if (route === '/v1/product-categories' && method === 'GET') {
    return { categories: PRODUCT_CATEGORIES } as T;
  }

  if (route === '/v1/products' && method === 'GET') {
    const query = (params.get('search') ?? '').trim().toLowerCase();
    const sort = params.get('sort') ?? 'name';
    const ascending = (params.get('order') ?? 'asc') !== 'desc';
    const categoryId = params.get('categoryId') ?? '';

    let found = products.filter((p) => !deletedProductIds.has(p.id));
    if (categoryId) found = found.filter((p) => p.categoryId === categoryId);
    if (query) found = found.filter((p) => p.name.toLowerCase().includes(query));

    const sorted = [...found].sort((a, b) => {
      const dir = ascending ? 1 : -1;

      if (sort === 'kcal') return (a.kcal - b.kcal) * dir;
      if (sort === 'protein') return (a.protein - b.protein) * dir;
      if (sort === 'fat') return (a.fat - b.fat) * dir;
      if (sort === 'carbs') return (a.carbs - b.carbs) * dir;

      return a.name.localeCompare(b.name, 'ru') * dir;
    });

    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.max(1, Number(params.get('pageSize')) || 10);
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const pageProducts = sorted.slice(start, start + pageSize);

    return { products: pageProducts, total, page, pageSize } as T;
  }

  if (route === '/v1/products' && method === 'POST') {
    const body = options.body as {
      name: string;
      categoryId: string;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
      vitaminC: number;
    };
    const product: Product = {
      id: `p-${Date.now()}`,
      name: body.name,
      categoryId: body.categoryId ?? '',
      kcal: body.kcal ?? 0,
      protein: body.protein ?? 0,
      fat: body.fat ?? 0,
      carbs: body.carbs ?? 0,
      vitaminC: body.vitaminC ?? 0,
    };
    products.unshift(product);

    return { product } as T;
  }

  const productId = match('/v1/products/:id', route);
  if (productId && method === 'PATCH') {
    const found = products.find((p) => p.id === productId.id);
    if (!found) throw new Error('mock: продукт не найден');

    const body = options.body as {
      name: string;
      categoryId: string;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
      vitaminC: number;
    };

    Object.assign(found, {
      name: body.name,
      categoryId: body.categoryId ?? found.categoryId,
      kcal: body.kcal ?? 0,
      protein: body.protein ?? 0,
      fat: body.fat ?? 0,
      carbs: body.carbs ?? 0,
      vitaminC: body.vitaminC ?? found.vitaminC,
    });

    return { product: found } as T;
  }

  if (productId && method === 'DELETE') {
    const found = products.find((p) => p.id === productId.id);
    if (!found) throw new Error('mock: продукт не найден');

    const mode = params.get('mode') ?? 'soft';
    if (mode === 'immediate') {
      const index = products.indexOf(found);
      products.splice(index, 1);
    } else {
      deletedProductIds.add(productId.id);
    }

    return {} as T;
  }

  // Диеты: справочник рационов питания (см. features/diets).
  if (route === '/v1/diets' && method === 'GET') {
    const diets = mockedDiets.filter((diet) => !deletedDietIds.has(diet.id));
    return { diets } as T;
  }

  if (route === '/v1/diets' && method === 'POST') {
    const body = options.body as {
      name: string;
      appliesTo: FacilityType[];
      pricePerDay: number;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    const diet: Diet = {
      id: `diet-${Date.now()}`,
      name: body.name,
      appliesTo: body.appliesTo ?? [],
      pricePerDay: body.pricePerDay ?? 0,
      kcal: body.kcal ?? 0,
      protein: body.protein ?? 0,
      fat: body.fat ?? 0,
      carbs: body.carbs ?? 0,
    };
    mockedDiets.unshift(diet);

    return { diet } as T;
  }

  const dietId = match('/v1/diets/:id', route);
  if (dietId && method === 'PATCH') {
    const found = mockedDiets.find((diet) => diet.id === dietId.id);
    if (!found) throw new Error('mock: диета не найдена');

    const body = options.body as {
      name: string;
      appliesTo: FacilityType[];
      pricePerDay: number;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    Object.assign(found, {
      name: body.name,
      appliesTo: body.appliesTo ?? found.appliesTo,
      pricePerDay: body.pricePerDay ?? found.pricePerDay,
      kcal: body.kcal ?? found.kcal,
      protein: body.protein ?? found.protein,
      fat: body.fat ?? found.fat,
      carbs: body.carbs ?? found.carbs,
    });

    return { diet: found } as T;
  }

  if (dietId && method === 'DELETE') {
    const found = mockedDiets.find((diet) => diet.id === dietId.id);
    if (!found) throw new Error('mock: диета не найдена');

    const mode = params.get('mode') ?? 'soft';
    if (mode === 'immediate') {
      const index = mockedDiets.indexOf(found);
      mockedDiets.splice(index, 1);
    } else {
      deletedDietIds.add(dietId.id);
    }

    return {} as T;
  }

  // Администрирование: персонал и роли (staff.v1.StaffService)
  if (route === '/v1/staff-roles' && method === 'GET') {
    return { roles: staffRoles } as T;
  }

  if (route === '/v1/staff' && method === 'GET') {
    const query = (params.get('search') ?? '').trim().toLowerCase();
    const found = query
      ? employees.filter((e) =>
          `${e.lastName} ${e.firstName} ${e.email}`.toLowerCase().includes(query)
        )
      : employees;

    return { employees: found, total: found.length } as T;
  }

  if (route === '/v1/staff' && method === 'POST') {
    const body = options.body as {
      firstName: string;
      lastName: string;
      email: string;
      orgEmail: string;
      roleId: string;
      documents?: EmployeeDocuments;
    };
    const created: Employee = {
      id: `e-${Date.now()}`,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email.toLowerCase(),
      orgEmail: body.orgEmail,
      roleId: body.roleId,
      // Приглашение отправлено, войти человек ещё не успел.
      status: 'EMPLOYEE_STATUS_INVITED',
      registeredAt: '0',
      createdAt: String(Date.now()),
    };
    employees.unshift(created);
    employeeDocuments[created.id] = body.documents ?? EMPTY_DOCUMENTS;

    return { employee: created } as T;
  }

  const staffInvitation = match('/v1/staff/:id/invitation', route);
  if (staffInvitation && method === 'POST') {
    const found = employees.find((e) => e.id === staffInvitation.id);
    if (!found) throw new Error('mock: сотрудник не найден');

    return { employee: found } as T;
  }

  const employee = match('/v1/staff/:id', route);
  if (employee && method === 'GET') {
    const found = employees.find((e) => e.id === employee.id);
    if (!found) throw new Error('mock: сотрудник не найден');

    return {
      employee: found,
      documents: employeeDocuments[found.id] ?? EMPTY_DOCUMENTS,
    } as T;
  }

  if (employee && method === 'PATCH') {
    const found = employees.find((e) => e.id === employee.id);
    if (!found) throw new Error('mock: сотрудник не найден');
    const body = options.body as Partial<Employee> & { documents?: EmployeeDocuments };
    const { documents, ...profile } = body;
    Object.assign(found, profile);

    if (documents) {
      employeeDocuments[found.id] = documents;
    }

    return {
      employee: found,
      documents: employeeDocuments[found.id] ?? EMPTY_DOCUMENTS,
    } as T;
  }

  if (employee && method === 'DELETE') {
    const index = employees.findIndex((e) => e.id === employee.id);
    if (index === -1) throw new Error('mock: сотрудник не найден');
    employees.splice(index, 1);

    return {} as T;
  }

  // orgadmin.v1.OrganizationAdminService
  if (route === '/v1/admin/organization-roles' && method === 'GET') {
    return { roles, total: roles.length } as T;
  }

  if (route === '/v1/admin/organizations' && method === 'GET') {
    return { organizations, total: organizations.length } as T;
  }

  if (route === '/v1/admin/organizations' && method === 'POST') {
    const body = options.body as { name: string; description: string; adminEmail: string };
    const created: Organization = {
      id: `org-${Date.now()}`,
      name: body.name,
      description: body.description,
      memberCount: 0,
      disabled: false,
      createdAt: String(Date.now()),
    };
    organizations.push(created);

    const invitation: Invitation = {
      id: `inv-${Date.now()}`,
      invitee: body.adminEmail,
      status: 'INVITATION_STATUS_PENDING',
      createdAt: String(Date.now()),
      expiresAt: String(Date.now() + 7 * day),
      roles: [roles[1]],
    };
    invitations[created.id] = [invitation];

    return { organization: created, invitation } as T;
  }

  const disabled = match('/v1/admin/organizations/:id/disabled', route);
  if (disabled && method === 'PATCH') {
    const org = organizations.find((o) => o.id === disabled.id);
    if (!org) throw new Error('mock: организация не найдена');
    org.disabled = (options.body as { disabled: boolean }).disabled;

    return { organization: org } as T;
  }

  const orgMembers = match('/v1/admin/organizations/:id/members', route);
  if (orgMembers && method === 'GET') {
    const list = members[orgMembers.id] ?? [];

    return { members: list, total: list.length } as T;
  }

  const member = match('/v1/admin/organizations/:id/members/:userId', route);
  if (member && method === 'DELETE') {
    members[member.id] = (members[member.id] ?? []).filter((m) => m.userId !== member.userId);
    syncMemberCount(member.id);

    return {} as T;
  }

  const orgInvitations = match('/v1/admin/organizations/:id/invitations', route);
  if (orgInvitations && method === 'GET') {
    const list = invitations[orgInvitations.id] ?? [];

    return { invitations: list, total: list.length } as T;
  }

  if (orgInvitations && method === 'POST') {
    const body = options.body as { email: string; roleIds: string[] };
    const invitation: Invitation = {
      id: `inv-${Date.now()}`,
      invitee: body.email,
      status: 'INVITATION_STATUS_PENDING',
      createdAt: String(Date.now()),
      expiresAt: String(Date.now() + 7 * day),
      roles: roles.filter((role) => body.roleIds.includes(role.id)),
    };
    invitations[orgInvitations.id] = [...(invitations[orgInvitations.id] ?? []), invitation];

    return { invitation } as T;
  }

  const invitation = match('/v1/admin/organizations/:id/invitations/:invitationId', route);
  if (invitation && method === 'DELETE') {
    const list = invitations[invitation.id] ?? [];
    const found = list.find((i) => i.id === invitation.invitationId);
    if (!found) throw new Error('mock: приглашение не найдено');
    found.status = 'INVITATION_STATUS_REVOKED';

    return { invitation: found } as T;
  }

  const org = match('/v1/admin/organizations/:id', route);
  if (org && method === 'DELETE') {
    const index = organizations.findIndex((o) => o.id === org.id);
    if (index === -1) throw new Error('mock: организация не найдена');
    if (!organizations[index].disabled) {
      throw new Error('mock: сначала отключите организацию');
    }

    organizations.splice(index, 1);

    return {} as T;
  }

  if (org && method === 'GET') {
    const found = organizations.find((o) => o.id === org.id);
    if (!found) throw new Error('mock: организация не найдена');

    return { organization: found } as T;
  }

  // Меню (цикловое)
  if (route === '/v1/menus' && method === 'GET') {
    return { menus, total: menus.length } as T;
  }

  if (route === '/v1/menus' && method === 'POST') {
    const body = options.body as {
      name: string;
      dietName: string;
      startDate: string;
      cycleDays: number;
    };
    const cycleDays = body.cycleDays > 0 ? body.cycleDays : 14;
    const menu: CycleMenu = {
      id: `menu-${Date.now()}`,
      name: body.name.trim() || 'Новое меню',
      dietName: body.dietName || 'Основная',
      startDate: mondayOfWeek(body.startDate || todayIso()),
      cycleDays,
      status: 'draft',
      createdAt: new Date().toISOString(),
      slots: filledSlots(cycleDays),
    };
    periodSlots(menu.id)[menu.startDate] = menu.slots;
    menus.unshift(menu);

    return { menu } as T;
  }

  const menuItem = match('/v1/menus/:id', route);
  if (menuItem && method === 'GET') {
    const found = menus.find((menu) => menu.id === menuItem.id);
    if (!found) throw new Error('mock: меню не найдено');

    return { menu: found } as T;
  }

  if (menuItem && method === 'PATCH') {
    const found = menus.find((menu) => menu.id === menuItem.id);
    if (!found) throw new Error('mock: меню не найдено');

    const body = options.body as {
      name?: string;
      dietName?: string;
      startDate?: string;
      cycleDays?: number;
    };

    if (body.name !== undefined) found.name = body.name.trim() || found.name;
    if (body.dietName !== undefined) found.dietName = body.dietName;

    if (body.startDate !== undefined) {
      const next = mondayOfWeek(body.startDate);
      if (next !== found.startDate) {
        const periods = periodSlots(found.id);
        periods[found.startDate] = found.slots;
        found.startDate = next;
        if (!periods[next]) {
          // Только текущие две недели заранее с расписанием; остальные периоды — пустые.
          periods[next] =
            next === mondayOfWeek() ? filledSlots(found.cycleDays) : emptySlots(found.cycleDays);
        }
        found.slots = periods[next];
      }
    }

    if (body.cycleDays !== undefined && body.cycleDays > 0 && body.cycleDays !== found.cycleDays) {
      const previous = new Map(
        found.slots.map((slot) => [`${slot.day}:${slot.mealId}`, slot.dishes] as const)
      );
      found.cycleDays = body.cycleDays;
      found.slots = emptySlots(body.cycleDays).map((slot) => ({
        ...slot,
        dishes: previous.get(`${slot.day}:${slot.mealId}`) ?? [],
      }));
      periodSlots(found.id)[found.startDate] = found.slots;
    }

    return { menu: found } as T;
  }

  const menuSlot = match('/v1/menus/:id/slots', route);
  if (menuSlot && method === 'PUT') {
    const found = menus.find((menu) => menu.id === menuSlot.id);
    if (!found) throw new Error('mock: меню не найдено');

    const body = options.body as { day: number; mealId: MealId; dishes: MenuDishRef[] };
    const index = found.slots.findIndex(
      (slot) => slot.day === body.day && slot.mealId === body.mealId
    );
    if (index === -1) {
      found.slots.push({ day: body.day, mealId: body.mealId, dishes: body.dishes });
    } else {
      found.slots[index] = { ...found.slots[index], dishes: body.dishes };
    }
    periodSlots(found.id)[found.startDate] = found.slots;

    return { menu: found } as T;
  }

  // --- Объекты (пищеблок → ЛПУ → отделения) ---
  if (route === '/v1/objects/kitchen' && method === 'GET') {
    return { kitchens } as T;
  }

  if (route === '/v1/objects/kitchen' && method === 'POST') {
    const body = options.body as { name: string };
    const newKitchen: KitchenUnit = {
      id: `kitchen-${Date.now()}`,
      name: body.name.trim(),
      facilities: [],
    };
    kitchens.push(newKitchen);
    return { kitchen: newKitchen } as T;
  }

  if (route === '/v1/objects/distribution' && method === 'GET') {
    return {
      rows: distributionRows,
      totalPortions: distributionRows.reduce((sum, row) => sum + row.portions, 0),
    } as T;
  }

  if (route === '/v1/objects/tables/headcount' && method === 'PATCH') {
    const body = options.body as {
      facilityId: string;
      departmentId: string;
      tableId: string;
      headcount: number;
    };
    const facility = findFacility(body.facilityId);
    if (!facility) throw new Error('mock: учреждение не найдено');
    const department = facility.departments.find((item) => item.id === body.departmentId);
    if (!department) throw new Error('mock: группа/класс не найдены');
    const table = department.tables.find((item) => item.id === body.tableId);
    if (!table) throw new Error('mock: рацион не найден');
    table.headcount = Math.max(0, body.headcount);
    rebuildDistribution();
    return { kitchens } as T;
  }

  const facilityRoute = match('/v1/objects/facilities/:id', route);
  if (facilityRoute && method === 'PATCH') {
    const body = options.body as {
      name: string;
      address: string;
      type: string;
      kettleNumber: number;
      departments: Array<{
        id: string;
        name: string;
        tables: Array<{ id: string; name: string }>;
      }>;
    };
    const facility = findFacility(facilityRoute.id);
    if (!facility) throw new Error('mock: учреждение не найдено');

    const oldDepartments = facility.departments;
    facility.name = body.name.trim();
    facility.address = body.address.trim();
    facility.type = isFacilityType(body.type) ? body.type : facility.type;
    facility.kettleNumber = Math.max(1, body.kettleNumber);
    facility.departments = body.departments.map((department) => {
      const oldDepartment = oldDepartments.find((item) => item.id === department.id);
      return {
        id: department.id,
        name: department.name.trim(),
        tables: department.tables.map((table) => {
          const oldTable = oldDepartment?.tables.find((item) => item.id === table.id);
          return {
            id: table.id,
            name: table.name.trim(),
            headcount: oldTable?.headcount ?? 0,
          };
        }),
      };
    });

    prunePortionEntries();
    rebuildDistribution();
    return { kitchens } as T;
  }

  // --- Порционник (численность на дату + раздача по блюдам) ---
  if (route === '/v1/portions' && method === 'GET') {
    const date = params.get('date') ?? '';
    return { date, entries: ensurePortionsDay(date) } as T;
  }

  if (route === '/v1/portions/dishes' && method === 'GET') {
    const date = params.get('date') ?? '';
    const rows = buildDishDistribution(date, params.get('kitchenId'));
    return {
      date,
      rows,
      totalPortions: rows.reduce((sum, row) => sum + row.portions, 0),
    } as T;
  }

  if (route === '/v1/portions/headcount' && method === 'PATCH') {
    const body = options.body as {
      date: string;
      facilityId: string;
      departmentId: string;
      tableId: string;
      headcount: number;
    };
    const entries = ensurePortionsDay(body.date);
    const found = entries.find(
      (item) =>
        item.facilityId === body.facilityId &&
        item.departmentId === body.departmentId &&
        item.tableId === body.tableId
    );
    if (found) {
      found.headcount = Math.max(0, body.headcount);
    } else {
      entries.push({
        facilityId: body.facilityId,
        departmentId: body.departmentId,
        tableId: body.tableId,
        headcount: Math.max(0, body.headcount),
      });
    }
    return { date: body.date, entries } as T;
  }

  // Склад: приходы
  if (route === '/v1/warehouse-receipts' && method === 'GET') {
    return { receipts: warehouseReceipts, total: warehouseReceipts.length } as T;
  }

  if (route === '/v1/warehouse-receipts' && method === 'POST') {
    const body = options.body as {
      date: string;
      invoiceNumber: string;
      warehouseId: string;
      unitId?: string;
      items: Array<{
        productId?: string;
        productName?: string;
        unit?: string;
        quantity: number;
        unitPrice: number;
        packaging?: string;
        productionDate?: string;
        manufacturer?: string;
        supplier?: string;
        documentNumber?: string;
        documentType?: string;
        organoleptic?: string;
        storageConditions?: string;
        expiryDate?: string;
        note?: string;
      }>;
    };
    const productMap: Record<string, string> = {
      'prod-1': 'Мука пшеничная',
      'prod-2': 'Масло подсолнечное',
      'prod-3': 'Молоко коровье',
      'prod-4': 'Яйцо куриное',
    };
    const unitMap: Record<string, string> = {
      'prod-1': 'кг',
      'prod-2': 'л',
      'prod-3': 'л',
      'prod-4': 'шт',
    };
    const receipt = {
      id: `rec-${Date.now()}`,
      date: body.date,
      invoiceNumber: body.invoiceNumber,
      warehouseId: body.warehouseId,
      unitId: body.unitId ?? undefined,
      items: body.items.map((item, idx) => ({
        id: `rec-item-${Date.now()}-${idx}`,
        productId: item.productId ?? `prod-${Date.now()}-${idx}`,
        productName: item.productName || productMap[item.productId ?? ''] || 'Неизвестный товар',
        quantity: item.quantity,
        unit: item.unit || unitMap[item.productId ?? ''] || 'шт',
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        packaging: item.packaging ?? '',
        productionDate: item.productionDate ?? '',
        manufacturer: item.manufacturer ?? '',
        supplier: item.supplier ?? '',
        documentType: item.documentType ?? '',
        documentNumber: item.documentNumber ?? '',
        organoleptic: item.organoleptic ?? '',
        storageConditions: item.storageConditions ?? '',
        expiryDate: item.expiryDate ?? '',
        note: item.note ?? '',
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    warehouseReceipts.unshift(receipt);
    return { receipt } as T;
  }

  if (route.startsWith('/v1/warehouse-receipts/') && method === 'PATCH') {
    const id = route.split('/').pop() ?? '';
    const body = options.body as {
      date: string;
      invoiceNumber: string;
      warehouseId: string;
      unitId?: string;
      items: Array<{
        productId?: string;
        productName?: string;
        unit?: string;
        quantity: number;
        unitPrice: number;
        packaging?: string;
        productionDate?: string;
        manufacturer?: string;
        supplier?: string;
        documentNumber?: string;
        documentType?: string;
        organoleptic?: string;
        storageConditions?: string;
        expiryDate?: string;
        note?: string;
      }>;
    };
    const existing = warehouseReceipts.find((r) => r.id === id);
    if (!existing) {
      return { error: { code: 404, message: 'Приход не найден' } } as T;
    }
    const updated = {
      ...existing,
      date: body.date,
      invoiceNumber: body.invoiceNumber,
      warehouseId: body.warehouseId,
      unitId: body.unitId ?? undefined,
      items: body.items.map((item, idx) => ({
        id: existing.items[idx]?.id ?? `rec-item-${Date.now()}-${idx}`,
        productId: item.productId ?? existing.items[idx]?.productId ?? `prod-${Date.now()}-${idx}`,
        productName: item.productName || existing.items[idx]?.productName || 'Неизвестный товар',
        quantity: item.quantity,
        unit: item.unit || existing.items[idx]?.unit || 'шт',
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        packaging: item.packaging ?? '',
        productionDate: item.productionDate ?? '',
        manufacturer: item.manufacturer ?? '',
        supplier: item.supplier ?? '',
        documentType: item.documentType ?? '',
        documentNumber: item.documentNumber ?? '',
        organoleptic: item.organoleptic ?? '',
        storageConditions: item.storageConditions ?? '',
        expiryDate: item.expiryDate ?? '',
        note: item.note ?? '',
      })),
      updatedAt: new Date().toISOString(),
    } as WarehouseReceipt;
    Object.assign(existing, updated);
    return { receipt: existing } as T;
  }

  // Склад: остатки
  if (route === '/v1/warehouse-balances' && method === 'GET') {
    return { balances: warehouseBalances, total: warehouseBalances.length } as T;
  }

  if (route === '/v1/warehouse-balances' && method === 'POST') {
    const body = options.body as {
      date: string;
      warehouseId: string;
      items: Array<{ productId: string; endingBalance: number }>;
    };
    const productMap: Record<string, string> = {
      'prod-1': 'Мука пшеничная',
      'prod-2': 'Масло подсолнечное',
      'prod-3': 'Молоко коровье',
      'prod-4': 'Яйцо куриное',
    };
    const unitMap: Record<string, string> = {
      'prod-1': 'кг',
      'prod-2': 'л',
      'prod-3': 'л',
      'prod-4': 'шт',
    };
    const balance = {
      id: `bal-${Date.now()}`,
      date: body.date,
      warehouseId: body.warehouseId,
      items: body.items.map((item) => ({
        productId: item.productId,
        productName: productMap[item.productId] || 'Неизвестный товар',
        unit: unitMap[item.productId] || 'шт',
        batches: [
          {
            batchId: `batch-${Date.now()}`,
            batchNumber: `НАК-${Date.now()}`,
            remaining: item.endingBalance,
            price: 0,
          },
        ],
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    warehouseBalances.unshift(balance);
    return { balance } as T;
  }

  // Склад: списания
  if (route === '/v1/write-offs' && method === 'GET') {
    const type = params.get('type') ?? '';
    const found = type ? writeOffs.filter((item) => item.type === type) : writeOffs;
    return { writeOffs: found, total: found.length } as T;
  }

  if (route === '/v1/write-offs' && method === 'POST') {
    const body = options.body as {
      type: string;
      date: string;
      warehouseId: string;
      reason: string;
      items: Array<{ productId: string; quantity: number; unitPrice: number }>;
    };
    const productMap: Record<string, string> = {
      'prod-1': 'Мука пшеничная',
      'prod-2': 'Масло подсолнечное',
      'prod-3': 'Молоко коровье',
      'prod-4': 'Яйцо куриное',
    };
    const unitMap: Record<string, string> = {
      'prod-1': 'кг',
      'prod-2': 'л',
      'prod-3': 'л',
      'prod-4': 'шт',
    };
    const writeOff = {
      id: `wo-${Date.now()}`,
      type: body.type,
      date: body.date,
      warehouseId: body.warehouseId,
      reason: body.reason,
      items: body.items.map((item, idx) => ({
        id: `wo-item-${Date.now()}-${idx}`,
        productId: item.productId,
        productName: productMap[item.productId] || 'Неизвестный товар',
        quantity: item.quantity,
        unit: unitMap[item.productId] || 'шт',
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeOffs.unshift(writeOff);
    return { writeOff } as T;
  }

  throw new Error(`mock: нет обработчика для ${method} ${path} — добавь в mock-handlers.ts`);
}

const kitchens: KitchenUnit[] = [
  {
    id: 'kitchen-1',
    name: 'Центральный пищеблок',
    facilities: [
      {
        id: 'lpu-1',
        name: 'Больница №1',
        address: 'корп. А',
        type: 'hospital',
        kettleNumber: 1,
        departments: [
          {
            id: 'dep-1-1',
            name: 'Терапия',
            tables: [
              { id: 'tbl-1-1-1', name: 'Основная', headcount: 42 },
              { id: 'tbl-1-1-2', name: 'Щадящая', headcount: 14 },
              { id: 'tbl-1-1-3', name: 'Диабетическая', headcount: 6 },
            ],
          },
          {
            id: 'dep-1-2',
            name: 'Хирургия',
            tables: [
              { id: 'tbl-1-2-1', name: 'Основная', headcount: 210 },
              { id: 'tbl-1-2-2', name: 'Диабетическая', headcount: 12 },
            ],
          },
        ],
      },
      {
        id: 'lpu-3',
        name: 'Больница №4',
        address: 'корп. Д',
        type: 'hospital',
        kettleNumber: 1,
        departments: [
          {
            id: 'dep-3-1',
            name: 'Кардиология',
            tables: [{ id: 'tbl-3-1-1', name: 'Основная', headcount: 38 }],
          },
          {
            id: 'dep-3-2',
            name: 'Неврология',
            tables: [
              { id: 'tbl-3-2-1', name: 'Основная', headcount: 45 },
              { id: 'tbl-3-2-2', name: 'Диабетическая', headcount: 5 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kitchen-2',
    name: 'Пищеблок №2',
    facilities: [
      {
        id: 'lpu-2',
        name: 'Школа №5',
        address: 'корп. Б',
        type: 'school',
        kettleNumber: 2,
        departments: [
          {
            id: 'dep-2-1',
            name: 'Начальная школа',
            tables: [
              { id: 'tbl-2-1-1', name: 'Основная', headcount: 96 },
              { id: 'tbl-2-1-2', name: 'Вегетарианская', headcount: 8 },
            ],
          },
          {
            id: 'dep-2-2',
            name: 'Средняя и старшая школа',
            tables: [
              { id: 'tbl-2-2-1', name: 'Основная', headcount: 140 },
              { id: 'tbl-2-2-2', name: 'Безглютеновая', headcount: 4 },
            ],
          },
        ],
      },
      {
        id: 'lpu-5',
        name: 'Детский сад №3',
        address: 'ул. Садовая, 5',
        type: 'kindergarten',
        kettleNumber: 2,
        departments: [
          {
            id: 'dep-5-1',
            name: 'Младшая группа',
            tables: [
              { id: 'tbl-5-1-1', name: 'Основная', headcount: 30 },
              { id: 'tbl-5-1-2', name: 'Щадящая', headcount: 6 },
            ],
          },
          {
            id: 'dep-5-2',
            name: 'Подготовительная группа',
            tables: [{ id: 'tbl-5-2-1', name: 'Основная', headcount: 34 }],
          },
        ],
      },
    ],
  },
  {
    id: 'kitchen-3',
    name: 'Пищеблок №3',
    facilities: [
      {
        id: 'lpu-4',
        name: 'Школа №2',
        address: 'корп. В',
        type: 'school',
        kettleNumber: 3,
        departments: [
          {
            id: 'dep-4-1',
            name: '1–4 классы',
            tables: [
              { id: 'tbl-4-1-1', name: 'Основная', headcount: 88 },
              { id: 'tbl-4-1-2', name: 'Безлактозная', headcount: 7 },
            ],
          },
          {
            id: 'dep-4-2',
            name: '5–11 классы',
            tables: [
              { id: 'tbl-4-2-1', name: 'Основная', headcount: 150 },
              { id: 'tbl-4-2-2', name: 'Диабетическая', headcount: 9 },
            ],
          },
        ],
      },
      {
        id: 'lpu-6',
        name: 'Больница №3',
        address: 'корп. Д',
        type: 'hospital',
        kettleNumber: 3,
        departments: [
          {
            id: 'dep-6-1',
            name: 'Терапия',
            tables: [
              { id: 'tbl-6-1-1', name: 'Основная', headcount: 42 },
              { id: 'tbl-6-1-2', name: 'Щадящая', headcount: 18 },
              { id: 'tbl-6-1-3', name: 'Диабетическая', headcount: 12 },
            ],
          },
          {
            id: 'dep-6-2',
            name: 'Хирургия',
            tables: [
              { id: 'tbl-6-2-1', name: 'Основная', headcount: 30 },
              { id: 'tbl-6-2-2', name: 'Диабетическая', headcount: 8 },
            ],
          },
        ],
      },
    ],
  },
];

function findFacility(facilityId: string): Facility | null {
  for (const unit of kitchens) {
    const facility = unit.facilities.find((item) => item.id === facilityId);
    if (facility) return facility;
  }
  return null;
}

let distributionRows: DistributionRow[] = [];

function rebuildDistribution() {
  const dishes = ['Каша рисовая молочная', 'Суп картофельный с мясом', 'Котлета куриная паровая'];
  const rows: DistributionRow[] = [];
  // Сначала блюдо — одинаковые идут подряд для группировки в таблице.
  for (const dishName of dishes) {
    for (const unit of kitchens) {
      for (const facility of unit.facilities) {
        for (const department of facility.departments) {
          for (const table of department.tables) {
            if (table.headcount <= 0) continue;
            rows.push({
              dishName,
              facilityName: facility.name,
              departmentName: department.name,
              tableName: table.name,
              kettleLabel: formatKettle(facility.kettleNumber),
              portions: table.headcount,
            });
          }
        }
      }
    }
  }
  distributionRows = rows;
}

rebuildDistribution();

/** Порционник по датам: ключ YYYY-MM-DD → строки численности. */
const portionsByDate: Record<string, PortionEntry[]> = {};

function tableExists(facilityId: string, departmentId: string, tableId: string): boolean {
  const facility = findFacility(facilityId);
  if (!facility) return false;
  const department = facility.departments.find((item) => item.id === departmentId);
  if (!department) return false;
  return department.tables.some((item) => item.id === tableId);
}

function prunePortionEntries() {
  for (const date of Object.keys(portionsByDate)) {
    portionsByDate[date] = portionsByDate[date].filter((entry) =>
      tableExists(entry.facilityId, entry.departmentId, entry.tableId)
    );
  }
}

function ensurePortionsDay(date: string): PortionEntry[] {
  if (!date) throw new Error('mock: не указана дата порционника');
  if (!portionsByDate[date]) {
    if (date > todayIso()) {
      // Будущая дата — численность ещё не заполняли.
      portionsByDate[date] = [];
      return portionsByDate[date];
    }
    const entries: PortionEntry[] = [];
    for (const unit of kitchens) {
      for (const facility of unit.facilities) {
        for (const department of facility.departments) {
          for (const table of department.tables) {
            entries.push({
              facilityId: facility.id,
              departmentId: department.id,
              tableId: table.id,
              headcount: table.headcount,
            });
          }
        }
      }
    }
    portionsByDate[date] = entries;
  }
  return portionsByDate[date];
}

function buildDishDistribution(date: string, kitchenId: string | null): DishDistributionRow[] {
  const dishes: Array<{ name: string; mealType: string }> = [
    { name: 'Каша рисовая молочная', mealType: 'Завтрак' },
    { name: 'Суп картофельный с мясом', mealType: 'Обед' },
    { name: 'Котлета куриная паровая', mealType: 'Ужин' },
  ];
  const entries = ensurePortionsDay(date);
  const units = kitchenId ? kitchens.filter((unit) => unit.id === kitchenId) : kitchens;
  const rows: DishDistributionRow[] = [];
  for (const dish of dishes) {
    for (const unit of units) {
      for (const facility of unit.facilities) {
        for (const department of facility.departments) {
          for (const table of department.tables) {
            const entry = entries.find(
              (item) =>
                item.facilityId === facility.id &&
                item.departmentId === department.id &&
                item.tableId === table.id
            );
            const portions = entry?.headcount ?? 0;
            if (portions <= 0) continue;
            rows.push({
              dishName: dish.name,
              mealType: dish.mealType,
              facilityName: facility.name,
              departmentName: department.name,
              tableName: table.name,
              portions,
            });
          }
        }
      }
    }
  }
  return rows;
}

/** Держит счётчик участников в согласии со списком. */
function syncMemberCount(organizationId: string) {
  const org = organizations.find((o) => o.id === organizationId);
  if (org) org.memberCount = (members[organizationId] ?? []).length;
}
