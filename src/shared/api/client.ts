import { mockApiFetch } from './mock/handlers';
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

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Bearer-токен; подставляет useApi, руками обычно не нужен. */
  token?: string;
  signal?: AbortSignal;
}

/**
 * Единая точка HTTP-общения с бэкендом. В мок-режиме все запросы
 * обрабатываются локальным диспетчером без сетевых вызовов.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Язык интерфейса прокидываем в мок-слой для совместимости.
  void i18n.language;
  return mockApiFetch<T>(path, options);
}
