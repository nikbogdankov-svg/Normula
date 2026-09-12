# Backend ТЗ: Диеты, Объекты, Меню, ТТК

Разделы живут в `mock-handlers` и обслуживаются из памяти. Чтобы перевести их на
реальный бэк, нужны ручки по контрактам ниже плюс схема БД. Все разделы —
**организационные**: организация приходит из токена (`urn:logto:organization:<id>`),
`organizationId` в URL не передаётся.

Отдельно про «Продукты» и склад: ТТК опирается на справочник продуктов
(`/v1/products`) и на цену из приходных — см.
[backend-requirements-diets-products.md](./backend-requirements-diets-products.md).

---

## 1. Общие требования

1. **Протокол** — тот же gRPC-gateway + REST, что у остальных ручек
   (`onemoreadmin.proto`). Пути и поля — camelCase на проводе.
2. **Организационная изоляция** — все записи скоупированы по организации из
   токена; межорганизационных данных нет.
3. **Ошибки** — стандартный формат проекта (HTTP-код + детали); фронт показывает
   `e.message`.
4. **PATCH** — частичное обновление только переданных полей, отсутствующие —
   сохраняют текущее значение. Исключение: там, где в контракте явно требуется
   полная структура (например `UpdateSubObjectRequest` передаёт всю иерархию).
5. **Soft-delete** — `DELETE ...?mode=soft|immediate`. `soft` (по умолчанию):
   запись скрывается из списков, но продолжает резолвиться по `id` там, где на
   неё ссылаются другие разделы, до конца текущего расчётного периода.
   `immediate`: удаляется сразу и из связанных разделов.
6. **Snapshots вместо live-вычислений** — меню хранит снимок блюда из ТТК, а ТТК
   хранит название ингредиента из справочника продуктов. Это позволяет истории
   не «поехать» при переименовании/удалении исходной записи.

---

## 2. Схема базы данных (предлагаемая)

Все сквозные таблицы начинаются с `organization_id`. Иерархия объектов:
`object → sub_object → department → diet_table`. Котлы объединяют подобъекты
разных объектов (`kettle_number`).

```sql
-- enum'ы
CREATE TYPE facility_type  AS ENUM ('school','kindergarten','hospital');
CREATE TYPE meal_id        AS ENUM ('breakfast','second_breakfast','lunch','snack','dinner');
CREATE TYPE menu_source    AS ENUM ('object','own');
CREATE TYPE menu_status    AS ENUM ('draft','active');

-- ── Справочники ────────────────────────────────────────────────────────────

CREATE TABLE diets (
  id              text PRIMARY KEY,
  organization_id text NOT NULL,
  name            text NOT NULL,
  applies_to      facility_type[] NOT NULL,        -- минимум 1
  meal_ids        meal_id[],                       -- пусто = все приёмы
  price_per_day   numeric(10,2) NOT NULL CHECK (price_per_day >= 0),
  kcal            numeric(10,1) NOT NULL DEFAULT 0,
  protein         numeric(10,1) NOT NULL DEFAULT 0,
  fat             numeric(10,1) NOT NULL DEFAULT 0,
  carbs           numeric(10,1) NOT NULL DEFAULT 0,
  deleted_at      timestamptz
);

CREATE TABLE collections (                        -- сборники рецептур (ТТК)
  id              text PRIMARY KEY,
  organization_id text NOT NULL,
  name            text NOT NULL
);

-- ── ТТК ────────────────────────────────────────────────────────────────────

CREATE TABLE recipes (
  id                 text PRIMARY KEY,
  organization_id    text NOT NULL,
  name               text NOT NULL,
  collection_id      text REFERENCES collections(id) ON DELETE SET NULL,  -- NULL = карта вручную
  collection_name    text NOT NULL DEFAULT '',     -- снимок названия сборника
  portion_yield      text NOT NULL DEFAULT '',     -- «90/50»
  recipe             text NOT NULL DEFAULT '',     -- технология приготовления
  price              numeric(10,2) NOT NULL DEFAULT 0,
  kcal               numeric(10,1) NOT NULL DEFAULT 0,
  output_per_portion text NOT NULL DEFAULT '',
  output_per_100     text NOT NULL DEFAULT '',
  nutrition          jsonb NOT NULL DEFAULT '{}',  -- {protein,fat,carbs,kcal,vitaminC}
  deleted_at         timestamptz
);

CREATE TABLE recipe_ingredients (
  id               text PRIMARY KEY,
  recipe_id        text NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position         int  NOT NULL,                  -- порядок строки раскладки
  product_id       text REFERENCES products(id)  ON DELETE SET NULL,  -- пусто — не связан
  name             text NOT NULL,                  -- снимок названия продукта
  gross_per_portion text NOT NULL DEFAULT '',
  net_per_portion   text NOT NULL DEFAULT '',
  gross_per_100     text NOT NULL DEFAULT '',
  net_per_100       text NOT NULL DEFAULT '',
  price_per_kg      text NOT NULL DEFAULT ''       -- строка, как в макете
);

-- ── Меню (цикловое) ────────────────────────────────────────────────────────

CREATE TABLE menus (
  id              text PRIMARY KEY,
  organization_id text NOT NULL,
  name            text NOT NULL,
  diet_id         text REFERENCES diets(id) ON DELETE SET NULL,  -- NULL пока = diet_name
  diet_name       text NOT NULL DEFAULT '',        -- текущий снимок названия диеты
  start_date      date  NOT NULL,                  -- первый день цикла
  cycle_days      int   NOT NULL CHECK (cycle_days >= 1),
  status          menu_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE menu_slots (
  id        text PRIMARY KEY,
  menu_id   text NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  day       int  NOT NULL CHECK (day >= 0),        -- 0..cycle_days-1
  meal_id   meal_id NOT NULL,
  UNIQUE (menu_id, day, meal_id)
);

CREATE TABLE menu_slot_dishes (
  slot_id      text NOT NULL REFERENCES menu_slots(id) ON DELETE CASCADE,
  position     int  NOT NULL,
  recipe_id    text REFERENCES recipes(id) ON DELETE SET NULL,  -- снимок, блюдо может быть удалено
  name         text NOT NULL,                  -- снимок из ТТК
  kcal         numeric(10,1) NOT NULL,
  price        numeric(10,2) NOT NULL,         -- себестоимость порции на момент добавления
  protein      numeric(10,1) NOT NULL,
  fat          numeric(10,1) NOT NULL,
  carbs        numeric(10,1) NOT NULL,
  portion_yield text NOT NULL,
  PRIMARY KEY (slot_id, position)
);

-- ── Объекты ────────────────────────────────────────────────────────────────

CREATE TABLE objects (
  id              text PRIMARY KEY,
  organization_id text NOT NULL,
  name            text NOT NULL,
  type            facility_type NOT NULL DEFAULT 'kindergarten',
  menu_id         text REFERENCES menus(id),
  meal_ids        meal_id[],                       -- deprecated: приёмы в диетах
  deleted_at      timestamptz
);

CREATE TABLE sub_objects (
  id             text PRIMARY KEY,
  object_id      text NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  name           text NOT NULL,
  address        text NOT NULL DEFAULT '',
  type           facility_type NOT NULL,
  kettle_number  int  NOT NULL DEFAULT 0,      -- одинаковый номер = общий котёл
  menu_source    menu_source NOT NULL DEFAULT 'object',
  menu_id        text REFERENCES menus(id),    -- заполнен при menu_source='own'
  meal_ids       meal_id[],                    -- deprecated: приёмы в диетах
  deleted_at     timestamptz
);

-- Группа/класс принадлежит объекту ИЛИ подобъекту (ровно один внешний ключ).
CREATE TABLE departments (
  id             text PRIMARY KEY,
  sub_object_id  text REFERENCES sub_objects(id) ON DELETE CASCADE,
  object_id      text REFERENCES objects(id)   ON DELETE CASCADE,
  name           text NOT NULL,
  meal_ids       meal_id[],
  CHECK (num_nonnulls(sub_object_id, object_id) = 1)
);

CREATE TABLE diet_tables (                      -- «рацион + численность» внутри группы
  id              text PRIMARY KEY,
  department_id   text NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name            text NOT NULL,               -- «Основная», «Щадящая» …
  headcount       int  NOT NULL DEFAULT 0 CHECK (headcount >= 0)
);

-- ── Порционник (численность на дату) ───────────────────────────────────────

CREATE TABLE portions (
  organization_id text NOT NULL,
  date            date NOT NULL,
  sub_object_id   text NOT NULL REFERENCES sub_objects(id),
  department_id   text NOT NULL REFERENCES departments(id),
  table_id        text NOT NULL REFERENCES diet_tables(id),
  headcount       int  NOT NULL CHECK (headcount >= 0),
  PRIMARY KEY (organization_id, date, sub_object_id, department_id, table_id)
);
```

---

## 3. Диеты (`/v1/diets`)

Справочник рационов. Создаются здесь, используются в «Объектах» и «Меню» —
**по `id`**, название для показа берётся из справочника.

### Сущность

```proto
message Diet {
  string id = 1;
  string name = 2;
  repeated string applies_to = 3; // school | kindergarten | hospital, минимум 1
  repeated string meal_ids = 4;   // пусто = все приёмы
  double price_per_day = 5;
  double kcal = 6;
  double protein = 7;
  double fat = 8;
  double carbs = 9;
}
```

### Ручки

| Метод  | Путь             | Тело / параметры        | Ответ                                                |
| ------ | ---------------- | ----------------------- | ---------------------------------------------------- |
| GET    | `/v1/diets`      | —                       | `{ diets: Diet[], usedIn: Record<string, boolean> }` |
| POST   | `/v1/diets`      | `CreateDietRequest`     | `{ diet: Diet }`                                     |
| PATCH  | `/v1/diets/{id}` | `UpdateDietRequest`     | `{ diet: Diet }`                                     |
| DELETE | `/v1/diets/{id}` | `?mode=soft\|immediate` | `{}`                                                 |

`CreateDietRequest = UpdateDietRequest` = поля `Diet` без `id`.

### Валидация

- `name` — обязательное, непустое.
- `applies_to` — минимум 1, значения строго из enum.
- `meal_ids` — опционально, значения строго из enum.
- `price_per_day >= 0`.

### `usedIn`

Фронт при удалении показывает подсказку, используются ли диета в объектах / меню.
Бэкенд возвращает `usedIn[{id}] = true`, если на диету ссылается хотя бы один
`objects.menu_id`, `sub_objects.menu_id`, `menus.diet_id` или `diet_tables.name`,
совпадающий с названием диеты (пока диеты связаны по строке — см. раздел 7).

---

## 4. Объекты (`/v1/objects`)

Иерархия: `CateringObject → SubObject → Department → DietTable`.
`Department` есть и у объекта (группы/классы самого объекта), и у подобъекта.
Часть данных объекта дублируется в подобъектах этого же контура (адрес, тип).

### Сущности

```proto
message CateringObject {
  string id = 1;
  string name = 2;
  repeated string meal_ids = 3;    // например у школ приёмов меньше
  string menu_id = 4;              // своё меню объекта
  repeated Department departments = 5;
  repeated SubObject sub_objects = 6;
}

message SubObject {
  string id = 1;
  string name = 2;
  string address = 3;              // корпус / короткий адрес
  string type = 4;                 // school | kindergarten | hospital
  int32 kettle_number = 5;         // общий номер = общий котёл
  string menu_source = 6;          // object | own
  string menu_id = 7;              // если menu_source = 'own'
  repeated string meal_ids = 8;    // пусто = как у объекта
  repeated Department departments = 9;
}

message Department {
  string id = 1;
  string name = 2;
  repeated string meal_ids = 3;    // пусто/undefined — все приёмы
  repeated DietTable tables = 4;
}

message DietTable {
  string id = 1;
  string name = 2;                 // «Основная», «Щадящая» …
  int32 headcount = 3;
}
```

### Ручки

| Метод | Путь                                 | Тело / параметры                 | Ответ                           |
| ----- | ------------------------------------ | -------------------------------- | ------------------------------- |
| GET   | `/v1/objects`                        | —                                | `{ objects: CateringObject[] }` |
| POST  | `/v1/objects`                        | `CreateObjectRequest`            | `{ object: CateringObject }`    |
| PATCH | `/v1/objects/{id}`                   | `UpdateObjectRequest` (= create) | `{ objects }`                   |
| DELETE| `/v1/objects/{id}`                   | `?mode=soft\|immediate`          | `{ objects }`                   |
| PATCH | `/v1/objects/sub-objects/{id}`       | `UpdateSubObjectRequest`         | `{ objects }`                   |
| DELETE| `/v1/objects/sub-objects/{id}`       | `?mode=soft\|immediate`          | `{ objects }`                   |
| POST  | `/v1/objects/{objectId}/sub-objects` | `{ name: string }`               | `{ objects }`                   |
| PATCH | `/v1/objects/menu`                   | `UpdateObjectMenuRequest`        | `{ objects }`                   |
| PATCH | `/v1/objects/tables/headcount`       | `UpdateTableHeadcountRequest`    | `{ objects }`                   |
| GET   | `/v1/objects/distribution`           | —                                | `DistributionPreviewResponse`   |

```proto
// Создание объекта: название, своё меню, группы с рационами.
// Приёмы пищи задаются в диетах, у объекта не заполняются.
message CreateObjectRequest {
  string name = 1;
  string type = 2;                         // school | kindergarten | hospital
  string menu_id = 3;                      // опционально
  repeated ObjectDepartmentRequest departments = 4;
}

message ObjectDepartmentRequest {
  string id = 1;
  string name = 2;
  repeated DietTable tables = 4;           // без headcount при создании объекта
  reserved 3;                              // meal_ids — приёмы живут в диетах
}

// Обновление подобъекта — полная структура без численности.
message UpdateSubObjectRequest {
  string name = 1;
  string address = 2;
  string type = 3;
  int32 kettle_number = 4;
  string menu_source = 5;
  string menu_id = 6;
  repeated string meal_ids = 7;            // опционально: приёмы в диетах, поле для обратной совместимости
  repeated Department departments = 8;     // таблицы без headcount
}

message UpdateObjectMenuRequest {
  string object_id = 1;                    // ровно один из object_id/sub_object_id
  string sub_object_id = 2;
  string menu_id = 3;
  repeated string meal_ids = 4;
}

// Численность: точный адрес строки по иерархии.
message UpdateTableHeadcountRequest {
  string object_id = 1;
  string sub_object_id = 2;
  string department_id = 3;
  string table_id = 4;
  int32 headcount = 5;
}

// Выход на раздачу (ОБЪЕКТ-04): раздача по котлам/группам.
message DistributionRow {
  string dish_name = 1;
  string object_name = 2;
  string sub_object_name = 3;
  string department_name = 4;
  string table_name = 5;
  string kettle_label = 6;                 // «Котел N» — клиентский формат
  int32 portions = 7;
}
```

### Семантика

- `kettle_number` — номер котла, общий у разных подобъектов организации;
  группировка «Выход на раздачу» строится по нему.
- Численность (`portions`) — это срок жизни из `diet_tables.headcount`
  (структура), а на конкретную дату — из `portions` (порционник): там даты
  перекрывают при необходимости фактическую численность.
- Приёмы пищи задаются **только в диетах**; на уровне объекта/подобъекта они не выбираются и не передаются (места по «сетке меню» сервер получает из назначенных диет).
- Удаление объекта/подобъекта: `mode=soft` — скрыть из справочника, записи в порционнике/меню остаются до конца периода; `mode=immediate` — убрать сразу и из связанных разделов.

---

## 5. Меню (`/v1/menus`)

Цикловое меню: сетка `day × meal_id`, в ячейке — снимки блюд из ТТК.

### Сущности

```proto
message MenuDishRef {   // СНИМОК из ТТК — блюдо может измениться или удалиться
  string recipe_id = 1;
  string name = 2;
  double kcal = 3;
  double price = 4;      // себестоимость порции на момент добавления
  double protein = 5;
  double fat = 6;
  double carbs = 7;
  string portion_yield = 8;
}

message MenuSlot {
  int32 day = 1;                       // 0..cycle_days-1
  string meal_id = 2;
  repeated MenuDishRef dishes = 3;
}

message CycleMenu {
  string id = 1;
  string name = 2;
  string diet_name = 3;                // пока строка; в БД — снимок + ссылка diet_id
  string start_date = 4;               // YYYY-MM-DD
  int32 cycle_days = 5;
  string status = 6;                   // draft | active
  string created_at = 7;
  repeated MenuSlot slots = 8;
}
```

### Ручки

| Метод | Путь                   | Тело / параметры        | Ответ                           |
| ----- | ---------------------- | ----------------------- | ------------------------------- |
| GET   | `/v1/menus`            | —                       | `{ menus: CycleMenu[], total }` |
| GET   | `/v1/menus/{id}`       | —                       | `{ menu: CycleMenu }`           |
| POST  | `/v1/menus`            | `CreateMenuRequest`     | `{ menu: CycleMenu }`           |
| PATCH | `/v1/menus/{id}`       | `UpdateMenuRequest`     | `{ menu: CycleMenu }`           |
| PUT   | `/v1/menus/{id}/slots` | `UpdateMenuSlotRequest` | `{ menu: CycleMenu }`           |

```proto
message CreateMenuRequest {
  string name = 1;
  string diet_name = 2;
  string start_date = 3;
  int32 cycle_days = 4;
}

message UpdateMenuRequest {   // частичное
  string name = 1;
  string diet_name = 2;
  string start_date = 3;
  int32 cycle_days = 4;
}

message UpdateMenuSlotRequest {   // зависимая замена содержимого одной ячейки
  int32 day = 1;
  string meal_id = 2;
  repeated MenuDishRef dishes = 3;
}
```

### Семантика

- `PUT /slots` — замена всех блюд ячейки за одну операцию (не patch):
  старые dish-строки удаляются, приходят новые.
- `status` — черновик/активен; активация подключает меню к отдаче.
- Блюдо в меню — всегда снимок. При PATCH-редактировании ячейки фронт
  отправляет актуальный `MenuDishRef` из ТТК целиком.

---

## 6. ТТК (`/v1/ttk`, `/v1/ttk-collections`)

### Сущности

```proto
message Recipe {
  string id = 1;
  string name = 2;
  string collection_name = 3;   // снимок; пусто у карт, заведённых вручную
  string collection_id = 4;
  string portion_yield = 5;     // «90/50»
  double price = 6;             // себестоимость порции, ₽
  double kcal = 7;
  string recipe = 8;            // технология приготовления
  repeated Ingredient ingredients = 9;
  string output_per_portion = 10;
  string output_per_100 = 11;
  Nutrition nutrition = 12;     // {protein, fat, carbs, kcal, vitaminC}
}

message Ingredient {
  string name = 1;              // снимок названия продукта
  string product_id = 2;        // ссылка на Product.id; пусто — не связан
  string gross_per_portion = 3;
  string net_per_portion = 4;
  string gross_per_100 = 5;
  string net_per_100 = 6;
  string price_per_kg = 7;      // строка, как в макете
}
```

### Ручки

| Метод  | Путь                         | Тело / параметры                                      | Ответ                           |
| ------ | ---------------------------- | ----------------------------------------------------- | ------------------------------- |
| GET    | `/v1/ttk`                    | `?search=&collectionId=&sort=&order=&page=&pageSize=` | `ListRecipesResponse`           |
| POST   | `/v1/ttk`                    | `CreateRecipeRequest`                                 | `{ recipe: Recipe }`            |
| PATCH  | `/v1/ttk/{id}`               | `UpdateRecipeRequest` (= create)                      | `{ recipe: Recipe }`            |
| DELETE | `/v1/ttk/{id}`               | `?mode=soft\|immediate`                               | `{}`                            |
| GET    | `/v1/ttk-collections`        | —                                                     | `{ collections: Collection[] }` |
| POST   | `/v1/ttk-collections/import` | `ImportCollectionsRequest`                            | `{ imported: int32 }`           |

Параметры `GET /v1/ttk`:

| Параметр       | Тип    | Значение по умолч. | Описание                       |
| -------------- | ------ | ------------------ | ------------------------------ |
| `search`       | string | `''`               | Подстрока названия карты       |
| `collectionId` | string | `''`               | Фильтр по сборнику; `''` = все |
| `sort`         | string | `'name'`           | `name \| price`                |
| `order`        | string | `'asc'`            | `asc \| desc`                  |
| `page`         | int    | `1`                | 1-based                        |
| `pageSize`     | int    | `10`               |                                |

Ответ `ListRecipesResponse`: `{ recipes, total, page, pageSize }`.

```proto
message CreateRecipeRequest {
  string name = 1;
  string portion_yield = 2;
  string recipe = 3;                        // технология
  repeated CreateRecipeIngredient ingredients = 4;
}

message CreateRecipeIngredient {   // в форме создания — без «на 100 г»
  string name = 1;
  string product_id = 2;
  string gross_per_portion = 3;
  string net_per_portion = 4;
}
```

После создания/обновления бэкенд возвращает полную `Recipe` с рассчитанными
`price`, `kcal`, `nutrition`, `output_per_*` (расчёт — на стороне бэка).

---

## 7. Связи между разделами (критично)

```
diets ─────▶ menus (diet_id / diet_name snapshot)
recipes ───▶ menus (menu_slot_dishes: snack, снимок MenuDishRef)
products ──▶ recipes (recipe_ingredients.product_id, название-снимок)
menus ─────▶ objects / sub_objects (menu_id)
diet_tables ◀── (пока строкой diet name → кандидат на diets.id)
objects ───▶ portions (численность на дату по дереву объекта)
```

1. **Диеты и ТТК/Меню** — связь должна идти по `id` (когда диеты переедут с
   `diet_name` → `diet_id`), а не по строке, чтобы переименование не разрывало
   связи. Пока на фронте диета в объекте/меню — строка, поэтому при `soft`
   удалении диеты продолжают резолвить название.
2. **Продукты и ТТК** — `Ingredient.product_id` — жёсткая ссылка на `Product.id`,
   `Ingredient.name` — снимок для показа. Переименование продукта не должно
   «расползаться» назад в историю (поэтому снимок), но при редактировании ТТК
   фронт подтянет актуальное название.
3. **ТТК и Меню** — блюдо в меню это снимок `MenuDishRef`. Если карта изменится,
   содержание слота меню не меняется, пока слот не пересохранён.
4. **Объекты и Порционник** — `portions` привязывается к узлам объекта
   (подобъект/группа/стол). Удаление узла дерева должно чистить и порционник.
5. **`mode=immediate`** для любой сущности каскадно удаляет зависимости, для
   `soft` — зависимости сохраняются и резолвятся до конца расчётного периода.

---

## 8. Чек-лист для переноса из mock

Реализовано → префикс убирается из `MOCKED_PREFIXES` в `mock-handlers.ts`,
запросы пойдут по сети без правок в фичах. После реализации проверить:

- [ ] `/v1/diets` (включая `usedIn`) — раздел 3
- [ ] `/v1/objects` и все PATCH-ручки дерева объектов — раздел 4
- [ ] `/v1/objects/distribution` — раздача по котлам
- [ ] `/v1/menus` + `PUT /v1/menus/{id}/slots` — раздел 5
- [ ] `/v1/ttk` + `/v1/ttk-collections` (+ import) — раздел 6
- [ ] Расчёт `price/kcal/nutrition/output_per_*` на бэке в ТТК
- [ ] Соответствие схемы БД разделу 2
- [ ] `npm run dev:mock` продолжает работать (ручки mock не удалять)
