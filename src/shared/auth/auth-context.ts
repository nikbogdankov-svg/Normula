import { createContext, useContext } from 'react';

/** Организация пользователя (из Logto userinfo / мока). */
export interface Organization {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

/**
 * Контракт авторизации. Две реализации: LogtoAuthProvider и MockAuthProvider.
 * Остальной код зависит только от этого интерфейса — переключение режима
 * не трогает фичи.
 */
export interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;

  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  /** Access token для API-ресурса (aud = apiResource). */
  getApiToken: () => Promise<string>;
  /** Организационный token (aud = urn:logto:organization:<id>). */
  getOrganizationToken: (organizationId: string) => Promise<string>;
  /** Организации пользователя. */
  fetchOrganizations: () => Promise<Organization[]>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth: компонент вне <AuthProvider>');
  }
  return ctx;
}
