import { useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { useOrganizations } from '@/shared/auth/org-context';
import { ApiError, apiFetch, type RequestOptions } from './client';

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
 * Сброс токенов, общий на весь модуль.
 *
 * Страница на загрузке шлёт несколько запросов разом, и при протухшем токене
 * все они получат 401 одновременно. Без общего промиса каждый начал бы свой
 * сброс и затирал бы токен, который только что взял соседний, — вплоть до
 * бесконечной карусели обновлений.
 */
let refreshing: Promise<void> | null = null;

function refreshOnce(reset: () => Promise<void>): Promise<void> {
  refreshing ??= reset().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

/**
 * Авторизованный API-клиент для хуков фич. Сам берёт нужный токен —
 * фиче достаточно написать: const api = useApi(); api.request('/v1/items').
 */
export function useApi() {
  const { getApiToken, getOrganizationToken, resetTokens } = useAuth();
  const { current } = useOrganizations();

  const request = useCallback(
    async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
      const { tokenKind = 'organization', ...rest } = options;

      const token = async (): Promise<string> => {
        if (tokenKind !== 'organization') {
          return getApiToken();
        }

        if (!current) {
          throw new Error('Нет выбранной организации: запрос с tokenKind=organization невозможен');
        }

        return getOrganizationToken(current.id);
      };

      try {
        return await apiFetch<T>(path, { ...rest, token: await token() });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        // 401 бывает двух видов, и лечатся они одинаково: токен протух сам
        // либо бэкенд поменял роль вошедшего, и выданный токен несёт прежние
        // скоупы. Берём свежий и повторяем ровно один раз — второй 401
        // подряд уходит наверх ошибкой, иначе получился бы цикл.
        await refreshOnce(resetTokens);

        return apiFetch<T>(path, { ...rest, token: await token() });
      }
    },
    [current, getApiToken, getOrganizationToken, resetTokens]
  );

  return useMemo(() => ({ request, organizationId: current?.id ?? null }), [request, current]);
}
