/** Домен рабочей почты сотрудника — фиксированный постфикс в форме. */
export const WORK_EMAIL_DOMAIN = '@pitaniye.ru';

/** Локальная часть до @ для отображения в инпуте. */
export function workEmailLocalPart(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return '';
  if (trimmed.endsWith(WORK_EMAIL_DOMAIN)) {
    return trimmed.slice(0, -WORK_EMAIL_DOMAIN.length);
  }
  const at = trimmed.indexOf('@');
  return at === -1 ? trimmed : trimmed.slice(0, at);
}

/** Собирает полный адрес из локальной части. */
export function toWorkEmail(localPart: string): string {
  const local = localPart.trim().replace(/@.*$/u, '');
  return local ? `${local}${WORK_EMAIL_DOMAIN}` : '';
}
