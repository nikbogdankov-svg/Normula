import { useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

const MOCK_ORGS = [
  { id: 'org-alpha', name: 'Alpha (mock)' },
  { id: 'org-beta', name: 'Beta (mock)' },
];

/**
 * Offline-режим: мгновенный «вход» без Logto и сети. Токены — заглушки,
 * их никто не проверяет: api-клиент в mock-режиме отвечает из памяти.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: false,
      isAuthenticated,
      user: isAuthenticated ? { id: 'mock-user', name: 'Dev User', email: 'dev@localhost' } : null,
      signIn: async () => setAuthenticated(true),
      signOut: async () => setAuthenticated(false),
      getApiToken: async () => 'mock-api-token',
      getOrganizationToken: async (orgId) => `mock-org-token:${orgId}`,
      fetchOrganizations: async () => MOCK_ORGS,
    }),
    [isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
