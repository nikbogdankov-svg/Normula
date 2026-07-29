import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { HelloResponse } from './types';

/**
 * API-слой фичи: query-хуки поверх useApi. Так же устроена любая другая фича.
 *
 * tokenKind='api': /hello живёт вне организационного контекста (в хендлере
 * бэка нет RequireOrganization), поэтому нужен обычный access token
 * API-ресурса. По той же причине organizationId не входит в queryKey —
 * ответ от организации не зависит. Для организационных эндпоинтов всё
 * наоборот: tokenKind по умолчанию + organizationId в ключе.
 */
export function useHello(name: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['hello', name],
    queryFn: () =>
      api.request<HelloResponse>(`/hello?name=${encodeURIComponent(name)}`, { tokenKind: 'api' }),
  });
}
