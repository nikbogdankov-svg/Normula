/**
 * Контракт бэкенда: orgadmin.v1.OrganizationAdminService
 * (onemore-admin/api/orgadmin/v1/orgadmin.proto), HTTP-биндинги /v1/admin/*.
 *
 * Имена полей — как их отдаёт grpc-gateway (lowerCamelCase), enum'ы —
 * строками с полным именем значения.
 */

export type InvitationStatus =
  | 'INVITATION_STATUS_UNSPECIFIED'
  | 'INVITATION_STATUS_PENDING'
  | 'INVITATION_STATUS_ACCEPTED'
  | 'INVITATION_STATUS_EXPIRED'
  | 'INVITATION_STATUS_REVOKED';

export interface OrganizationScope {
  id: string;
  name: string;
  description: string;
}

export interface OrganizationRole {
  id: string;
  name: string;
  description: string;
  scopes: OrganizationScope[];
}

export interface OrganizationFeatures {
  warehouseEnabled: boolean;
  financeEnabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  /** grpc-gateway отдаёт int32 числом. */
  memberCount: number;
  disabled: boolean;
  features?: OrganizationFeatures;
  /** epoch в миллисекундах; int64 приходит строкой. */
  createdAt: string;
}

export interface OrganizationMember {
  userId: string;
  primaryEmail: string;
  name: string;
  suspended: boolean;
  roles: OrganizationRole[];
}

export interface Invitation {
  id: string;
  invitee: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  roles: OrganizationRole[];
}

export interface ListOrganizationsResponse {
  organizations: Organization[];
  total: number;
}

export interface CreateOrganizationRequest {
  name: string;
  /** Имя и фамилия первого администратора — сохраняются в его карточке. */
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminRoleIds?: string[];
}

export interface CreateOrganizationResponse {
  organization: Organization;
  invitation: Invitation;
}

export interface ListMembersResponse {
  members: OrganizationMember[];
  total: number;
}

export interface ListInvitationsResponse {
  invitations: Invitation[];
  total: number;
}

export interface ListRolesResponse {
  roles: OrganizationRole[];
  total: number;
}
