import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToaster } from '@gravity-ui/uikit';
import { useApi } from '@/shared/api/use-api';
import { toastError, toastSuccess } from './toasts';
import type {
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  GetEmployeeResponse,
  ListEmployeesResponse,
  ListStaffRolesResponse,
  ResendInvitationResponse,
  UpdateEmployeeRequest,
  UpdateEmployeeResponse,
} from './types';

/**
 * API раздела «Администрирование». Данные организационные, поэтому токен
 * организационный (дефолт useApi), а organizationId входит в queryKey:
 * сменил организацию в шапке — получил другой список, а не чужой из кэша.
 */

const KEY = 'staff';

/**
 * Размер страницы. Пагинации в макете нет, поэтому берём потолок, который
 * разрешает бэкенд (maxPageSize = 100), и показываем предупреждение, если
 * сотрудников оказалось больше — молча обрезать список нельзя.
 */
export const PAGE_SIZE = 100;

export function useEmployees(search: string) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'list', api.organizationId, search],
    queryFn: () => {
      const query = new URLSearchParams({
        page: '1',
        pageSize: String(PAGE_SIZE),
        search,
      });

      return api.request<ListEmployeesResponse>(`/v1/staff?${query.toString()}`);
    },
    enabled: api.organizationId !== null,
  });
}

/**
 * Карточка целиком: профиль и документы одним запросом. Отдельного запроса
 * под вкладку «Документы» нет намеренно — карточка маленькая, а второй
 * round-trip при переключении вкладки был бы заметен.
 */
export function useEmployeeCard(employeeId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: [KEY, 'card', api.organizationId, employeeId],
    queryFn: () => api.request<GetEmployeeResponse>(`/v1/staff/${employeeId}`),
    enabled: api.organizationId !== null && employeeId !== null,
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

/** Инвалидация всего раздела после любой мутации. */
function useInvalidate() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

/**
 * Тосты живут здесь, на уровне useMutation, а не в mutate() диалогов:
 * колбэки mutate() TanStack не вызывает, если компонент размонтировался до
 * ответа. Запросы к Logto идут секунды, и уйти со страницы раньше ответа —
 * обычное дело; плашка об итоге обязана появиться всё равно. Диалогам в
 * mutate() остаётся только их собственный UI: закрыться и сбросить форму.
 */
export function useCreateEmployee() {
  const api = useApi();
  const invalidate = useInvalidate();
  const toaster = useToaster();

  return useMutation({
    mutationFn: (body: CreateEmployeeRequest) =>
      api.request<CreateEmployeeResponse>('/v1/staff', { method: 'POST', body }),
    onSuccess: (_, body) =>
      toastSuccess(
        toaster,
        'employee-created',
        'Сотрудник добавлен',
        `Приглашение отправлено на ${body.email}`
      ),
    onError: (e) => toastError(toaster, 'employee-add', e),
    // Инвалидация и при ошибке: карточка могла создаться, а письмо не уйти —
    // тогда сотрудник уже есть в списке, и не показать его было бы враньём.
    onSettled: invalidate,
  });
}

export function useUpdateEmployee() {
  const api = useApi();
  const invalidate = useInvalidate();
  const toaster = useToaster();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEmployeeRequest }) =>
      api.request<UpdateEmployeeResponse>(`/v1/staff/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      toastSuccess(toaster, 'employee-updated', 'Данные сотрудника обновлены');
      return invalidate();
    },
    onError: (e) => toastError(toaster, 'employee-edit', e),
  });
}

export function useDeleteEmployee() {
  const api = useApi();
  const invalidate = useInvalidate();
  const toaster = useToaster();

  return useMutation({
    mutationFn: (id: string) =>
      api.request<Record<string, never>>(`/v1/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toastSuccess(toaster, 'employee-deleted', 'Сотрудник удалён');
      return invalidate();
    },
    onError: (e) => toastError(toaster, 'employee-delete', e),
  });
}

/**
 * Выслать приглашение заново. Заменяет «Сброс пароля» из макета: паролей
 * сервис не выдаёт и не хранит, человек задаёт его сам при регистрации.
 */
export function useResendInvitation() {
  const api = useApi();
  const invalidate = useInvalidate();
  const toaster = useToaster();

  return useMutation({
    mutationFn: (id: string) =>
      api.request<ResendInvitationResponse>(`/v1/staff/${id}/invitation`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: (data) => {
      toastSuccess(toaster, 'employee-invited', 'Приглашение отправлено', data.employee.email);
      return invalidate();
    },
    onError: (e) => toastError(toaster, 'employee-invite', e),
  });
}
