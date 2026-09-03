import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CreateProductRequest,
  ListProductCategoriesResponse,
  ListProductsResponse,
  Product,
  UpdateProductRequest,
} from './types';

/** API раздела «Продукты». Данные организационные — токен по умолчанию. */

const KEY = 'products';

export type ProductSort = 'name' | 'kcal' | 'protein' | 'fat' | 'carbs';

export function useProducts(params: {
  search: string;
  categoryId: string;
  sort: ProductSort;
  ascending?: boolean;
  pageSize?: number;
}) {
  const api = useApi();
  const ascending = params.ascending ?? true;
  const pageSize = params.pageSize ?? 20;

  return useQuery({
    queryKey: [KEY, api.organizationId, { ...params, ascending }],
    queryFn: () => {
      const query = new URLSearchParams({
        search: params.search,
        categoryId: params.categoryId,
        sort: params.sort,
        order: ascending ? 'asc' : 'desc',
        pageSize: String(pageSize),
      });

      return api.request<ListProductsResponse>(`/v1/products?${query.toString()}`);
    },
    enabled: api.organizationId !== null,
  });
}

export function useProductCategories() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'categories', api.organizationId],
    queryFn: () => api.request<ListProductCategoriesResponse>('/v1/product-categories'),
    enabled: api.organizationId !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateProduct() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: CreateProductRequest) =>
      api.request<{ product: Product }>('/v1/products', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductRequest }) =>
      api.request<{ product: Product }>(`/v1/products/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}

/** Как удалять продукт: 'soft' — остаётся в меню и других разделах до конца
 *  недели, 'immediate' — убирается из всех разделов сейчас. */
export type ProductDeleteMode = 'soft' | 'immediate';

export function useDeleteProduct() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: ProductDeleteMode }) =>
      api.request<void>(`/v1/products/${id}?mode=${mode}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
