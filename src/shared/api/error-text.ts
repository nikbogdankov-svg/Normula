import { i18n } from '@/shared/i18n';
import { ApiError } from './client';

/**
 * Текст ошибки для пользователя.
 *
 * Бэкенд отдаёт код ошибки (reason) и параметры, текст берётся из словаря
 * `apiErrors.<CODE>` на языке интерфейса. Нет кода или он неизвестен —
 * общий текст по gRPC-коду или HTTP-статусу. Технический message бэкенда не
 * показывается никогда.
 */
export function errorText(error: unknown): string {
  if (!(error instanceof ApiError)) {
    // fetch падает TypeError, когда до сервера не достучаться.
    return error instanceof TypeError
      ? i18n.t('apiErrors.fallback.network')
      : i18n.t('apiErrors.fallback.unknown');
  }

  if (error.details) {
    const key = `apiErrors.codes.${error.details.reason}`;
    if (i18n.exists(key)) return i18n.t(key, formatParams(error.details.params));
  }

  return i18n.t(`apiErrors.fallback.${fallbackKey(error)}`);
}

/** gRPC-коды из тела ответа grpc-gateway. */
const GRPC_FALLBACK: Record<number, string> = {
  3: 'invalidArgument',
  5: 'notFound',
  6: 'alreadyExists',
  7: 'permissionDenied',
  8: 'rateLimited',
  9: 'conflict',
  14: 'unavailable',
  16: 'unauthenticated',
};

/** Ключ общего текста: по gRPC-коду, иначе по HTTP-статусу. */
function fallbackKey(error: ApiError): string {
  if (error.grpcCode !== undefined && GRPC_FALLBACK[error.grpcCode]) {
    return GRPC_FALLBACK[error.grpcCode];
  }

  if (error.status === 401) return 'unauthenticated';
  if (error.status === 403) return 'permissionDenied';
  if (error.status === 404) return 'notFound';
  if (error.status >= 500) return 'unavailable';

  return 'unknown';
}

/**
 * Параметры бэкенда → значения для подстановки в текст. Вид значения
 * определяется именем ключа: даты (`date`, `…Date`) — дд.мм.гггг,
 * количества (`quantity`, `…Quantity`) и деньги (`…Price`, `…Amount`) — по-
 * русски с запятой, `items` — список «продукт — количество единица»,
 * `field` — подпись поля из словаря.
 */
function formatParams(params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = formatParam(key, value);
  }

  return out;
}

function formatParam(key: string, value: string): string {
  if (key === 'items') return formatItems(value);
  if (key === 'field') return i18n.t(`apiErrors.fields.${value}`, { defaultValue: value });
  if (key === 'date' || key.endsWith('Date')) return formatDate(value);
  if (key === 'quantity' || key.endsWith('Quantity')) return formatNumber(value, 3);
  if (key.endsWith('Price') || key.endsWith('Amount')) return `${formatNumber(value, 2, 2)} ₽`;

  return value;
}

/** Элемент списка items: продукт и количество в его единице. */
interface ErrorItem {
  name?: string;
  quantity?: string;
  unit?: string;
}

function formatItems(value: string): string {
  try {
    const items = JSON.parse(value) as ErrorItem[];

    return items
      .map((item) =>
        [item.name, '—', item.quantity ? formatNumber(item.quantity, 3) : '', item.unit]
          .filter(Boolean)
          .join(' ')
      )
      .join(', ');
  } catch {
    return value;
  }
}

/** гггг-мм-дд → дд.мм.гггг; другое — как есть. */
function formatDate(value: string): string {
  const [yyyy, mm, dd] = value.split('-');
  if (!yyyy || !mm || !dd) return value;

  return `${dd}.${mm}.${yyyy}`;
}

/** Число с точкой → «1 234,5»; не число — как есть. */
function formatNumber(value: string, maxDigits: number, minDigits = 0): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;

  return parsed.toLocaleString('ru-RU', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });
}
