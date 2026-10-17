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
 *
 * ПРОТОТИП: настройки Logto больше не нужны — авторизация и API подменены
 * моковыми, поэтому конфиг не требует никаких ключей. Если `window.__APP_CONFIG__`
 * не загрузился, приложение всё равно стартует со значениями по умолчанию.
 */

export interface AppConfig {
  /** Имя среды: 'local' | 'stg' | 'prod'. Только для диагностики в UI и логах. */
  env: string;
  /** Базовый путь к API: всегда same-origin '/api' (dev: vite-proxy, prod: nginx). */
  apiBaseUrl: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

function loadConfig(): AppConfig {
  const raw = window.__APP_CONFIG__ ?? {};

  return {
    env: raw.env ?? 'local',
    apiBaseUrl: raw.apiBaseUrl ?? '/api',
  };
}

export const config: AppConfig = loadConfig();
