import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CreateMenuRequest,
  CycleMenu,
  ListMenusResponse,
  UpdateMenuRequest,
  UpdateMenuSlotRequest,
} from './types';

const KEY = 'menu';

export function useMenus() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListMenusResponse>('/v1/menus'),
    enabled: api.organizationId !== null,
  });
}

export function useMenu(menuId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, menuId],
    queryFn: () => api.request<{ menu: CycleMenu }>(`/v1/menus/${menuId}`),
    enabled: api.organizationId !== null && menuId !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateMenu() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: CreateMenuRequest) =>
      api.request<{ menu: CycleMenu }>('/v1/menus', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateMenu(menuId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateMenuRequest) =>
      api.request<{ menu: CycleMenu }>(`/v1/menus/${menuId}`, { method: 'PATCH', body }),
    onMutate: async (body) => {
      const detailKey = [KEY, api.organizationId, menuId] as const;
      const listKey = [KEY, api.organizationId] as const;
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<{ menu: CycleMenu }>(detailKey);
      const previousList = queryClient.getQueryData<ListMenusResponse>(listKey);

      if (previousDetail) {
        queryClient.setQueryData(detailKey, {
          menu: { ...previousDetail.menu, ...body },
        });
      }

      if (previousList) {
        queryClient.setQueryData(listKey, {
          ...previousList,
          menus: previousList.menus.map((menu) =>
            menu.id === menuId ? { ...menu, ...body } : menu
          ),
        });
      }

      return { previousDetail, previousList, detailKey, listKey };
    },
    onError: (_error, _body, context) => {
      if (!context) return;
      if (context.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      if (context.previousList) {
        queryClient.setQueryData(context.listKey, context.previousList);
      }
    },
    onSuccess: (result) => {
      const detailKey = [KEY, api.organizationId, menuId] as const;
      const listKey = [KEY, api.organizationId] as const;
      queryClient.setQueryData(detailKey, result);
      const list = queryClient.getQueryData<ListMenusResponse>(listKey);
      if (list) {
        queryClient.setQueryData(listKey, {
          ...list,
          menus: list.menus.map((menu) => (menu.id === menuId ? result.menu : menu)),
        });
      }
    },
  });
}

export function useUpdateMenuSlot(menuId: string) {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: UpdateMenuSlotRequest) =>
      api.request<{ menu: CycleMenu }>(`/v1/menus/${menuId}/slots`, {
        method: 'PUT',
        body,
      }),
    onSuccess: invalidate,
  });
}
