import type { RequestOptions } from './client';
import type { HelloResponse } from '@/features/hello/types';
import type {
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/features/organizations/types';

/**
 * In-memory обработчики для mock-режима: фронт полностью работает без бэка.
 *
 * Добавляя фичу, регистрируй её эндпоинты здесь по образцу ниже —
 * тогда фича сразу работает в `npm run dev:mock` без Logto и бэкенда.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  // onemoreadmin.v1.OnemoreAdminService/Hello
  if (route === '/hello' && method === 'GET') {
    const response: HelloResponse = { greeting: `hello, ${params.get('name') ?? ''} (mock)` };

    return response as T;
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
