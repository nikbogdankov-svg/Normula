import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  DishDistributionResponse,
  PortionsDayResponse,
  UpdatePortionHeadcountRequest,
} from './types';

const KEY = 'portions';

export function usePortionsDay(date: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'day', date],
    queryFn: () =>
      api.request<PortionsDayResponse>(`/v1/portions?date=${encodeURIComponent(date)}`),
    enabled: api.organizationId !== null && date.length > 0,
  });
}

export function useDishDistribution(date: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'dishes', date],
    queryFn: () =>
      api.request<DishDistributionResponse>(`/v1/portions/dishes?date=${encodeURIComponent(date)}`),
    enabled: api.organizationId !== null && date.length > 0,
  });
}

export function useUpdatePortionHeadcount() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdatePortionHeadcountRequest) =>
      api.request<PortionsDayResponse>('/v1/portions/headcount', {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [KEY, api.organizationId],
      });
    },
  });
}
