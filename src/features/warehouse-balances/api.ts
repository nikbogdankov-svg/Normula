import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { CreateBalanceRequest, GetBalancesResponse, WarehouseBalance } from './types';

const KEY = 'warehouse-balances';

export function useBalances(warehouseId: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, warehouseId],
    queryFn: () =>
      api.request<GetBalancesResponse>(
        `/v1/warehouse-balances?warehouseId=${encodeURIComponent(warehouseId)}`
      ),
    enabled: api.organizationId !== null && !!warehouseId,
  });
}

export function useCreateBalance() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBalanceRequest) =>
      api.request<WarehouseBalance>('/v1/warehouse-balances', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [KEY, api.organizationId],
      });
    },
  });
}
