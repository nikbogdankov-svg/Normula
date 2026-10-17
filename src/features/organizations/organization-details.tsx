import { useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  Label,
  Select,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { EnvelopeOpen, PersonPlus, TrashBin, Xmark } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import {
  useInviteMember,
  useOrganizationInvitations,
  useOrganizationMembers,
  useOrganizationRoles,
  useRemoveMember,
  useRevokeInvitation,
} from './api';
import type { Invitation, InvitationStatus, Organization } from './types';
import { formatDate } from './management-route';

const STATUS_LABEL: Record<
  InvitationStatus,
  { key: string; theme: 'info' | 'success' | 'warning' | 'danger' | 'normal' }
> = {
  INVITATION_STATUS_UNSPECIFIED: { key: 'org.statusUnspecified', theme: 'normal' },
  INVITATION_STATUS_PENDING: { key: 'org.statusPending', theme: 'info' },
  INVITATION_STATUS_ACCEPTED: { key: 'org.statusAccepted', theme: 'success' },
  INVITATION_STATUS_EXPIRED: { key: 'org.statusExpired', theme: 'warning' },
  INVITATION_STATUS_REVOKED: { key: 'org.statusRevoked', theme: 'danger' },
};

/** Карточка выбранной организации: участники и приглашения. */
export function OrganizationDetails({
  organization,
  onClose,
}: {
  organization: Organization;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--g-color-line-generic)' }}
      >
        <Flex alignItems="center" gap={2}>
          <Text variant="subheader-2">{organization.name}</Text>
          <Text variant="body-1" color="secondary">
            {organization.id}
          </Text>
          {organization.disabled && <Label theme="warning">{t('org.disabledShort')}</Label>}
        </Flex>
        <Button view="flat" size="s" onClick={onClose} aria-label={t('common.close')}>
          <Icon data={Xmark} size={16} />
        </Button>
      </Flex>

      <div style={{ padding: 16 }}>
        <Flex direction="column" gap={5}>
          <MembersSection organizationId={organization.id} />
          <InvitationsSection organizationId={organization.id} />
        </Flex>
      </div>
    </Card>
  );
}

function MembersSection({ organizationId }: { organizationId: string }) {
  const { data, isPending, isError, error, refetch } = useOrganizationMembers(organizationId);
  const { t } = useTranslation();
  const remove = useRemoveMember(organizationId);
  const toaster = useToaster();

  const onRemove = (userId: string, email: string) => {
    if (!window.confirm(t('org.removeMemberConfirm', { email }))) return;

    remove.mutate(userId, {
      onError: (e) =>
        toaster.add({
          name: 'member-remove',
          title: t('common.error'),
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  return (
    <Flex direction="column" gap={2}>
      <Text variant="subheader-1">{t('org.membersTitle')}</Text>

      {isPending && <LoadingState />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && data.members.length === 0 && (
        <Text variant="body-1" color="secondary">
          {t('org.membersEmpty')}
        </Text>
      )}
      {data && data.members.length > 0 && (
        <Table
          data={data.members}
          columns={[
            { id: 'name', name: t('org.memberName'), template: (row) => row.name || '—' },
            { id: 'primaryEmail', name: t('common.email') },
            {
              id: 'roles',
              name: t('org.colRoles'),
              template: (row) => (
                <Flex gap={1} wrap>
                  {row.roles.map((role) => (
                    <Label key={role.id}>{role.name}</Label>
                  ))}
                </Flex>
              ),
            },
            {
              id: 'suspended',
              name: t('org.colStatus'),
              template: (row) =>
                row.suspended ? (
                  <Label theme="danger">{t('org.memberSuspended')}</Label>
                ) : (
                  <Label>{t('org.memberActive')}</Label>
                ),
            },
            {
              id: 'actions',
              name: '',
              template: (row) => (
                <Button
                  view="flat"
                  size="s"
                  onClick={() => onRemove(row.userId, row.primaryEmail)}
                  title={t('org.removeFromOrg')}
                >
                  <Icon data={TrashBin} size={16} />
                </Button>
              ),
            },
          ]}
        />
      )}
    </Flex>
  );
}

function InvitationsSection({ organizationId }: { organizationId: string }) {
  const { data, isPending, isError, error, refetch } = useOrganizationInvitations(organizationId);
  const roles = useOrganizationRoles();
  const { t } = useTranslation();
  const invite = useInviteMember(organizationId);
  const revoke = useRevokeInvitation(organizationId);
  const toaster = useToaster();

  const [email, setEmail] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const onInvite = () => {
    invite.mutate(
      { email: email.trim(), roleIds },
      {
        onSuccess: (result) => {
          toaster.add({
            name: 'invited',
            title: t('org.inviteSent'),
            content: result.invitation.invitee,
            theme: 'success',
          });
          setEmail('');
        },
        onError: (e) =>
          toaster.add({
            name: 'invite',
            title: t('common.error'),
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  const onRevoke = (invitation: Invitation) => {
    revoke.mutate(invitation.id, {
      onError: (e) =>
        toaster.add({
          name: 'revoke',
          title: t('common.error'),
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  return (
    <Flex direction="column" gap={2}>
      <Text variant="subheader-1">{t('org.invitationsTitle')}</Text>

      <Flex gap={2} alignItems="flex-end" wrap>
        <TextInput
          placeholder={t('org.inviteEmailPlaceholder')}
          type="email"
          value={email}
          onUpdate={setEmail}
          style={{ maxWidth: 280 }}
        />
        <Select
          placeholder={t('org.inviteRolePlaceholder')}
          multiple
          width={220}
          value={roleIds}
          onUpdate={setRoleIds}
          options={(roles.data?.roles ?? []).map((role) => ({
            value: role.id,
            content: role.name,
          }))}
        />
        <Button
          view="action"
          onClick={onInvite}
          disabled={!email.trim()}
          loading={invite.isPending}
        >
          <Icon data={PersonPlus} size={16} />
          {t('org.invite')}
        </Button>
      </Flex>

      {isPending && <LoadingState />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && data.invitations.length === 0 && (
        <Text variant="body-1" color="secondary">
          {t('org.noInvitations')}
        </Text>
      )}
      {data && data.invitations.length > 0 && (
        <Table
          data={data.invitations}
          columns={[
            {
              id: 'invitee',
              name: t('common.email'),
              template: (row) => (
                <Flex alignItems="center" gap={1}>
                  <Icon data={EnvelopeOpen} size={14} />
                  {row.invitee}
                </Flex>
              ),
            },
            {
              id: 'status',
              name: t('org.colStatus'),
              template: (row) => (
                <Label theme={STATUS_LABEL[row.status].theme}>
                  {t(STATUS_LABEL[row.status].key)}
                </Label>
              ),
            },
            {
              id: 'expiresAt',
              name: t('org.colExpiresAt'),
              template: (row) => formatDate(row.expiresAt),
            },
            {
              id: 'actions',
              name: '',
              template: (row) =>
                row.status === 'INVITATION_STATUS_PENDING' ? (
                  <Button
                    view="flat"
                    size="s"
                    onClick={() => onRevoke(row)}
                    title={t('org.revoke')}
                  >
                    <Icon data={Xmark} size={16} />
                  </Button>
                ) : null,
            },
          ]}
        />
      )}
    </Flex>
  );
}
