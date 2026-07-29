/**
 * Runtime-конфиг приложения.
 *
 * Источник — `window.__APP_CONFIG__` из `/config.js`. Файл никогда не пишется
 * руками, он рендерится из пресета среды `config/env.<APP_ENV>`:
 *  - в dev — плагином vite (см. vite.config.ts);
 *  - в stg/prod — entrypoint'ом контейнера.
 *
 * Runtime, а не import.meta.env: один Docker-образ катится во все среды,
 * конфиг подставляется на старте контейнера без пересборки.
 */

export type AuthMode = 'logto' | 'mock';

export interface LogtoSettings {
  /** Базовый URL Logto, напр. https://<tenant>.logto.app */
  endpoint: string;
  /** App ID SPA-приложения Logto (публичный идентификатор, не секрет). */
  appId: string;
  /** API resource (audience) бэкенда, напр. https://api.styleu.ru */
  apiResource: string;
}

export interface AppConfig {
  /** Имя среды: 'local' | 'stg' | 'prod'. Только для диагностики в UI и логах. */
  env: string;
  /** Базовый путь к API: всегда same-origin '/api' (dev: vite-proxy, prod: nginx). */
  apiBaseUrl: string;
  /** 'mock' — без Logto и без бэка (данные in-memory), 'logto' — по-настоящему. */
  authMode: AuthMode;
  logto?: LogtoSettings;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

function loadConfig(): AppConfig {
  const raw = window.__APP_CONFIG__;
  if (!raw) {
    throw new Error('window.__APP_CONFIG__ не найден: /config.js не отдался или не загрузился');
  }

  const authMode: AuthMode = raw.authMode === 'logto' ? 'logto' : 'mock';
  if (authMode === 'logto') {
    const missing = (['endpoint', 'appId', 'apiResource'] as const).filter((k) => !raw.logto?.[k]);
    if (missing.length > 0) {
      throw new Error(`authMode='logto', но не заданы logto.${missing.join(', logto.')}`);
    }
  }

  return {
    env: raw.env ?? 'unknown',
    apiBaseUrl: raw.apiBaseUrl ?? '/api',
    authMode,
    logto: raw.logto,
  };
}

export const config: AppConfig = loadConfig();
