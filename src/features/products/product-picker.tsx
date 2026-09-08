import { useMemo, useState } from 'react';
import { Flex, Icon, Select, type SelectOption } from '@gravity-ui/uikit';
import { Plus } from '@gravity-ui/icons';
import { useProducts } from './api';
import type { Product } from './types';
import { CreateProductDialog } from './create-product-dialog';
import './product-picker.css';

const CREATE_OPTION = 'create-new-product';

/**
 * Автокомплит продукта из справочника.
 *
 * Используется в ТТК (состав рецепта) и в приходных склада. Позволяет выбрать
 * существующий продукт либо быстро создать новый inline, если в справочнике
 * его ещё нет. Оба источника пишут в один общий справочник.
 */
export function ProductPicker({
  value,
  valueLabel,
  placeholder = 'Выбрать продукт',
  size = 'm',
  onChange,
}: {
  /** id выбранного продукта (пусто — ничего не выбрано). */
  value?: string;
  /** Имя продукта, если id нет в справочнике (например, устаревшие приходы). */
  valueLabel?: string;
  placeholder?: string;
  size?: 's' | 'm' | 'l' | 'xl';
  onChange: (product: Product | null) => void;
}) {
  const { data, isPending } = useProducts({ pageSize: 100 });
  const [filter, setFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const products = useMemo(() => data?.products ?? [], [data]);

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, filter]);

  const selected = useMemo(
    () => value && products.find((product) => product.id === value),
    [products, value]
  );

  const exactMatch = filtered.some(
    (product) => product.name.toLowerCase() === filter.trim().toLowerCase()
  );
  const showCreate = filter.trim() !== '' && !exactMatch;

  const queryText = filter.trim();

  const options: SelectOption[] = filtered.map((product) => ({
    value: product.id,
    text: product.name,
    content: (
      <span className="product-picker__option">
        {product.name}
        {product.unit ? <span className="product-picker__unit">{product.unit}</span> : null}
      </span>
    ),
  }));

  // Выбранный продукт всегда остаётся в списке: иначе Select покажет голый id,
  // пока он не попадёт в результаты фильтра (ввод в поиске, отсутствие в каталоге).
  if (value && !options.some((option) => option.value === value)) {
    const fallback = selected ? selected.name : (valueLabel ?? value);
    options.unshift({
      value,
      text: fallback,
      content: fallback,
    });
  }

  if (showCreate) {
    options.push({
      value: CREATE_OPTION,
      text: `Создать «${queryText}»`,
      content: (
        <span className="product-picker__create-option">
          <Icon data={Plus} size={14} />
          Создать «{queryText}»
        </span>
      ),
    });
  }

  const handleSelect = (ids: string[]) => {
    const id = ids[0];
    setFilter('');
    if (id === CREATE_OPTION) {
      setCreateOpen(true);
      return;
    }
    onChange(products.find((product) => product.id === id) ?? null);
  };

  return (
    <Flex direction="column" gap={1} style={{ width: '100%' }}>
      <Select
        value={value ? [value] : []}
        filter={filter}
        size={size}
        options={options}
        onUpdate={handleSelect}
        onFilterChange={setFilter}
        filterable
        filterOption={() => true}
        hasClear
        placeholder={placeholder}
        disabled={isPending}
        className="product-picker__select"
      />

      <CreateProductDialog
        open={createOpen}
        initialName={filter.trim()}
        onClose={() => setCreateOpen(false)}
        onCreated={(product) => {
          setFilter('');
          onChange(product);
        }}
      />
    </Flex>
  );
}
