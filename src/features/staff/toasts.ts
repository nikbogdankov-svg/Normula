import type { useToaster } from '@gravity-ui/uikit';

type Toaster = ReturnType<typeof useToaster>;

/**
 * Соответствие технических сообщений бэкенда текстам плашки.
 *
 * Бэкенд оборачивает ошибки контекстом («create employee: …»), поэтому
 * совпадение ищется по подстроке, а не по равенству. Неопознанное сообщение
 * показывается как есть: спрятать его значило бы оставить человека гадать.
 */
const ERROR_TEXTS: [match: RegExp, title: string, hint?: string][] = [
  [/СНИЛС checksum/, 'СНИЛС неверный', 'Не сошлось контрольное число — проверьте цифры'],
  [/ИНН checksum/, 'ИНН неверный', 'Не сошлись контрольные разряды — проверьте цифры'],
  [/СНИЛС must contain/, 'СНИЛС неверный', 'В СНИЛС должно быть 11 цифр'],
  [/ИНН must contain/, 'ИНН неверный', 'В ИНН должно быть 12 цифр'],
  [/серия паспорта must contain/, 'Серия паспорта неверна', 'В серии должно быть 4 цифры'],
  [/номер паспорта must contain/, 'Номер паспорта неверен', 'В номере должно быть 6 цифр'],
  [
    /contains a non-digit/,
    'Недопустимые символы',
    'В номерах документов допустимы только цифры, пробелы, точки и дефисы',
  ],
  [/email .*is invalid|email is empty/, 'Почта указана с ошибкой', 'Проверьте адрес'],
  [/first name is empty/, 'Не заполнено имя'],
  [/last name is empty/, 'Не заполнена фамилия'],
  [/already registered/, 'Сотрудник уже зарегистрирован', 'Повторное приглашение не требуется'],
  [/already exists/, 'Такой сотрудник уже есть', 'Эта почта занята другой карточкой'],
  [
    /email was not sent/,
    'Письмо не отправилось',
    'Карточка сохранена — вышлите приглашение заново из списка',
  ],
];

export function toastError(toaster: Toaster, name: string, error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const known = ERROR_TEXTS.find(([match]) => match.test(message));

  toaster.add({
    name,
    title: known ? known[1] : 'Ошибка',
    content: known ? known[2] : message || 'Неизвестная ошибка',
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
