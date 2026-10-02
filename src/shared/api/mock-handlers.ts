import type { RequestOptions } from './client';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/features/organizations/types';
import type { Employee, EmployeeDocuments, StaffRole } from '@/features/staff/types';
import { EMPTY_DOCUMENTS } from '@/features/staff/types';
import type { Collection, Ingredient, Recipe } from '@/features/ttk/types';
import type { CreateRecipeRequest } from '@/features/ttk/types';
import type { Diet } from '@/features/diets/types';
import type { CycleMenu, MealId, MenuDishRef } from '@/features/menu/types';
import { MEALS } from '@/features/menu/types';
import type { CateringObject } from '@/features/objects/types';
import { todayIso, type DishDistributionRow, type PortionEntry } from '@/features/portions/types';
import type { ProductSpreadItem, ProductSpreadMealId } from '@/features/products-spread/types';

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
  // Мок-двойники объектов и диет — для разделов, которые ещё на моках
  // (меню, порционник, раскладка продуктов): см. useMockCateringObjects,
  // useMockDiets.
  '/v1/mock/objects',
  '/v1/portions',
  '/v1/mock/diets',
  '/v1/products-spread',
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
    description: 'Объект школы',
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

/** Спецификация ингредиента мок-ТТК: брутто/нетто на 1 порцию и цена за единицу закупки. */
interface MockIngredientSpec {
  name: string;
  grossPerPortion: string;
  netPerPortion: string;
  pricePerUnit: string;
}

/** Рецептура и технология каждого блюда — продукты не должны повторяться в каждом блюде. */
interface DishMockSpec {
  technology: string;
  ingredients: MockIngredientSpec[];
}

const FALLBACK_SPEC: DishMockSpec = {
  technology:
    'Продукты подготавливают и доводят до готовности в соответствии с технологической картой.',
  ingredients: [
    { name: 'Картофель', grossPerPortion: '180', netPerPortion: '135', pricePerUnit: '60 р/ед' },
    {
      name: 'Масло растительное',
      grossPerPortion: '8',
      netPerPortion: '8',
      pricePerUnit: '200 р/ед',
    },
    { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
  ],
};

const DISH_SPECS: Record<string, DishMockSpec> = {
  'Бефстроганов из мяса': {
    technology:
      'Мясо нарезают брусочками, обжаривают, добавляют пассерованный лук, муку, сметану и тушат до готовности.',
    ingredients: [
      { name: 'Говядина', grossPerPortion: '193', netPerPortion: '142', pricePerUnit: '450 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '29', netPerPortion: '24', pricePerUnit: '80 р/ед' },
      { name: 'Мука пшеничная', grossPerPortion: '4', netPerPortion: '4', pricePerUnit: '70 р/ед' },
      { name: 'Сметана', grossPerPortion: '23', netPerPortion: '23', pricePerUnit: '320 р/ед' },
      {
        name: 'Масло растительное',
        grossPerPortion: '7',
        netPerPortion: '7',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1,8', netPerPortion: '1,8', pricePerUnit: '25 р/ед' },
    ],
  },
  'Каша рисовая молочная': {
    technology:
      'Рис промывают, засыпают в кипящее молоко с водой, варят до загустения, добавляют соль, сахар и масло.',
    ingredients: [
      { name: 'Рис', grossPerPortion: '48', netPerPortion: '48', pricePerUnit: '130 р/ед' },
      { name: 'Молоко', grossPerPortion: '150', netPerPortion: '150', pricePerUnit: '70 р/ед' },
      { name: 'Сахар', grossPerPortion: '10', netPerPortion: '10', pricePerUnit: '90 р/ед' },
      {
        name: 'Масло сливочное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '600 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1', netPerPortion: '1', pricePerUnit: '25 р/ед' },
    ],
  },
  'Омлет натуральный': {
    technology:
      'Яйца взбивают с молоком и солью, выливают на разогретую с маслом сковороду и запекают.',
    ingredients: [
      { name: 'Яйца', grossPerPortion: '100', netPerPortion: '100', pricePerUnit: '180 р/ед' },
      { name: 'Молоко', grossPerPortion: '30', netPerPortion: '30', pricePerUnit: '70 р/ед' },
      {
        name: 'Масло сливочное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '600 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1', netPerPortion: '1', pricePerUnit: '25 р/ед' },
    ],
  },
  'Суп картофельный с мясом': {
    technology:
      'Мясо варят до готовности, бульон процеживают, закладывают картофель и пассерованные овощи и варят до мягкости.',
    ingredients: [
      { name: 'Картофель', grossPerPortion: '140', netPerPortion: '105', pricePerUnit: '60 р/ед' },
      { name: 'Говядина', grossPerPortion: '60', netPerPortion: '44', pricePerUnit: '450 р/ед' },
      { name: 'Морковь', grossPerPortion: '15', netPerPortion: '12', pricePerUnit: '45 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '10', netPerPortion: '8', pricePerUnit: '80 р/ед' },
      {
        name: 'Масло растительное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Котлета куриная паровая': {
    technology:
      'Филе пропускают через мясорубку с луком, добавляют замоченный в молоке хлеб, формуют котлеты и готовят на пару.',
    ingredients: [
      {
        name: 'Куриное филе',
        grossPerPortion: '157',
        netPerPortion: '120',
        pricePerUnit: '280 р/ед',
      },
      {
        name: 'Хлеб пшеничный',
        grossPerPortion: '24',
        netPerPortion: '24',
        pricePerUnit: '80 р/ед',
      },
      { name: 'Молоко', grossPerPortion: '38', netPerPortion: '38', pricePerUnit: '70 р/ед' },
      { name: 'Яйца', grossPerPortion: '8', netPerPortion: '8', pricePerUnit: '180 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '20', netPerPortion: '16', pricePerUnit: '80 р/ед' },
      { name: 'Соль', grossPerPortion: '1,5', netPerPortion: '1,5', pricePerUnit: '25 р/ед' },
    ],
  },
  'Компот из сухофруктов': {
    technology:
      'Сухофрукты промывают, заливают горячей водой, добавляют сахар и варят, затем настаивают.',
    ingredients: [
      {
        name: 'Сухофрукты',
        grossPerPortion: '120',
        netPerPortion: '120',
        pricePerUnit: '400 р/ед',
      },
      { name: 'Сахар', grossPerPortion: '40', netPerPortion: '40', pricePerUnit: '90 р/ед' },
      { name: 'Вода', grossPerPortion: '200', netPerPortion: '200', pricePerUnit: '' },
    ],
  },
  'Салат из свежих овощей': {
    technology: 'Овощи нарезают, заправляют маслом и солью, перемешивают и охлаждают.',
    ingredients: [
      { name: 'Огурцы', grossPerPortion: '40', netPerPortion: '38', pricePerUnit: '120 р/ед' },
      { name: 'Помидоры', grossPerPortion: '50', netPerPortion: '48', pricePerUnit: '180 р/ед' },
      { name: 'Лук зелёный', grossPerPortion: '15', netPerPortion: '12', pricePerUnit: '150 р/ед' },
      {
        name: 'Масло растительное',
        grossPerPortion: '8',
        netPerPortion: '8',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1', netPerPortion: '1', pricePerUnit: '25 р/ед' },
    ],
  },
  'Пюре картофельное': {
    technology:
      'Картофель отваривают до готовности, разминают с горячим молоком и маслом до однородной массы.',
    ingredients: [
      { name: 'Картофель', grossPerPortion: '220', netPerPortion: '165', pricePerUnit: '60 р/ед' },
      { name: 'Молоко', grossPerPortion: '40', netPerPortion: '40', pricePerUnit: '70 р/ед' },
      {
        name: 'Масло сливочное',
        grossPerPortion: '10',
        netPerPortion: '10',
        pricePerUnit: '600 р/ед',
      },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Рыба запечённая': {
    technology: 'Рыбу панируют в муке, кладут на противень, смазанный маслом, и запекают.',
    ingredients: [
      { name: 'Рыба', grossPerPortion: '150', netPerPortion: '124', pricePerUnit: '350 р/ед' },
      {
        name: 'Мука пшеничная',
        grossPerPortion: '10',
        netPerPortion: '10',
        pricePerUnit: '70 р/ед',
      },
      {
        name: 'Масло растительное',
        grossPerPortion: '8',
        netPerPortion: '8',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1,5', netPerPortion: '1,5', pricePerUnit: '25 р/ед' },
    ],
  },
  'Чай с сахаром': {
    technology: 'Чай заваривают кипятком, настаивают, процеживают и добавляют сахар.',
    ingredients: [
      { name: 'Чай', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '1200 р/ед' },
      { name: 'Сахар', grossPerPortion: '20', netPerPortion: '20', pricePerUnit: '90 р/ед' },
      { name: 'Вода', grossPerPortion: '200', netPerPortion: '200', pricePerUnit: '' },
    ],
  },
  'Бутерброд с сыром': {
    technology: 'Хлеб намазывают сливочным маслом и покрывают ломтиками сыра.',
    ingredients: [
      {
        name: 'Хлеб пшеничный',
        grossPerPortion: '50',
        netPerPortion: '50',
        pricePerUnit: '80 р/ед',
      },
      { name: 'Сыр', grossPerPortion: '25', netPerPortion: '25', pricePerUnit: '700 р/ед' },
      {
        name: 'Масло сливочное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '600 р/ед',
      },
    ],
  },
  'Борщ со сметаной': {
    technology:
      'Свёклу тушат с томатной пастой, в бульон закладывают капусту и картофель, затем заправку; подают со сметаной.',
    ingredients: [
      { name: 'Свекла', grossPerPortion: '50', netPerPortion: '40', pricePerUnit: '50 р/ед' },
      {
        name: 'Капуста белокочанная',
        grossPerPortion: '40',
        netPerPortion: '32',
        pricePerUnit: '40 р/ед',
      },
      { name: 'Картофель', grossPerPortion: '60', netPerPortion: '45', pricePerUnit: '60 р/ед' },
      { name: 'Морковь', grossPerPortion: '15', netPerPortion: '12', pricePerUnit: '45 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '10', netPerPortion: '8', pricePerUnit: '80 р/ед' },
      {
        name: 'Томатная паста',
        grossPerPortion: '6',
        netPerPortion: '6',
        pricePerUnit: '250 р/ед',
      },
      { name: 'Сметана', grossPerPortion: '15', netPerPortion: '15', pricePerUnit: '320 р/ед' },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Гуляш из говядины': {
    technology:
      'Говядину нарезают кубиками, обжаривают с луком, добавляют муку, томатную пасту и тушат.',
    ingredients: [
      { name: 'Говядина', grossPerPortion: '120', netPerPortion: '88', pricePerUnit: '450 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '40', netPerPortion: '34', pricePerUnit: '80 р/ед' },
      { name: 'Мука пшеничная', grossPerPortion: '8', netPerPortion: '8', pricePerUnit: '70 р/ед' },
      {
        name: 'Томатная паста',
        grossPerPortion: '10',
        netPerPortion: '10',
        pricePerUnit: '250 р/ед',
      },
      {
        name: 'Масло растительное',
        grossPerPortion: '10',
        netPerPortion: '10',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Каша гречневая': {
    technology:
      'Гречневую крупу засыпают в кипящую подсоленную воду и варят до полного впитывания жидкости.',
    ingredients: [
      {
        name: 'Крупа гречневая',
        grossPerPortion: '50',
        netPerPortion: '50',
        pricePerUnit: '120 р/ед',
      },
      {
        name: 'Масло сливочное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '600 р/ед',
      },
      { name: 'Вода', grossPerPortion: '120', netPerPortion: '120', pricePerUnit: '' },
      { name: 'Соль', grossPerPortion: '1', netPerPortion: '1', pricePerUnit: '25 р/ед' },
    ],
  },
  'Сок яблочный': {
    technology: 'Яблоки отжимают, сок доводят до кипения с сахаром и охлаждают.',
    ingredients: [
      { name: 'Яблоки', grossPerPortion: '200', netPerPortion: '165', pricePerUnit: '120 р/ед' },
      { name: 'Сахар', grossPerPortion: '10', netPerPortion: '10', pricePerUnit: '90 р/ед' },
      { name: 'Вода', grossPerPortion: '60', netPerPortion: '60', pricePerUnit: '' },
    ],
  },
  'Запеканка творожная': {
    technology:
      'Творог протирают, смешивают с манкой, яйцами и сахаром, запекают и подают со сметаной.',
    ingredients: [
      { name: 'Творог', grossPerPortion: '130', netPerPortion: '130', pricePerUnit: '320 р/ед' },
      { name: 'Крупа манная', grossPerPortion: '15', netPerPortion: '15', pricePerUnit: '95 р/ед' },
      { name: 'Яйца', grossPerPortion: '10', netPerPortion: '10', pricePerUnit: '180 р/ед' },
      { name: 'Сахар', grossPerPortion: '20', netPerPortion: '20', pricePerUnit: '90 р/ед' },
      { name: 'Сметана', grossPerPortion: '25', netPerPortion: '25', pricePerUnit: '320 р/ед' },
      {
        name: 'Масло сливочное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '600 р/ед',
      },
    ],
  },
  'Щи из свежей капусты': {
    technology:
      'Капусту и картофель варят в бульоне, добавляют пассерованные овощи с томатной пастой и доводят до готовности.',
    ingredients: [
      {
        name: 'Капуста белокочанная',
        grossPerPortion: '90',
        netPerPortion: '72',
        pricePerUnit: '40 р/ед',
      },
      { name: 'Картофель', grossPerPortion: '60', netPerPortion: '45', pricePerUnit: '60 р/ед' },
      { name: 'Морковь', grossPerPortion: '15', netPerPortion: '12', pricePerUnit: '45 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '10', netPerPortion: '8', pricePerUnit: '80 р/ед' },
      {
        name: 'Томатная паста',
        grossPerPortion: '6',
        netPerPortion: '6',
        pricePerUnit: '250 р/ед',
      },
      {
        name: 'Масло растительное',
        grossPerPortion: '6',
        netPerPortion: '6',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Котлета рыбная': {
    technology:
      'Филе рыбы пропускают через мясорубку с луком и хлебом, формуют котлеты, панируют и запекают.',
    ingredients: [
      { name: 'Рыба', grossPerPortion: '130', netPerPortion: '110', pricePerUnit: '350 р/ед' },
      {
        name: 'Хлеб пшеничный',
        grossPerPortion: '20',
        netPerPortion: '20',
        pricePerUnit: '80 р/ед',
      },
      { name: 'Молоко', grossPerPortion: '30', netPerPortion: '30', pricePerUnit: '70 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '15', netPerPortion: '12', pricePerUnit: '80 р/ед' },
      {
        name: 'Сухари панировочные',
        grossPerPortion: '8',
        netPerPortion: '8',
        pricePerUnit: '150 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1,5', netPerPortion: '1,5', pricePerUnit: '25 р/ед' },
    ],
  },
  'Макароны отварные': {
    technology:
      'Макароны варят в подсоленной воде до готовности, откидывают и заправляют сливочным маслом.',
    ingredients: [
      { name: 'Макароны', grossPerPortion: '70', netPerPortion: '70', pricePerUnit: '90 р/ед' },
      {
        name: 'Масло сливочное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '600 р/ед',
      },
      { name: 'Соль', grossPerPortion: '1', netPerPortion: '1', pricePerUnit: '25 р/ед' },
    ],
  },
  'Кисель ягодный': {
    technology:
      'Ягоды протирают, отвар доводят до кипения, вводят разведённый крахмал и сахар, охлаждают.',
    ingredients: [
      { name: 'Ягоды', grossPerPortion: '30', netPerPortion: '30', pricePerUnit: '350 р/ед' },
      {
        name: 'Крахмал картофельный',
        grossPerPortion: '15',
        netPerPortion: '15',
        pricePerUnit: '140 р/ед',
      },
      { name: 'Сахар', grossPerPortion: '25', netPerPortion: '25', pricePerUnit: '90 р/ед' },
      { name: 'Вода', grossPerPortion: '190', netPerPortion: '190', pricePerUnit: '' },
    ],
  },
  'Яйцо варёное': {
    technology: 'Яйца варят 8-10 минут в кипящей воде, охлаждают и чистят.',
    ingredients: [
      { name: 'Яйца', grossPerPortion: '55', netPerPortion: '55', pricePerUnit: '180 р/ед' },
      { name: 'Соль', grossPerPortion: '1', netPerPortion: '1', pricePerUnit: '25 р/ед' },
    ],
  },
  'Суп гороховый': {
    technology:
      'Горох замачивают и варят до размягчения, добавляют картофель и пассерованные овощи, солят.',
    ingredients: [
      { name: 'Горох', grossPerPortion: '60', netPerPortion: '60', pricePerUnit: '95 р/ед' },
      { name: 'Картофель', grossPerPortion: '80', netPerPortion: '60', pricePerUnit: '60 р/ед' },
      { name: 'Морковь', grossPerPortion: '15', netPerPortion: '12', pricePerUnit: '45 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '10', netPerPortion: '8', pricePerUnit: '80 р/ед' },
      {
        name: 'Масло растительное',
        grossPerPortion: '5',
        netPerPortion: '5',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Рагу овощное': {
    technology: 'Овощи нарезают, обжаривают, добавляют томатную пасту и тушат до мягкости.',
    ingredients: [
      { name: 'Картофель', grossPerPortion: '120', netPerPortion: '90', pricePerUnit: '60 р/ед' },
      { name: 'Кабачки', grossPerPortion: '60', netPerPortion: '50', pricePerUnit: '90 р/ед' },
      { name: 'Морковь', grossPerPortion: '30', netPerPortion: '24', pricePerUnit: '45 р/ед' },
      { name: 'Лук репчатый', grossPerPortion: '25', netPerPortion: '20', pricePerUnit: '80 р/ед' },
      {
        name: 'Томатная паста',
        grossPerPortion: '8',
        netPerPortion: '8',
        pricePerUnit: '250 р/ед',
      },
      {
        name: 'Масло растительное',
        grossPerPortion: '10',
        netPerPortion: '10',
        pricePerUnit: '200 р/ед',
      },
      { name: 'Соль', grossPerPortion: '2', netPerPortion: '2', pricePerUnit: '25 р/ед' },
    ],
  },
  'Какао с молоком': {
    technology: 'Какао смешивают с сахаром, разводят горячим молоком и доводят до кипения.',
    ingredients: [
      { name: 'Какао-порошок', grossPerPortion: '5', netPerPortion: '5', pricePerUnit: '900 р/ед' },
      { name: 'Сахар', grossPerPortion: '15', netPerPortion: '15', pricePerUnit: '90 р/ед' },
      { name: 'Молоко', grossPerPortion: '180', netPerPortion: '180', pricePerUnit: '70 р/ед' },
    ],
  },
};

/** Перевод спецификации в строку с пересчётом «на 100 порций» и ценой. */
const toIngredient = (spec: MockIngredientSpec): Ingredient => {
  const gross = Number(spec.grossPerPortion.replace(',', '.'));
  const net = Number(spec.netPerPortion.replace(',', '.'));
  if (!Number.isFinite(gross) || !Number.isFinite(net)) {
    return { ...spec, grossPer100: '', netPer100: '' };
  }
  return {
    ...spec,
    grossPer100: String(+(gross / 10).toFixed(2)).replace('.', ','),
    netPer100: String(+(net / 10).toFixed(2)).replace('.', ','),
    unit: 'кг',
  };
};

const sampleRecipe = (index: number): Recipe => {
  const name = DISH_NAMES[(index - 1) % DISH_NAMES.length];
  const spec = DISH_SPECS[name] ?? FALLBACK_SPEC;
  const inCollection = index % 3 !== 0;
  const protein = (12 + (index % 8) * 2.4).toFixed(1).replace('.', ',');
  const fat = (8 + (index % 6) * 1.7).toFixed(1).replace('.', ',');
  const carbs = (18 + (index % 10) * 3.2).toFixed(1).replace('.', ',');
  const kcal = 180 + (index % 9) * 35;

  return {
    id: `t-${index}`,
    name,
    collectionName: inCollection ? collections[index % 2].name : '',
    collectionId: inCollection ? collections[index % 2].id : '',
    portionYield: index % 2 === 0 ? '150/50' : '90/50',
    price: 95 + (index % 7) * 18,
    kcal,
    recipe: spec.technology,
    ingredients: spec.ingredients.map(toIngredient),
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

// Soft-удалённые ТТК: остаются в меню до конца периода.
const deletedRecipeIds = new Set<string>();

const mockedDiets: Diet[] = [
  {
    id: 'diet-main',
    name: 'Основной',
    appliesTo: ['school', 'kindergarten', 'hospital'],
    mealIds: ['breakfast', 'second_breakfast', 'lunch', 'snack', 'dinner'],
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
    mealIds: ['breakfast', 'lunch', 'dinner'],
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
    mealIds: ['breakfast', 'lunch', 'snack', 'dinner'],
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
    mealIds: [],
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
    mealIds: ['breakfast', 'lunch', 'dinner'],
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
    mealIds: [],
    pricePerDay: 420,
    kcal: 1700,
    protein: 70,
    fat: 55,
    carbs: 250,
  },
];
// Soft-удалённые диеты: скрыты из справочника, но остаются в объектах/меню.

/** Object ids в отложенном удалении: скрыты из справочника до конца периода. */

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
 * (1800 ккал / Б 90 / Ж 60 / У 250 / 450 р/ед) с допуском ±10%.
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
      collectionName?: string;
      recipe: string;
      ingredients: Array<{
        name: string;
        productId?: string;
        grossPerPortion: string;
        netPerPortion: string;
      }>;
      nutrition?: CreateRecipeRequest['nutrition'];
    };
    const base = sampleRecipe(recipes.length + 1);
    const recipe: Recipe = {
      ...base,
      id: `t-${Date.now()}`,
      name: body.name,
      collectionId: '',
      collectionName: body.collectionName ?? '',
      portionYield: body.portionYield,
      recipe: body.recipe,
      nutrition: body.nutrition ? { ...base.nutrition, ...body.nutrition } : base.nutrition,
      ingredients: (body.ingredients ?? [])
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name,
          productId: row.productId ?? undefined,
          grossPerPortion: row.grossPerPortion,
          netPerPortion: row.netPerPortion,
          grossPer100: '',
          netPer100: '',
          pricePerUnit: '',
          unit: 'кг',
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
      collectionName?: string;
      recipe: string;
      ingredients: Array<{
        name: string;
        productId?: string;
        grossPerPortion: string;
        netPerPortion: string;
      }>;
      nutrition?: CreateRecipeRequest['nutrition'];
    };

    Object.assign(found, {
      name: body.name,
      portionYield: body.portionYield,
      collectionName: body.collectionName ?? found.collectionName,
      recipe: body.recipe,
      nutrition: body.nutrition ? { ...found.nutrition, ...body.nutrition } : found.nutrition,
      ingredients: (body.ingredients ?? [])
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name,
          productId: row.productId ?? undefined,
          grossPerPortion: row.grossPerPortion,
          netPerPortion: row.netPerPortion,
          grossPer100: '',
          netPer100: '',
          pricePerUnit: '',
          unit: 'кг',
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

  // Диеты: справочник рационов питания (см. features/diets).
  if (route === '/v1/mock/diets' && method === 'GET') {
    return { diets: mockedDiets } as T;
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

  // --- Объекты (объект → подобъект → отделения) ---
  if (route === '/v1/mock/objects' && method === 'GET') {
    return { objects } as T;
  }

  // --- Порционник (численность на дату + раздача по блюдам) ---
  if (route === '/v1/portions' && method === 'GET') {
    const date = params.get('date') ?? '';
    return { date, entries: ensurePortionsDay(date) } as T;
  }

  if (route === '/v1/portions/dishes' && method === 'GET') {
    const date = params.get('date') ?? '';
    const rows = buildDishDistribution(date, params.get('objectId'));
    return {
      date,
      rows,
      totalPortions: rows.reduce((sum, row) => sum + row.portions, 0),
    } as T;
  }

  if (route === '/v1/portions/headcount' && method === 'PATCH') {
    const body = options.body as {
      date: string;
      subObjectId: string;
      departmentId: string;
      tableId: string;
      headcount: number;
    };
    const entries = ensurePortionsDay(body.date);
    const found = entries.find(
      (item) =>
        item.subObjectId === body.subObjectId &&
        item.departmentId === body.departmentId &&
        item.tableId === body.tableId
    );
    if (found) {
      found.headcount = Math.max(0, body.headcount);
    } else {
      entries.push({
        subObjectId: body.subObjectId,
        departmentId: body.departmentId,
        tableId: body.tableId,
        headcount: Math.max(0, body.headcount),
      });
    }
    return { date: body.date, entries } as T;
  }

  // Раскладка продуктов на день: порционник × меню × ТТК.
  if (route === '/v1/products-spread' && method === 'GET') {
    const date = params.get('date') ?? '';
    const objectId = params.get('objectId') ?? null;
    return buildProductSpread(date, objectId) as T;
  }

  throw new Error(`mock: нет обработчика для ${method} ${path} — добавь в mock-handlers.ts`);
}

const objects: CateringObject[] = [
  {
    id: 'object-1',
    name: 'Больница №1',
    type: 'hospital',
    menuId: 'menu-1',
    mealIds: ['breakfast', 'second_breakfast', 'lunch', 'snack', 'dinner'],
    departments: [
      {
        id: 'obj-dep-1-1',
        name: 'Административный корпус',
        tables: [
          { id: 'obj-tbl-1-1-1', name: 'Основная', headcount: 18 },
          { id: 'obj-tbl-1-1-2', name: 'Щадящая', headcount: 4 },
        ],
      },
    ],
    subObjects: [
      {
        id: 'sub-1-1',
        name: 'Больница №1',
        address: 'корп. А',
        type: 'hospital',
        kettleNumber: 1,
        menuSource: 'object',
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
        id: 'sub-1-3',
        name: 'Больница №4',
        address: 'корп. Д',
        type: 'hospital',
        kettleNumber: 1,
        menuSource: 'object',
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
    id: 'object-2',
    name: 'Объект №2',
    type: 'school',
    mealIds: ['breakfast', 'lunch'],
    departments: [
      {
        id: 'obj-dep-2-1',
        name: 'Спортивный комплекс',
        tables: [{ id: 'obj-tbl-2-1-1', name: 'Основная', headcount: 12 }],
      },
    ],
    subObjects: [
      {
        id: 'sub-2-1',
        name: 'Школа №5',
        address: 'корп. Б',
        type: 'school',
        kettleNumber: 2,
        menuSource: 'object',
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
        id: 'sub-2-5',
        name: 'Детский сад №3',
        address: 'ул. Садовая, 5',
        type: 'kindergarten',
        kettleNumber: 2,
        menuSource: 'own',
        menuId: 'menu-1',
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
    id: 'object-3',
    name: 'Объект №3',
    type: 'hospital',
    mealIds: ['breakfast', 'second_breakfast', 'lunch', 'snack', 'dinner'],
    departments: [
      {
        id: 'obj-dep-3-1',
        name: 'Пищеблок (своя столовая)',
        tables: [{ id: 'obj-tbl-3-1-1', name: 'Основная', headcount: 25 }],
      },
    ],
    subObjects: [
      {
        id: 'sub-3-4',
        name: 'Школа №2',
        address: 'корп. В',
        type: 'school',
        kettleNumber: 3,
        menuSource: 'object',
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
        id: 'sub-3-6',
        name: 'Больница №3',
        address: 'корп. Д',
        type: 'hospital',
        kettleNumber: 3,
        menuSource: 'object',
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

/** Порционник по датам: ключ YYYY-MM-DD → строки численности. */
const portionsByDate: Record<string, PortionEntry[]> = {};

function ensurePortionsDay(date: string): PortionEntry[] {
  if (!date) throw new Error('mock: не указана дата порционника');
  if (!portionsByDate[date]) {
    if (date > todayIso()) {
      // Будущая дата — численность ещё не заполняли.
      portionsByDate[date] = [];
      return portionsByDate[date];
    }
    const entries: PortionEntry[] = [];
    for (const obj of objects) {
      for (const subObject of obj.subObjects) {
        for (const department of subObject.departments) {
          for (const table of department.tables) {
            entries.push({
              subObjectId: subObject.id,
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

function buildDishDistribution(date: string, objectId: string | null): DishDistributionRow[] {
  const dishes: Array<{ name: string; mealType: string }> = [
    { name: 'Каша рисовая молочная', mealType: 'Завтрак' },
    { name: 'Суп картофельный с мясом', mealType: 'Обед' },
    { name: 'Котлета куриная паровая', mealType: 'Ужин' },
  ];
  const entries = ensurePortionsDay(date);
  const units = objectId ? objects.filter((obj) => obj.id === objectId) : objects;
  const rows: DishDistributionRow[] = [];
  for (const dish of dishes) {
    for (const unit of units) {
      for (const subObject of unit.subObjects) {
        for (const department of subObject.departments) {
          for (const table of department.tables) {
            const entry = entries.find(
              (item) =>
                item.subObjectId === subObject.id &&
                item.departmentId === department.id &&
                item.tableId === table.id
            );
            const portions = entry?.headcount ?? 0;
            if (portions <= 0) continue;
            rows.push({
              dishName: dish.name,
              mealType: dish.mealType,
              objectName: unit.name,
              subObjectName: subObject.name,
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

// --- Раскладка продуктов на день ---

/** Целые сутки между датами (a → b), как в shiftIso: строки YYYY-MM-DD. */
function daysBetween(a: string, b: string): number {
  const from = new Date(`${a}T00:00:00`);
  const to = new Date(`${b}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

/** Номер дня цикла (1…cycleDays) для даты относительно старта меню. */
function cycleDayForDate(menu: CycleMenu, date: string): number {
  const offset = daysBetween(menu.startDate, date);
  return (((offset % menu.cycleDays) + menu.cycleDays) % menu.cycleDays) + 1;
}

/**
 * Слоты меню на конкретную дату. Меню цикловое (CYCLE_DAYS=14): берём слоты
 * активного периода, если дата в него попадает, иначе — базовый день цикла.
 */
function slotsForDate(menu: CycleMenu, date: string): CycleMenu['slots'] {
  const periods = periodSlots(menu.id);
  for (const [start, periodSlotsArr] of Object.entries(periods)) {
    const offset = daysBetween(start, date);
    if (offset < 0 || offset >= menu.cycleDays) continue;
    const day = (((offset % menu.cycleDays) + menu.cycleDays) % menu.cycleDays) + 1;
    return periodSlotsArr.filter((slot) => slot.day === day);
  }
  const day = cycleDayForDate(menu, date);
  return menu.slots.filter((slot) => slot.day === day);
}

/** Численность объекта на дату: сумма по подразделениям/столам порционника. */
function unitHeadcount(entries: PortionEntry[], unit: CateringObject): number {
  let total = 0;
  for (const subObject of unit.subObjects) {
    for (const department of subObject.departments) {
      for (const table of department.tables) {
        const entry = entries.find(
          (item) =>
            item.subObjectId === subObject.id &&
            item.departmentId === department.id &&
            item.tableId === table.id
        );
        total += entry?.headcount ?? 0;
      }
    }
  }
  return total;
}

/** Граммы на порцию из «брутто на порцию»; '' и промежуточные строки → null. */
function parseIngredientGrams(grossPerPortion: string): number | null {
  const value = Number(grossPerPortion.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Округление до 0,01 (граммы в кг); л/шт тоже округляем до сотых. */
function roundKg(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ссылка на продукт справочника по имени ингредиента ТТК.
 * Мок-ТТК пока не связывают ингредиенты с productId, а справочник продуктов
 * живёт на бэке: id строим из имени, единица — килограммы.
 */
function resolveIngredientProduct(name: string): {
  id: string;
  name: string;
  unit: string;
} {
  return { id: `ing-${name}`, name, unit: 'кг' };
}

/**
 * Раскладка на дату: численность из порционника × меню дня × ТТК.
 * Блюда берутся не захардкоженными, а из циклового меню каждого объекта
 * (recipeId → рецепт ТТК → ингредиенты); продукт агрегируется по блюдам
 * и приёмам пищи (авторазбивка).
 */
function buildProductSpread(
  date: string,
  objectId: string | null
): {
  date: string;
  objectId: string | null;
  items: ProductSpreadItem[];
} {
  const entries = ensurePortionsDay(date);
  const units = objectId ? objects.filter((obj) => obj.id === objectId) : objects;

  const byId = new Map<string, ProductSpreadItem>();

  for (const unit of units) {
    const menu = menus.find((item) => item.id === unit.menuId) ?? menus[0];
    if (!menu) continue;
    const daySlots = slotsForDate(menu, date);

    const portions = unitHeadcount(entries, unit);
    if (portions <= 0) continue;

    for (const meal of MEALS) {
      if (!unit.mealIds.includes(meal.id)) continue;
      const dishes = daySlots
        .filter((slot) => slot.mealId === meal.id)
        .flatMap((slot) => slot.dishes);
      if (dishes.length === 0) continue;

      for (const dish of dishes) {
        const recipe = recipes.find((item) => item.id === dish.recipeId);
        if (!recipe) continue;

        for (const ingredient of recipe.ingredients) {
          const grams = parseIngredientGrams(ingredient.grossPerPortion);
          if (grams === null) continue;
          const product = resolveIngredientProduct(ingredient.name);
          const quantity = roundKg((portions * grams) / 1000);

          let item = byId.get(product.id);
          if (!item) {
            item = {
              productId: product.id,
              productName: product.name,
              unit: product.unit,
              total: 0,
              byMeal: Object.fromEntries(MEALS.map((entry) => [entry.id, 0])) as Record<
                ProductSpreadMealId,
                number
              >,
              dishes: [],
            };
            byId.set(product.id, item);
          }
          item.byMeal[meal.id] = roundKg(item.byMeal[meal.id] + quantity);
          item.total = roundKg(item.total + quantity);
          item.dishes.push({
            mealId: meal.id,
            dishName: dish.name,
            portions,
            quantity,
          });
        }
      }
    }
  }

  const items = [...byId.values()]
    .sort((a, b) => a.productName.localeCompare(b.productName, 'ru'))
    .map((item) => ({ ...item, dishes: [...item.dishes] }));

  return { date, objectId, items };
}
