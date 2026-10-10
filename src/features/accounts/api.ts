import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { ListAccountsResponse } from './types';

const KEY = 'accounts';

/** Все счета организации: фильтр по объекту и сортировка — на клиенте. */
export function useAccounts() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListAccountsResponse>('/v1/accounts'),
    enabled: api.organizationId !== null,
  });
}
