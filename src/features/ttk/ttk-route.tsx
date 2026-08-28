import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
import { useCollections, useInfiniteRecipes, type RecipeSort } from './api';
import type { Recipe } from './types';
import { RecipeDialog } from './recipe-dialog';
import { CreateRecipeDialog } from './create-recipe-dialog';
import { ImportCollectionsDialog } from './import-dialog';
import './ttk-route.css';

const ALL_COLLECTIONS = 'all';
const PAGE_SIZE = 20;

/** Раздел ТТК: панель фильтров закреплена, скроллится таблица. */
export function TtkRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [collectionId, setCollectionId] = useState(ALL_COLLECTIONS);
  const [sort, setSort] = useState<RecipeSort>('name');
  const [ascending, setAscending] = useState(true);
  const [opened, setOpened] = useState<Recipe | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const collections = useCollections();
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRecipes({
    search,
    collectionId: collectionId === ALL_COLLECTIONS ? '' : collectionId,
    sort,
    ascending,
    pageSize: PAGE_SIZE,
  });

  const recipes = useMemo(() => data?.pages.flatMap((page) => page.recipes) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const hasFilters = search.trim() !== '' || collectionId !== ALL_COLLECTIONS;

  const onSort = (column: RecipeSort) => {
    if (sort === column) {
      setAscending((value) => !value);
    } else {
      setSort(column);
      setAscending(true);
    }
  };

  // Сброс прокрутки при смене фильтров или сортировки.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [search, collectionId, sort, ascending]);

  // Бесконечный скролл: подгружаем следующую страницу при приближении к концу.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="ttk-page">
      <Flex className="ttk-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Select
            size="l"
            width={260}
            label="Сборник:"
            value={[collectionId]}
            onUpdate={(value) => {
              setCollectionId(value[0] ?? ALL_COLLECTIONS);
            }}
            options={[
              { value: ALL_COLLECTIONS, content: 'Все' },
              ...(collections.data?.collections ?? []).map((collection) => ({
                value: collection.id,
                content: collection.name,
              })),
            ]}
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
            placeholder="Поиск по имени"
            value={search}
            onUpdate={(value) => {
              setSearch(value);
            }}
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
              {hasFilters ? `Найдено: ${total} ТТК` : `Всего ТТК: ${total}`}
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
              text={search ? `Ничего не нашли по запросу «${search}»` : 'Карт ТТК пока нет'}
            />
          )}

          {data && recipes.length > 0 && (
            <RecipesTable
              recipes={recipes}
              search={search}
              sort={sort}
              ascending={ascending}
              onSort={onSort}
              onOpen={setOpened}
              scrollRef={scrollRef}
              sentinelRef={sentinelRef}
            />
          )}
        </div>

        {isFetchingNextPage && (
          <div className="ttk-page__loading-more">
            <Text variant="body-2" color="secondary">
              Загрузка…
            </Text>
          </div>
        )}
      </div>

      <RecipeDialog recipe={opened} onClose={() => setOpened(null)} onRecipeChange={setOpened} />
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
  scrollRef,
  sentinelRef,
}: {
  recipes: Recipe[];
  search: string;
  sort: RecipeSort;
  ascending: boolean;
  onSort: (column: RecipeSort) => void;
  onOpen: (recipe: Recipe) => void;
  scrollRef: RefObject<HTMLDivElement>;
  sentinelRef: RefObject<HTMLDivElement>;
}) {
  const columns: TableColumnConfig<Recipe>[] = [
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
        <Text variant="body-2">
          <HighlightText text={row.name} query={search} />
        </Text>
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
      template: (row) => <Text variant="body-2">{row.price} ₽</Text>,
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
      <div className="admin-table-wrap" ref={scrollRef}>
        <Table
          width="max"
          className="admin-table ttk-page__table-body"
          data={recipes}
          onRowClick={(row) => onOpen(row)}
          columns={columns}
        />
        <div ref={sentinelRef} className="ttk-page__sentinel" />
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
