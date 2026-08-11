/**
 * Контракт раздела «Администрирование».
 *
 * Бэкенда под него ещё нет — формы взяты из макета, эндпоинты описаны здесь
 * и реализованы в mock-handlers. Когда появится сервер, менять придётся
 * только базовые пути, форма ответов уже зафиксирована.
 */

/** Раздел меню, доступ к которому выдаётся роли. */
export interface AccessSection {
  id: string;
  title: string;
}

/** Роль сотрудника вместе с доступными ей разделами. */
export interface StaffRole {
  id: string;
  name: string;
  /** Разделы, к которым роль даёт доступ. */
  sections: AccessSection[];
  /** Роль системная: набор доступов у неё менять нельзя (Администратор). */
  locked: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  /** Рабочая почта — по ней сотрудник входит. */
  email: string;
  roleId: string;
  /** Дата регистрации, ISO-строка. */
  registeredAt: string;
  snils: string;
  inn: string;
  passport: string;
  otherDoc: string;
}

export interface ListEmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface ListStaffRolesResponse {
  roles: StaffRole[];
}

/** Данные обоих шагов диалога добавления. */
export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  snils: string;
  inn: string;
  passport: string;
  otherDoc: string;
}

export interface CreateEmployeeResponse {
  employee: Employee;
  /** Пароль показывается один раз сразу после создания. */
  password: string;
}

export interface ResetPasswordResponse {
  password: string;
}
