import type { RequestOptions } from './client';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/features/organizations/types';
import type { Employee, StaffRole } from '@/features/staff/types';
import type { Collection, Recipe } from '@/features/ttk/types';
import type { CycleMenu, MealId, MenuDishRef } from '@/features/menu/types';
import { MEALS } from '@/features/menu/types';
import { formatKettle, type DistributionRow, type KitchenUnit } from '@/features/objects/types';
import type { DishDistributionRow, PortionEntry } from '@/features/portions/types';

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
  '/v1/staff',
  '/v1/ttk',
  '/v1/menus',
  '/v1/objects',
  '/v1/portions',
  '/v1/warehouse',
  '/v1/write-offs',
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

const section = (title: string) => ({ id: title, title });

const staffRoles: StaffRole[] = [
  { id: 'r-admin', name: 'Администратор', sections: [], locked: true },
  {
    id: 'r-cook',
    name: 'Повар',
    sections: [section('Планирование'), section('Производство'), section('Справочники')],
    locked: false,
  },
  { id: 'r-store', name: 'Складовщик', sections: [section('Склад')], locked: false },
  { id: 'r-book', name: 'Бухгалтер', sections: [section('Финансы')], locked: false },
];

const employees: Employee[] = [
  'Иванов;Иван;r-cook',
  'Петрова;Мария;r-cook',
  'Сидоров;Пётр;r-cook',
  'Кузнецова;Анна;r-book',
  'Богданков;Никита;r-admin',
].map((row, index) => {
  const [lastName, firstName, roleId] = row.split(';');

  return {
    id: `e-${index + 1}`,
    firstName,
    lastName,
    email: `${lastName.toLowerCase()}${firstName.toLowerCase()}@pitaniye.ru`,
    roleId,
    registeredAt: new Date(Date.UTC(2019, 1, 1 + index)).toISOString(),
    snils: `00 000 000${index} 0${index}`,
    inn: `00 0000 000 0${index}`,
    passport: `012${index} 45678${index}`,
    otherDoc: `DOC-${index + 1}`,
  };
});

/** Пароль, который «выдаёт» сервер: в моках он предсказуемо случайный. */
const newPassword = () => Math.random().toString(36).slice(2, 10);

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

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
      },
      {
        id: 'rec-1-item-2',
        productId: 'prod-2',
        productName: 'Масло подсолнечное',
        quantity: 20,
        unit: 'л',
        unitPrice: 120,
        totalPrice: 2400,
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
      },
      {
        id: 'rec-2-item-2',
        productId: 'prod-4',
        productName: 'Яйцо куриное',
        quantity: 300,
        unit: 'шт',
        unitPrice: 12,
        totalPrice: 3600,
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

    let found = recipes;
    if (query) found = found.filter((r) => r.name.toLowerCase().includes(query));
    if (collectionId) found = found.filter((r) => r.collectionId === collectionId);

    const sorted = [...found].sort((a, b) => {
      const dir = ascending ? 1 : -1;
      if (sort === 'price') return (a.price - b.price) * dir;

      return a.name.localeCompare(b.name, 'ru') * dir;
    });

    return { recipes: sorted, total: sorted.length } as T;
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

  // Администрирование: персонал и роли
  if (route === '/v1/staff-roles' && method === 'GET') {
    return { roles: staffRoles } as T;
  }

  const roleSections = match('/v1/staff-roles/:roleId/sections', route);
  if (roleSections && method === 'PUT') {
    const role = staffRoles.find((r) => r.id === roleSections.roleId);
    if (!role) throw new Error('mock: роль не найдена');
    role.sections = (options.body as { sectionIds: string[] }).sectionIds.map(section);

    return { roleId: role.id } as T;
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
    const body = options.body as Omit<Employee, 'id' | 'registeredAt'>;
    const employee: Employee = {
      ...body,
      id: `e-${Date.now()}`,
      registeredAt: new Date().toISOString(),
    };
    employees.unshift(employee);

    return { employee, password: newPassword() } as T;
  }

  const resetPassword = match('/v1/staff/:id/reset-password', route);
  if (resetPassword && method === 'POST') {
    return { password: newPassword() } as T;
  }

  const employee = match('/v1/staff/:id', route);
  if (employee && method === 'PATCH') {
    const found = employees.find((e) => e.id === employee.id);
    if (!found) throw new Error('mock: сотрудник не найден');
    Object.assign(found, options.body as Partial<Employee>);

    return { employee: found } as T;
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
    return { kitchen } as T;
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
    const facility = kitchen.facilities.find((item) => item.id === body.facilityId);
    if (!facility) throw new Error('mock: ЛПУ не найдено');
    const department = facility.departments.find((item) => item.id === body.departmentId);
    if (!department) throw new Error('mock: отделение не найдено');
    const table = department.tables.find((item) => item.id === body.tableId);
    if (!table) throw new Error('mock: стол не найден');
    table.headcount = Math.max(0, body.headcount);
    rebuildDistribution();
    return { kitchen } as T;
  }

  const facilityRoute = match('/v1/objects/facilities/:id', route);
  if (facilityRoute && method === 'PATCH') {
    const body = options.body as {
      name: string;
      address: string;
      kettleNumber: number;
      departments: Array<{
        id: string;
        name: string;
        tables: Array<{ id: string; name: string }>;
      }>;
    };
    const facility = kitchen.facilities.find((item) => item.id === facilityRoute.id);
    if (!facility) throw new Error('mock: ЛПУ не найдено');

    const oldDepartments = facility.departments;
    facility.name = body.name.trim();
    facility.address = body.address.trim();
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
    return { kitchen } as T;
  }

  // --- Порционник (численность на дату + раздача по блюдам) ---
  if (route === '/v1/portions' && method === 'GET') {
    const date = params.get('date') ?? '';
    return { date, entries: ensurePortionsDay(date) } as T;
  }

  if (route === '/v1/portions/dishes' && method === 'GET') {
    const date = params.get('date') ?? '';
    const rows = buildDishDistribution(date);
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
    if (!found) throw new Error('mock: строка порционника не найдена');
    found.headcount = Math.max(0, body.headcount);
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
    const receipt = {
      id: `rec-${Date.now()}`,
      date: body.date,
      invoiceNumber: body.invoiceNumber,
      warehouseId: body.warehouseId,
      items: body.items.map((item, idx) => ({
        id: `rec-item-${Date.now()}-${idx}`,
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
    warehouseReceipts.unshift(receipt);
    return { receipt } as T;
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

const kitchen: KitchenUnit = {
  id: 'kitchen-1',
  name: 'Центральный пищеблок',
  facilities: [
    {
      id: 'lpu-1',
      name: 'Больница №1',
      address: 'корп. А',
      kettleNumber: 1,
      departments: [
        {
          id: 'dep-1-1',
          name: 'Терапия',
          tables: [
            { id: 'tbl-1-1-1', name: 'Основная', headcount: 42 },
            { id: 'tbl-1-1-2', name: 'Щадящая', headcount: 18 },
          ],
        },
        {
          id: 'dep-1-2',
          name: 'Хирургия',
          tables: [
            { id: 'tbl-1-2-1', name: 'Основная', headcount: 30 },
            { id: 'tbl-1-2-2', name: 'Диабетическая', headcount: 12 },
          ],
        },
      ],
    },
    {
      id: 'lpu-2',
      name: 'Больница №5',
      address: 'корп. Б',
      kettleNumber: 2,
      departments: [
        {
          id: 'dep-2-1',
          name: 'Педиатрия',
          tables: [
            { id: 'tbl-2-1-1', name: 'Основная', headcount: 36 },
            { id: 'tbl-2-1-2', name: 'Щадящая', headcount: 14 },
          ],
        },
        {
          id: 'dep-2-2',
          name: 'Неврология',
          tables: [{ id: 'tbl-2-2-1', name: 'Основная', headcount: 28 }],
        },
      ],
    },
    {
      id: 'lpu-3',
      name: 'Поликлиника №3',
      address: 'дневной стационар',
      kettleNumber: 1,
      departments: [
        {
          id: 'dep-3-1',
          name: 'Дневной стационар',
          tables: [{ id: 'tbl-3-1-1', name: 'Основная', headcount: 22 }],
        },
      ],
    },
    {
      id: 'lpu-4',
      name: 'Больница №2',
      address: 'корп. В',
      kettleNumber: 3,
      departments: [
        {
          id: 'dep-4-1',
          name: 'Кардиология',
          tables: [
            { id: 'tbl-4-1-1', name: 'Основная', headcount: 38 },
            { id: 'tbl-4-1-2', name: 'Щадящая', headcount: 16 },
          ],
        },
        {
          id: 'dep-4-2',
          name: 'Реанимация',
          tables: [{ id: 'tbl-4-2-1', name: 'Основная', headcount: 10 }],
        },
        {
          id: 'dep-4-3',
          name: 'Ортопедия',
          tables: [
            { id: 'tbl-4-3-1', name: 'Основная', headcount: 24 },
            { id: 'tbl-4-3-2', name: 'Диабетическая', headcount: 8 },
          ],
        },
      ],
    },
    {
      id: 'lpu-5',
      name: 'Роддом №1',
      address: 'корп. Г',
      kettleNumber: 2,
      departments: [
        {
          id: 'dep-5-1',
          name: 'Послеродовое',
          tables: [
            { id: 'tbl-5-1-1', name: 'Основная', headcount: 40 },
            { id: 'tbl-5-1-2', name: 'Щадящая', headcount: 15 },
          ],
        },
        {
          id: 'dep-5-2',
          name: 'Патология',
          tables: [{ id: 'tbl-5-2-1', name: 'Основная', headcount: 20 }],
        },
      ],
    },
  ],
};

let distributionRows: DistributionRow[] = [];

function rebuildDistribution() {
  const dishes = ['Каша рисовая молочная', 'Суп картофельный с мясом', 'Котлета куриная паровая'];
  const rows: DistributionRow[] = [];
  // Сначала блюдо — одинаковые идут подряд для группировки в таблице.
  for (const dishName of dishes) {
    for (const facility of kitchen.facilities) {
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
  distributionRows = rows;
}

rebuildDistribution();

/** Порционник по датам: ключ YYYY-MM-DD → строки численности. */
const portionsByDate: Record<string, PortionEntry[]> = {};

function tableExists(facilityId: string, departmentId: string, tableId: string): boolean {
  const facility = kitchen.facilities.find((item) => item.id === facilityId);
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
    const entries: PortionEntry[] = [];
    for (const facility of kitchen.facilities) {
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
    portionsByDate[date] = entries;
  }
  return portionsByDate[date];
}

function buildDishDistribution(date: string): DishDistributionRow[] {
  const dishes = ['Каша рисовая молочная', 'Суп картофельный с мясом', 'Котлета куриная паровая'];
  const entries = ensurePortionsDay(date);
  const rows: DishDistributionRow[] = [];
  for (const dishName of dishes) {
    for (const facility of kitchen.facilities) {
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
            dishName,
            facilityName: facility.name,
            departmentName: department.name,
            tableName: table.name,
            kettleLabel: formatKettle(facility.kettleNumber),
            portions,
          });
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
