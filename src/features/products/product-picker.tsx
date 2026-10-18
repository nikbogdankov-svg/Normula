import { useMemo, useState, type ReactNode } from 'react';
import { Flex, Icon, Select, type SelectOption } from '@gravity-ui/uikit';
import { Plus } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { filterProducts, useProducts } from './api';
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
  placeholder,
  size = 'm',
  products,
  disabled,
  selectedHint,
  showUnitInValue = true,
  withWater = false,
  onChange,
}: {
  /** id выбранного продукта (пусто — ничего не выбрано). */
  value?: string;
  /** Имя продукта, если id нет в справочнике (например, устаревшие приходы). */
  valueLabel?: string;
  /** Подпись пустого поля; по умолчанию — общая подпись выбора продукта. */
  placeholder?: string;
  size?: 's' | 'm' | 'l' | 'xl';
  /**
   * Ограничение списка продуктов (например, продуктами выбранной партии).
   * Справочник в этом случае не используется; inline-создание отключается.
   */
  products?: Product[];
  /** Полностью отключает автокомплит (выбор партии ещё не сделан). */
  disabled?: boolean;
  /** Доп. строка справа внутри инпута рядом с выбранным продуктом. */
  selectedHint?: ReactNode;
  /** Показывать единицу измерения рядом с названием в контроле (по умолчанию да). */
  showUnitInValue?: boolean;
  /** Предлагать воду из справочника — только в составе ТТК, на складе её нет. */
  withWater?: boolean;
  onChange: (product: (Product & { unit?: string }) | null) => void;
}) {
  const { t } = useTranslation();
  const { data, isPending } = useProducts();
  const [filter, setFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const allProducts = useMemo(
    () => products ?? (data?.products ?? []).filter((product) => withWater || !product.water),
    [products, data, withWater]
  );

  const filtered = useMemo(() => filterProducts(allProducts, filter), [allProducts, filter]);

  const selected = useMemo(
    () => value && allProducts.find((product) => product.id === value),
    [allProducts, value]
  );

  const exactMatch = filtered.some(
    (product) => product.name.toLowerCase() === filter.trim().toLowerCase()
  );

  const showCreate = products === undefined && filter.trim() !== '' && !exactMatch;

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
      text: t('products.createOption', { query: queryText }),
      content: (
        <span className="product-picker__create-option">
          <Icon data={Plus} size={14} />
          {t('products.createOption', { query: queryText })}
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
    onChange(allProducts.find((product) => product.id === id) ?? null);
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
        placeholder={placeholder ?? t('products.pickPlaceholder')}
        disabled={disabled || (products === undefined && isPending)}
        renderSelectedOption={(option) => (
          <Flex
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            style={{ width: '100%' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {showUnitInValue ? (option.content ?? option.text ?? '') : (option.text ?? '')}
            </span>
            {selectedHint ? (
              <span
                style={{
                  flexShrink: 0,
                  color: 'var(--g-color-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedHint}
              </span>
            ) : null}
          </Flex>
        )}
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
