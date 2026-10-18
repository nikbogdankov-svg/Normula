import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  Flex,
  Icon,
  Label,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { Ban, Cubes3Overlap, Persons, Play, Plus, TrashBin } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/shared/i18n';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import {
  useCreateOrganization,
  useDeleteOrganization,
  useOrganizationList,
  useSetOrganizationDisabled,
} from './api';
import type { Organization } from './types';
import { useOrganizations } from '@/shared/auth';
import { OrganizationDetails } from './organization-details';
import { RolesCard } from './roles-card';
import { errorText } from '@/shared/api/error-text';

/** «Управление» — организации в том же карточном стиле, что и «Персонал». */
export function ManagementRoute() {
  const { current } = useOrganizations();
  const { data, isPending, isError, error, refetch } = useOrganizationList();
  const hasOrganization = current !== null;
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Organization | null>(null);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <RolesCard />

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={Cubes3Overlap} size={16} />
            <Text variant="subheader-2">{t('org.listTitle')}</Text>
            {data && (
              <Text variant="body-1" color="secondary">
                {data.total}
              </Text>
            )}
          </Flex>

          <Button view="normal" onClick={() => setCreateOpen(true)}>
            <Icon data={Plus} size={16} />
            {t('org.addButton')}
          </Button>
        </Flex>

        {/* Разделитель шапки и таблицы — как у «Персонал». */}
        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          {!hasOrganization && <NoOrganizationSelectedState />}
          {hasOrganization && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && data.organizations.length > 0 && (
            <OrganizationsTable
              organizations={data.organizations}
              onSelect={setSelected}
              selectedId={selected?.id ?? null}
            />
          )}
          {data && data.organizations.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Text variant="body-2" color="secondary">
                {t('org.empty')}
              </Text>
            </div>
          )}
        </div>
      </Card>

      {selected && (
        <OrganizationDetails organization={selected} onClose={() => setSelected(null)} />
      )}

      <CreateOrganizationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Flex>
  );
}

function OrganizationsTable({
  organizations,
  onSelect,
  selectedId,
}: {
  organizations: Organization[];
  onSelect: (org: Organization) => void;
  selectedId: string | null;
}) {
  const { t } = useTranslation();
  const setDisabled = useSetOrganizationDisabled();
  const remove = useDeleteOrganization();
  const toaster = useToaster();

  const onToggleDisabled = (org: Organization) => {
    setDisabled.mutate(
      { organizationId: org.id, disabled: !org.disabled },
      {
        onError: (e) =>
          toaster.add({
            name: 'org-disable',
            title: t('common.error'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  const onRemove = (org: Organization) => {
    // Бэкенд не даст удалить включённую организацию — предупреждаем заранее,
    // чтобы кнопка не выглядела сломанной.
    if (!org.disabled) {
      toaster.add({
        name: 'org-delete-guard',
        title: t('org.disableFirstTitle'),
        content: t('org.disableFirstContent'),
        theme: 'warning',
      });

      return;
    }

    if (!window.confirm(t('org.deleteConfirm', { name: org.name }))) return;

    remove.mutate(org.id, {
      onSuccess: () =>
        toaster.add({ name: 'org-deleted', title: t('org.deleted'), theme: 'success' }),
      onError: (e) =>
        toaster.add({
          name: 'org-delete',
          title: t('common.error'),
          content: errorText(e),
          theme: 'danger',
        }),
    });
  };

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table"
        data={organizations}
        onRowClick={(row) => onSelect(row)}
        // Выбранную строку не подсвечиваем классом: подходящей утилиты в Gravity
        // нет, а выбор и так виден — карточка организации раскрывается ниже.
        getRowDescriptor={(row) => (row.id === selectedId ? { disabled: false } : undefined)}
        columns={[
          {
            id: 'name',
            name: t('org.orgName'),
            template: (row) => <Text variant="subheader-1">{row.name}</Text>,
          },
          {
            id: 'memberCount',
            name: t('org.colMembers'),
            template: (row) => (
              <Flex alignItems="center" gap={1}>
                <Icon data={Persons} size={14} />
                {row.memberCount}
              </Flex>
            ),
          },
          {
            id: 'disabled',
            name: t('org.colStatus'),
            template: (row) =>
              row.disabled ? (
                <Label theme="warning">{t('org.disabled')}</Label>
              ) : (
                <Label theme="success">{t('org.active')}</Label>
              ),
          },
          {
            id: 'createdAt',
            name: t('org.colCreated'),
            template: (row) => formatDate(row.createdAt),
          },
          {
            id: 'actions',
            name: t('org.colActions'),
            width: 0,
            align: 'end',
            className: 'admin-table__actions',
            template: (row) => (
              <Flex gap={1} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                <Button
                  view="flat"
                  size="s"
                  onClick={() => onToggleDisabled(row)}
                  title={row.disabled ? t('org.enable') : t('org.disable')}
                >
                  <Icon data={row.disabled ? Play : Ban} size={16} />
                </Button>
                <Button
                  view="flat"
                  size="s"
                  onClick={() => onRemove(row)}
                  title={t('common.delete')}
                >
                  <Icon data={TrashBin} size={16} />
                </Button>
              </Flex>
            ),
          },
        ]}
      />
    </div>
  );
}

function CreateOrganizationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateOrganization();
  const toaster = useToaster();
  const [name, setName] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const reset = () => {
    setName('');
    setAdminFirstName('');
    setAdminLastName('');
    setAdminEmail('');
  };

  const submit = () => {
    create.mutate(
      {
        name: name.trim(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim(),
        adminEmail: adminEmail.trim(),
      },
      {
        onSuccess: (result) => {
          toaster.add({
            name: 'org-created',
            title: t('org.created'),
            content: t('org.createdContent', { email: result.invitation.invitee }),
            theme: 'success',
          });
          reset();
          onClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'org-create',
            title: t('org.createFailed'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} size="s">
      <Dialog.Header caption={t('org.createTitle')} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <TextInput
            label={t('org.createName')}
            value={name}
            onUpdate={setName}
            autoFocus
            size="l"
          />
          <Flex gap={3}>
            <TextInput
              label={t('org.createFirstName')}
              value={adminFirstName}
              onUpdate={setAdminFirstName}
              size="l"
            />
            <TextInput
              label={t('org.createLastName')}
              value={adminLastName}
              onUpdate={setAdminLastName}
              size="l"
            />
          </Flex>
          <TextInput
            label={t('org.createAdminEmail')}
            type="email"
            value={adminEmail}
            onUpdate={setAdminEmail}
            note={t('org.createEmailNote')}
            size="l"
          />
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer
        onClickButtonCancel={onClose}
        onClickButtonApply={submit}
        textButtonCancel={t('common.cancel')}
        textButtonApply={t('common.create')}
        propsButtonApply={{
          disabled:
            !name.trim() || !adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim(),
        }}
        loading={create.isPending}
      />
    </Dialog>
  );
}

/** epoch в миллисекундах приходит строкой (int64 в grpc-gateway). */
export function formatDate(epochMillis: string): string {
  const value = Number(epochMillis);
  if (!Number.isFinite(value) || value === 0) return '—';

  return new Date(value).toLocaleDateString(i18n.language);
}
