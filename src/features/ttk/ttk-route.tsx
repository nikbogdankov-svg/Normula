import { useMemo, useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  Select,
  Text,
  TextInput,
  Table,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpArrowDown,
  ArrowUpFromSquare,
  Magnifier,
  Plus,
} from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { formatMoney } from '@/features/warehouse/format';
import { useRecipes } from './api';
import type { RecipeSummary } from './types';
import { RecipeDialog } from './recipe-dialog';
import { CreateRecipeDialog } from './create-recipe-dialog';
import { ImportCollectionsDialog } from './import-dialog';
import './ttk-route.css';

const ALL_COLLECTIONS = 'all';
/** Пункт фильтра для карт с пустым названием сборника. */
const NO_COLLECTION = 'none';

type RecipeSort = 'name' | 'price';

/** Карты по фильтрам и сортировке; всё на клиенте, список приходит целиком. */
function filterRecipes(
  recipes: RecipeSummary[],
  search: string,
  collection: string,
  sort: RecipeSort,
  ascending: boolean
): RecipeSummary[] {
  const query = search.trim().toLowerCase();

  const found = recipes.filter((recipe) => {
    if (collection === NO_COLLECTION && recipe.collectionName !== '') return false;
    if (collection !== ALL_COLLECTIONS && collection !== NO_COLLECTION) {
      if (recipe.collectionName !== collection) return false;
    }
    if (!query) return true;

    return (
      recipe.name.toLowerCase().includes(query) || recipe.cardName.toLowerCase().includes(query)
    );
  });

  const direction = ascending ? 1 : -1;

  return found.sort((a, b) => {
    if (sort === 'price') return (a.price - b.price) * direction;

    return a.name.localeCompare(b.name, 'ru') * direction;
  });
}

/** Раздел ТТК: панель фильтров закреплена, скроллится таблица. */
export function TtkRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState(ALL_COLLECTIONS);
  const [sort, setSort] = useState<RecipeSort>('name');
  const [ascending, setAscending] = useState(true);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = useRecipes();

  const all = useMemo(() => data?.recipes ?? [], [data]);

  const collectionOptions = useMemo(() => {
    const names = [...new Set(all.map((recipe) => recipe.collectionName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'ru')
    );
    const hasEmpty = all.some((recipe) => recipe.collectionName === '');

    return [
      { value: ALL_COLLECTIONS, content: 'Все' },
      ...(hasEmpty ? [{ value: NO_COLLECTION, content: 'Без сборника' }] : []),
      ...names.map((name) => ({ value: name, content: name })),
    ];
  }, [all]);

  const recipes = useMemo(
    () => filterRecipes(all, search, collection, sort, ascending),
    [all, search, collection, sort, ascending]
  );
  const hasFilters = search.trim() !== '' || collection !== ALL_COLLECTIONS;

  const onSort = (column: RecipeSort) => {
    if (sort === column) {
      setAscending((value) => !value);
    } else {
      setSort(column);
      setAscending(true);
    }
  };

  return (
    <div className="ttk-page">
      <Flex className="ttk-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Select
            size="l"
            width={260}
            label="Сборник:"
            value={[collection]}
            onUpdate={(value) => setCollection(value[0] ?? ALL_COLLECTIONS)}
            options={collectionOptions}
          />

          <Flex alignItems="center" gap={2}>
            <Button size="l" view="normal-contrast" onClick={() => setImportOpen(true)}>
              <Icon data={ArrowUpFromSquare} size={16} />
              Импорт сборника
            </Button>
            <Button size="l" view="normal-contrast" onClick={() => setCreateOpen(true)}>
              <Icon data={Plus} size={16} />
              Создать ТТК
            </Button>
          </Flex>
        </Flex>
        <Flex direction="column" gap={2}>
          <TextInput
            size="xl"
            placeholder="Поиск по названию блюда или карты"
            value={search}
            onUpdate={setSearch}
            hasClear
            startContent={
              <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                <Icon data={Magnifier} size={20} />
              </span>
            }
            style={{ width: '100%' }}
          />
          {data && (
            <Text variant="body-1" color="secondary">
              {hasFilters ? `Найдено: ${recipes.length} ТТК` : `Всего ТТК: ${all.length}`}
            </Text>
          )}
        </Flex>
      </Flex>

      <div className="ttk-page__scroll">
        <div className="ttk-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && recipes.length === 0 && (
            <EmptyState
              text={hasFilters ? 'Ничего не нашли по заданным фильтрам' : 'Карт ТТК пока нет'}
            />
          )}

          {data && recipes.length > 0 && (
            <RecipesTable
              recipes={recipes}
              search={search}
              sort={sort}
              ascending={ascending}
              onSort={onSort}
              onOpen={(recipe) => setOpenedId(recipe.id)}
            />
          )}
        </div>
      </div>

      <RecipeDialog
        recipeId={openedId}
        onClose={() => setOpenedId(null)}
        onRecipeChange={setOpenedId}
      />
      <ImportCollectionsDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <CreateRecipeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function RecipesTable({
  recipes,
  search,
  sort,
  ascending,
  onSort,
  onOpen,
}: {
  recipes: RecipeSummary[];
  search: string;
  sort: RecipeSort;
  ascending: boolean;
  onSort: (column: RecipeSort) => void;
  onOpen: (recipe: RecipeSummary) => void;
}) {
  const columns: TableColumnConfig<RecipeSummary>[] = [
    {
      id: 'name',
      name: () => (
        <SortableHeader
          label="Название"
          column="name"
          sort={sort}
          ascending={ascending}
          onSort={onSort}
        />
      ),
      template: (row) => (
        <Flex direction="column">
          <Text variant="body-2">
            <HighlightText text={row.name} query={search} />
          </Text>
          {row.cardName && (
            <Text variant="body-1" color="secondary">
              <HighlightText text={row.cardName} query={search} />
            </Text>
          )}
        </Flex>
      ),
    },
    {
      id: 'collection',
      name: 'Сборник',
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {row.collectionName || '—'}
        </Text>
      ),
    },
    {
      id: 'price',
      name: () => (
        <SortableHeader
          label="Цена"
          column="price"
          sort={sort}
          ascending={ascending}
          onSort={onSort}
          alignEnd
        />
      ),
      align: 'end',
      template: (row) => <Text variant="body-2">{formatMoney(row.price)}</Text>,
    },
    {
      id: 'kcal',
      name: () => (
        <Flex alignItems="center" justifyContent="flex-end" style={{ width: '100%' }}>
          <Text variant="body-2" color="secondary">
            Ккал
          </Text>
        </Flex>
      ),
      align: 'end',
      template: (row) => <Text variant="body-2">{row.kcal}</Text>,
    },
  ];

  return (
    <>
      <div className="ttk-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap">
        <Table
          width="max"
          className="admin-table ttk-page__table-body"
          data={recipes}
          onRowClick={(row) => onOpen(row)}
          columns={columns}
        />
      </div>
    </>
  );
}

function SortableHeader({
  label,
  column,
  sort,
  ascending,
  onSort,
  alignEnd,
}: {
  label: string;
  column: RecipeSort;
  sort: RecipeSort;
  ascending: boolean;
  onSort: (column: RecipeSort) => void;
  alignEnd?: boolean;
}) {
  const active = sort === column;
  const icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpArrowDown;

  return (
    <Flex
      alignItems="center"
      justifyContent={alignEnd ? 'flex-end' : 'flex-start'}
      gap={1}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(column)}
      title={
        active
          ? ascending
            ? 'По возрастанию — нажмите для убывания'
            : 'По убыванию — нажмите для возрастания'
          : `Сортировать по: ${label}`
      }
    >
      {label}
      <span
        style={{
          display: 'inline-flex',
          color: active ? 'var(--g-color-text-primary)' : 'var(--g-color-text-secondary)',
        }}
      >
        <Icon data={icon} size={14} />
      </span>
    </Flex>
  );
}
