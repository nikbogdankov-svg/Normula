import type { ReactNode } from 'react';
import { LogtoAuthProvider } from './logto-provider';

/** Авторизация приложения — Logto. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <LogtoAuthProvider>{children}</LogtoAuthProvider>;
}
