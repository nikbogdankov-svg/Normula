import { useCallback, useMemo, type ReactNode } from 'react';
import { LogtoProvider, ReservedScope, useLogto, UserScope, type LogtoConfig } from '@logto/react';
import { config, type LogtoSettings } from '@/shared/config';
import { AuthContext, type AuthContextValue, type Organization } from './auth-context';

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
    scopes: [ReservedScope.OpenId, ReservedScope.OfflineAccess, UserScope.Organizations],
  };
}

export const signInRedirectUri = `${window.location.origin}/callback`;
export const postSignOutRedirectUri = `${window.location.origin}/`;

function LogtoAuthBridge({ children }: { children: ReactNode }) {
  const logto = useLogto();
  const { signIn, signOut, getAccessToken, getOrganizationToken, fetchUserInfo } = logto;
  const apiResource = requireLogtoSettings().apiResource;

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

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: logto.isLoading,
      isAuthenticated: logto.isAuthenticated,
      user: null, // заполняется лениво через fetchUserInfo при необходимости
      signIn: () => signIn(signInRedirectUri),
      signOut: () => signOut(postSignOutRedirectUri),
      getApiToken,
      getOrganizationToken: getOrgToken,
      fetchOrganizations,
    }),
    [
      logto.isLoading,
      logto.isAuthenticated,
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
