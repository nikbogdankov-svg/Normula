import type { RequestOptions } from './client';
import type { HelloResponse } from '@/features/hello/types';

/**
 * In-memory обработчики для mock-режима: фронт полностью работает без бэка.
 *
 * Добавляя фичу, регистрируй её эндпоинты здесь по образцу ниже —
 * тогда фича сразу работает в `npm run dev:mock` без Logto и бэкенда.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function handleMockRequest<T>(path: string, options: RequestOptions): Promise<T> {
  await delay(250); // имитация сети, чтобы были видны лоадеры

  const method = options.method ?? 'GET';
  const [route, search] = path.split('?');
  const params = new URLSearchParams(search);

  // onemoreadmin.v1.OnemoreAdminService/Hello
  if (route === '/hello' && method === 'GET') {
    const response: HelloResponse = { greeting: `hello, ${params.get('name') ?? ''} (mock)` };
    return response as T;
  }

  throw new Error(`mock: нет обработчика для ${method} ${path} — добавь в mock-handlers.ts`);
}
