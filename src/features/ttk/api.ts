import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CreateRecipeRequest,
  ImportCollectionsRequest,
  ImportCollectionsResponse,
  ListCollectionsResponse,
  ListRecipesResponse,
  Recipe,
  UpdateRecipeRequest,
} from './types';

/** API раздела ТТК. Данные организационные — токен по умолчанию. */

const KEY = 'ttk';

export type RecipeSort = 'name' | 'price' | 'kcal';

export function useRecipes(params: { search: string; collectionId: string; sort: RecipeSort }) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, params],
    queryFn: () => {
      const query = new URLSearchParams({
        search: params.search,
        collectionId: params.collectionId,
        sort: params.sort,
      });

      return api.request<ListRecipesResponse>(`/v1/ttk?${query.toString()}`);
    },
    enabled: api.organizationId !== null,
  });
}

export function useCollections() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'collections', api.organizationId],
    queryFn: () => api.request<ListCollectionsResponse>('/v1/ttk-collections'),
    enabled: api.organizationId !== null,
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
    mutationFn: (body: CreateRecipeRequest) =>
      api.request<{ recipe: Recipe }>('/v1/ttk', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateRecipe() {
  const api = useApi();

  // Инвалидацию списка делает RecipeDialog после переключения в view —
  // иначе refetch в середине смены mode может закрыть drawer.
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRecipeRequest }) =>
      api.request<{ recipe: Recipe }>(`/v1/ttk/${id}`, { method: 'PATCH', body }),
  });
}

export function useImportCollections() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: ImportCollectionsRequest) =>
      api.request<ImportCollectionsResponse>('/v1/ttk-collections/import', {
        method: 'POST',
        body,
      }),
    onSuccess: invalidate,
  });
}
