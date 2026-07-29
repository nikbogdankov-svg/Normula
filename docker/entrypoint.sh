#!/bin/sh
# Рендерит runtime-конфиг SPA и конфиг nginx перед стартом nginx.
#
# Среда выбирается переменной APP_ENV (prod|stg|local) — она указывает на
# пресет /etc/onemore/env.<APP_ENV>: это те же файлы config/env.*, что читает
# vite в dev. Любой ключ пресета переопределяется переменной окружения
# контейнера (ENV важнее пресета).
#
# Один образ катится во все среды: отличается только APP_ENV.
set -eu

# APP_ENV обязателен и дефолта у него намеренно нет. С дефолтом забытая
# переменная на stg-деплое молча подняла бы прод-конфиг (чужой Logto-appId,
# прод-API) — лучше громкое падение, чем тихо неправильная среда.
if [ -z "${APP_ENV:-}" ]; then
  echo "[entrypoint] не задан APP_ENV: укажи среду ($(ls /etc/onemore | sed 's/^env\.//' | tr '\n' '|' | sed 's/|$//'))" >&2
  exit 1
fi

PRESET="/etc/onemore/env.${APP_ENV}"

if [ ! -f "$PRESET" ]; then
  echo "[entrypoint] неизвестный APP_ENV='${APP_ENV}': нет ${PRESET}" >&2
  echo "[entrypoint] доступны: $(ls /etc/onemore | sed 's/^env\.//' | tr '\n' ' ')" >&2
  exit 1
fi

# Значение ключа из пресета. Файл — простой KEY=value, он не исполняется.
preset_get() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$PRESET" | head -n 1
}

AUTH_MODE="${AUTH_MODE:-$(preset_get AUTH_MODE)}"
API_UPSTREAM="${API_UPSTREAM:-$(preset_get API_UPSTREAM)}"
API_RESOURCE="${API_RESOURCE:-$(preset_get API_RESOURCE)}"
LOGTO_ENDPOINT="${LOGTO_ENDPOINT:-$(preset_get LOGTO_ENDPOINT)}"
LOGTO_APP_ID="${LOGTO_APP_ID:-$(preset_get LOGTO_APP_ID)}"

for key in AUTH_MODE API_UPSTREAM API_RESOURCE LOGTO_ENDPOINT LOGTO_APP_ID; do
  eval "value=\${$key}"
  if [ -z "$value" ]; then
    echo "[entrypoint] не задан ${key} (ни в ${PRESET}, ни в окружении)" >&2
    exit 1
  fi
done

# mock-режим — только для локальной разработки: в образе он означал бы
# «приложение без авторизации и без бэка», выкатывать такое нельзя.
if [ "$AUTH_MODE" != "logto" ]; then
  echo "[entrypoint] AUTH_MODE='${AUTH_MODE}' в контейнере запрещён: только 'logto'" >&2
  exit 1
fi

cat > /usr/share/nginx/html/config.js <<CFG
window.__APP_CONFIG__ = {
  "env": "${APP_ENV}",
  "apiBaseUrl": "/api",
  "authMode": "${AUTH_MODE}",
  "logto": {
    "endpoint": "${LOGTO_ENDPOINT}",
    "appId": "${LOGTO_APP_ID}",
    "apiResource": "${API_RESOURCE}"
  }
};
CFG

# Хост бэка без схемы и порта — нужен для Host-заголовка и SNI,
# потому что при proxy_pass через переменную nginx их сам не выведет.
API_UPSTREAM_HOST=$(echo "$API_UPSTREAM" | sed -e 's|^[a-zA-Z]*://||' -e 's|/.*$||' -e 's|:[0-9]*$||')

# DNS-серверы для рантайм-резолва upstream'а. NGINX_LOCAL_RESOLVERS выставляет
# штатный /docker-entrypoint.d/15-local-resolvers.envsh из /etc/resolv.conf.
RESOLVER="${RESOLVER:-${NGINX_LOCAL_RESOLVERS:-}}"
if [ -z "$RESOLVER" ]; then
  RESOLVER=$(awk '/^nameserver/ { printf "%s ", $2 }' /etc/resolv.conf)
fi
RESOLVER="${RESOLVER:-8.8.8.8}"

export API_UPSTREAM API_UPSTREAM_HOST LOGTO_ENDPOINT RESOLVER

mkdir -p /etc/nginx/snippets
envsubst '${LOGTO_ENDPOINT}' \
  < /etc/nginx/onemore-templates/security-headers.conf.template \
  > /etc/nginx/snippets/security-headers.conf
envsubst '${API_UPSTREAM} ${API_UPSTREAM_HOST} ${RESOLVER}' \
  < /etc/nginx/onemore-templates/site.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] APP_ENV=${APP_ENV} upstream=${API_UPSTREAM} resource=${API_RESOURCE}"
