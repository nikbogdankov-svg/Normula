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
import { useTranslation } from '@/shared/i18n';
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

    return recipe.name.toLowerCase().includes(query);
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
  const { t } = useTranslation();
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
      { value: ALL_COLLECTIONS, content: t('ttk.allCollections') },
      ...(hasEmpty ? [{ value: NO_COLLECTION, content: t('ttk.noCollection') }] : []),
      ...names.map((name) => ({ value: name, content: name })),
    ];
  }, [all, t]);

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
            width={280}
            label={t('ttk.collectionLabel')}
            value={[collection]}
            onUpdate={(value) => setCollection(value[0] ?? ALL_COLLECTIONS)}
            options={collectionOptions}
          />

          <Flex alignItems="center" gap={2}>
            <Button size="l" view="normal-contrast" onClick={() => setImportOpen(true)}>
              <Icon data={ArrowUpFromSquare} size={16} />
              {t('ttk.importCollection')}
            </Button>
            <Button size="l" view="normal-contrast" onClick={() => setCreateOpen(true)}>
              <Icon data={Plus} size={16} />
              {t('ttk.createTitle')}
            </Button>
          </Flex>
        </Flex>
        <Flex direction="column" gap={2}>
          <TextInput
            size="xl"
            placeholder={t('ttk.searchPlaceholder')}
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
              {hasFilters
                ? t('ttk.foundCount', { count: recipes.length })
                : t('ttk.totalCount', { count: all.length })}
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
            <EmptyState text={hasFilters ? t('ttk.nothingFound') : t('ttk.empty')} />
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
  const { t } = useTranslation();
  const columns: TableColumnConfig<RecipeSummary>[] = [
    {
      id: 'name',
      name: () => (
        <SortableHeader
          label={t('ttk.colTitle')}
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
        </Flex>
      ),
    },
    {
      id: 'collection',
      name: t('ttk.colCollection'),
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
          label={t('ttk.colPrice')}
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
            {t('ttk.colKcal')}
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
  const { t } = useTranslation();

  return (
    <Flex
      alignItems="center"
      justifyContent={alignEnd ? 'flex-end' : 'flex-start'}
      gap={1}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(column)}
      title={
        active ? (ascending ? t('ttk.sortAsc') : t('ttk.sortDesc')) : t('ttk.sortBy', { label })
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
