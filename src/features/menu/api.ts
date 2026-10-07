import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  AllowViolationRequest,
  CreateMenuRequest,
  CreateMenuResponse,
  FillScheduleRequest,
  GetScheduleResponse,
  ListMenusResponse,
  ScheduleDay,
  ScheduleParams,
  UpdateSlotRequest,
  UpdateSlotResponse,
} from './types';

/** API раздела «Меню». Данные организационные — токен по умолчанию. */

const KEY = 'menu';

/**
 * Расписание за отрезок дат. Пока грузится следующий отрезок, в данных
 * остаётся предыдущий (isPlaceholderData) — страница по этому флагу
 * показывает загрузку, не теряя сетку.
 */
export function useSchedule(params: ScheduleParams | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'schedule', params],
    queryFn: () => {
      const query = new URLSearchParams({
        objectId: params?.objectId ?? '',
        dietId: params?.dietId ?? '',
        from: params?.from ?? '',
        to: params?.to ?? '',
      });

      return api.request<GetScheduleResponse>(`/v1/menu-schedule?${query.toString()}`);
    },
    enabled: api.organizationId !== null && params !== null,
    placeholderData: keepPreviousData,
  });
}

function useInvalidateSchedule() {
  const api = useApi();
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY, api.organizationId, 'schedule'] });
}

/** Подменяет день во всех закэшированных отрезках, куда он попадает. */
function useReplaceDay() {
  const api = useApi();
  const queryClient = useQueryClient();

  return (day: ScheduleDay) =>
    queryClient.setQueriesData<GetScheduleResponse>(
      { queryKey: [KEY, api.organizationId, 'schedule'] },
      (old) =>
        old && { ...old, days: old.days.map((item) => (item.date === day.date ? day : item)) }
    );
}

/** Замена блюд одного приёма пищи одной даты целиком. */
export function useUpdateSlot() {
  const api = useApi();
  const replaceDay = useReplaceDay();
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: (body: UpdateSlotRequest) =>
      api.request<UpdateSlotResponse>('/v1/menu-schedule/slot', { method: 'PUT', body }),
    onSuccess: (result) => {
      replaceDay(result.day);

      return invalidate();
    },
  });
}

/** Разрешение нарушения нормы на день. */
export function useAllowViolation() {
  const api = useApi();
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: (body: AllowViolationRequest) =>
      api.request<Record<string, never>>('/v1/menu-schedule/allow', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Заполнение отрезка расписания сохранённым меню. */
export function useFillSchedule() {
  const api = useApi();
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: (body: FillScheduleRequest) =>
      api.request<Record<string, never>>('/v1/menu-schedule/fill', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Сохранённые меню организации, свежие сверху. */
export function useMenus() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, 'menus'],
    queryFn: () => api.request<ListMenusResponse>('/v1/menus'),
    enabled: api.organizationId !== null,
  });
}

/** Сохранение отрезка расписания как меню. */
export function useCreateMenu() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateMenuRequest) =>
      api.request<CreateMenuResponse>('/v1/menus', { method: 'POST', body }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [KEY, api.organizationId, 'menus'] }),
  });
}
