import { useMemo, useState } from 'react';
import { Alert, Button, Card, Flex, Icon, Label, Table, Text, TextInput } from '@gravity-ui/uikit';
import {
  ArrowDown,
  ArrowUp,
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
import './staff-route.css';
import {
  AddEmployeeDialog,
  DeleteEmployeeDialog,
  EditEmployeeDialog,
  ResendInvitationDialog,
} from './staff-dialogs';

type StaffSort = 'name' | 'registeredAt';

/** Экран «Администрирование» из макета: доступы для ролей + персонал. */
export function StaffRoute() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [toEdit, setToEdit] = useState<Employee | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [toInvite, setToInvite] = useState<Employee | null>(null);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
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
  const [sort, setSort] = useState<StaffSort>('registeredAt');
  const [ascending, setAscending] = useState(false);

  const onSort = (column: StaffSort) => {
    if (sort === column) {
      setAscending((value) => !value);
      return;
    }
    setSort(column);
    setAscending(column === 'name');
  };

  // Сортировка живёт на клиенте: в макете это переключатели в заголовках
  // столбцов, отдельных параметров у списка нет.
  const employees = useMemo(() => {
    const list = [...(data?.employees ?? [])];
    const dir = ascending ? 1 : -1;

    list.sort((a, b) => {
      if (sort === 'name') {
        const left = `${a.lastName} ${a.firstName}`.trim();
        const right = `${b.lastName} ${b.firstName}`.trim();
        return left.localeCompare(right, 'ru') * dir;
      }

      // Числами, а не строками: epoch-миллисекунды приходят строкой (int64
      // в grpc-gateway), и лексикографически «9…» оказалось бы больше «10…».
      const left = Number(a.registeredAt);
      const right = Number(b.registeredAt);

      // Не заходившие уезжают вниз при любом направлении: даты у них нет,
      // и мешать их с настоящими значениями бессмысленно.
      if (left === 0 || right === 0) {
        return left === right ? 0 : left === 0 ? 1 : -1;
      }

      return (left - right) * dir;
    });

    return list;
  }, [data, sort, ascending]);

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
          <Button view="normal" onClick={onAdd}>
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
            {/* Пагинации в макете нет, поэтому берём потолок страницы. Если
                сотрудников больше — говорим об этом, а не обрезаем молча. */}
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
              sort={sort}
              ascending={ascending}
              onSort={onSort}
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
  sort,
  ascending,
  onSort,
  onEdit,
  onDelete,
  onInvite,
}: {
  employees: Employee[];
  sort: StaffSort;
  ascending: boolean;
  onSort: (column: StaffSort) => void;
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
            name: () => (
              <SortableHeader
                label="Имя"
                column="name"
                sort={sort}
                ascending={ascending}
                onSort={onSort}
              />
            ),
            width: '28%',
            template: (row) => (
              <Text variant="body-2">
                {`${row.firstName} ${row.lastName}`.trim() || '—'}
              </Text>
            ),
          },
          {
            id: 'email',
            name: () => <Text variant="body-2">Почта</Text>,
            width: '32%',
            template: (row) => <Text variant="body-2">{row.email}</Text>,
          },
          {
            id: 'registeredAt',
            name: () => (
              <SortableHeader
                label="Регистрация"
                column="registeredAt"
                sort={sort}
                ascending={ascending}
                onSort={onSort}
              />
            ),
            template: (row) => <RegisteredCell employee={row} />,
          },
          {
            id: 'role',
            name: () => <Text variant="body-2">Роль</Text>,
            width: '22%',
            template: (row) => <Text variant="body-2">{roleName(row.roleId)}</Text>,
          },
          {
            id: 'actions',
            name: '',
            // Узкая колонка по ширине кнопок — остальное место уходит имени/почте.
            width: 0,
            align: 'end',
            className: 'admin-table__actions',
            template: (row) => (
              <Flex alignItems="center" justifyContent="flex-end" gap={1}>
                {/* Пока человек не зашёл — единственное осмысленное действие
                    это выслать приглашение заново. */}
                {row.status !== 'EMPLOYEE_STATUS_ACTIVE' && (
                  <Button view="flat-secondary" size="s" onClick={() => onInvite(row)}>
                    <Icon data={Envelope} size={14} />
                    Пригласить заново
                  </Button>
                )}
                <Button view="flat-secondary" size="s" title="Изменить" onClick={() => onEdit(row)}>
                  <Icon data={Pencil} size={16} />
                </Button>
                <Button
                  view="flat-secondary"
                  size="s"
                  onClick={() => onDelete(row)}
                  title="Удалить"
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
    return <Text variant="body-2">{new Date(millis).toLocaleDateString('ru-RU')}</Text>;
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

function SortableHeader({
  label,
  column,
  sort,
  ascending,
  onSort,
}: {
  label: string;
  column: StaffSort;
  sort: StaffSort;
  ascending: boolean;
  onSort: (column: StaffSort) => void;
}) {
  const active = sort === column;
  const icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpArrowDown;

  return (
    <Flex
      alignItems="center"
      gap={1}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(column)}
      title={
        active
          ? ascending
            ? 'По возрастанию — нажмите для убывания'
            : 'По убыванию — нажмите для возрастания'
          : `Сортировать по: ${label}`
      }
    >
      <Text variant="body-2">{label}</Text>
      <span
        style={{
          display: 'inline-flex',
          color: active ? 'var(--g-color-text-primary)' : 'var(--g-color-text-secondary)',
        }}
      >
        <Icon data={icon} size={14} />
      </span>
    </Flex>
  );
}
