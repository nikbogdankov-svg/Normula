import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CreateProductRequest,
  ListProductsResponse,
  Product,
  ProductDeleteMode,
  UpdateProductRequest,
} from './types';

/** API справочника продуктов (SKU). Данные организационные — токен по умолчанию. */

const KEY = 'products';

/**
 * Подбор продуктов по поисковому запросу. Без параметров возвращает весь
 * справочник — используется автокомплитами в ТТК и приходных склада.
 */
export function useProducts(params: { search?: string; pageSize?: number } = {}) {
  const api = useApi();
  const pageSize = params.pageSize ?? 100;

  return useQuery({
    queryKey: [KEY, api.organizationId, { search: params.search ?? '', pageSize }],
    queryFn: () => {
      const query = new URLSearchParams({
        search: params.search ?? '',
        pageSize: String(pageSize),
      });

      return api.request<ListProductsResponse>(`/v1/products?${query.toString()}`);
    },
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

export function useDeleteProduct() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: ProductDeleteMode }) =>
      api.request<void>(`/v1/products/${id}?mode=${mode}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
