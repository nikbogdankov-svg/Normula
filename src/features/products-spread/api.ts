import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { ConfirmProductSpreadRequest, ProductSpreadResponse } from './types';

const KEY = 'products-spread';

/** Раскладка продуктов на дату (по объекту или по всей организации при null). */
export function useProductSpread(date: string, objectId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, date, objectId],
    queryFn: () => {
      let path = `/v1/products-spread?date=${encodeURIComponent(date)}`;
      if (objectId) {
        path += `&objectId=${encodeURIComponent(objectId)}`;
      }
      return api.request<ProductSpreadResponse>(path);
    },
    enabled: api.organizationId !== null && date.length > 0,
  });
}

/**
 * Подтверждение раскладки: автосписания со склада и счета. После него
 * меняются раскладка (флаг подтверждения), склад и счета.
 */
export function useConfirmProductSpread() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ConfirmProductSpreadRequest) =>
      api.request<void>('/v1/products-spread/confirm', { method: 'POST', body }),
    onSuccess: () => {
      for (const key of [KEY, 'warehouse', 'accounts']) {
        void queryClient.invalidateQueries({ queryKey: [key, api.organizationId] });
      }
    },
  });
}
