import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LogtoProvider, ReservedScope, useLogto, UserScope, type LogtoConfig } from '@logto/react';
import { config, type LogtoSettings } from '@/shared/config';
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
  type Organization,
} from './auth-context';

function requireLogtoSettings(): LogtoSettings {
  if (!config.logto) {
    throw new Error("authMode='logto', но config.logto не задан");
  }
  return config.logto;
}

/**
 * Конфиг SPA-приложения Logto (PKCE, без секрета).
 *
 * Просим РОВНО то, что используем: Logto отбивает весь запрос авторизации,
 * если хотя бы один скоуп не разрешён приложению, поэтому «на вырост» здесь
 * ничего быть не должно.
 *
 * - openid — обязателен;
 * - offline_access — refresh-токен, иначе перезагрузка страницы = новый вход;
 * - UserScope.Organizations — организационные токены (getOrganizationToken)
 *   и список организаций в userinfo (organization_data); без него не работает
 *   переключатель организаций и любой tokenKind='organization';
 * - resources: [apiResource] — чтобы getAccessToken(apiResource) выдавал токен
 *   с правильным aud для бэкенда. Организационный ресурс SDK добавит сам,
 *   раз в scopes есть Organizations.
 *
 * includeReservedScopes: false — иначе SDK молча дописывает `profile`
 * (см. withReservedScopes в @logto/js), а имя и почту хранит бэкенд.
 */
function buildLogtoConfig(): LogtoConfig {
  const logto = requireLogtoSettings();

  return {
    endpoint: logto.endpoint,
    appId: logto.appId,
    resources: [logto.apiResource],
    includeReservedScopes: false,
    scopes: [
      ReservedScope.OpenId,
      ReservedScope.OfflineAccess,
      UserScope.Organizations,
      ...ORGANIZATION_SCOPES,
    ],
  };
}

/**
 * Организационные разрешения, которые бэкенд проверяет в токене.
 *
 * Их обязательно перечислять здесь: Logto кладёт в организационный токен
 * только те скоупы, которые были ЗАПРОШЕНЫ, — даже если у пользователя они
 * есть по роли. Без этого списка бэкенд отвечает «missing scope».
 *
 * Что человеку реально не выдано ролью, Logto просто не положит в токен,
 * так что запрашивать можно весь набор.
 */
const ORGANIZATION_SCOPES = [
  // Администрирование организаций платформы (раздел «Управление»).
  'manage:platform',
  // Управление своей организацией: участники, роли, приглашения.
  'manage:organization',
  // Чтение технологических карт.
  'read:ttk',
];

export const signInRedirectUri = `${window.location.origin}/callback`;
export const postSignOutRedirectUri = `${window.location.origin}/`;

function LogtoAuthBridge({ children }: { children: ReactNode }) {
  const logto = useLogto();
  const { signIn, signOut, getAccessToken, getOrganizationToken, fetchUserInfo } = logto;
  const apiResource = requireLogtoSettings().apiResource;
  const [user, setUser] = useState<AuthUser | null>(null);

  const getApiToken = useCallback(async () => {
    const token = await getAccessToken(apiResource);
    if (!token) throw new Error('Не удалось получить access token (сессия истекла?)');
    return token;
  }, [getAccessToken, apiResource]);

  const getOrgToken = useCallback(
    async (organizationId: string) => {
      const token = await getOrganizationToken(organizationId);
      if (!token) throw new Error(`Нет доступа к организации ${organizationId}`);
      return token;
    },
    [getOrganizationToken]
  );

  const fetchOrganizations = useCallback(async (): Promise<Organization[]> => {
    // userinfo при scope Organizations содержит organization_data:
    // [{ id, name, description }]. Типы SDK это поле знают не во всех версиях,
    // поэтому читаем защищённо.
    const info = (await fetchUserInfo()) as {
      organization_data?: { id: string; name: string }[];
      organizations?: string[];
    };
    if (info.organization_data?.length) {
      return info.organization_data.map((o) => ({ id: o.id, name: o.name }));
    }
    return (info.organizations ?? []).map((id) => ({ id, name: id }));
  }, [fetchUserInfo]);

  // Имя/почта в userinfo появятся только если приложению выданы соответствующие
  // скоупы; иначе остаётся sub. Профиль рисует то, что реально пришло.
  useEffect(() => {
    if (!logto.isAuthenticated) {
      setUser(null);
      return;
    }
    let cancelled = false;
    fetchUserInfo()
      .then((info) => {
        if (cancelled) return;
        const record = info as {
          sub?: string;
          name?: string;
          username?: string;
          email?: string;
        };
        if (!record.sub) {
          setUser(null);
          return;
        }
        setUser({
          id: record.sub,
          name: record.name ?? record.username,
          email: record.email,
        });
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [logto.isAuthenticated, fetchUserInfo]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: logto.isLoading,
      isAuthenticated: logto.isAuthenticated,
      user,
      signIn: () => signIn(signInRedirectUri),
      signOut: () => signOut(postSignOutRedirectUri),
      getApiToken,
      getOrganizationToken: getOrgToken,
      fetchOrganizations,
    }),
    [
      logto.isLoading,
      logto.isAuthenticated,
      user,
      signIn,
      signOut,
      getApiToken,
      getOrgToken,
      fetchOrganizations,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function LogtoAuthProvider({ children }: { children: ReactNode }) {
  return (
    <LogtoProvider config={buildLogtoConfig()}>
      <LogtoAuthBridge>{children}</LogtoAuthBridge>
    </LogtoProvider>
  );
}
