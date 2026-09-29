import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CateringObjectsResponse,
  CreateObjectRequest,
  ListObjectsResponse,
  UpdateObjectRequest,
} from './types';

const KEY = 'objects';

/** Объекты и подобъекты организации одним списком — раздел «Объекты». */
export function useObjects() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListObjectsResponse>('/v1/objects'),
    enabled: api.organizationId !== null,
  });
}

/**
 * Мок-объекты для разделов, которые ещё на моках (меню, порционник, склад,
 * раскладка продуктов): их мок-данные завязаны на мок-объекты. Удаляется
 * вместе с их моками — тогда они переходят на useObjects.
 */
export function useMockCateringObjects() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'mock'],
    queryFn: () => api.request<CateringObjectsResponse>('/v1/mock/objects'),
    enabled: api.organizationId !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

/** Создаёт объект, а с parentObjectId — подобъект. */
export function useCreateObject() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: CreateObjectRequest) =>
      api.request<{ id: string }>('/v1/objects', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Меняет название, тип и группы объекта или подобъекта. */
export function useUpdateObject() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateObjectRequest }) =>
      api.request<void>(`/v1/objects/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}

/**
 * Как удалять объект/подобъект: 'soft' — по конец периода, 'immediate' — сразу.
 * Бэкенд принимает режим, но пока не различает.
 */
export type ObjectDeleteMode = 'soft' | 'immediate';

/** Удаляет объект (вместе с подобъектами) или подобъект. */
export function useDeleteObject() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: ObjectDeleteMode }) =>
      api.request<void>(`/v1/objects/${id}?mode=${mode}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
