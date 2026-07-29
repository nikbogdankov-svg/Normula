# onemore-frontend

Фронтенд платформы StyleU: React 18 + TypeScript + Vite + [Gravity UI](https://gravity-ui.com) +
Logto (авторизация с организациями) + TanStack Query.

Проект спроектирован под расширение с помощью Claude: конвенции и рецепты — в [CLAUDE.md](./CLAUDE.md).

Сейчас в приложении две страницы: лендинг с кнопкой «Войти» и — за авторизацией —
страница, которая дёргает `GET /hello` (`onemoreadmin.v1.OnemoreAdminService/Hello`)
и показывает `greeting`. Это дымовой тест цепочки Logto → токен → прокси → бэкенд.

## Быстрый старт

```bash
npm install
npm run dev        # http://localhost:5173 → ходит на стенд stg
```

Чтобы `npm run dev` работал с реальным Logto, в Logto Console у SPA-приложения
должны быть прописаны Redirect URI `http://localhost:5173/callback` и
Post sign-out redirect `http://localhost:5173/`.

## Среды

Настройки среды лежат в `config/env.<APP_ENV>` — один и тот же файл читают
и vite (dev и сборка), и entrypoint контейнера. Больше адреса нигде не дублируются.

| APP_ENV | сайт | `/api` проксируется на (API_UPSTREAM) | Logto API resource |
|---|---|---|---|
| `prod` | `onemore.styleu.ru` | `https://onemoreadmin.styleu.ru` | `https://onemore.styleu.ru` |
| `stg` | `stg.onemore.styleu.ru` | `https://stg.onemoreadmin.styleu.ru` | `https://stg.onemore.styleu.ru` |
| `local` (дефолт в dev) | `localhost:5173` | `https://stg.onemoreadmin.styleu.ru` | `https://stg.onemore.styleu.ru` |

`local` намеренно повторяет `stg`: локальный фронт ходит туда же, куда стенд.

**API_RESOURCE ≠ API_UPSTREAM, и это не опечатка.** `API_RESOURCE` — идентификатор
ресурса в Logto (`aud` токена), он совпадает с `logto.apiResource` в конфиге
бэкенда onemore-admin и не обязан быть работающим адресом. Реальный хост API —
`API_UPSTREAM`. Сайт при этом живёт на своём домене, но браузер всё равно ходит
на same-origin `/api`, а на API-хост запрос уводит nginx.

Любой ключ пресета переопределяется переменной окружения — и локально, и в контейнере:

```bash
npm run dev                 # стенд stg
npm run dev:api-local       # бэк на localhost:8080, Logto — как на stg
npm run dev:mock            # без сети и без Logto: данные in-memory
APP_ENV=prod npm run dev    # прод-контур (осторожно)
```

Браузер всегда ходит same-origin `/api` (dev — vite-proxy, prod — nginx) → CORS не нужен.

## Прод

Образ один на все среды, среду выбирает `APP_ENV`:

```bash
docker build -t onemore-frontend .

docker run -p 8080:8080 -e APP_ENV=stg  onemore-frontend   # stg.onemore.styleu.ru
docker run -p 8080:8080 -e APP_ENV=prod onemore-frontend   # onemore.styleu.ru
```

`APP_ENV` обязателен: дефолта у него нет специально, иначе забытая переменная
на stg молча подняла бы прод-конфиг. Без неё контейнер падает со списком сред.

Точечно переопределить можно переменными `API_UPSTREAM`, `API_RESOURCE`,
`LOGTO_ENDPOINT`, `LOGTO_APP_ID` — они важнее пресета. `AUTH_MODE=mock`
в контейнере запрещён (entrypoint падает): mock — только для локальной разработки.

Проверка живости — `GET /healthz`; в образе есть `HEALTHCHECK` на неё.

### Dokploy

Приложение с типом сборки **Dockerfile**, по одному на среду:

| | stg | prod |
|---|---|---|
| Branch | `staging` | `master` |
| Environment | `APP_ENV=stg` | `APP_ENV=prod` |
| Domain → Host | `stg.onemore.styleu.ru` | `onemore.styleu.ru` |
| Container Port | `8080` | `8080` |
| HTTPS / Certificate | вкл / Let's Encrypt | вкл / Let's Encrypt |

Dockerfile Path — `Dockerfile`, Docker Context Path — `.`, Docker Build Stage —
пусто. После деплоя добавь в Logto Console у соответствующего приложения
Redirect URI `https://<домен>/callback` и post sign-out `https://<домен>/`.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер (среда `local` = stg) |
| `npm run dev:mock` | dev-сервер без Logto и без бэка |
| `npm run dev:api-local` | dev-сервер против локального бэка на :8080 |
| `npm run check` | typecheck + eslint + prettier + сборка |
| `npm run format` | prettier --write |
| `npm run build:stg` / `npm run build:prod` | сборка с конкретным пресетом среды |
