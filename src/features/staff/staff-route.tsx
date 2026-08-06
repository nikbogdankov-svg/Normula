import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  Select,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import {
  ArrowUpArrowDown,
  Key,
  Magnifier,
  Pencil,
  Persons,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useEmployees, useStaffRoles, useUpdateEmployee } from './api';
import type { Employee } from './types';
import { RoleAccessCard } from './role-access-card';
import { AddEmployeeDialog, DeleteEmployeeDialog, ResetPasswordDialog } from './staff-dialogs';

/** Экран «Администрирование» из макета: доступы для ролей + персонал. */
export function StaffRoute() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [toReset, setToReset] = useState<Employee | null>(null);

  return (
    <Flex direction="column" gap={4} style={{ padding: 16 }}>
      <RoleAccessCard />

      <StaffCard
        search={search}
        onSearch={setSearch}
        onAdd={() => setAddOpen(true)}
        onDelete={setToDelete}
        onReset={setToReset}
      />

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <DeleteEmployeeDialog employee={toDelete} onClose={() => setToDelete(null)} />
      <ResetPasswordDialog employee={toReset} onClose={() => setToReset(null)} />
    </Flex>
  );
}

function StaffCard({
  search,
  onSearch,
  onAdd,
  onDelete,
  onReset,
}: {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onDelete: (employee: Employee) => void;
  onReset: (employee: Employee) => void;
}) {
  const { current } = useOrganizations();
  const { data, isPending, isError, error, refetch } = useEmployees(search);
  const [ascending, setAscending] = useState(false);

  // Сортировка по дате регистрации живёт на клиенте: в макете это переключатель
  // в заголовке столбца, отдельного параметра у списка нет.
  const employees = useMemo(() => {
    const list = [...(data?.employees ?? [])];
    list.sort((a, b) =>
      ascending
        ? a.registeredAt.localeCompare(b.registeredAt)
        : b.registeredAt.localeCompare(a.registeredAt)
    );

    return list;
  }, [data, ascending]);

  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        gap={4}
        style={{ padding: '12px 16px' }}
      >
        <Flex alignItems="center" gap={2}>
          <Icon data={Persons} size={16} />
          <Text variant="subheader-2">Персонал</Text>
        </Flex>

        <Flex alignItems="center" gap={2}>
          <TextInput
            placeholder="Найти сотрудника"
            value={search}
            onUpdate={onSearch}
            hasClear
            startContent={<Icon data={Magnifier} size={14} />}
            style={{ width: 240 }}
          />
          <Button view="outlined" onClick={onAdd}>
            <Icon data={Plus} size={16} />
            Добавить
          </Button>
        </Flex>
      </Flex>

      {current === null && <NoOrganizationSelectedState />}
      {current !== null && isPending && <LoadingState />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && employees.length === 0 && (
        <EmptyState
          text={search ? `Никого не нашли по запросу «${search}»` : 'Сотрудников пока нет'}
        />
      )}
      {data && employees.length > 0 && (
        <EmployeesTable
          employees={employees}
          ascending={ascending}
          onToggleSort={() => setAscending((value) => !value)}
          onDelete={onDelete}
          onReset={onReset}
        />
      )}
    </Card>
  );
}

function EmployeesTable({
  employees,
  ascending,
  onToggleSort,
  onDelete,
  onReset,
}: {
  employees: Employee[];
  ascending: boolean;
  onToggleSort: () => void;
  onDelete: (employee: Employee) => void;
  onReset: (employee: Employee) => void;
}) {
  const roles = useStaffRoles();
  const update = useUpdateEmployee();
  const toaster = useToaster();

  const changeRole = (employee: Employee, roleId: string) => {
    update.mutate(
      { id: employee.id, patch: { roleId } },
      {
        onError: (e) =>
          toaster.add({
            name: 'role-change',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Table
      width="max"
      data={employees}
      columns={[
        {
          id: 'name',
          name: 'Имя',
          template: (row) => `${row.firstName} ${row.lastName}`.trim() || '—',
        },
        {
          id: 'email',
          name: 'Почта',
          template: (row) => (
            <Text variant="body-1" color="secondary">
              {row.email}
            </Text>
          ),
        },
        {
          id: 'registeredAt',
          name: () => (
            <Flex
              alignItems="center"
              gap={1}
              style={{ cursor: 'pointer' }}
              onClick={onToggleSort}
              title={ascending ? 'Сначала новые' : 'Сначала старые'}
            >
              Регистрация
              <Icon data={ArrowUpArrowDown} size={14} />
            </Flex>
          ),
          template: (row) => row.registeredAt.slice(0, 10),
        },
        {
          id: 'role',
          name: 'Роль',
          template: (row) => (
            <Select
              size="s"
              width={150}
              value={[row.roleId]}
              onUpdate={(value) => value[0] && changeRole(row, value[0])}
              options={(roles.data?.roles ?? []).map((role) => ({
                value: role.id,
                content: role.name,
              }))}
            />
          ),
        },
        {
          id: 'actions',
          name: 'Действия',
          template: (row) => (
            <Flex alignItems="center" gap={1}>
              <Button view="flat" size="s" onClick={() => onReset(row)}>
                <Icon data={Key} size={14} />
                Сброс пароля
              </Button>
              <Button view="flat" size="s" title="Изменить" disabled>
                <Icon data={Pencil} size={16} />
              </Button>
              <Button view="flat" size="s" onClick={() => onDelete(row)} title="Удалить">
                <Icon data={TrashBin} size={16} />
              </Button>
            </Flex>
          ),
        },
      ]}
    />
  );
}
