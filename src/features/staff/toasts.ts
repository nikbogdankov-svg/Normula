import type { useToaster } from '@gravity-ui/uikit';
import { ApiError } from '@/shared/api/client';
import { errorText } from '@/shared/api/error-text';
import { i18n } from '@/shared/i18n';

type Toaster = ReturnType<typeof useToaster>;

/**
 * Заголовок и подсказка плашки по коду ошибки бэкенда. Для ошибок по полю
 * (EMPLOYEE_FIELD_*) ключ — «код:поле». Остальные ошибки показываются
 * общим текстом errorText.
 */
const ERROR_TEXTS: Record<string, [titleKey: string, hintKey?: string]> = {
  EMPLOYEE_SNILS_INVALID: ['staff.errSnilsInvalid', 'staff.errSnilsInvalidHint'],
  EMPLOYEE_INN_INVALID: ['staff.errInnInvalid', 'staff.errInnInvalidHint'],
  'EMPLOYEE_FIELD_DIGITS_COUNT:snils': ['staff.errSnilsLength', 'staff.errSnilsLengthHint'],
  'EMPLOYEE_FIELD_DIGITS_COUNT:inn': ['staff.errInnLength', 'staff.errInnLengthHint'],
  'EMPLOYEE_FIELD_DIGITS_COUNT:passportSeries': [
    'staff.errPassportSeries',
    'staff.errPassportSeriesHint',
  ],
  'EMPLOYEE_FIELD_DIGITS_COUNT:passportNumber': [
    'staff.errPassportNumber',
    'staff.errPassportNumberHint',
  ],
  EMPLOYEE_FIELD_DIGITS_ONLY: ['staff.errNonDigit', 'staff.errNonDigitHint'],
  EMPLOYEE_EMAIL_INVALID: ['staff.errEmail', 'staff.errEmailHint'],
  'EMPLOYEE_FIELD_REQUIRED:email': ['staff.errEmail', 'staff.errEmailHint'],
  'EMPLOYEE_FIELD_REQUIRED:firstName': ['staff.errFirstName'],
  'EMPLOYEE_FIELD_REQUIRED:lastName': ['staff.errLastName'],
  EMPLOYEE_ALREADY_REGISTERED: ['staff.errAlreadyRegistered', 'staff.errAlreadyRegisteredHint'],
  EMPLOYEE_ALREADY_EXISTS: ['staff.errAlreadyExists', 'staff.errAlreadyExistsHint'],
  EMPLOYEE_EMAIL_TAKEN: ['staff.errAlreadyExists', 'staff.errAlreadyExistsHint'],
  INVITATION_EMAIL_NOT_SENT: ['staff.errEmailNotSent', 'staff.errEmailNotSentHint'],
};

/** Свой заголовок с подсказкой для кода ошибки, если он есть. */
function knownTexts(error: unknown): [string, string?] | undefined {
  if (!(error instanceof ApiError) || !error.details) return undefined;

  const { reason, params } = error.details;

  return ERROR_TEXTS[`${reason}:${params.field ?? ''}`] ?? ERROR_TEXTS[reason];
}

export function toastError(toaster: Toaster, name: string, error: unknown): void {
  const known = knownTexts(error);

  toaster.add({
    name,
    title: known ? i18n.t(known[0]) : i18n.t('common.error'),
    content: known ? (known[1] ? i18n.t(known[1]) : undefined) : errorText(error),
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
