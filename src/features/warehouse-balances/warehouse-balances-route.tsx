import { useEffect, useMemo, useState } from 'react';
import { Card, Flex, Icon, Select, Text, TextInput } from '@gravity-ui/uikit';
import {
  ChevronDown,
  ChevronUp,
  Magnifier,
  ArrowDown,
  ArrowUp,
  ArrowUpArrowDown,
} from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useApi } from '@/shared/api/use-api';
import { useMockCateringObjects } from '@/features/objects/api';
import { useBalances } from './api';
import './warehouse-balances-route.css';

interface ProductBalanceCard {
  productName: string;
  unit: string;
  batches: Array<{
    batchId: string;
    batchNumber: string;
    date: string;
    remaining: number;
    price: number;
  }>;
  avgPrice: number;
  totalRemaining: number;
}

export function WarehouseBalancesRoute() {
  const api = useApi();
  const objects = useMockCateringObjects();
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nameSort, setNameSort] = useState<'asc' | 'desc'>('asc');

  const toggleExpanded = (productName: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(productName)) {
        next.delete(productName);
      } else {
        next.add(productName);
      }
      return next;
    });
  };

  useEffect(() => {
    const first = objects.data?.objects[0];
    if (first) setWarehouseId((current) => current || first.id);
  }, [objects.data]);

  const { data, isLoading, error } = useBalances(warehouseId);

  const cards = useMemo(() => {
    if (!data?.balances.length) return [];
    const query = search.trim().toLowerCase();
    const byProduct = new Map<string, ProductBalanceCard>();

    for (const balance of data.balances) {
      for (const item of balance.items) {
        let card = byProduct.get(item.productName);
        if (!card) {
          card = {
            productName: item.productName,
            unit: item.unit,
            batches: [],
            avgPrice: 0,
            totalRemaining: 0,
          };
          byProduct.set(item.productName, card);
        }
        for (const batch of item.batches) {
          if (
            query &&
            !item.productName.toLowerCase().includes(query) &&
            !batch.batchNumber.toLowerCase().includes(query)
          ) {
            continue;
          }
          card.batches.push({
            batchId: batch.batchId,
            batchNumber: batch.batchNumber,
            date: balance.date,
            remaining: batch.remaining,
            price: batch.price,
          });
        }
      }
    }

    const result: ProductBalanceCard[] = [];
    for (const card of byProduct.values()) {
      const weighted = card.batches.reduce((sum, batch) => sum + batch.price * batch.remaining, 0);
      card.totalRemaining = card.batches.reduce((sum, batch) => sum + batch.remaining, 0);
      card.avgPrice =
        card.totalRemaining > 0 ? Math.round((weighted / card.totalRemaining) * 100) / 100 : 0;
      if (card.batches.length > 0) result.push(card);
    }
    result.sort((a, b) => a.productName.localeCompare(b.productName, 'ru'));
    if (nameSort === 'desc') result.reverse();
    return result;
  }, [data, nameSort, search]);

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="warehouse-balances-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (objects.isPending) {
    return (
      <Flex justifyContent="center" style={{ padding: 48 }}>
        <Text variant="body-1">Загрузка...</Text>
      </Flex>
    );
  }

  if (objects.isError || !objects.data) {
    return (
      <Card view="filled" style={{ padding: 16 }}>
        <Text variant="body-1" color="danger">
          Ошибка: {objects.error instanceof Error ? objects.error.message : 'неизвестная ошибка'}
        </Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Flex justifyContent="center" style={{ padding: 48 }}>
        <Text variant="body-1">Загрузка...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Card view="filled" style={{ padding: 16 }}>
        <Text variant="body-1" color="danger">
          Ошибка: {error instanceof Error ? error.message : 'неизвестная ошибка'}
        </Text>
      </Card>
    );
  }

  if (!data?.balances.length) {
    return (
      <Flex direction="column" alignItems="center" gap={2} style={{ padding: '48px 24px' }}>
        <Text variant="body-1">Нет данных об остатках</Text>
      </Flex>
    );
  }

  return (
    <div className="warehouse-balances-page">
      <Flex justifyContent="space-between" gap={8} className="warehouse-balances-page__toolbar">
        <Select
          size="l"
          width={220}
          label="Объект:"
          placeholder="Выберите объект"
          value={[warehouseId]}
          onUpdate={(value) => setWarehouseId(value[0] ?? '')}
          options={
            objects.data?.objects.length
              ? objects.data.objects.map((object) => ({
                  value: object.id,
                  content: object.name,
                }))
              : []
          }
        />
        <TextInput
          size="l"
          placeholder="Поиск по товару или партии"
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
                <th>
                  <SortableHeader
                    label="Товар"
                    active
                    ascending={nameSort === 'asc'}
                    onToggle={() => setNameSort(nameSort === 'asc' ? 'desc' : 'asc')}
                  />
                </th>
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
                  const open = expanded.has(card.productName);
                  return (
                    <tr
                      key={card.productName}
                      className={
                        open ? 'warehouse-balances-card is-open' : 'warehouse-balances-card'
                      }
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!open) {
                          toggleExpanded(card.productName);
                        }
                      }}
                      onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && !open) {
                          toggleExpanded(card.productName);
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
                            <Text variant="body-2">{card.avgPrice} ₽</Text>
                          </div>
                          <div className="warehouse-balances-card__rest">
                            <Text variant="body-2">
                              {card.totalRemaining} {card.unit}
                            </Text>
                          </div>
                          <div
                            className="warehouse-balances-card__chevron"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpanded(card.productName);
                            }}
                            title={open ? 'Свернуть' : 'Раскрыть'}
                          >
                            <Icon data={open ? ChevronUp : ChevronDown} size={16} />
                          </div>
                        </div>

                        {open && (
                          <div className="warehouse-balances-card__batches">
                            {card.batches.length === 0 ? (
                              <Text
                                variant="body-2"
                                color="secondary"
                                style={{ display: 'block', padding: '4px 0 8px' }}
                              >
                                Нет партий по запросу
                              </Text>
                            ) : (
                              <table className="warehouse-balances-batches">
                                <thead>
                                  <tr>
                                    <th>Партия</th>
                                    <th>Дата</th>
                                    <th style={{ textAlign: 'right' }}>Цена</th>
                                    <th style={{ textAlign: 'right' }}>Остаток</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {card.batches.map((batch, index) => (
                                    <tr
                                      key={batch.batchId}
                                      className={
                                        index === card.batches.length - 1
                                          ? 'admin-table__row_last'
                                          : ''
                                      }
                                    >
                                      <td>
                                        <HighlightText text={batch.batchNumber} query={search} />
                                      </td>
                                      <td>{new Date(batch.date).toLocaleDateString('ru-RU')}</td>
                                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {batch.price} ₽
                                      </td>
                                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {batch.remaining} {card.unit}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {cards.length === 0 && (
              <Text variant="body-1" color="secondary" style={{ display: 'block', padding: 16 }}>
                {search.trim() ? 'Ничего не найдено по запросу' : 'Нет остатков'}
              </Text>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  ascending,
  onToggle,
}: {
  label: string;
  active: boolean;
  ascending: boolean;
  onToggle: () => void;
}) {
  const icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpArrowDown;

  return (
    <Flex
      alignItems="center"
      justifyContent="flex-start"
      gap={1}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={onToggle}
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
        <Icon data={icon} size={16} />
      </span>
    </Flex>
  );
}
