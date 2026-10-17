import type { useToaster } from '@gravity-ui/uikit';
import { i18n } from '@/shared/i18n';

type Toaster = ReturnType<typeof useToaster>;

/**
 * Соответствие технических сообщений бэкенда текстам плашки.
 *
 * Бэкенд оборачивает ошибки контекстом («create employee: …»), поэтому
 * совпадение ищется по подстроке, а не по равенству. Неопознанное сообщение
 * показывается как есть: спрятать его значило бы оставить человека гадать.
 */
const ERROR_TEXTS: [match: RegExp, titleKey: string, hintKey?: string][] = [
  [/СНИЛС checksum/, 'staff.errSnilsInvalid', 'staff.errSnilsInvalidHint'],
  [/ИНН checksum/, 'staff.errInnInvalid', 'staff.errInnInvalidHint'],
  [/СНИЛС must contain/, 'staff.errSnilsLength', 'staff.errSnilsLengthHint'],
  [/ИНН must contain/, 'staff.errInnLength', 'staff.errInnLengthHint'],
  [/серия паспорта must contain/, 'staff.errPassportSeries', 'staff.errPassportSeriesHint'],
  [/номер паспорта must contain/, 'staff.errPassportNumber', 'staff.errPassportNumberHint'],
  [/contains a non-digit/, 'staff.errNonDigit', 'staff.errNonDigitHint'],
  [/email .*is invalid|email is empty/, 'staff.errEmail', 'staff.errEmailHint'],
  [/first name is empty/, 'staff.errFirstName'],
  [/last name is empty/, 'staff.errLastName'],
  [/already registered/, 'staff.errAlreadyRegistered', 'staff.errAlreadyRegisteredHint'],
  [/already exists/, 'staff.errAlreadyExists', 'staff.errAlreadyExistsHint'],
  [/email was not sent/, 'staff.errEmailNotSent', 'staff.errEmailNotSentHint'],
];

export function toastError(toaster: Toaster, name: string, error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const known = ERROR_TEXTS.find(([match]) => match.test(message));

  toaster.add({
    name,
    title: known ? i18n.t(known[1]) : i18n.t('common.error'),
    content: known
      ? known[2]
        ? i18n.t(known[2])
        : undefined
      : message || i18n.t('common.unknownError'),
    theme: 'danger',
  });
}

export function toastSuccess(
  toaster: Toaster,
  name: string,
  title: string,
  content?: string
): void {
  toaster.add({ name, title, content, theme: 'success' });
}
