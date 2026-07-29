import type { ReactNode } from 'react';
import { config } from '@/shared/config';
import { LogtoAuthProvider } from './logto-provider';
import { MockAuthProvider } from './mock-provider';

/** Выбирает реализацию авторизации по runtime-конфигу. */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (config.authMode === 'logto') {
    return <LogtoAuthProvider>{children}</LogtoAuthProvider>;
  }
  return <MockAuthProvider>{children}</MockAuthProvider>;
}
