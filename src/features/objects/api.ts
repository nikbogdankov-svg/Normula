import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  DistributionPreviewResponse,
  KitchenResponse,
  UpdateTableHeadcountRequest,
} from './types';

const KEY = 'objects';

export function useKitchen() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'kitchen'],
    queryFn: () => api.request<KitchenResponse>('/v1/objects/kitchen'),
    enabled: api.organizationId !== null,
  });
}

export function useDistributionPreview() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'distribution'],
    queryFn: () => api.request<DistributionPreviewResponse>('/v1/objects/distribution'),
    enabled: api.organizationId !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useUpdateTableHeadcount() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: UpdateTableHeadcountRequest) =>
      api.request<KitchenResponse>('/v1/objects/tables/headcount', {
        method: 'PATCH',
        body,
      }),
    onSuccess: invalidate,
  });
}
