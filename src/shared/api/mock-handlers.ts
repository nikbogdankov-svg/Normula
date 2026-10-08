import type { RequestOptions } from './client';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/features/organizations/types';
import type { Employee, EmployeeDocuments, StaffRole } from '@/features/staff/types';
import { EMPTY_DOCUMENTS } from '@/features/staff/types';
import type { ObjectItem } from '@/features/objects/types';
import type { ProductSpreadItem, ProductSpreadResponse } from '@/features/products-spread/types';

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
export const MOCKED_PREFIXES: string[] = [
  // TEMP-MOCK «Раскладка продуктов»: на стенде данных ещё нет, раскладка
  // нужна для отладки порционника. Убрать, когда появится за подтверждением.
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

  // TEMP-MOCK «Раскладка продуктов»: стендовые данные до сих пор пустые,
  // поэтому раскладка нужна для отладки порционника (пока мок не уберём).
  if (route === '/v1/products-spread' && method === 'GET') {
    const dateParam = params.get('date') ?? '';
    const objectId = params.get('objectId') ?? undefined;
    const response: ProductSpreadResponse = objectId
      ? { date: dateParam, objectId, items: mockProductSpreadItems }
      : { date: dateParam, items: mockProductSpreadItems };

    return response as T;
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

  // Раздел «Объекты» — на бэке (v1/objects). Небольшой плоский список
  // отдаём только в полностью офлайновом режиме, чтобы селектам объектов
  // было что показать.
  if (route === '/v1/objects' && method === 'GET') {
    return { objects: mockObjects } as T;
  }

  throw new Error(`mock: нет обработчика для ${method} ${path} — добавь в mock-handlers.ts`);
}

/** Объекты для офлайнового режима: без групп, только имена для селектов. */
const mockObjects: ObjectItem[] = [
  { id: 'object-0', parentObjectId: '', name: 'Центральный склад', type: 'warehouse', groups: [] },
  { id: 'object-1', parentObjectId: '', name: 'Больница №1', type: 'hospital', groups: [] },
  { id: 'sub-1-1', parentObjectId: 'object-1', name: 'Корпус А', type: 'hospital', groups: [] },
  { id: 'object-2', parentObjectId: '', name: 'Школа 5', type: 'school', groups: [] },
];

/** Держит счётчик участников в согласии со списком. */
function syncMemberCount(organizationId: string) {
  const org = organizations.find((o) => o.id === organizationId);
  if (org) org.memberCount = (members[organizationId] ?? []).length;
}

/**
 * TEMP-MOCK: правдоподобная раскладка продуктов на день. Отдаётся в ответ на
 * любой запрошенный день; забрать вместе с обработчиком /v1/products-spread.
 */
const mockProductSpreadItems: ProductSpreadItem[] = [
  {
    productId: 'p-milk',
    productName: 'Молоко, 3,2%',
    unit: 'л',
    total: 38.5,
    byMeal: { breakfast: 15.0, second_breakfast: 3.5, lunch: 15.0, snack: 5.0 },
    dishes: [
      { mealId: 'breakfast', dishName: 'Каша молочная рисовая', portions: 125, quantity: 15.0 },
      { mealId: 'second_breakfast', dishName: 'Печенье с молоком', portions: 125, quantity: 3.5 },
      { mealId: 'lunch', dishName: 'Суп-лапша молочный', portions: 125, quantity: 15.0 },
      { mealId: 'snack', dishName: 'Какао', portions: 100, quantity: 5.0 },
    ],
  },
  {
    productId: 'p-potato',
    productName: 'Картофель',
    unit: 'кг',
    total: 42.5,
    byMeal: { lunch: 30.0, dinner: 12.5 },
    dishes: [
      { mealId: 'lunch', dishName: 'Пюре картофельное', portions: 120, quantity: 30.0 },
      { mealId: 'dinner', dishName: 'Картофель отварной', portions: 100, quantity: 12.5 },
    ],
  },
  {
    productId: 'p-chicken',
    productName: 'Курица (филе)',
    unit: 'кг',
    total: 16.2,
    byMeal: { breakfast: 3.2, lunch: 9.0, dinner: 4.0 },
    dishes: [
      { mealId: 'breakfast', dishName: 'Омлет с курицей', portions: 80, quantity: 3.2 },
      { mealId: 'lunch', dishName: 'Курица отварная', portions: 125, quantity: 9.0 },
      { mealId: 'dinner', dishName: 'Тушёная курица с овощами', portions: 100, quantity: 4.0 },
    ],
  },
  {
    productId: 'p-carrot',
    productName: 'Морковь',
    unit: 'кг',
    total: 9.8,
    byMeal: { breakfast: 1.8, lunch: 5.0, dinner: 3.0 },
    dishes: [
      { mealId: 'breakfast', dishName: 'Салат морковный', portions: 80, quantity: 1.8 },
      { mealId: 'lunch', dishName: 'Суп с морковью', portions: 125, quantity: 5.0 },
      { mealId: 'dinner', dishName: 'Гарнир овощной', portions: 100, quantity: 3.0 },
    ],
  },
  {
    productId: 'p-bread',
    productName: 'Хлеб пшеничный',
    unit: 'кг',
    total: 11.0,
    byMeal: { breakfast: 3.0, lunch: 5.0, dinner: 3.0 },
    dishes: [
      { mealId: 'breakfast', dishName: 'Хлеб к завтраку', portions: 125, quantity: 3.0 },
      { mealId: 'lunch', dishName: 'Хлеб к обеду', portions: 125, quantity: 5.0 },
      { mealId: 'dinner', dishName: 'Хлеб к ужину', portions: 100, quantity: 3.0 },
    ],
  },
  {
    productId: 'p-apple',
    productName: 'Яблоки',
    unit: 'кг',
    total: 12.4,
    byMeal: { second_breakfast: 6.0, snack: 6.4 },
    dishes: [
      { mealId: 'second_breakfast', dishName: 'Яблоко свежее', portions: 125, quantity: 6.0 },
      { mealId: 'snack', dishName: 'Яблоко свежее', portions: 100, quantity: 6.4 },
    ],
  },
  {
    productId: 'p-sugar',
    productName: 'Сахар',
    unit: 'кг',
    total: 4.6,
    byMeal: { breakfast: 1.6, second_breakfast: 0.8, lunch: 1.2, snack: 1.0 },
    dishes: [
      { mealId: 'breakfast', dishName: 'Чай с сахаром', portions: 125, quantity: 1.6 },
      { mealId: 'second_breakfast', dishName: 'Компот', portions: 125, quantity: 0.8 },
      { mealId: 'lunch', dishName: 'Компот', portions: 125, quantity: 1.2 },
      { mealId: 'snack', dishName: 'Кисель', portions: 100, quantity: 1.0 },
    ],
  },
  {
    productId: 'p-butter',
    productName: 'Масло сливочное',
    unit: 'кг',
    total: 1.45,
    byMeal: { breakfast: 0.6, lunch: 0.5, dinner: 0.35 },
    dishes: [
      { mealId: 'breakfast', dishName: 'Масло к каше', portions: 125, quantity: 0.6 },
      { mealId: 'lunch', dishName: 'Масло к гарниру', portions: 125, quantity: 0.5 },
      { mealId: 'dinner', dishName: 'Масло к гарниру', portions: 100, quantity: 0.35 },
    ],
  },
];
