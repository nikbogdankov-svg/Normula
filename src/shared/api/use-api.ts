import { useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { useOrganizations } from '@/shared/auth/org-context';
import { apiFetch, type RequestOptions } from './client';

type ApiRequestOptions = Omit<RequestOptions, 'token'> & {
  /**
   * Какой токен подставить:
   *  - 'organization' (дефолт) — организационный токен текущей организации;
   *    бэкенд по нему видит organization_id и организационные скоупы;
   *  - 'api' — обычный access token API-ресурса (для эндпоинтов вне
   *    организационного контекста: профиль, создание организации).
   */
  tokenKind?: 'organization' | 'api';
};

/**
 * Авторизованный API-клиент для хуков фич. Сам берёт нужный токен —
 * фиче достаточно написать: const api = useApi(); api.request('/v1/items').
 */
export function useApi() {
  const { getApiToken, getOrganizationToken } = useAuth();
  const { current } = useOrganizations();

  const request = useCallback(
    async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
      const { tokenKind = 'organization', ...rest } = options;

      let token: string;
      if (tokenKind === 'organization') {
        if (!current) {
          throw new Error('Нет выбранной организации: запрос с tokenKind=organization невозможен');
        }
        token = await getOrganizationToken(current.id);
      } else {
        token = await getApiToken();
      }

      return apiFetch<T>(path, { ...rest, token });
    },
    [current, getApiToken, getOrganizationToken]
  );

  return useMemo(() => ({ request, organizationId: current?.id ?? null }), [request, current]);
}
