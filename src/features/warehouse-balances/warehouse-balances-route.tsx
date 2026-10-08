import { useMemo, useState } from 'react';
import { Flex, Icon, Text, TextInput } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, Magnifier } from '@gravity-ui/icons';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useApi } from '@/shared/api/use-api';
import { useOpenBatches } from '@/features/warehouse/api';
import { formatDate, formatMoney, formatQuantity } from '@/features/warehouse/format';
import { ObjectSelect, useObjectChoice } from '@/features/warehouse/object-select';
import type { Batch } from '@/features/warehouse/types';
import './warehouse-balances-route.css';

/** Карточка продукта: открытые партии и итог по ним. */
interface ProductCard {
  productId: string;
  productName: string;
  unit: string;
  batches: Batch[];
  /** Средняя цена остатка, взвешенная по количеству. */
  avgPrice: number;
  totalRemaining: number;
}

/** Группирует партии по продукту; поиск — по названию продукта и накладной. */
function buildCards(batches: Batch[], search: string): ProductCard[] {
  const query = search.trim().toLowerCase();
  const byProduct = new Map<string, ProductCard>();

  for (const batch of batches) {
    if (
      query &&
      !batch.productName.toLowerCase().includes(query) &&
      !batch.invoiceNumber.toLowerCase().includes(query)
    ) {
      continue;
    }

    let card = byProduct.get(batch.productId);
    if (!card) {
      card = {
        productId: batch.productId,
        productName: batch.productName,
        unit: batch.unit,
        batches: [],
        avgPrice: 0,
        totalRemaining: 0,
      };
      byProduct.set(batch.productId, card);
    }
    card.batches.push(batch);
  }

  const cards = [...byProduct.values()];
  for (const card of cards) {
    const weighted = card.batches.reduce((sum, b) => sum + b.unitPrice * b.remaining, 0);
    card.totalRemaining = card.batches.reduce((sum, b) => sum + b.remaining, 0);
    card.avgPrice = card.totalRemaining > 0 ? weighted / card.totalRemaining : 0;
  }

  return cards.sort((a, b) => a.productName.localeCompare(b.productName, 'ru'));
}

/** Раздел «Склад → Остатки»: открытые партии объекта в разрезе продуктов. */
export function WarehouseBalancesRoute() {
  const api = useApi();
  const [objectId, setObjectId] = useState('');
  const { options, objects } = useObjectChoice(objectId, setObjectId);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const batches = useOpenBatches(objectId);
  const cards = useMemo(
    () => buildCards(batches.data?.batches ?? [], search),
    [batches.data, search]
  );

  const toggleExpanded = (productId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-balances-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  const noObjects = objects.isSuccess && options.length === 0;

  return (
    <div className="warehouse-balances-page">
      <Flex justifyContent="space-between" gap={8} className="warehouse-balances-page__toolbar">
        <ObjectSelect
          value={objectId}
          onUpdate={setObjectId}
          options={options}
          disabled={objects.isPending}
        />
        <TextInput
          size="l"
          placeholder="Поиск по товару или накладной"
          value={search}
          onUpdate={setSearch}
          hasClear
          startContent={
            <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
              <Icon data={Magnifier} size={16} />
            </span>
          }
          style={{ width: 320 }}
        />
      </Flex>

      {objects.isError && (
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      )}
      {noObjects && <EmptyState text="Сначала заведите объект в справочнике «Объекты»" />}
      {!noObjects && !objects.isError && (objects.isPending || batches.isPending) && (
        <LoadingState />
      )}
      {batches.isError && (
        <ErrorState error={batches.error} onRetry={() => void batches.refetch()} />
      )}
      {batches.isSuccess && cards.length === 0 && (
        <EmptyState text={search.trim() ? 'Ничего не найдено по запросу' : 'Нет остатков'} />
      )}

      {batches.isSuccess && cards.length > 0 && (
        <div className="warehouse-balances-table">
          <div className="warehouse-balances-table__header">
            <table className="admin-table">
              <colgroup>
                <col />
                <col className="warehouse-balances-col-price" />
                <col className="warehouse-balances-col-rest" />
                <col className="warehouse-balances-col-chevron" />
              </colgroup>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className="warehouse-balances-col-price">Средняя цена</th>
                  <th className="warehouse-balances-col-rest">Остаток</th>
                  <th className="warehouse-balances-col-chevron" />
                </tr>
              </thead>
            </table>
          </div>

          <div className="warehouse-balances-table__scroll">
            <div className="admin-table-wrap">
              <table className="admin-table warehouse-balances-table__body">
                <tbody>
                  {cards.map((card) => {
                    const open = expanded.has(card.productId);
                    return (
                      <tr
                        key={card.productId}
                        className={
                          open ? 'warehouse-balances-card is-open' : 'warehouse-balances-card'
                        }
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!open) toggleExpanded(card.productId);
                        }}
                        onKeyDown={(event) => {
                          if ((event.key === 'Enter' || event.key === ' ') && !open) {
                            toggleExpanded(card.productId);
                          }
                        }}
                        title={open ? 'Свернуть' : 'Раскрыть'}
                        aria-label={open ? 'Свернуть товар' : 'Раскрыть товар'}
                        aria-expanded={open}
                      >
                        <td colSpan={4}>
                          <div className="warehouse-balances-card__summary">
                            <div className="warehouse-balances-card__name">
                              <Text variant="body-2" ellipsis>
                                <HighlightText text={card.productName} query={search} />
                              </Text>
                            </div>
                            <div className="warehouse-balances-card__price">
                              <Text variant="body-2">{formatMoney(card.avgPrice)}</Text>
                            </div>
                            <div className="warehouse-balances-card__rest">
                              <Text variant="body-2">
                                {formatQuantity(card.totalRemaining, card.unit)}
                              </Text>
                            </div>
                            <div
                              className="warehouse-balances-card__chevron"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpanded(card.productId);
                              }}
                              title={open ? 'Свернуть' : 'Раскрыть'}
                            >
                              <Icon data={open ? ChevronUp : ChevronDown} size={16} />
                            </div>
                          </div>

                          {open && (
                            <div className="warehouse-balances-card__batches">
                              <table className="warehouse-balances-batches">
                                <thead>
                                  <tr>
                                    <th>Накладная</th>
                                    <th>Дата</th>
                                    <th style={{ textAlign: 'right' }}>Цена</th>
                                    <th style={{ textAlign: 'right' }}>Приход</th>
                                    <th style={{ textAlign: 'right' }}>Остаток</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {card.batches.map((batch) => (
                                    <tr key={batch.id}>
                                      <td>
                                        <HighlightText text={batch.invoiceNumber} query={search} />
                                      </td>
                                      <td>{formatDate(batch.receiptDate)}</td>
                                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {formatMoney(batch.unitPrice)}
                                      </td>
                                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {formatQuantity(batch.quantity, card.unit)}
                                      </td>
                                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {formatQuantity(batch.remaining, card.unit)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
