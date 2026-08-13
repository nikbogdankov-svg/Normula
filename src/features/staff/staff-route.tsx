import { useMemo, useState } from 'react';
import { Button, Card, Flex, Icon, Label, Table, Text, TextInput } from '@gravity-ui/uikit';
import {
  ArrowDown,
  ArrowUp,
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
import { useEmployees, useStaffRoles } from './api';
import type { Employee } from './types';
import './staff-route.css';
import {
  AddEmployeeDialog,
  DeleteEmployeeDialog,
  EditEmployeeDialog,
  ResetPasswordDialog,
} from './staff-dialogs';

type StaffSort = 'name' | 'registeredAt';

/** Экран «Персонал»: таблица сотрудников. */
export function StaffRoute() {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [toEdit, setToEdit] = useState<Employee | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [toReset, setToReset] = useState<Employee | null>(null);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <StaffCard
        search={search}
        onSearch={setSearch}
        onAdd={() => setAddOpen(true)}
        onEdit={setToEdit}
        onDelete={setToDelete}
        onReset={setToReset}
      />

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditEmployeeDialog employee={toEdit} onClose={() => setToEdit(null)} />
      <DeleteEmployeeDialog employee={toDelete} onClose={() => setToDelete(null)} />
      <ResetPasswordDialog employee={toReset} onClose={() => setToReset(null)} />
    </Flex>
  );
}

function StaffCard({
  search,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onReset,
}: {
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onReset: (employee: Employee) => void;
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

  const employees = useMemo(() => {
    const list = [...(data?.employees ?? [])];
    const dir = ascending ? 1 : -1;
    list.sort((a, b) => {
      if (sort === 'name') {
        const left = `${a.lastName} ${a.firstName}`.trim();
        const right = `${b.lastName} ${b.firstName}`.trim();
        return left.localeCompare(right, 'ru') * dir;
      }
      return a.registeredAt.localeCompare(b.registeredAt) * dir;
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
          <EmployeesTable
            employees={employees}
            sort={sort}
            ascending={ascending}
            onSort={onSort}
            onEdit={onEdit}
            onDelete={onDelete}
            onReset={onReset}
          />
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
  onReset,
}: {
  employees: Employee[];
  sort: StaffSort;
  ascending: boolean;
  onSort: (column: StaffSort) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onReset: (employee: Employee) => void;
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
        getRowDescriptor={(row) =>
          row.status === 'pending' ? { classNames: ['employee-pending-row'] } : undefined
        }
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
              <Flex alignItems="center" gap={1}>
                <Text variant="subheader-1">{`${row.firstName} ${row.lastName}`.trim() || '—'}</Text>
                {row.status === 'pending' && (
                  <Label className="employee-pending-tag">ждем ответа</Label>
                )}
              </Flex>
            ),
          },
          {
            id: 'email',
            name: 'Рабочая почта',
            width: '32%',
            template: (row) => <Text variant="body-1">{row.email}</Text>,
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
            template: (row) => <Text variant="body-1">{row.registeredAt.slice(0, 10)}</Text>,
          },
          {
            id: 'role',
            name: 'Роль',
            template: (row) => <Text variant="subheader-1">{roleName(row.roleId)}</Text>,
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
                <Button view="flat-secondary" size="s" onClick={() => onReset(row)}>
                  <Icon data={Key} size={14} />
                  {row.status === 'pending' ? 'Отправить снова' : 'Сброс пароля'}
                </Button>
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
      {label}
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
