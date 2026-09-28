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
 * Весь справочник продуктов организации одним запросом.
 *
 * Бэкенд отдаёт его целиком, без страниц и поиска: ищут по нему на клиенте —
 * раздел «Продукты» и автокомплиты в ТТК и складе (см. filterProducts).
 * Один ключ запроса на всех, поэтому справочник грузится один раз.
 */
export function useProducts() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListProductsResponse>('/v1/products'),
    enabled: api.organizationId !== null,
  });
}

/** Продукты, в названии которых есть query (без учёта регистра и пробелов по краям). */
export function filterProducts(products: Product[], query: string): Product[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return products;

  return products.filter((product) => product.name.toLowerCase().includes(needle));
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
