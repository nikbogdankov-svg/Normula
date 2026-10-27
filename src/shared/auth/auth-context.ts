import { createContext, useContext } from 'react';

/** Организация пользователя (из Logto userinfo). */
export interface Organization {
  id: string;
  name: string;
  features?: {
    warehouseEnabled: boolean;
    financeEnabled: boolean;
    objectsEnabled: boolean;
  };
}

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

/**
 * Контракт авторизации; реализация — LogtoAuthProvider. Остальной код
 * зависит только от этого интерфейса.
 */
export interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;

  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Смена пароля: вход Logto сразу на экране сброса пароля — код на почту
   * и новый пароль. После него человек возвращается в приложение уже
   * вошедшим.
   */
  changePassword: () => Promise<void>;

  /** Access token для API-ресурса (aud = apiResource). */
  getApiToken: () => Promise<string>;
  /** Организационный token (aud = urn:logto:organization:<id>). */
  getOrganizationToken: (organizationId: string) => Promise<string>;
  /**
   * Скоупы организационного токена. По ним фронт прячет разделы, которых у
   * человека нет: Logto кладёт в токен только то, что реально выдано ролью.
   *
   * Это подсказка интерфейсу, а не защита — доступ решают перехватчики
   * на бэкенде.
   */
  getOrganizationScopes: (organizationId: string) => Promise<string[]>;
  /**
   * Сбросить закэшированные токены, чтобы следующий запрос взял свежие.
   *
   * Нужно после того, как бэкенд поменял роль вошедшего: выданный токен
   * несёт прежние скоупы до самого истечения, и обновить его может только
   * клиент.
   */
  resetTokens: () => Promise<void>;
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
