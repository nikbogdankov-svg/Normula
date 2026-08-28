import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  DistributionPreviewResponse,
  KitchenResponse,
  KitchenUnit,
  UpdateFacilityRequest,
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
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] });
    queryClient.invalidateQueries({ queryKey: ['portions'] });
  };
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

export function useUpdateFacility() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateFacilityRequest }) =>
      api.request<KitchenResponse>(`/v1/objects/facilities/${id}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: invalidate,
  });
}

export function useCreateKitchen() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (name: string) =>
      api.request<{ kitchen: KitchenUnit }>('/v1/objects/kitchen', {
        method: 'POST',
        body: { name },
      }),
    onSuccess: invalidate,
  });
}
