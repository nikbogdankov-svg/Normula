import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Button,
  Flex,
  Icon,
  Select,
  Table,
  Text,
  TextInput,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { ArrowDown, ArrowUp, ArrowUpArrowDown, Magnifier, Plus } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useProductCategories, useProducts, type ProductSort } from './api';
import type { Product } from './types';
import { ProductDialog } from './product-dialog';
import { CreateProductDialog } from './create-product-dialog';
import './products-route.css';

const PAGE_SIZE = 20;
const ALL_CATEGORIES = 'all';

/** Раздел «Продукты»: справочник с КБЖУ на 100 г. */
export function ProductsRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const [sort, setSort] = useState<ProductSort>('name');
  const [ascending, setAscending] = useState(true);
  const [opened, setOpened] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = useProductCategories();
  const { data, isPending, isError, error, refetch } = useProducts({
    search,
    categoryId: categoryId === ALL_CATEGORIES ? '' : categoryId,
    sort,
    ascending,
    pageSize: PAGE_SIZE,
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const hasFilters = search.trim() !== '' || categoryId !== ALL_CATEGORIES;

  const onSort = (column: ProductSort) => {
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
  }, [search, categoryId, sort, ascending]);

  return (
    <div className="products-page">
      <Flex className="products-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Select
            size="l"
            width={240}
            label="Категория:"
            value={[categoryId]}
            onUpdate={(value) => {
              setCategoryId(value[0] ?? ALL_CATEGORIES);
            }}
            options={[
              { value: ALL_CATEGORIES, content: 'Все' },
              ...(categories.data?.categories ?? []).map((category) => ({
                value: category.id,
                content: category.name,
              })),
            ]}
          />
          <Button size="l" view="normal-contrast" onClick={() => setCreateOpen(true)}>
            <Icon data={Plus} size={16} />
            Создать продукт
          </Button>
        </Flex>
        <TextInput
          size="xl"
          placeholder="Поиск по названию"
          value={search}
          onUpdate={setSearch}
          hasClear
          startContent={
            <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
              <Icon data={Magnifier} size={20} />
            </span>
          }
        />
        {data && (
          <Text variant="body-1" color="secondary">
            {hasFilters ? `Найдено: ${total}` : `Всего продуктов: ${total}`}
          </Text>
        )}
      </Flex>

      <div className="products-page__scroll">
        <div className="products-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && products.length === 0 && (
            <EmptyState
              text={
                search || categoryId !== ALL_CATEGORIES
                  ? 'Ничего не нашли по заданным фильтрам'
                  : 'Продуктов пока нет'
              }
            />
          )}

          {data && products.length > 0 && (
            <ProductsTable
              products={products}
              search={search}
              sort={sort}
              ascending={ascending}
              onSort={onSort}
              onOpen={setOpened}
              categories={categories.data?.categories ?? []}
              scrollRef={scrollRef}
            />
          )}
        </div>
      </div>

      <ProductDialog product={opened} onClose={() => setOpened(null)} onProductChange={setOpened} />
      <CreateProductDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ProductsTable({
  products,
  search,
  sort,
  ascending,
  onSort,
  onOpen,
  categories,
  scrollRef,
}: {
  products: Product[];
  search: string;
  sort: ProductSort;
  ascending: boolean;
  onSort: (column: ProductSort) => void;
  onOpen: (product: Product) => void;
  categories: { id: string; name: string }[];
  scrollRef: RefObject<HTMLDivElement>;
}) {
  const categoryName = (categoryId: string) =>
    categories.find((item) => item.id === categoryId)?.name;

  const columns: TableColumnConfig<Product>[] = [
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
      id: 'categoryId',
      name: 'Категория',
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {categoryName(row.categoryId) || '—'}
        </Text>
      ),
    },
    {
      id: 'kcal',
      name: 'Ккал',
      align: 'end',
      template: (row) => <Text variant="body-2">{row.kcal}</Text>,
    },
    {
      id: 'protein',
      name: 'Белки, г',
      align: 'end',
      template: (row) => <Text variant="body-2">{row.protein}</Text>,
    },
    {
      id: 'fat',
      name: 'Жиры, г',
      align: 'end',
      template: (row) => <Text variant="body-2">{row.fat}</Text>,
    },
    {
      id: 'carbs',
      name: 'Углеводы, г',
      align: 'end',
      template: (row) => <Text variant="body-2">{row.carbs}</Text>,
    },
  ];

  return (
    <>
      <div className="products-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap" ref={scrollRef}>
        <Table
          width="max"
          className="admin-table products-page__table-body"
          data={products}
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
}: {
  label: string;
  column: ProductSort;
  sort: ProductSort;
  ascending: boolean;
  onSort: (column: ProductSort) => void;
}) {
  const active = sort === column;
  const icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpArrowDown;

  return (
    <Flex
      alignItems="center"
      justifyContent="flex-start"
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
