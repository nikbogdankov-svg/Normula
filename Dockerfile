# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
# Без кеш-маунта: на слабом хосте битый/переполненный /root/.npm роняет npm
# с «Exit handler never called». Слой всё равно кешируется по package-lock.json.
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
RUN npm ci --loglevel=error
COPY . .
RUN NODE_OPTIONS=--max-old-space-size=1024 npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Пресеты сред — /etc/onemore/env.<APP_ENV>; их читает entrypoint.
COPY config/ /etc/onemore/
COPY docker/site.conf.template docker/security-headers.conf.template /etc/nginx/onemore-templates/
COPY docker/entrypoint.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh

# Среда задаётся ТОЛЬКО снаружи: APP_ENV=prod|stg. Дефолта нет специально —
# см. комментарий в entrypoint.sh. Один образ на все среды.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1
