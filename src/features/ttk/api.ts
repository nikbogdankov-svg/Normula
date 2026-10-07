import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type { GetRecipeResponse, ListRecipesResponse, RecipeRequest } from './types';

/** API раздела ТТК. Данные организационные — токен по умолчанию. */

const KEY = 'ttk';

/** Все карты организации кратко одним запросом; фильтры — на клиенте. */
export function useRecipes() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListRecipesResponse>('/v1/ttk'),
    enabled: api.organizationId !== null,
  });
}

/** Карта целиком, с ингредиентами и ценами. */
export function useRecipe(id: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'recipe', id],
    queryFn: () => api.request<GetRecipeResponse>(`/v1/ttk/${id}`),
    enabled: api.organizationId !== null && id !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateRecipe() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: RecipeRequest) =>
      api.request<{ id: string }>('/v1/ttk', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateRecipe() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RecipeRequest }) =>
      api.request<void>(`/v1/ttk/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}

/**
 * Как удалять карту: 'soft' — по конец периода, 'immediate' — сразу.
 * Бэкенд принимает режим, но пока не различает.
 */
export type RecipeDeleteMode = 'soft' | 'immediate';

export function useDeleteRecipe() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: RecipeDeleteMode }) =>
      api.request<void>(`/v1/ttk/${id}?mode=${mode}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
