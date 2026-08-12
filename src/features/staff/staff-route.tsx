import { useMemo, useState } from 'react';
import { Alert, Button, Card, Flex, Icon, Label, Table, Text, TextInput } from '@gravity-ui/uikit';
import {
  ArrowUpArrowDown,
  Envelope,
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
import { PAGE_SIZE, useEmployees, useStaffRoles } from './api';
import type { Employee, EmployeeStatus } from './types';
import { RoleAccessCard } from './role-access-card';
import {
  AddEmployeeDialog,
  DeleteEmployeeDialog,
  EditEmployeeDialog,
  ResendInvitationDialog,
} from './staff-dialogs';

/** Экран «Администрирование» из макета: доступы для ролей + персонал. */
export function StaffRoute() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [toEdit, setToEdit] = useState<Employee | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [toInvite, setToInvite] = useState<Employee | null>(null);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <RoleAccessCard />

      <StaffCard
        search={search}
        onSearch={setSearch}
        onAdd={() => setAddOpen(true)}
        onEdit={setToEdit}
        onDelete={setToDelete}
        onInvite={setToInvite}
      />

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditEmployeeDialog employee={toEdit} onClose={() => setToEdit(null)} />
      <DeleteEmployeeDialog employee={toDelete} onClose={() => setToDelete(null)} />
      <ResendInvitationDialog employee={toInvite} onClose={() => setToInvite(null)} />
    </Flex>
  );
}

function StaffCard({
  search,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onInvite,
}: {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onInvite: (employee: Employee) => void;
}) {
  const { current } = useOrganizations();
  const { data, isPending, isError, error, refetch } = useEmployees(search);
  const [ascending, setAscending] = useState(false);

  // Сортировка по дате регистрации живёт на клиенте: в макете это переключатель
  // в заголовке столбца, отдельного параметра у списка нет.
  //
  // Сравниваем числами, а не строками: epoch-миллисекунды приходят строкой
  // (int64 в grpc-gateway), и лексикографически «9…» оказалось бы больше
  // «10…». Не заходившие с нулём уезжают в конец при любом направлении.
  const employees = useMemo(() => {
    const list = [...(data?.employees ?? [])];
    list.sort((a, b) => {
      const left = Number(a.registeredAt);
      const right = Number(b.registeredAt);

      if (left === 0 || right === 0) return left === right ? 0 : left === 0 ? 1 : -1;

      return ascending ? left - right : right - left;
    });

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
            startContent={
              <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                <Icon data={Magnifier} size={14} />
              </span>
            }
            style={{ width: 240 }}
          />
          <Button view="outlined" onClick={onAdd}>
            <Icon data={Plus} size={16} />
            Добавить
          </Button>
        </Flex>
      </Flex>

      {/* Разделитель шапки и таблицы — как в макете «Персонал». */}
      <div
        style={{
          borderTop: '1px solid var(--g-color-line-generic)',
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        {current === null && <NoOrganizationSelectedState />}
        {current !== null && isPending && <LoadingState />}
        {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
        {data && employees.length === 0 && (
          <EmptyState
            text={search ? `Никого не нашли по запросу «${search}»` : 'Сотрудников пока нет'}
          />
        )}
        {data && employees.length > 0 && (
          <>
            {data.total > employees.length && (
              <div style={{ padding: '0 16px 8px' }}>
                <Alert
                  theme="info"
                  message={`Показаны первые ${PAGE_SIZE} из ${data.total}. Уточните поиск, чтобы найти нужного.`}
                />
              </div>
            )}
            <EmployeesTable
              employees={employees}
              ascending={ascending}
              onToggleSort={() => setAscending((value) => !value)}
              onEdit={onEdit}
              onDelete={onDelete}
              onInvite={onInvite}
            />
          </>
        )}
      </div>
    </Card>
  );
}

function EmployeesTable({
  employees,
  ascending,
  onToggleSort,
  onEdit,
  onDelete,
  onInvite,
}: {
  employees: Employee[];
  ascending: boolean;
  onToggleSort: () => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onInvite: (employee: Employee) => void;
}) {
  const roles = useStaffRoles();
  const roleName = (roleId: string) =>
    roles.data?.roles.find((role) => role.id === roleId)?.name ?? '—';

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table"
        data={employees}
        columns={[
          {
            id: 'name',
            name: 'Имя',
            width: '28%',
            template: (row) => (
              <Text variant="body-1" style={{ fontWeight: 600 }}>
                {`${row.firstName} ${row.lastName}`.trim() || '—'}
              </Text>
            ),
          },
          {
            id: 'email',
            name: 'Почта',
            width: '32%',
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
            template: (row) => <RegisteredCell employee={row} />,
          },
          {
            id: 'role',
            name: 'Роль',
            template: (row) => (
              <Text variant="body-1" style={{ fontWeight: 600 }}>
                {roleName(row.roleId)}
              </Text>
            ),
          },
          {
            id: 'actions',
            name: 'Действия',
            // Узкая колонка по ширине кнопок — остальное место уходит имени/почте.
            width: 0,
            align: 'end',
            className: 'admin-table__actions',
            template: (row) => (
              <Flex alignItems="center" justifyContent="flex-end" gap={1}>
                {/* Пока человек не зашёл — единственное осмысленное
                    действие это выслать приглашение заново. */}
                {row.status !== 'EMPLOYEE_STATUS_ACTIVE' && (
                  <Button view="flat" size="s" onClick={() => onInvite(row)}>
                    <Icon data={Envelope} size={14} />
                    Пригласить заново
                  </Button>
                )}
                <Button view="flat" size="s" title="Изменить" onClick={() => onEdit(row)}>
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
    </div>
  );
}

/**
 * Колонка «Регистрация»: дата первого захода либо статус приглашения.
 *
 * Ноль в registeredAt означает, что человек ещё ни разу не входил — дата
 * прочерком без пояснения выглядела бы поломкой, поэтому показываем, чего
 * ждём.
 */
function RegisteredCell({ employee }: { employee: Employee }) {
  const millis = Number(employee.registeredAt);

  if (Number.isFinite(millis) && millis > 0) {
    return <Text variant="body-1">{new Date(millis).toLocaleDateString('ru-RU')}</Text>;
  }

  return <Label theme={STATUS_THEME[employee.status]}>{STATUS_LABEL[employee.status]}</Label>;
}

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  EMPLOYEE_STATUS_UNSPECIFIED: 'неизвестно',
  EMPLOYEE_STATUS_INVITED: 'ждёт входа',
  EMPLOYEE_STATUS_ACTIVE: 'активен',
  EMPLOYEE_STATUS_EXPIRED: 'приглашение истекло',
};

const STATUS_THEME: Record<EmployeeStatus, 'normal' | 'warning' | 'success'> = {
  EMPLOYEE_STATUS_UNSPECIFIED: 'normal',
  EMPLOYEE_STATUS_INVITED: 'normal',
  EMPLOYEE_STATUS_ACTIVE: 'success',
  EMPLOYEE_STATUS_EXPIRED: 'warning',
};
