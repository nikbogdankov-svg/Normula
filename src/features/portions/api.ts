import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  GetRecipeResponse,
  ListRecipesResponse,
  Recipe,
  RecipeSummary,
} from '@/features/ttk/types';
import type {
  CopyPortionsDayRequest,
  DishDistributionResponse,
  PortionsDayResponse,
  UpdatePortionHeadcountRequest,
} from './types';

/** API раздела «Порционник». Данные организационные — токен по умолчанию. */

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

export function useDishDistribution(date: string, objectId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'dishes', date, objectId],
    queryFn: () => {
      let path = `/v1/portions/dishes?date=${encodeURIComponent(date)}`;
      if (objectId) {
        path += `&objectId=${encodeURIComponent(objectId)}`;
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
    onSuccess: (day) => {
      queryClient.setQueryData([KEY, api.organizationId, 'day', day.date], day);
      void queryClient.invalidateQueries({
        queryKey: [KEY, api.organizationId, 'dishes'],
      });
    },
  });
}

/** Копирует численность дня `from` в день `to`; ответ — день `to`. */
export function useCopyPortionsDay() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CopyPortionsDayRequest) =>
      api.request<PortionsDayResponse>('/v1/portions/copy', { method: 'POST', body }),
    onSuccess: (day) => {
      queryClient.setQueryData([KEY, api.organizationId, 'day', day.date], day);
      void queryClient.invalidateQueries({
        queryKey: [KEY, api.organizationId, 'dishes'],
      });
    },
  });
}

/**
 * Карты ТТК по именам блюд раздачи — для наклеек на термос. Сначала грузится
 * список карт, затем полная карта по каждому найденному имени. Потеряли имя
 * (карты нет) — блюдо в выдаче отсутствует, наклейка печатается без состава.
 *
 * Data берётся из мок-двойника /v1/mock/ttk: раздача по блюдам ещё на моках,
 * её блюда завязаны на мок-карты, поэтому настоящий /v1/ttk с ними не
 * совпадёт. Двойник удаляется вместе с моками раздачи.
 */
export function useStickerRecipes(dishNames: string[]): {
  summaries: RecipeSummary[] | undefined;
  recipes: ReadonlyMap<string, Recipe> | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} {
  const api = useApi();
  const names = useMemo(
    () => [...new Set(dishNames.map((name) => name.trim().toLowerCase()))].filter(Boolean).sort(),
    [dishNames]
  );

  const list = useQuery({
    queryKey: [KEY, api.organizationId, 'ttk-list'],
    queryFn: () => api.request<ListRecipesResponse>('/v1/mock/ttk'),
    enabled: api.organizationId !== null && names.length > 0,
  });

  const summaries = list.data?.recipes;

  const matched = useMemo(() => {
    const byName = new Map<string, RecipeSummary>();
    for (const summary of summaries ?? []) {
      const key = summary.name.trim().toLowerCase();
      if (names.includes(key) && !byName.has(key)) byName.set(key, summary);
    }
    return byName;
  }, [summaries, names]);

  const ids = useMemo(() => [...matched.values()].map((summary) => summary.id), [matched]);

  const full = useQuery({
    queryKey: [KEY, api.organizationId, 'ttk-full', ids],
    queryFn: async () => {
      const recipes = new Map<string, Recipe>();
      for (const id of ids) {
        const { recipe } = await api.request<GetRecipeResponse>(`/v1/mock/ttk/${id}`);
        recipes.set(recipe.name.trim().toLowerCase(), recipe);
      }
      return recipes;
    },
    enabled: api.organizationId !== null && ids.length > 0,
  });

  return {
    summaries,
    recipes: full.data,
    // full не запускается, когда ни одна карта не сматчилась — это не загрузка,
    // а отсутствие карт: наклейки печатаются без состава.
    isPending: (names.length > 0 && list.isPending) || (ids.length > 0 && full.isPending),
    isError: list.isError || full.isError,
    error:
      list.error instanceof Error ? list.error : full.error instanceof Error ? full.error : null,
  };
}

function upsertEntry(
  day: PortionsDayResponse,
  body: UpdatePortionHeadcountRequest
): PortionsDayResponse {
  const rest = (day.entries ?? []).filter(
    (entry) =>
      entry.objectId !== body.objectId ||
      entry.groupId !== body.groupId ||
      entry.dietId !== body.dietId
  );
  return {
    ...day,
    entries: [
      ...rest,
      {
        objectId: body.objectId,
        groupId: body.groupId,
        dietId: body.dietId,
        headcount: body.headcount,
      },
    ],
  };
}
