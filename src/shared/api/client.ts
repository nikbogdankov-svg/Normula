import { config } from '@/shared/config';

/** Ошибка API с HTTP-статусом — в UI удобно различать 401/403/5xx. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
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
 * Единая точка HTTP-общения с бэкендом. Функция чистая: токен приходит
 * аргументом, base URL — из runtime-конфига. В mock-режиме запрос
 * перехватывает in-memory реестр (см. mock-handlers.ts) — сети нет вообще.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Полностью офлайновый режим: из памяти отвечает всё.
  if (config.authMode === 'mock') {
    const { handleMockRequest } = await import('./mock-handlers');

    return handleMockRequest<T>(path, options);
  }

  // Вход настоящий, но у части разделов бэкенда ещё нет — их обслуживаем
  // из памяти, чтобы они не отдавали 404 живому пользователю.
  if (config.mockUnimplemented) {
    const { handleMockRequest, isMocked } = await import('./mock-handlers');

    if (isMocked(path)) {
      return handleMockRequest<T>(path, options);
    }
  }

  const headers: Record<string, string> = {};
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
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // тело не JSON — оставляем statusText
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
