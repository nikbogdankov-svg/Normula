/**
 * Контракт раздела «Администрирование»: staff.v1.StaffService
 * (onemore-admin/api/staff/v1/staff.proto), HTTP-биндинги /v1/staff*.
 *
 * Имена полей — как их отдаёт grpc-gateway (lowerCamelCase), enum'ы —
 * строками с полным именем значения, int64 — строками, int32 — числами.
 */

export type EmployeeStatus =
  | 'EMPLOYEE_STATUS_UNSPECIFIED'
  /** Приглашение отправлено, человек ещё ни разу не заходил. */
  | 'EMPLOYEE_STATUS_INVITED'
  /** Зашёл хотя бы раз, учётка Logto привязана. */
  | 'EMPLOYEE_STATUS_ACTIVE'
  /** Срок приглашения истёк, нужно выслать заново. */
  | 'EMPLOYEE_STATUS_EXPIRED';

/** Раздел меню, который открывает роль. */
export interface AccessSection {
  id: string;
  title: string;
}

/** Роль сотрудника вместе с открытыми ею разделами. */
export interface StaffRole {
  id: string;
  name: string;
  description: string;
  sections: AccessSection[];
  /**
   * Роль открывает все разделы без исключения. Это факт о наборе разделов,
   * а не разрешение: менять доступы ролей раздел не умеет вовсе.
   */
  fullAccess: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  /** Личная почта: на неё уходит приглашение, по ней же человек входит. */
  email: string;
  /** Почта в организации — необязательное поле, вводит администратор. */
  orgEmail: string;
  roleId: string;
  status: EmployeeStatus;
  /** epoch в миллисекундах строкой; «0» — сотрудник ещё не заходил. */
  registeredAt: string;
  createdAt: string;
}

/**
 * Документы сотрудника. Отдаются только в карточке, в списке их нет —
 * это персональные данные, а список открывается при каждом заходе.
 *
 * Все поля строковые и хранят только цифры: ведущий ноль в СНИЛС или серии
 * паспорта значащий, числом он потеряется. Пустое значение допустимо.
 */
export interface EmployeeDocuments {
  snils: string;
  inn: string;
  passportSeries: string;
  passportNumber: string;
  otherDoc: string;
}

export interface ListEmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface ListStaffRolesResponse {
  roles: StaffRole[];
}

export interface GetEmployeeResponse {
  employee: Employee;
  documents: EmployeeDocuments;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  orgEmail: string;
  roleId: string;
  documents: EmployeeDocuments;
}

export interface CreateEmployeeResponse {
  employee: Employee;
}

/**
 * Изменение карточки. Непереданное поле не меняется, переданное пустым —
 * очищается: в proto это `optional`, и отсутствие ключа отличается от
 * пустой строки. Поэтому undefined-поля обязаны не попадать в тело запроса.
 */
export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  orgEmail?: string;
  roleId?: string;
  documents?: EmployeeDocuments;
}

export interface UpdateEmployeeResponse {
  employee: Employee;
  documents: EmployeeDocuments;
}

export interface ResendInvitationResponse {
  employee: Employee;
}

/** Пустые документы — форма всегда работает с полным объектом. */
export const EMPTY_DOCUMENTS: EmployeeDocuments = {
  snils: '',
  inn: '',
  passportSeries: '',
  passportNumber: '',
  otherDoc: '',
};
