import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CateringObject,
  CateringObjectsResponse,
  DistributionPreviewResponse,
  UpdateObjectMenuRequest,
  UpdateSubObjectRequest,
  UpdateTableHeadcountRequest,
} from './types';

const KEY = 'objects';

export function useCateringObjects() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'objects'],
    queryFn: () => api.request<CateringObjectsResponse>('/v1/objects'),
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
      api.request<CateringObjectsResponse>('/v1/objects/tables/headcount', {
        method: 'PATCH',
        body,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateSubObject() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateSubObjectRequest }) =>
      api.request<CateringObjectsResponse>(`/v1/objects/sub-objects/${id}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: invalidate,
  });
}

export function useCreateObject() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (name: string) =>
      api.request<{ object: CateringObject }>('/v1/objects', {
        method: 'POST',
        body: { name },
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateObjectMenu() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: UpdateObjectMenuRequest) =>
      api.request<CateringObjectsResponse>('/v1/objects/menu', {
        method: 'PATCH',
        body,
      }),
    onSuccess: invalidate,
  });
}
