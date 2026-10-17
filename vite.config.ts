import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ПРОТОТИП: фронт полностью автономен — API и авторизация подменены моками
 * (src/shared/api/mock, src/shared/auth/provider.tsx). Реальный бэкенд и Logto
 * отключены, поэтому dev-сервер:
 *   - НЕ проксирует /api на стенд (прокси убран целиком);
 *   - НЕ читает config/env.<среда> и не требует ключей Logto.
 *
 * `APP_ENV` остаётся только для диагностики и карт исходников. `apiBaseUrl: '/api'`
 * сохраняется в рантайм-конфиге для совместимости, но сеть по нему не ходит.
 *
 * Чтобы вернуть реальную интеграцию, нужно восстановить прокси на API_UPSTREAM
 * и блок logto в конфиге (историю — в git).
 */
const APP_ENV = process.env.APP_ENV ?? 'local';

/** Ровно тот же формат, что рендерит docker/entrypoint.sh в контейнере. */
function renderConfigJs(): string {
  const appConfig = {
    env: APP_ENV,
    apiBaseUrl: '/api',
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
  console.info(`[onemore] APP_ENV=${APP_ENV} (моки: API и Logto отключены)`);

  return {
    plugins: [react(), runtimeConfigPlugin()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    optimizeDeps: {
      // Gravity date-* должны пре-бандлиться одной сборкой и делиться одним
      // экземпляром date-utils. Иначе esbuild заинлайнивает копию date-utils
      // в date-components, классы DateTime из двух копий не совпадают, и
      // DatePicker падает в dev: "Cannot read properties of undefined
      // (reading 'isSame')".
      include: ['@gravity-ui/date-components', '@gravity-ui/date-utils'],
    },
    // Карты исходников нужны для отладки стенда, в прод-бандл их не кладём.
    build: { sourcemap: APP_ENV !== 'prod' },
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
