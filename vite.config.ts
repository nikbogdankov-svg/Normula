import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Настройки среды берутся из `config/env.<APP_ENV>` — из тех же файлов, что
 * читает entrypoint контейнера. Один источник правды для dev, сборки и прода.
 *
 *   APP_ENV=local (по умолчанию) → stg.onemore.styleu.ru  ← локально = как на стенде
 *   APP_ENV=stg                  → stg.onemore.styleu.ru
 *   APP_ENV=prod                 → onemore.styleu.ru
 *
 * Любой ключ переопределяется одноимённой переменной окружения:
 *   API_UPSTREAM=http://localhost:8080 npm run dev
 *   AUTH_MODE=mock npm run dev
 */
const APP_ENV = process.env.APP_ENV ?? 'local';

type EnvKey =
  | 'AUTH_MODE'
  | 'API_UPSTREAM'
  | 'API_RESOURCE'
  | 'LOGTO_ENDPOINT'
  | 'LOGTO_APP_ID'
  | 'MOCK_UNIMPLEMENTED';

function readPreset(env: string): Record<string, string> {
  const file = path.resolve(__dirname, 'config', `env.${env}`);
  if (!fs.existsSync(file)) {
    throw new Error(`Неизвестный APP_ENV='${env}': нет файла config/env.${env}`);
  }
  const preset: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) preset[match[1]] = match[2];
  }
  return preset;
}

const preset = readPreset(APP_ENV);
const setting = (key: EnvKey): string => process.env[key] ?? preset[key] ?? '';

const authMode = setting('AUTH_MODE') || 'logto';
const apiUpstream = setting('API_UPSTREAM');

if (authMode === 'logto') {
  const missing = (['API_RESOURCE', 'LOGTO_ENDPOINT', 'LOGTO_APP_ID'] as const).filter(
    (key) => !setting(key)
  );
  if (missing.length > 0) {
    throw new Error(`APP_ENV='${APP_ENV}': не заданы ${missing.join(', ')}`);
  }
}

/** Ровно тот же формат, что рендерит docker/entrypoint.sh в контейнере. */
function renderConfigJs(): string {
  const appConfig = {
    env: APP_ENV,
    apiBaseUrl: '/api',
    authMode,
    mockUnimplemented: setting('MOCK_UNIMPLEMENTED') === 'true',
    logto: {
      endpoint: setting('LOGTO_ENDPOINT'),
      appId: setting('LOGTO_APP_ID'),
      apiResource: setting('API_RESOURCE'),
    },
  };
  return `window.__APP_CONFIG__ = ${JSON.stringify(appConfig, null, 2)};\n`;
}

/**
 * Отдаёт /config.js dev-серверу и кладёт его в dist при сборке.
 * В контейнере файл перезаписывает entrypoint — образ один на все среды.
 */
function runtimeConfigPlugin(): Plugin {
  return {
    name: 'onemore:runtime-config',
    configureServer(server) {
      // Пресет читается один раз при старте vite, поэтому следим за файлом
      // сами: без этого правка config/env.* тихо не доезжает до браузера.
      const presetFile = path.resolve(__dirname, 'config', `env.${APP_ENV}`);
      server.watcher.add(presetFile);
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === presetFile) {
          server.config.logger.info(`[onemore] изменился config/env.${APP_ENV} — перезапуск`);
          void server.restart();
        }
      });

      server.middlewares.use('/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(renderConfigJs());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'config.js', source: renderConfigJs() });
    },
  };
}

export default defineConfig(() => {
  console.info(`[onemore] APP_ENV=${APP_ENV} authMode=${authMode} api=${apiUpstream}`);

  return {
    plugins: [react(), runtimeConfigPlugin()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    // Карты исходников нужны для отладки стенда, в прод-бандл их не кладём.
    build: { sourcemap: APP_ENV !== 'prod' },
    server: {
      port: 5173,
      // Порт — часть redirect URI, зарегистрированного в Logto. Если 5173
      // занят, vite по умолчанию молча уехал бы на 5174, и вход упал бы с
      // невнятным invalid_redirect_uri. Лучше сразу отказаться стартовать.
      strictPort: true,
      // Браузер ходит same-origin /api → CORS не нужен ни в dev, ни в prod.
      proxy: {
        '/api': {
          target: apiUpstream,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});
