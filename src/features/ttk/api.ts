import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  GetRecipeResponse,
  ListMockRecipesResponse,
  ListRecipesResponse,
  RecipeRequest,
} from './types';

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

/*
 * Мок-двойник карт для разделов, которые ещё на моках (меню, порционник):
 * их мок-данные завязаны на мок-карты. Удаляется вместе с их моками — тогда
 * они переходят на useRecipes.
 */

export type MockRecipeSort = 'name' | 'price';

interface MockRecipesParams {
  search: string;
  collectionId: string;
  sort: MockRecipeSort;
  ascending?: boolean;
  pageSize?: number;
}

function mockQuery(params: MockRecipesParams, page: number): string {
  const query = new URLSearchParams({
    search: params.search,
    collectionId: params.collectionId,
    sort: params.sort,
    order: (params.ascending ?? true) ? 'asc' : 'desc',
    page: String(page),
    pageSize: String(params.pageSize ?? 10),
  });

  return `/v1/mock/ttk?${query.toString()}`;
}

export function useMockRecipes(params: MockRecipesParams) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'mock', params],
    queryFn: () => api.request<ListMockRecipesResponse>(mockQuery(params, 1)),
    enabled: api.organizationId !== null,
  });
}

export function useInfiniteMockRecipes(params: MockRecipesParams) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: [KEY, api.organizationId, 'mock-pages', params],
    queryFn: ({ pageParam }) => api.request<ListMockRecipesResponse>(mockQuery(params, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const maxPage = Math.max(1, Math.ceil(lastPage.total / lastPage.pageSize));
      return lastPage.page < maxPage ? lastPage.page + 1 : undefined;
    },
    enabled: api.organizationId !== null,
  });
}
