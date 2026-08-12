import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { CreateReceiptRequest, GetReceiptsResponse, WarehouseReceipt } from './types';

const KEY = 'warehouse-receipts';

export function useReceipts(warehouseId: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, warehouseId],
    queryFn: () =>
      api.request<GetReceiptsResponse>(
        `/v1/warehouse-receipts?warehouseId=${encodeURIComponent(warehouseId)}`
      ),
    enabled: api.organizationId !== null && !!warehouseId,
  });
}

export function useCreateReceipt() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReceiptRequest) =>
      api.request<WarehouseReceipt>('/v1/warehouse-receipts', {
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
