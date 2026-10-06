import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import {
  PAGE_SIZE,
  type GetReceiptResponse,
  type GetTransferResponse,
  type GetWriteOffResponse,
  type ListOpenBatchesResponse,
  type ListParams,
  type ListReceiptsResponse,
  type ListTransfersResponse,
  type ListWriteOffsResponse,
  type ReceiptRequest,
  type TransferRequest,
  type WriteOffRequest,
} from './types';

/**
 * API склада. Данные организационные — токен по умолчанию.
 *
 * Один ключ на весь склад: любое изменение накладной или списания меняет
 * остатки, поэтому после мутаций сбрасывается всё разом.
 */
const KEY = 'warehouse';

function listQuery(path: string, params: ListParams, cursor: string): string {
  const query = new URLSearchParams({ objectId: params.objectId, pageSize: String(PAGE_SIZE) });
  if (params.search) query.set('search', params.search);
  if (cursor) query.set('cursor', cursor);

  return `${path}?${query.toString()}`;
}

/** Страницы накладных объекта: свежие сверху, следующая — по курсору. */
export function useReceipts(params: ListParams) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: [KEY, api.organizationId, 'receipts', params.objectId, params.search],
    queryFn: ({ pageParam }) =>
      api.request<ListReceiptsResponse>(listQuery('/v1/warehouse/receipts', params, pageParam)),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: api.organizationId !== null && params.objectId !== '',
  });
}

/** Накладная целиком, со строками. */
export function useReceipt(id: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'receipt', id],
    queryFn: () => api.request<GetReceiptResponse>(`/v1/warehouse/receipts/${id}`),
    enabled: api.organizationId !== null && id !== null,
  });
}

/** Страницы списаний объекта: свежие сверху, следующая — по курсору. */
export function useWriteOffs(params: ListParams) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: [KEY, api.organizationId, 'write-offs', params.objectId, params.search],
    queryFn: ({ pageParam }) =>
      api.request<ListWriteOffsResponse>(listQuery('/v1/warehouse/write-offs', params, pageParam)),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: api.organizationId !== null && params.objectId !== '',
  });
}

/** Списание целиком, со строками. */
export function useWriteOff(id: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'write-off', id],
    queryFn: () => api.request<GetWriteOffResponse>(`/v1/warehouse/write-offs/${id}`),
    enabled: api.organizationId !== null && id !== null,
  });
}

/** Страницы перемещений: всё, что между складами организации. */
export function useTransfers(search: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: [KEY, api.organizationId, 'transfers', search],
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
      if (search) query.set('search', search);
      if (pageParam) query.set('cursor', pageParam);

      return api.request<ListTransfersResponse>(`/v1/warehouse/transfers?${query.toString()}`);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: api.organizationId !== null,
  });
}

/** Перемещение целиком, со строками. */
export function useTransfer(id: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'transfer', id],
    queryFn: () => api.request<GetTransferResponse>(`/v1/warehouse/transfers/${id}`),
    enabled: api.organizationId !== null && id !== null,
  });
}

/** Партии объекта с ненулевым остатком. */
export function useOpenBatches(objectId: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'batches', objectId],
    queryFn: () =>
      api.request<ListOpenBatchesResponse>(
        `/v1/warehouse/batches?objectId=${encodeURIComponent(objectId)}`
      ),
    enabled: api.organizationId !== null && objectId !== '',
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateReceipt() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: ReceiptRequest) =>
      api.request<{ id: string }>('/v1/warehouse/receipts', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateReceipt() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReceiptRequest }) =>
      api.request<void>(`/v1/warehouse/receipts/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}

export function useCreateWriteOff() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: WriteOffRequest) =>
      api.request<{ id: string }>('/v1/warehouse/write-offs', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateWriteOff() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: WriteOffRequest }) =>
      api.request<void>(`/v1/warehouse/write-offs/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}

export function useCreateTransfer() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: TransferRequest) =>
      api.request<{ id: string }>('/v1/warehouse/transfers', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateTransfer() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransferRequest }) =>
      api.request<void>(`/v1/warehouse/transfers/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });
}
