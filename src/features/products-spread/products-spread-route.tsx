import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import { Button, Dialog, Flex, Icon, Select, Text, TextInput, Table } from '@gravity-ui/uikit';
import type { TableColumnConfig } from '@gravity-ui/uikit';
import { ChevronLeft, ChevronRight, Magnifier, Printer } from '@gravity-ui/icons';
import { useCateringObjects } from '@/features/objects/api';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useProductSpread } from './api';
import { MEALS, type ProductSpreadItem } from './types';
import './products-spread-route.css';

const ALL_OBJECTS = '__all';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${unit}`;
}

/** Раскладка продуктов на день: тулбар закреплён, скроллится таблица. */
export function ProductsSpreadRoute() {
  const { current } = useOrganizations();
  const objects = useCateringObjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDate = searchParams.get('date');
  const date = ISO_DATE_RE.test(rawDate ?? '') ? (rawDate as string) : todayIso();

  const setDate = (next: string) => {
    setSearchParams(next === todayIso() ? {} : { date: next }, { replace: true });
  };

  const [selectedObjectId, setSelectedObjectId] = useState<string>(ALL_OBJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<ProductSpreadItem | null>(null);

  const objectsList = useMemo(() => objects.data?.objects ?? [], [objects.data]);
  const activeObjectId = selectedObjectId === ALL_OBJECTS ? null : selectedObjectId;

  const spread = useProductSpread(date, activeObjectId);

  const items = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source = spread.data?.items ?? [];
    if (!query) return source;
    return source.filter((item) => item.productName.toLowerCase().includes(query));
  }, [spread.data, searchQuery]);

  const selectedItem = useMemo(() => {
    if (selected === null) return null;
    return spread.data?.items.find((item) => item.productId === selected.productId) ?? selected;
  }, [selected, spread.data]);

  const total = spread.data?.items.length ?? 0;
  const hasFilters = searchQuery.trim() !== '';
  const loading = spread.isPending || objects.isPending;
  const error = spread.isError || objects.isError;

  return (
    <div className="products-spread-page">
      <Flex className="products-spread-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Flex alignItems="center" gap={3} wrap>
            <Flex alignItems="center" gap={1}>
              <Button
                view="outlined"
                size="l"
                title="Предыдущий день"
                onClick={() => setDate(shiftIso(date, -1))}
              >
                <Icon data={ChevronLeft} size={16} />
              </Button>
              <DatePicker
                size="l"
                value={dateTime({ input: date })}
                onUpdate={(value) => setDate(value ? value.format('YYYY-MM-DD') : todayIso())}
                style={{ width: 180 }}
              />
              <Button
                view="outlined"
                size="l"
                title="Следующий день"
                onClick={() => setDate(shiftIso(date, 1))}
              >
                <Icon data={ChevronRight} size={16} />
              </Button>
            </Flex>
            {objectsList.length > 0 && (
              <Select
                size="l"
                width={280}
                label="Объект:"
                title="Объект:"
                value={[selectedObjectId]}
                onUpdate={(value) => setSelectedObjectId(value[0] ?? ALL_OBJECTS)}
                placeholder="Выберите объект"
                options={[
                  { value: ALL_OBJECTS, content: 'Вся организация' },
                  ...objectsList.map((unit) => ({ value: unit.id, content: unit.name })),
                ]}
              />
            )}
          </Flex>
          <Button size="l" view="normal-contrast" onClick={() => window.print()} title="Печать">
            <Icon data={Printer} size={16} />
            Печать
          </Button>
        </Flex>
        <Flex direction="column" gap={2}>
          <TextInput
            size="xl"
            placeholder="Поиск по продуктам..."
            value={searchQuery}
            onUpdate={setSearchQuery}
            hasClear
            startContent={
              <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                <Icon data={Magnifier} size={20} />
              </span>
            }
            style={{ width: '100%' }}
          />
          {spread.data && (
            <Text variant="body-1" color="secondary">
              {hasFilters ? `Найдено: ${items.length} продуктов` : `Всего продуктов: ${total}`}
            </Text>
          )}
        </Flex>
      </Flex>

      <div className="products-spread-page__scroll">
        <div className="products-spread-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && loading && <LoadingState />}
          {error && <ErrorState error={undefined} onRetry={() => void spread.refetch()} />}
          {spread.data && items.length === 0 && (
            <EmptyState text="Раскладки нет: заполните порционник на эту дату" />
          )}
          {spread.data && items.length > 0 && (
            <ProductsSpreadTable items={items} searchQuery={searchQuery} onSelect={setSelected} />
          )}
        </div>
      </div>

      <ProductSpreadDialog item={selectedItem} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProductsSpreadTable({
  items,
  searchQuery,
  onSelect,
}: {
  items: ProductSpreadItem[];
  searchQuery: string;
  onSelect: (item: ProductSpreadItem) => void;
}) {
  const columns: TableColumnConfig<ProductSpreadItem>[] = [
    {
      id: 'productName',
      name: 'Продукт',
      width: '28%',
      template: (row) => (
        <Flex alignItems="baseline" gap={4}>
          <Text variant="body-2" ellipsis>
            <HighlightText text={row.productName} query={searchQuery} />
          </Text>
          <Text variant="body-1" color="secondary">
            {row.unit}
          </Text>
        </Flex>
      ),
    },
    ...MEALS.map((meal) => ({
      id: `meal-${meal.id}`,
      name: meal.label,
      width: '9%',
      align: 'end' as const,
      template: (row: ProductSpreadItem) => (
        <Text variant="body-2">
          {row.byMeal[meal.id] > 0 ? formatQuantity(row.byMeal[meal.id], row.unit) : '—'}
        </Text>
      ),
    })),
    {
      id: 'total',
      name: 'Всего на день',
      width: '27%',
      align: 'end',
      template: (row) => (
        <Text variant="body-2" style={{ fontWeight: 600 }}>
          {formatQuantity(row.total, row.unit)}
        </Text>
      ),
    },
  ];

  return (
    <>
      <div className="products-spread-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap">
        <Table
          width="max"
          className="admin-table products-spread-page__table-body"
          data={items}
          onRowClick={(row) => onSelect(row)}
          columns={columns}
        />
      </div>
    </>
  );
}

/** Попап с авторазбивкой выбранного продукта между блюдами. */
function ProductSpreadDialog({
  item,
  onClose,
}: {
  item: ProductSpreadItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={item !== null} onClose={onClose} size="l" className="products-spread-dialog">
      {item && (
        <>
          <Dialog.Header caption={item.productName} />
          <Dialog.Divider />
          <Dialog.Body>
            <Flex direction="column" gap={3}>
              <Text variant="body-2" color="secondary">
                Авторазбивка {formatQuantity(item.total, item.unit)} между блюдами дня
              </Text>
              <table className="products-spread-dishes">
                <thead>
                  <tr>
                    <th>Блюдо</th>
                    <th>Приём пищи</th>
                    <th className="products-spread-dishes__right">Порций</th>
                    <th className="products-spread-dishes__right">Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  {item.dishes.map((row) => (
                    <tr key={`${row.mealId}-${row.dishName}`}>
                      <td>{row.dishName}</td>
                      <td>{MEALS.find((meal) => meal.id === row.mealId)?.label}</td>
                      <td className="products-spread-dishes__right">{row.portions}</td>
                      <td className="products-spread-dishes__right">
                        {formatQuantity(row.quantity, item.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Flex>
          </Dialog.Body>
          <Dialog.Divider />
          <Dialog.Footer
            textButtonCancel="Закрыть"
            onClickButtonCancel={onClose}
            textButtonApply="ОК"
            onClickButtonApply={onClose}
          />
        </>
      )}
    </Dialog>
  );
}
