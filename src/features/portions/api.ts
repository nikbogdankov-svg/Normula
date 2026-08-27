import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  DishDistributionResponse,
  PortionsDayResponse,
  UpdatePortionHeadcountRequest,
} from './types';

const KEY = 'portions';

export function usePortionsDay(date: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'day', date],
    queryFn: () =>
      api.request<PortionsDayResponse>(`/v1/portions?date=${encodeURIComponent(date)}`),
    enabled: api.organizationId !== null && date.length > 0,
  });
}

export function useDishDistribution(date: string, kitchenId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'dishes', date, kitchenId],
    queryFn: () => {
      let path = `/v1/portions/dishes?date=${encodeURIComponent(date)}`;
      if (kitchenId) {
        path += `&kitchenId=${encodeURIComponent(kitchenId)}`;
      }
      return api.request<DishDistributionResponse>(path);
    },
    enabled: api.organizationId !== null && date.length > 0,
  });
}

export function useUpdatePortionHeadcount() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdatePortionHeadcountRequest) =>
      api.request<PortionsDayResponse>('/v1/portions/headcount', {
        method: 'PATCH',
        body,
      }),
    onMutate: async (body) => {
      const key = [KEY, api.organizationId, 'day', body.date] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PortionsDayResponse>(key);
      queryClient.setQueryData<PortionsDayResponse>(key, (old) =>
        old ? upsertEntry(old, body) : old
      );
      return { previous, key };
    },
    onError: (_error, _body, context) => {
      if (context) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [KEY, api.organizationId],
      });
    },
  });
}

function upsertEntry(
  day: PortionsDayResponse,
  body: UpdatePortionHeadcountRequest
): PortionsDayResponse {
  const rest = day.entries.filter(
    (entry) =>
      entry.facilityId !== body.facilityId ||
      entry.departmentId !== body.departmentId ||
      entry.tableId !== body.tableId
  );
  return {
    ...day,
    entries: [
      ...rest,
      {
        facilityId: body.facilityId,
        departmentId: body.departmentId,
        tableId: body.tableId,
        headcount: body.headcount,
      },
    ],
  };
}
