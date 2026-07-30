import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  Employee,
  ListEmployeesResponse,
  ListStaffRolesResponse,
  ResetPasswordResponse,
} from './types';

/**
 * API раздела «Администрирование». Данные организационные, поэтому токен
 * организационный (дефолт useApi), а organizationId входит в queryKey.
 */

const KEY = 'staff';

export function useEmployees(search: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId, search],
    queryFn: () =>
      api.request<ListEmployeesResponse>(`/v1/staff?search=${encodeURIComponent(search)}`),
    enabled: api.organizationId !== null,
  });
}

export function useStaffRoles() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'roles', api.organizationId],
    queryFn: () => api.request<ListStaffRolesResponse>('/v1/staff-roles'),
    enabled: api.organizationId !== null,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateEmployee() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: CreateEmployeeRequest) =>
      api.request<CreateEmployeeResponse>('/v1/staff', { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateEmployeeRequest> }) =>
      api.request<{ employee: Employee }>(`/v1/staff/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: invalidate,
  });
}

export function useDeleteEmployee() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (id: string) =>
      api.request<Record<string, never>>(`/v1/staff/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useResetPassword() {
  const api = useApi();

  return useMutation({
    mutationFn: (id: string) =>
      api.request<ResetPasswordResponse>(`/v1/staff/${id}/reset-password`, { method: 'POST' }),
  });
}

export function useSetRoleSections() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ roleId, sectionIds }: { roleId: string; sectionIds: string[] }) =>
      api.request<{ roleId: string }>(`/v1/staff-roles/${roleId}/sections`, {
        method: 'PUT',
        body: { sectionIds },
      }),
    onSuccess: invalidate,
  });
}
