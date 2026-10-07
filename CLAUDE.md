# onemore-frontend

SPA платформы StyleU. React 18 + TypeScript + Vite + Gravity UI + Logto (организации) + TanStack Query.
Владелец — бэкендер: код должен оставаться скучным, единообразным и расширяемым по шаблону.

## Команды

```bash
npm run dev        # dev-сервер; ходит на стенд stg (среда local == stg)
npm run dev:mock   # то же, но без Logto и без бэка: данные in-memory
npm run check      # typecheck + lint + prettier + build — после ЛЮБОГО изменения
npm run format     # prettier --write
```

Изменение считается готовым только после зелёного `npm run check`.

## Карта проекта

```
config/
  env.prod|stg|local     адреса сред; читают И vite, И entrypoint контейнера
docker/
  entrypoint.sh          рендерит /config.js и конфиг nginx из пресета среды
  site.conf.template     nginx: SPA + /api-прокси + кэш
  security-headers.conf.template  CSP и прочие заголовки (include в каждый location)
src/
  app/
    providers.tsx        композиция провайдеров (тема → boundary → тосты → query → auth → org)
    error-boundary.tsx   ловит ошибки рендера вместо белого экрана
    router.tsx           все маршруты; новая страница добавляется сюда
    theme.tsx            светлая/тёмная тема Gravity
    layout/app-layout.tsx  шапка: навигация (NAV), переключатель организации, выход
    routes/              страницы вне фич (лендинг, callback, 404)
  shared/
    config.ts            runtime-конфиг из window.__APP_CONFIG__ — НЕ import.meta.env
    api/client.ts        apiFetch + ApiError; в mock-режиме отвечает mock-handlers
    api/use-api.ts       useApi(): авторизованные запросы, сам подставляет токен
    api/mock-handlers.ts in-memory обработчики разделов, у которых ещё нет бэкенда
    auth/                Logto + mock реализации одного AuthContext; OrgProvider
    ui/                  Page, LoadingState/ErrorState/EmptyState, FullPageLoader
  features/
    hello/               ЕДИНСТВЕННАЯ И ЭТАЛОННАЯ ФИЧА — копируй её структуру
      types.ts           типы = контракт бэкенда (onemoreadmin.proto)
      api.ts             useQuery/useMutation поверх useApi
      hello-route.tsx    страница на Gravity-компонентах
```

Сейчас за авторизацией ровно одна страница: `GET /hello` → показывает `greeting`.
Это дымовой тест всей цепочки Logto → токен → прокси → grpc-gateway.

## Инварианты (не нарушать)

1. **Только Gravity UI.** Никаких новых UI-библиотек, css-фреймворков, styled-components.
   Свой CSS — только inline-style для отступов/раскладки или var(--g-color-*) токены.
2. **Никаких новых зависимостей** без явной просьбы владельца.
3. **Все запросы к бэку — через useApi().request().** Не вызывать fetch напрямую,
   не доставать токены руками. tokenKind='organization' — дефолт; 'api' — только
   для эндпоинтов вне организационного контекста.
4. **Конфиг — только из shared/config.ts** (runtime). import.meta.env не используется:
   один Docker-образ катится во все среды. Адрес среды меняется ТОЛЬКО
   в `config/env.<среда>` — ни в коде, ни в nginx-шаблоне, ни в Dockerfile.
5. **queryKey организационного запроса всегда включает api.organizationId** —
   иначе при смене организации покажутся чужие данные из кэша. Для запросов
   с tokenKind='api' (как /hello) organizationId в ключе не нужен.
6. **Моки — только для разделов, у которых ещё нет бэкенда.** Пока ручки нет,
   её эндпоинты живут в mock-handlers.ts, а префикс — в MOCKED_PREFIXES. Как
   только ручка появилась на сервере, её моки удаляются целиком (обработчики,
   сид-данные, префикс) — фича ходит только в бэк. Из-за этого в
   npm run dev:mock такие разделы не работают, и это ожидаемо.
   Исключение — справочник с бэком, который читают разделы, ещё живущие на
   моках, и их мок-данные завязаны на мок-записи. Тогда остаётся мок-двойник:
   только GET под `/v1/mock/<раздел>` и хук `useMock<X>` для этих разделов.
   Двойник удаляется вместе с моками последнего раздела, который его читает.
   Сейчас все разделы на бэке, `MOCKED_PREFIXES` пуст.
7. Тексты интерфейса — на русском. Код и идентификаторы — на английском.

## Рецепт: добавить фичу «X» (страница со списком/формой)

1. `src/features/x/types.ts` — типы запросов/ответов по контракту бэка
   (сверяйся с `api/**/*.proto` соответствующего сервиса).
2. `src/features/x/api.ts` — хуки useX/useCreateX по образцу features/hello/api.ts
   (queryKey с organizationId, инвалидация после мутаций).
3. `src/features/x/x-route.tsx` — страница: Page → Loading/Error/Empty → контент.
4. Роут в `src/app/router.tsx` (children раздела /app) + пункт в NAV
   в `src/app/layout/app-layout.tsx`.
5. Если бэкенда ещё нет — обработчики в `src/shared/api/mock-handlers.ts` и
   префикс в MOCKED_PREFIXES (см. инвариант 6); если есть — моков не пишем.
6. `npm run check`.

## Gravity UI: справка

**Полная документация компонентов установленной версии лежит в
`node_modules/@gravity-ui/uikit/build/docs/INDEX.md` — читай её, а не полагайся
на память: API между версиями меняется.**

Опорные факты:
- Импорты: `import { Button, Table, TextInput } from '@gravity-ui/uikit'`.
- Иконки: `import { Gear } from '@gravity-ui/icons'` → `<Icon data={Gear} size={16} />`.
  У Icon НЕТ пропа name.
- Темы: только `light | dark | light-hc | dark-hc`. Никакого theme="default".
- Инпуты используют `onUpdate={(value) => ...}` (значение сразу), не onChange.
- Тосты: `const toaster = useToaster(); toaster.add({ name, title, theme })` —
  name обязателен и уникален в пределах смысла.
- Таблица: `<Table data={rows} columns={[{ id, name, template? }]} />` —
  это простая таблица uikit; тяжёлые гриды (@gravity-ui/table) не подключены.
- Цвета/линии — через CSS-переменные `var(--g-color-...)`, не хексы.

## Авторизация: как это работает

- `AuthProvider` (shared/auth/provider.tsx) выбирает реализацию по
  `config.authMode`: Logto (реальная) или mock (offline).
- Logto SPA: PKCE, resources=[apiResource], scopes включают
  UserScope.Organizations — поэтому доступны организационные токены.
- `OrgProvider` грузит организации пользователя (userinfo.organization_data),
  хранит выбранную в localStorage, отдаёт через useOrganizations().
- `useApi().request(path)` сам получает токен ТЕКУЩЕЙ организации
  (aud = urn:logto:organization:<id>) и ставит Authorization. Бэкенд (onemore/mwgrpc)
  из этого токена достаёт organization_id и скоупы.
- Страницы под логином — дети `<ProtectedRoute/>` в router.tsx.

Что нужно от окружения для authMode='logto':
- В Logto Console: SPA-приложение, Redirect URI `<origin>/callback`,
  Post sign-out `<origin>/`.
- `config/env.<среда>`: LOGTO_ENDPOINT, LOGTO_APP_ID, API_RESOURCE.
- Бэк доступен по /api (dev: vite-proxy, prod: nginx) — адрес в API_UPSTREAM.

## Среды

`config/env.<APP_ENV>` — единственное место, где записаны адреса. Файл в формате
`KEY=value` читают и `vite.config.ts` (dev-сервер, сборка), и `docker/entrypoint.sh`
(рендер `/config.js` и nginx-конфига). Переменная окружения важнее пресета.

| APP_ENV | сайт | API_UPSTREAM (куда идёт /api) | API_RESOURCE (aud токена) |
|---|---|---|---|
| prod | onemore.styleu.ru | https://onemoreadmin.styleu.ru | https://onemore.styleu.ru |
| stg | stg.onemore.styleu.ru | https://stg.onemoreadmin.styleu.ru | https://stg.onemore.styleu.ru |
| local (дефолт dev) | localhost:5173 | https://stg.onemoreadmin.styleu.ru | https://stg.onemore.styleu.ru |

API_RESOURCE — идентификатор ресурса в Logto, а не адрес: он обязан совпадать
с `logto.apiResource` в `internal/config/config_*.yaml` бэкенда onemore-admin,
иначе токен не пройдёт проверку audience. Реальный хост API — API_UPSTREAM,
он другой. Не «чинить» это, приравнивая одно к другому.

## Чего НЕ делать

- Не хранить токены в localStorage/стейте — их выдаёт SDK по запросу.
- Не добавлять секреты в config/env.* и /config.js: всё в браузере публично.
- Не хардкодить домены в коде и в nginx-шаблонах — только config/env.*.
- Не обходить Page/states ради «кастомного» лэйаута без просьбы владельца.
- Не менять src/shared/* под нужды одной фичи — это общий слой; если очень
  нужно, предложи изменение отдельно и объясни зачем.
