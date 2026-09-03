import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { CreateDietRequest, Diet, ListDietsResponse, UpdateDietRequest } from './types';

/** API раздела «Диеты». Данные организационные — токен по умолчанию. */

const KEY = 'diets';

export function useDiets() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListDietsResponse>('/v1/diets'),
    enabled: api.organizationId !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateDiet() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: CreateDietRequest) =>
      api.request<{ diet: Diet }>('/v1/diets', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateDiet() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDietRequest }) =>
      api.request<{ diet: Diet }>(`/v1/diets/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}

/** Как удалять диету: 'soft' — скрыть из справочника, 'immediate' — убрать совсем. */
export type DietDeleteMode = 'soft' | 'immediate';

export function useDeleteDiet() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: DietDeleteMode }) =>
      api.request<void>(`/v1/diets/${id}?mode=${mode}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
