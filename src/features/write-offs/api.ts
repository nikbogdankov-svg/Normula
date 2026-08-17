import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { CreateWriteOffRequest, GetWriteOffsResponse, WriteOff, WriteOffType } from './types';

const KEY = 'write-offs';

export function useWriteOffs(warehouseId: string, type: WriteOffType) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, warehouseId, type],
    queryFn: () =>
      api.request<GetWriteOffsResponse>(
        `/v1/write-offs?warehouseId=${encodeURIComponent(warehouseId)}&type=${type}`
      ),
    enabled: api.organizationId !== null && !!warehouseId,
  });
}

export function useCreateWriteOff() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWriteOffRequest) =>
      api.request<WriteOff>('/v1/write-offs', {
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
