import type { RequestOptions } from './client';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/features/organizations/types';
import type { Employee, StaffRole } from '@/features/staff/types';
import type { Collection, Recipe } from '@/features/ttk/types';

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
export const MOCKED_PREFIXES = ['/v1/staff', '/v1/ttk'];

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
    email: `surname${index + 1}@zdorovoyepitanie.ru`,
    orgEmail: `${firstName.toLowerCase()[0] ?? ''}.${lastName.toLowerCase()}@zdorovoyepitanie.ru`,
    roleId,
    registeredAt: new Date(Date.UTC(2019, 1, 1 + index)).toISOString(),
    snils: '',
    inn: '',
    passport: '',
    otherDoc: '',
  };
});

/** Пароль, который «выдаёт» сервер: в моках он предсказуемо случайный. */
const newPassword = () => Math.random().toString(36).slice(2, 10);

// --- ТТК ---

const collections: Collection[] = [
  { id: 'c-1', name: 'Сборник рецептур на продукцию для обучающихся, Москва 2017' },
  { id: 'c-2', name: 'Сборник технических нормативов, 2020' },
];

const sampleRecipe = (index: number): Recipe => {
  const inCollection = index % 3 !== 0;

  return {
    id: `t-${index}`,
    name: index === 1 ? 'Бефстроганов из мяса' : `Название блюда ${index}`,
    collectionName: inCollection ? collections[index % 2].name : '',
    collectionId: inCollection ? collections[index % 2].id : '',
    portionYield: '90/50',
    price: 180 + (index % 5) * 5,
    kcal: 240 + (index % 4) * 20,
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
    outputPerPortion: '90/50',
    outputPer100: '9,0/5,0',
    nutrition: { protein: '26,1', fat: '30,8', carbs: '8,3', kcal: '404', vitaminC: '0,78' },
  };
};

const recipes: Recipe[] = Array.from({ length: 24 }, (_, index) => sampleRecipe(index + 1));

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

    let found = recipes;
    if (query) found = found.filter((r) => r.name.toLowerCase().includes(query));
    if (collectionId) found = found.filter((r) => r.collectionId === collectionId);

    const sorted = [...found].sort((a, b) => {
      if (sort === 'price') return a.price - b.price;
      if (sort === 'kcal') return a.kcal - b.kcal;

      return a.name.localeCompare(b.name, 'ru');
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
    const body = options.body as Omit<Employee, 'id' | 'orgEmail' | 'registeredAt'>;
    const employee: Employee = {
      ...body,
      id: `e-${Date.now()}`,
      orgEmail: `${body.firstName.toLowerCase()[0] ?? ''}.${body.lastName.toLowerCase()}@zdorovoyepitanie.ru`,
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
    Object.assign(found, options.body);

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

  throw new Error(`mock: нет обработчика для ${method} ${path} — добавь в mock-handlers.ts`);
}

/** Держит счётчик участников в согласии со списком. */
function syncMemberCount(organizationId: string) {
  const org = organizations.find((o) => o.id === organizationId);
  if (org) org.memberCount = (members[organizationId] ?? []).length;
}
