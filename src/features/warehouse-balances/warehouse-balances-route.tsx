import { useEffect, useMemo, useState } from 'react';
import { Card, Flex, Icon, Select, Text, TextInput } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, Magnifier } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { HighlightText } from '@/shared/ui/highlight-text';
import { useApi } from '@/shared/api/use-api';
import { useCateringObjects } from '@/features/objects/api';
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
  const objects = useCateringObjects();
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    return result;
  }, [data, search]);

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
          <div className="warehouse-balances-header-row">
            <Text
              variant="body-2"
              color="secondary"
              className="warehouse-balances-header-row__name"
            >
              Товар
            </Text>
            <Text
              variant="body-2"
              color="secondary"
              className="warehouse-balances-header-row__price"
            >
              Средняя цена
            </Text>
            <Text
              variant="body-2"
              color="secondary"
              className="warehouse-balances-header-row__rest"
            >
              Остаток
            </Text>
            <div className="warehouse-balances-header-row__arrow" />
          </div>
        </div>

        <div className="warehouse-balances-table__scroll">
          <div className="warehouse-balances-list">
            {cards.map((card) => {
              const open = expanded.has(card.productName);
              return (
                <div key={card.productName} className="warehouse-balances-card">
                  <div
                    className="warehouse-balances-card__summary"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpanded(card.productName)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        toggleExpanded(card.productName);
                      }
                    }}
                    title={open ? 'Свернуть' : 'Раскрыть'}
                    aria-label={open ? 'Свернуть товар' : 'Раскрыть товар'}
                    aria-expanded={open}
                  >
                    <Text variant="body-2" ellipsis className="warehouse-balances-card__name">
                      <HighlightText text={card.productName} query={search} />
                    </Text>
                    <Text variant="body-2" className="warehouse-balances-card__price">
                      {card.avgPrice} ₽
                    </Text>
                    <Text variant="body-2" className="warehouse-balances-card__rest">
                      {card.totalRemaining} {card.unit}
                    </Text>
                    <Icon data={open ? ChevronUp : ChevronDown} size={16} />
                  </div>

                  {open && (
                    <div className="warehouse-balances-card__detail">
                      {card.batches.length === 0 ? (
                        <Text
                          variant="body-2"
                          color="secondary"
                          style={{ display: 'block', padding: '12px 16px' }}
                        >
                          Нет партий по запросу
                        </Text>
                      ) : (
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Партия</th>
                                <th>Дата</th>
                                <th style={{ width: 80, textAlign: 'right' }}>Цена</th>
                                <th style={{ width: 96, textAlign: 'right' }}>Остаток</th>
                              </tr>
                            </thead>
                            <tbody>
                              {card.batches.map((batch, index) => (
                                <tr
                                  key={batch.batchId}
                                  className={
                                    index === card.batches.length - 1 ? 'admin-table__row_last' : ''
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

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
