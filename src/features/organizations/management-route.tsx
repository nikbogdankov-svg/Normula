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

/** «Управление» — организации в том же карточном стиле, что и «Персонал». */
export function ManagementRoute() {
  const { current } = useOrganizations();
  const { data, isPending, isError, error, refetch } = useOrganizationList();
  const hasOrganization = current !== null;
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
            <Text variant="subheader-2">Организации</Text>
            {data && (
              <Text variant="body-1" color="secondary">
                {data.total}
              </Text>
            )}
          </Flex>

          <Button view="outlined" onClick={() => setCreateOpen(true)}>
            <Icon data={Plus} size={16} />
            Добавить
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
                Организаций пока нет
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
            title: 'Ошибка',
            content: e.message,
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
        title: 'Сначала отключите организацию',
        content: 'Удаление необратимо, поэтому доступно только для отключённых организаций.',
        theme: 'warning',
      });

      return;
    }

    if (!window.confirm(`Удалить организацию «${org.name}» безвозвратно?`)) return;

    remove.mutate(org.id, {
      onSuccess: () =>
        toaster.add({ name: 'org-deleted', title: 'Организация удалена', theme: 'success' }),
      onError: (e) =>
        toaster.add({ name: 'org-delete', title: 'Ошибка', content: e.message, theme: 'danger' }),
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
            name: 'Название',
            template: (row) => <Text variant="subheader-1">{row.name}</Text>,
          },
          {
            id: 'memberCount',
            name: 'Участников',
            template: (row) => (
              <Flex alignItems="center" gap={1}>
                <Icon data={Persons} size={14} />
                {row.memberCount}
              </Flex>
            ),
          },
          {
            id: 'disabled',
            name: 'Статус',
            template: (row) =>
              row.disabled ? (
                <Label theme="warning">Отключена</Label>
              ) : (
                <Label theme="success">Активна</Label>
              ),
          },
          {
            id: 'createdAt',
            name: 'Создана',
            template: (row) => formatDate(row.createdAt),
          },
          {
            id: 'actions',
            name: 'Действия',
            width: 0,
            align: 'end',
            className: 'admin-table__actions',
            template: (row) => (
              <Flex gap={1} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                <Button
                  view="flat"
                  size="s"
                  onClick={() => onToggleDisabled(row)}
                  title={row.disabled ? 'Включить' : 'Отключить'}
                >
                  <Icon data={row.disabled ? Play : Ban} size={16} />
                </Button>
                <Button view="flat" size="s" onClick={() => onRemove(row)} title="Удалить">
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
  const create = useCreateOrganization();
  const toaster = useToaster();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setAdminEmail('');
  };

  const submit = () => {
    create.mutate(
      { name: name.trim(), description: description.trim(), adminEmail: adminEmail.trim() },
      {
        onSuccess: (result) => {
          toaster.add({
            name: 'org-created',
            title: 'Организация создана',
            content: `Приглашение отправлено на ${result.invitation.invitee}`,
            theme: 'success',
          });
          reset();
          onClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'org-create',
            title: 'Не удалось создать организацию',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} size="s">
      <Dialog.Header caption="Новая организация" />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <TextInput label="Название" value={name} onUpdate={setName} autoFocus />
          <TextInput label="Описание" value={description} onUpdate={setDescription} />
          <TextInput
            label="Почта администратора"
            type="email"
            value={adminEmail}
            onUpdate={setAdminEmail}
            note="На этот адрес уйдёт приглашение с ролью администратора организации"
          />
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer
        onClickButtonCancel={onClose}
        onClickButtonApply={submit}
        textButtonCancel="Отмена"
        textButtonApply="Создать"
        propsButtonApply={{ disabled: !name.trim() || !adminEmail.trim() }}
        loading={create.isPending}
      />
    </Dialog>
  );
}

/** epoch в миллисекундах приходит строкой (int64 в grpc-gateway). */
export function formatDate(epochMillis: string): string {
  const value = Number(epochMillis);
  if (!Number.isFinite(value) || value === 0) return '—';

  return new Date(value).toLocaleDateString('ru-RU');
}
