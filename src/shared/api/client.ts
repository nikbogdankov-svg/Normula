import { config } from '@/shared/config';
import { i18n } from '@/shared/i18n';

/** Детали ошибки бэкенда: код для пользователя и параметры текста. */
export interface ApiErrorReason {
  /** Код ошибки (google.rpc.ErrorInfo.reason): PRODUCT_USED_IN_RECIPES и т.п. */
  reason: string;
  /** Параметры текста: строки, даты гггг-мм-дд, числа с точкой, списки JSON. */
  params: Record<string, string>;
}

/**
 * Ошибка API с HTTP-статусом — в UI удобно различать 401/403/5xx.
 *
 * message — технический текст бэкенда, пользователю его не показываем:
 * текст для человека собирает errorText по grpcCode и reason.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** gRPC-код из тела ответа (3 — InvalidArgument, 9 — FailedPrecondition…). */
    public readonly grpcCode?: number,
    public readonly details?: ApiErrorReason
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Тело ошибки grpc-gateway: статус gRPC с деталями. */
interface ErrorBody {
  code?: number;
  message?: string;
  details?: Array<{ '@type'?: string; reason?: string; metadata?: Record<string, string> }>;
}

/** Достаёт из деталей google.rpc.ErrorInfo — код ошибки для пользователя. */
function reasonOf(body: ErrorBody): ApiErrorReason | undefined {
  const info = body.details?.find((detail) => detail['@type']?.endsWith('google.rpc.ErrorInfo'));
  if (!info?.reason) return undefined;

  return { reason: info.reason, params: info.metadata ?? {} };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Bearer-токен; подставляет useApi, руками обычно не нужен. */
  token?: string;
  signal?: AbortSignal;
}

/**
 * Единая точка HTTP-общения с бэкендом. Функция чистая: токен приходит
 * аргументом, base URL — из runtime-конфига.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Язык интерфейса, а не браузера: на нём бэкенд отправляет письма,
  // которые вызывает запрос (приглашения сотрудникам и администраторам).
  const headers: Record<string, string> = { 'Accept-Language': i18n.language };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    let message = response.statusText;
    let body: ErrorBody = {};
    try {
      body = (await response.json()) as ErrorBody;
      if (body.message) message = body.message;
    } catch {
      // тело не JSON — оставляем statusText
    }
    throw new ApiError(response.status, message, body.code, reasonOf(body));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
