# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Пресеты сред — /etc/onemore/env.<APP_ENV>; их читает entrypoint.
COPY config/ /etc/onemore/
COPY docker/site.conf.template docker/security-headers.conf.template /etc/nginx/onemore-templates/
COPY docker/entrypoint.sh /docker-entrypoint.d/40-render-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-config.sh
# Среда контейнера: prod | stg. Один образ, отличается только APP_ENV.
ENV APP_ENV=prod
EXPOSE 8080
