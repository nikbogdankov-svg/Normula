import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { ProductSpreadResponse } from './types';

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
