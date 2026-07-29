import { AuthCallback } from '@/shared/auth';

/** Завершение OIDC-редиректа из Logto. Логика — в shared/auth/callback.tsx. */
export function CallbackRoute() {
  return <AuthCallback />;
}
