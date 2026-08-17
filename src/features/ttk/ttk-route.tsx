import { useState } from 'react';
import { Button, Flex, Icon, Pagination, Select, Text, TextInput, Table } from '@gravity-ui/uikit';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpArrowDown,
  ArrowUpFromSquare,
  Magnifier,
  Plus,
  Printer,
} from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useCollections, useRecipes, type RecipeSort } from './api';
import type { Recipe } from './types';
import { RecipeDialog } from './recipe-dialog';
import { CreateRecipeDialog } from './create-recipe-dialog';
import { ImportCollectionsDialog } from './import-dialog';
import './ttk-route.css';

const ALL_COLLECTIONS = 'all';

const getDefaultPageSize = () => {
  if (typeof window === 'undefined') {
    return 20;
  }

  const availableHeight = window.innerHeight - 280;
  const rowCount = Math.max(10, Math.floor(availableHeight / 48));

  return Math.min(50, rowCount);
};

/** Раздел ТТК: панель фильтров закреплена, скроллится таблица. */
export function TtkRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [collectionId, setCollectionId] = useState(ALL_COLLECTIONS);
  const [sort, setSort] = useState<RecipeSort>('name');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => getDefaultPageSize());
  const [opened, setOpened] = useState<Recipe | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const collections = useCollections();
  const { data, isPending, isError, error, refetch } = useRecipes({
    search,
    collectionId: collectionId === ALL_COLLECTIONS ? '' : collectionId,
    sort,
    ascending,
    page,
    pageSize,
  });

  const onSort = (column: RecipeSort) => {
    if (sort === column) {
      setAscending((value) => !value);
    } else {
      setSort(column);
      setAscending(true);
    }
    setPage(1);
  };

  return (
    <div className="ttk-page">
      <Flex
        className="ttk-page__toolbar"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        wrap
      >
        <Flex alignItems="center" gap={2} wrap>
          <TextInput
            size="l"
            placeholder="Поиск по имени"
            value={search}
            onUpdate={(value) => {
              setSearch(value);
              setPage(1);
            }}
            hasClear
            startContent={
              <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                <Icon data={Magnifier} size={16} />
              </span>
            }
            style={{ width: 300 }}
          />
          <Select
            size="l"
            width={260}
            label="Сборник:"
            value={[collectionId]}
            onUpdate={(value) => {
              setCollectionId(value[0] ?? ALL_COLLECTIONS);
              setPage(1);
            }}
            options={[
              { value: ALL_COLLECTIONS, content: 'Все' },
              ...(collections.data?.collections ?? []).map((collection) => ({
                value: collection.id,
                content: collection.name,
              })),
            ]}
          />
        </Flex>

        <Flex alignItems="center" gap={2}>
          <Button size="l" view="normal-contrast" onClick={() => window.print()} title="Печать">
            <Icon data={Printer} size={16} />
          </Button>
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

      <div className="ttk-page__scroll">
        <div className="ttk-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && data.recipes.length === 0 && (
            <EmptyState text={search ? `Ничего не нашли по запросу «${search}»` : 'Карт ТТК пока нет'} />
          )}

          {data && data.recipes.length > 0 && (
            <RecipesTable
              recipes={data.recipes}
              search={search}
              sort={sort}
              ascending={ascending}
              onSort={onSort}
              onOpen={setOpened}
            />
          )}
        </div>

        {data && !isPending && data.total > 0 && (
          <div className="ttk-page__footer">
            <Text variant="body-1" color="secondary">
              Всего: {data.total}
            </Text>
            <Pagination
              page={Math.min(page, Math.max(1, Math.ceil(data.total / pageSize)))}
              pageSize={pageSize}
              total={data.total}
              pageSizeOptions={[10, 20, 50]}
              onUpdate={(nextPage, nextPageSize) => {
                const maxPage = Math.max(1, Math.ceil(data.total / nextPageSize));
                setPage(Math.min(Math.max(1, nextPage), maxPage));
                setPageSize(nextPageSize);
              }}
            />
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
}: {
  recipes: Recipe[];
  search: string;
  sort: RecipeSort;
  ascending: boolean;
  onSort: (column: RecipeSort) => void;
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table"
        data={recipes}
        onRowClick={(row) => onOpen(row)}
        columns={[
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
              <Text variant="subheader-2">
                <HighlightText text={row.name} query={search} />
              </Text>
            ),
          },
          {
            id: 'collection',
            name: 'Сборник',
            template: (row) => <Text variant="body-2">{row.collectionName || '—'}</Text>,
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
        ]}
      />
    </div>
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
