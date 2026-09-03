# Backend requirements: «Диеты» и «Продукты»

Разделы-справочники, которые сейчас живут в `mock-handlers` и обслуживаются
из памяти. Чтобы перевести их на реальный бэк, нужны ручки по контрактам ниже.
Оба раздела — **организационные**: идентификация организации приходит из токена
(`urn:logto:organization:<id>`), как у остальных ручек.

---

## 1. Диеты (`/v1/diets`)

### Сущность

```proto
// Диета (рацион питания организации).
message Diet {
  string id = 1;
  // Название рациона, например «Основной», «Безглютеновый».
  string name = 2;
  // Типы учреждений, для которых доступна диета.
  repeated string applies_to = 3; // school | kindergarten | hospital
  // Приёмы пищи, для которых доступна диета; пусто = все.
  repeated string meal_ids = 4;   // breakfast | second_breakfast | lunch | snack | dinner
  // Норма цены на день на человека, ₽.
  double price_per_day = 5;
  // Норма калорийности на день, ккал.
  double kcal = 6;
  // Норма белков / жиров / углеводов на день, г.
  double protein = 7;
  double fat = 8;
  double carbs = 9;
}
```

- `applies_to` — enum `FacilityType { school, kindergarten, hospital }`.
- `meal_ids` — enum `MealId { breakfast, second_breakfast, lunch, snack, dinner }`
  (совпадает с приёмами пищи в меню). Фронт трактует **пустой список = «для всех
  приёмов»**.

### Ручки

| Метод | Путь | Тело / параметры | Ответ |
|-------|------|------------------|-------|
| GET | `/v1/diets` | — | `{ diets: Diet[] }` |
| POST | `/v1/diets` | `CreateDietRequest` | `{ diet: Diet }` |
| PATCH | `/v1/diets/{id}` | `UpdateDietRequest` | `{ diet: Diet }` |
| DELETE | `/v1/diets/{id}` | `?mode=soft\|immediate` | `{}` |

Запросы создания/обновления — те же поля, что и у сущности:

```proto
message CreateDietRequest {
  string name = 1;
  repeated string applies_to = 2;
  repeated string meal_ids = 3;
  double price_per_day = 4;
  double kcal = 5;
  double protein = 6;
  double fat = 7;
  double carbs = 8;
}
```

`UpdateDietRequest` = `CreateDietRequest`.

### Валидация

- `name` — обязательное, непустое.
- `applies_to` — минимум 1 элемент; значения строго из enum `FacilityType`.
- `meal_ids` — опционально; если есть, значения строго из enum `MealId`.
- `price_per_day` — обязательное, `>= 0`.

### Удаление и `mode`

- `mode=soft` (по умолчанию): диета **скрывается из справочника** (GET не
  отдаёт), но остаётся привязанной к объектам/меню до конца текущего
  расчётного периода.
- `mode=immediate`: удаляется **сразу и из всех разделов** (меню, объекты).
- 404, если диеты с таким id нет.

### Что учесть при реализации удаления

Диета связывается с другими разделами **по `id`**, а название берётся из
справочника. Ожидаемое (пока не подключено во фронте полностью, но заложено
в модели) использование:

- **Объекты**: `DietTable.name` — строка с названием рациона, `DIET_CATALOG`
  (захардкожен на фронте «Объектов») — кандидат на замену ссылкой на `Diet.id`.
- **Меню**: `CycleMenu.dietName` — строка; при полной интеграции должен стать
  ссылкой на `Diet.id` (чтобы смена названия диеты не разрывала связь).
- При `soft`-удалении важно, чтобы эти разделы продолжали резолвить название
  диеты по id.

---

## 2. Продукты (`/v1/products`, `/v1/product-categories`)

### Сущность

```proto
// Категория продукта (бакалея, овощи, мясо и т.п.).
message ProductCategory {
  string id = 1;
  string name = 2;
}

// Продукт с пищевой ценностью на 100 г.
message Product {
  string id = 1;
  string name = 2;
  string category_id = 3; // -> ProductCategory.id
  // Калорийность / белки / жиры / углеводы на 100 г.
  double kcal = 4;
  double protein = 5;
  double fat = 6;
  double carbs = 7;
  // Витамин С на 100 г, мг.
  double vitamin_c = 8;
}
```

Справочник продуктов — источник КБЖУ: из него меню и ТТК берут пищевую
ценность.

### Ручки

| Метод | Путь | Тело / параметры | Ответ |
|-------|------|------------------|-------|
| GET | `/v1/product-categories` | — | `{ categories: ProductCategory[] }` |
| GET | `/v1/products` | query, см. ниже | `{ products, total, page, pageSize }` |
| POST | `/v1/products` | `CreateProductRequest` | `{ product: Product }` |
| PATCH | `/v1/products/{id}` | `UpdateProductRequest` | `{ product: Product }` |
| DELETE | `/v1/products/{id}` | `?mode=soft\|immediate` | `{}` |

### GET `/v1/products` — параметры (пагинация, поиск, сортировка)

| Параметр | Тип | Значение по умолч. | Описание |
|----------|-----|--------------------|----------|
| `search` | string | `''` | Подстрока названия, регистронезависимо |
| `categoryId` | string | `''` | Фильтр по категории; пусто = все |
| `sort` | string | `name` | `name \| kcal \| protein \| fat \| carbs` |
| `order` | string | `asc` | `asc \| desc` |
| `page` | int | `1` | 1-based номер страницы |
| `pageSize` | int | `20` | Размер страницы (фронт шлёт 20) |

Ответ:

```proto
message ListProductsResponse {
  repeated Product products = 1;
  int32 total = 2;
  int32 page = 3;
  int32 page_size = 4;
}
```

### Валидация

- `POST / PATCH`:
  - `name` — обязательное, непустое.
  - `categoryId` — обязательное, ссылка на существующую категорию.
  - числовые поля (`kcal`, `protein`, `fat`, `carbs`, `vitamin_c`) — `>= 0`.
- `GET`:
  - `sort` — только из списка выше (неизвестное значение → 400 или фолбэк на `name`).
  - `page >= 1`, `pageSize >= 1`.

### Удаление и `mode`

- `mode=soft` (по умолчанию): продукт скрывается из справочника, но остаётся
  в ТТК/меню и других разделах до конца недели (текущего периода).
- `mode=immediate`: удаляется сразу из всех разделов.
- 404, если продукта с таким id нет.

### Что учесть: ссылки на продукт из других разделов

Сейчас продукт связан с другими разделами **по `productId`** (мягкая ссылка,
название продублировано строкой):

- **ТТК**: `Ingredient.name` — строка с названием (на роль FK идёт кандидат —
  заменить на `Product.id`).
- **Склад**: `ReceiptItem.productId`, `BalanceItem.productId`, `WriteOffItem.productId`.
- При `soft`-удалении эти разделы должны продолжать резолвить название продукта
  по id.
- Переименование продукта сейчас не «расползается» на ТТК (связь по строке) —
  при переходе на `Product.id` это станет консистентным автоматически.

---

## Общие требования к обоим разделам

1. **Организационная изоляция** — все данные скоупированы по организации из
   токена; `organizationId` в URL не передавать.
2. **Протокол** — тот же gRPC-gateway + REST, что и у остальных ручек
   (`onemoreadmin.proto`). Пути и поля в camelCase на проводе, как указано выше.
3. **Ошибки** — стандартный формат ошибок проекта (HTTP-код + детали);
   фронт показывает `e.message`.
4. **Идемпотентность** — `PATCH` обновляет только переданные поля (частичное
   обновление), отсутствующие — сохраняют текущее значение.
5. **Soft-удаление** — должно быть реализовано бэкендом с учётом хранения
   связей (см. разделы выше), а не только скрытием из списка.
6. После реализации префикс пути убирается из `MOCKED_PREFIXES` в
   `mock-handlers.ts`, запросы пойдут по сети без правок в фичах.