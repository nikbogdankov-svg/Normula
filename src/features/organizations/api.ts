import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  Invitation,
  ListInvitationsResponse,
  ListMembersResponse,
  ListOrganizationsResponse,
  ListRolesResponse,
  Organization,
  OrganizationFeaturesUpdate,
  UpdateOrganizationFeaturesRequest,
} from './types';

/**
 * API администрирования организаций.
 *
 * Токен — организационный (дефолт useApi): бэкенд требует членства в
 * служебной организации платформы со скоупом manage:platform. Поэтому
 * organizationId входит в каждый queryKey: сменил организацию в шапке —
 * получил другой ответ, вплоть до отказа в доступе.
 */

const KEY = 'admin-organizations';

export function useOrganizationList() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, api.organizationId],
    queryFn: () => api.request<ListOrganizationsResponse>('/v1/admin/organizations'),
    enabled: api.organizationId !== null,
  });
}

export function useOrganizationRoles() {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'roles', api.organizationId],
    queryFn: () => api.request<ListRolesResponse>('/v1/admin/organization-roles'),
    enabled: api.organizationId !== null,
  });
}

export function useOrganizationMembers(organizationId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'members', organizationId, api.organizationId],
    queryFn: () =>
      api.request<ListMembersResponse>(`/v1/admin/organizations/${organizationId}/members`),
    enabled: api.organizationId !== null && organizationId !== null,
  });
}

export function useOrganizationInvitations(organizationId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'invitations', organizationId, api.organizationId],
    queryFn: () =>
      api.request<ListInvitationsResponse>(`/v1/admin/organizations/${organizationId}/invitations`),
    enabled: api.organizationId !== null && organizationId !== null,
  });
}

/** Инвалидация всего дерева админки после любой мутации. */
function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useCreateOrganization() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: CreateOrganizationRequest) =>
      api.request<CreateOrganizationResponse>('/v1/admin/organizations', {
        method: 'POST',
        body,
      }),
    onSuccess: invalidate,
  });
}

export function useSetOrganizationDisabled() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ organizationId, disabled }: { organizationId: string; disabled: boolean }) =>
      api.request<{ organization: Organization }>(
        `/v1/admin/organizations/${organizationId}/disabled`,
        { method: 'PATCH', body: { disabled } }
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteOrganization() {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (organizationId: string) =>
      api.request<Record<string, never>>(`/v1/admin/organizations/${organizationId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}

export function useInviteMember(organizationId: string) {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: { email: string; roleIds: string[] }) =>
      api.request<{ invitation: Invitation }>(
        `/v1/admin/organizations/${organizationId}/invitations`,
        { method: 'POST', body }
      ),
    onSuccess: invalidate,
  });
}

export function useRevokeInvitation(organizationId: string) {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (invitationId: string) =>
      api.request<{ invitation: Invitation }>(
        `/v1/admin/organizations/${organizationId}/invitations/${invitationId}`,
        { method: 'DELETE' }
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(organizationId: string) {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (userId: string) =>
      api.request<Record<string, never>>(
        `/v1/admin/organizations/${organizationId}/members/${userId}`,
        { method: 'DELETE' }
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateOrganizationFeatures(organizationId: string) {
  const api = useApi();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (body: OrganizationFeaturesUpdate) =>
      api.request<{ organization: Organization }>(
        `/v1/admin/organizations/${organizationId}/features`,
        { method: 'PATCH', body }
      ),
    onSuccess: invalidate,
  });
}
