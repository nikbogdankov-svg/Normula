import { useMemo, useState } from 'react';
import {
  Button,
  Flex,
  Icon,
  Table,
  Text,
  TextInput,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { Magnifier, Pencil, Plus, TrashBin } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { filterProducts, useProducts } from './api';
import type { Product } from './types';
import { CreateProductDialog } from './create-product-dialog';
import { DeleteProductDialog, EditProductDialog } from './products-dialogs';
import './products-route.css';

/** Раздел «Продукты»: справочник SKU — название и единица закупки. */
export function ProductsRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [toEdit, setToEdit] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const { data, isPending, isError, error, refetch } = useProducts();

  // Справочник приходит целиком, поиск — по нему на клиенте.
  const products = useMemo(() => filterProducts(data?.products ?? [], search), [data, search]);
  const hasQuery = search.trim() !== '';

  return (
    <div className="products-page">
      <Flex className="products-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Text variant="body-1" color="secondary"></Text>
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
            {hasQuery ? `Найдено: ${products.length}` : `Всего продуктов: ${data.total}`}
          </Text>
        )}
      </Flex>

      <div className="products-page__scroll">
        <div className="products-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && !isPending && !isError && products.length === 0 && (
            <EmptyState text={hasQuery ? 'Ничего не нашли по запросу' : 'Продуктов пока нет'} />
          )}

          {data && products.length > 0 && (
            <ProductsTable
              products={products}
              query={search}
              onEdit={setToEdit}
              onDelete={setToDelete}
            />
          )}
        </div>
      </div>

      <CreateProductDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={noop}
      />
      <EditProductDialog product={toEdit} onClose={() => setToEdit(null)} />
      <DeleteProductDialog product={toDelete} onClose={() => setToDelete(null)} />
    </div>
  );
}

function noop() {}

function ProductsTable({
  products,
  query,
  onEdit,
  onDelete,
}: {
  products: Product[];
  query: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const columns: TableColumnConfig<Product>[] = [
    {
      id: 'name',
      name: 'Название',
      template: (row) => (
        <Text variant="body-2">
          <HighlightText text={row.name} query={query} />
        </Text>
      ),
    },
    {
      id: 'unit',
      name: 'Единица измерения',
      template: (row) => <Text variant="body-2">{row.unit}</Text>,
    },
    {
      id: 'actions',
      name: '',
      // Финальная колонка: кнопки по ширине контента, прижаты к правому краю.
      align: 'end',
      template: (row) => (
        <Flex alignItems="center" justifyContent="flex-end" gap={1}>
          <Button view="flat-secondary" size="s" title="Изменить" onClick={() => onEdit(row)}>
            <Icon data={Pencil} size={16} />
          </Button>
          <Button view="flat-secondary" size="s" title="Удалить" onClick={() => onDelete(row)}>
            <Icon data={TrashBin} size={16} />
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <div className="products-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap">
        <Table
          width="max"
          className="admin-table products-page__table-body"
          data={products}
          columns={columns}
        />
      </div>
    </>
  );
}
