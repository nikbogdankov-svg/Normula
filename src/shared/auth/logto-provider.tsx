import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LogtoClientError,
  LogtoProvider,
  LogtoRequestError,
  ReservedScope,
  useLogto,
  UserScope,
  type LogtoConfig,
} from '@logto/react';
import { config } from '@/shared/config';
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
  type Organization,
} from './auth-context';

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
  const logto = config.logto;

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

/**
 * Ошибка SDK, после которой сессию не восстановить без нового входа:
 * refresh-токен истёк или отозван, либо его нет вовсе.
 *
 * Сетевые сбои (TypeError из fetch) сюда намеренно не попадают — ради
 * пропавшего интернета отправлять человека на страницу входа незачем.
 */
function isSessionLost(error: Error): boolean {
  if (error instanceof LogtoClientError) {
    return error.code === 'not_authenticated' || error.code === 'fetch_user_info_failed';
  }

  if (error instanceof LogtoRequestError) {
    return error.code === 'oidc.invalid_grant' || error.code === 'oidc.invalid_token';
  }

  return false;
}

/** Когда в последний раз уводили на вход из-за потерянной сессии. */
const RELOGIN_AT_KEY = 'onemore.reloginAt';
/**
 * Не чаще раза в минуту: если сразу после входа сессия снова «теряется»
 * (например, приложению в Logto не выдан ресурс), без этого ограничения
 * страница бесконечно прыгала бы между собой и Logto.
 */
const RELOGIN_COOLDOWN_MS = 60_000;

function LogtoAuthBridge({ children }: { children: ReactNode }) {
  const logto = useLogto();
  const {
    signIn,
    signOut,
    getAccessToken,
    getOrganizationToken,
    getOrganizationTokenClaims,
    clearAllTokens,
    fetchUserInfo,
  } = logto;
  const apiResource = config.logto.apiResource;
  const [user, setUser] = useState<AuthUser | null>(null);

  // Методы useLogto не бросают исключений: SDK ловит ошибку, кладёт её в
  // logto.error и возвращает undefined. Поэтому протухшая сессия не видна ни
  // одному вызывающему — isAuthenticated держится на ID-токене в
  // localStorage, а данные молча не приходят: ни вошёл, ни вышел. Ловим
  // такую ошибку здесь, в одном месте, и честно отправляем на вход.
  const { error: logtoError, isAuthenticated: logtoAuthenticated } = logto;
  useEffect(() => {
    if (!logtoError || !logtoAuthenticated || !isSessionLost(logtoError)) return;

    const lastAttempt = Number(sessionStorage.getItem(RELOGIN_AT_KEY) ?? 0);
    if (Date.now() - lastAttempt < RELOGIN_COOLDOWN_MS) {
      console.warn(
        'Сессия Logto потеряна повторно сразу после входа — не зацикливаемся',
        logtoError
      );
      return;
    }

    sessionStorage.setItem(RELOGIN_AT_KEY, String(Date.now()));

    // Токены чистим до ухода: если человек не завершит вход и вернётся
    // позже, мёртвый ID-токен снова изображал бы вошедшего пользователя.
    void clearAllTokens().then(() => signIn(signInRedirectUri));
  }, [logtoError, logtoAuthenticated, clearAllTokens, signIn]);

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

  // Скоуп в токене — строка через пробел, как в OAuth. Промах здесь не
  // должен ронять интерфейс: без скоупов меню просто покажет базовый набор.
  const getOrganizationScopes = useCallback(
    async (organizationId: string): Promise<string[]> => {
      const claims = await getOrganizationTokenClaims(organizationId);

      return claims?.scope?.split(' ').filter(Boolean) ?? [];
    },
    [getOrganizationTokenClaims]
  );

  const resetTokens = useCallback(async () => {
    await clearAllTokens();
  }, [clearAllTokens]);

  const fetchOrganizations = useCallback(async (): Promise<Organization[]> => {
    // userinfo при scope Organizations содержит organization_data:
    // [{ id, name, description }]. Типы SDK это поле знают не во всех версиях,
    // поэтому читаем защищённо.
    const response = await fetchUserInfo();
    // undefined — SDK проглотил ошибку (см. эффект выше). Пустой список здесь
    // выдавал бы сбой за «у вас нет организаций».
    if (!response) {
      throw new Error('Не удалось получить организации: сессия Logto недоступна');
    }

    const info = response as {
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
        // undefined — SDK проглотил ошибку; ей занимается эффект потери сессии.
        if (!info) {
          setUser(null);
          return;
        }
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
      getOrganizationScopes,
      resetTokens,
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
      getOrganizationScopes,
      resetTokens,
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
