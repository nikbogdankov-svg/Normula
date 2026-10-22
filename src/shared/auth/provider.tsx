import { useCallback, useMemo, type ReactNode } from 'react';
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
  type Organization,
} from './auth-context';

/**
 * Моковая авторизация прототипа.
 *
 * Полностью заменяет Logto: пользователь и организации заданы константами,
 * токены не запрашиваются у сервера, а вход/выход — no-op. Реализует тот же
 * `AuthContextValue`, что и прежний Logto-провайдер, поэтому остальной код
 * (useApi, OrgProvider, меню по скоупам) продолжает работать как есть.
 *
 * Скоупы намеренно полные: в прототипе должны быть видны ВСЕ разделы, включая
 * «Управление» (manage:platform).
 */

const MOCK_USER: AuthUser = {
  id: 'user-001',
  name: 'Anna Nováková',
  email: 'a.novakova@styleu.cz',
};

const MOCK_ORGANIZATIONS: Organization[] = [
  { id: 'org-styleu', name: 'StyleU s.r.o.' },
  { id: 'org-gym12', name: 'Gymnázium č. 12' },
];

/** Все организационные разрешения — чтобы меню показало все пункты. */
const MOCK_SCOPES = ['manage:platform', 'manage:organization', 'read:ttk'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const signIn = useCallback(async () => undefined, []);
  const signOut = useCallback(async () => undefined, []);
  // Параметры organizationId не нужны: мок отдаёт один и тот же токен и
  // скоупы для любой организации. Сигнатуры короче — но всё ещё совместимы
  // с AuthContextValue (меньше аргументов у функции допустимо).
  const getApiToken = useCallback(async () => 'mock-api-token', []);
  const getOrganizationToken = useCallback(async () => 'mock-org-token', []);
  const getOrganizationScopes = useCallback(async () => [...MOCK_SCOPES], []);
  const resetTokens = useCallback(async () => undefined, []);
  const fetchOrganizations = useCallback(async () => [...MOCK_ORGANIZATIONS], []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: false,
      isAuthenticated: true,
      user: MOCK_USER,
      signIn,
      signOut,
      changePassword: async () => {},
      getApiToken,
      getOrganizationToken,
      getOrganizationScopes,
      resetTokens,
      fetchOrganizations,
    }),
    [
      signIn,
      signOut,
      getApiToken,
      getOrganizationToken,
      getOrganizationScopes,
      resetTokens,
      fetchOrganizations,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
