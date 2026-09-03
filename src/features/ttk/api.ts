import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export type RecipeSort = 'name' | 'price';

export function useRecipes(params: {
  search: string;
  collectionId: string;
  sort: RecipeSort;
  ascending?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const api = useApi();
  const ascending = params.ascending ?? true;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;

  return useQuery({
    queryKey: [KEY, api.organizationId, { ...params, ascending }],
    queryFn: () => {
      const query = new URLSearchParams({
        search: params.search,
        collectionId: params.collectionId,
        sort: params.sort,
        order: ascending ? 'asc' : 'desc',
        page: String(page),
        pageSize: String(pageSize),
      });

      return api.request<ListRecipesResponse>(`/v1/ttk?${query.toString()}`);
    },
    enabled: api.organizationId !== null,
  });
}

export function useInfiniteRecipes(params: {
  search: string;
  collectionId: string;
  sort: RecipeSort;
  ascending?: boolean;
  pageSize?: number;
}) {
  const api = useApi();
  const ascending = params.ascending ?? true;
  const pageSize = params.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: [KEY, api.organizationId, { ...params, ascending }],
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({
        search: params.search,
        collectionId: params.collectionId,
        sort: params.sort,
        order: ascending ? 'asc' : 'desc',
        page: String(pageParam),
        pageSize: String(pageSize),
      });

      return api.request<ListRecipesResponse>(`/v1/ttk?${query.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const maxPage = Math.max(1, Math.ceil(lastPage.total / lastPage.pageSize));
      return lastPage.page < maxPage ? lastPage.page + 1 : undefined;
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
