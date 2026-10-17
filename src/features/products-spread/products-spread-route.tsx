import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import {
  Button,
  Dialog,
  Flex,
  Icon,
  SegmentedRadioGroup,
  Select,
  Text,
  TextInput,
  Table,
  Tooltip,
  useToaster,
} from '@gravity-ui/uikit';
import type { TableColumnConfig } from '@gravity-ui/uikit';
import { ChevronLeft, ChevronRight, CircleCheck, Magnifier, Printer } from '@gravity-ui/icons';
import { useObjects } from '@/features/objects/api';
import { useOrganizations } from '@/shared/auth';
import { useTranslation } from '@/shared/i18n';
import { usePageObjectChoice } from '@/shared/object-selection';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useConfirmProductSpread, useProductSpread } from './api';
import { MEALS, type ProductSpreadItem } from './types';
import { buildProductSpreadPrint, downloadProductSpreadDoc } from './products-spread-print';
import './products-spread-route.css';

const ALL_OBJECTS = '__all';

/** Как показывать раскладку: секциями по приёмам пищи или таблицей по продуктам. */
type SpreadView = 'meals' | 'products';

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

/** ISO-дата в виде «ДД.ММ.ГГГГ» для печатного документа. */
function formatDisplayDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

/** Раскладка продуктов на день: тулбар закреплён, скроллится таблица. */
export function ProductsSpreadRoute() {
  const { current } = useOrganizations();
  const { t } = useTranslation();
  const objects = useObjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDate = searchParams.get('date');
  const date = ISO_DATE_RE.test(rawDate ?? '') ? (rawDate as string) : todayIso();

  const setDate = (next: string) => {
    setSearchParams(next === todayIso() ? {} : { date: next }, { replace: true });
  };

  const [viewMode, setViewMode] = useState<SpreadView>('meals');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<ProductSpreadItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toaster = useToaster();
  const confirmSpread = useConfirmProductSpread();

  // Объекты верхнего уровня, кроме складов: раскладка идёт по объекту вместе
  // с его подобъектами.
  const objectsList = useMemo(
    () =>
      (objects.data?.objects ?? []).filter(
        (object) => !object.parentObjectId && object.type !== 'warehouse'
      ),
    [objects.data]
  );
  const objectOptions = useMemo(
    () => objectsList.map((unit) => ({ value: unit.id, content: unit.name })),
    [objectsList]
  );
  const { objectId: selectedObjectId, setObjectIdLocal: setSelectedObjectId } = usePageObjectChoice(
    objectOptions,
    ALL_OBJECTS
  );
  const activeObjectId = selectedObjectId === ALL_OBJECTS ? null : selectedObjectId;

  const spread = useProductSpread(date, activeObjectId);
  const confirmed = spread.data?.confirmed ?? false;

  const onConfirm = () => {
    confirmSpread.mutate(
      { date, objectId: activeObjectId ?? undefined },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toaster.add({
            name: 'products-spread-confirmed',
            title: t('spread.confirmedToast'),
            theme: 'success',
          });
        },
        onError: (e) =>
          toaster.add({
            name: 'products-spread-confirm',
            title: t('common.error'),
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

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

  const activeObjectName =
    activeObjectId === null
      ? null
      : (objectsList.find((unit) => unit.id === activeObjectId)?.name ?? null);

  const handlePrint = () => {
    if (!spread.data) return;
    const printData = buildProductSpreadPrint(spread.data.items);
    void downloadProductSpreadDoc({
      displayDate: formatDisplayDate(date),
      objectName: activeObjectName ?? t('spread.wholeOrg'),
      ...printData,
    });
  };

  // Подтвердить списание можно только за сегодня и завтра; более поздние
  // даты — только просмотр.
  const canConfirm = date <= shiftIso(todayIso(), 1);

  return (
    <div className="products-spread-page">
      <Flex className="products-spread-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Flex alignItems="center" gap={3} wrap>
            {objectsList.length > 0 && (
              <Select
                size="l"
                width={280}
                label={t('spread.objectLabel')}
                title={t('spread.objectLabel')}
                value={[selectedObjectId]}
                onUpdate={(value) => setSelectedObjectId(value[0] ?? ALL_OBJECTS)}
                placeholder={t('spread.objectPlaceholder')}
                options={[{ value: ALL_OBJECTS, content: t('spread.wholeOrg') }, ...objectOptions]}
              />
            )}
            <Flex alignItems="center" gap={1}>
              <Button
                view="outlined"
                size="l"
                title={t('spread.prevDay')}
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
                title={t('spread.nextDay')}
                onClick={() => setDate(shiftIso(date, 1))}
              >
                <Icon data={ChevronRight} size={16} />
              </Button>
            </Flex>
          </Flex>
          <Flex alignItems="center" gap={3}>
            <SegmentedRadioGroup
              name="spread-view"
              size="l"
              value={viewMode}
              onUpdate={(value) => setViewMode(value as SpreadView)}
            >
              <SegmentedRadioGroup.Option value="meals">
                {t('spread.byMeals')}
              </SegmentedRadioGroup.Option>
              <SegmentedRadioGroup.Option value="products">
                {t('spread.byProducts')}
              </SegmentedRadioGroup.Option>
            </SegmentedRadioGroup>
            <Button
              size="l"
              view="normal-contrast"
              onClick={handlePrint}
              title={t('spread.printPdf')}
            >
              <Icon data={Printer} size={16} />
            </Button>
          </Flex>
        </Flex>
        <Flex direction="column" gap={2}>
          <TextInput
            size="xl"
            placeholder={t('spread.searchPlaceholder')}
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
          <Flex
            alignItems="flex-start"
            justifyContent="space-between"
            gap={2}
            wrap
            style={{ marginTop: 4, marginBottom: 4 }}
          >
            {spread.data && (
              <Text variant="body-1" color="secondary">
                {hasFilters
                  ? t('spread.foundProducts', { count: items.length })
                  : t('spread.totalProducts', { count: total })}
              </Text>
            )}
            {confirmed ? (
              <Text variant="body-1" color="secondary">
                {t('spread.alreadyConfirmed')}
              </Text>
            ) : (
              <Tooltip content={t('spread.confirmHint')} disabled={canConfirm} openDelay={0}>
                <span tabIndex={canConfirm ? undefined : 0}>
                  <Button
                    size="l"
                    view="action"
                    title={canConfirm ? t('spread.confirmProducts') : undefined}
                    disabled={!canConfirm}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Icon data={CircleCheck} size={16} />
                    {t('spread.confirmProducts')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Flex>
        </Flex>
      </Flex>

      <div className="products-spread-page__scroll">
        <div className="products-spread-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && loading && <LoadingState />}
          {error && <ErrorState error={undefined} onRetry={() => void spread.refetch()} />}
          {spread.data && items.length === 0 && <EmptyState text={t('spread.emptySpread')} />}
          {spread.data &&
            items.length > 0 &&
            (viewMode === 'meals' ? (
              <ProductsSpreadSections
                items={items}
                searchQuery={searchQuery}
                onSelect={setSelected}
              />
            ) : (
              <ProductsSpreadTable items={items} searchQuery={searchQuery} onSelect={setSelected} />
            ))}
        </div>
      </div>

      <ProductSpreadDialog item={selectedItem} onClose={() => setSelected(null)} />

      <ConfirmSpreadDialog
        open={confirmOpen}
        loading={confirmSpread.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
      />
    </div>
  );
}

/** Попап подтверждения списания: действие необратимо. */
function ConfirmSpreadDialog({
  open,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} size="s" className="products-spread-confirm-dialog">
      <Dialog.Header caption={t('spread.confirmTitle')} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={2}>
          <Text variant="body-2">{t('spread.confirmText')}</Text>
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer
        textButtonApply={t('common.confirm')}
        textButtonCancel={t('common.cancel')}
        loading={loading}
        onClickButtonApply={onConfirm}
        onClickButtonCancel={onClose}
      />
    </Dialog>
  );
}

/** Таблица «По продуктам»: строки-карточки продуктов, колонки — приёмы пищи.
 *  Шапка живёт отдельным блоком (всегда наверху), скроллится только тело. */
function ProductsSpreadTable({
  items,
  searchQuery,
  onSelect,
}: {
  items: ProductSpreadItem[];
  searchQuery: string;
  onSelect: (item: ProductSpreadItem) => void;
}) {
  const { t } = useTranslation();
  const columns: TableColumnConfig<ProductSpreadItem>[] = [
    {
      id: 'productName',
      name: t('spread.colProduct'),
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
      name: t(meal.labelKey),
      width: '9%',
      align: 'end' as const,
      template: (row: ProductSpreadItem) =>
        (row.byMeal[meal.id] ?? 0) > 0 ? (
          <Text variant="body-2">{formatQuantity(row.byMeal[meal.id] ?? 0, row.unit)}</Text>
        ) : (
          <Text variant="body-2" color="hint">
            —
          </Text>
        ),
    })),
    {
      id: 'total',
      name: t('spread.colTotalDay'),
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

/** Секции по приёмам пищи: завтрак/обед/… → продукты этого приёма. */
function ProductsSpreadSections({
  items,
  searchQuery,
  onSelect,
}: {
  items: ProductSpreadItem[];
  searchQuery: string;
  onSelect: (item: ProductSpreadItem) => void;
}) {
  const { t } = useTranslation();
  const sections = useMemo(
    () =>
      MEALS.map((meal) => ({
        meal,
        rows: items.filter((item) => (item.byMeal[meal.id] ?? 0) > 0),
      })).filter((section) => section.rows.length > 0),
    [items]
  );

  return (
    <div className="products-spread-sections">
      {sections.map(({ meal, rows }) => (
        <section key={meal.id} className="products-spread-section">
          <div className="products-spread-section__header">
            <Text variant="subheader-2">{t(meal.labelKey)}</Text>
          </div>
          <div className="products-spread-section__rows">
            {rows.map((row) => (
              <button
                key={row.productId}
                type="button"
                className="products-spread-row"
                onClick={() => onSelect(row)}
              >
                <span className="products-spread-row__name">
                  <Text variant="body-2" ellipsis>
                    <HighlightText text={row.productName} query={searchQuery} />
                  </Text>
                  <Text variant="body-1" color="secondary">
                    {row.unit}
                  </Text>
                </span>
                <Text variant="body-2" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {formatQuantity(row.byMeal[meal.id] ?? 0, row.unit)}
                </Text>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
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
  const { t } = useTranslation();
  return (
    <Dialog open={item !== null} onClose={onClose} size="l" className="products-spread-dialog">
      {item && (
        <>
          <Dialog.Header caption={item.productName} />
          <Dialog.Divider />
          <Dialog.Body>
            <Flex direction="column" gap={3}>
              <table className="products-spread-dishes">
                <thead>
                  <tr>
                    <th>{t('spread.colDish')}</th>
                    <th>{t('spread.colMeal')}</th>
                    <th className="products-spread-dishes__right">{t('spread.colPortions')}</th>
                    <th className="products-spread-dishes__right">{t('spread.colQuantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.dishes
                    .filter((row) => row.quantity > 0)
                    .map((row) => {
                      const mealDef = MEALS.find((meal) => meal.id === row.mealId);
                      return (
                        <tr key={`${row.mealId}-${row.dishName}`}>
                          <td>{row.dishName}</td>
                          <td>{mealDef ? t(mealDef.labelKey) : row.mealId}</td>
                          <td className="products-spread-dishes__right">{row.portions}</td>
                          <td className="products-spread-dishes__right">
                            {formatQuantity(row.quantity, item.unit)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </Flex>
          </Dialog.Body>
          <Dialog.Divider />
          <Dialog.Footer
            textButtonApply={t('spread.ok')}
            propsButtonApply={{ view: 'normal' }}
            onClickButtonApply={onClose}
          />
        </>
      )}
    </Dialog>
  );
}
