import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import { useOrganizations } from '@/shared/auth';
import type { CreateObjectRequest, ListObjectsResponse, UpdateObjectRequest } from './types';

const KEY = 'objects';

/** Объекты и подобъекты организации одним списком — раздел «Объекты». */
export function useObjects() {
  const api = useApi();
  const { organizationFeatures } = useOrganizations();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListObjectsResponse>('/v1/objects'),
    select: (data) => {
      if (organizationFeatures?.objectsEnabled !== false) return data;

      const firstObject = data.objects.find((object) => !object.parentObjectId);
      if (!firstObject) return data;

      return {
        ...data,
        objects: data.objects.filter(
          (object) => object.id === firstObject.id || object.parentObjectId === firstObject.id
        ),
      };
    },
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
