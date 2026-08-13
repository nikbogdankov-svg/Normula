import { useState } from 'react';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import { Card, Flex, Text, TextInput } from '@gravity-ui/uikit';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationSelectedState } from '@/shared/ui/states';

const MEALS = [
  { name: 'Завтрак', headcount: 40, cost: 16000 },
  { name: 'Обед', headcount: 45, cost: 18000 },
  { name: 'Полдник', headcount: 35, cost: 14000 },
];

function formatMoney(value: number) {
  return value.toLocaleString('ru-RU');
}

export function CostRoute() {
  const { current } = useOrganizations();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [priceLimit, setPriceLimit] = useState('');

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  const totalCost = MEALS.reduce((sum, meal) => sum + meal.cost, 0);
  const averageHeadcount = Math.round(
    MEALS.reduce((sum, meal) => sum + meal.headcount, 0) / MEALS.length
  );
  const costPerDayPerPerson = totalCost / Math.max(averageHeadcount, 1);
  const limitValue = priceLimit ? Number(priceLimit) : null;
  const isLimitExceeded = limitValue !== null && costPerDayPerPerson > limitValue;

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <Flex alignItems="center" gap={3} wrap>
        <DatePicker
          size="l"
          value={dateTime({ input: date })}
          onUpdate={(value) => setDate(value?.toISOString().slice(0, 10) ?? date)}
          style={{ width: 180 }}
        />
      </Flex>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          wrap
          style={{ padding: '12px 16px' }}
        >
          <Text variant="subheader-2">Параметры</Text>
          <TextInput
            value={priceLimit}
            type="number"
            style={{ width: 220 }}
            label="Лимит цены питания"
            placeholder="Введите лимит ₽"
            onUpdate={(value) => setPriceLimit(value)}
          />
        </Flex>

        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          <Flex direction="column" gap={3} style={{ padding: '16px 24px' }}>
            <Flex gap={4} wrap>
              <Card view="outlined" style={{ minWidth: 220, flex: 1 }}>
                <Text variant="body-2" color="secondary">
                  Себестоимость дня
                </Text>
                <Text variant="subheader-2" style={{ marginTop: 8 }}>
                  {formatMoney(totalCost)} ₽
                </Text>
              </Card>

              <Card view="outlined" style={{ minWidth: 220, flex: 1 }}>
                <Text variant="body-2" color="secondary">
                  Себестоимость на одного человека в день
                </Text>
                <Text variant="subheader-2" style={{ marginTop: 8 }}>
                  {formatMoney(costPerDayPerPerson)} ₽
                </Text>
              </Card>
            </Flex>

            {limitValue !== null && (
              <Text
                variant="body-2"
                style={{
                  color: isLimitExceeded
                    ? 'var(--g-color-text-danger)'
                    : 'var(--g-color-text-secondary)',
                }}
              >
                {isLimitExceeded
                  ? 'Лимит превышен: стоимость на человека выше заданного лимита.'
                  : 'Стоимость в пределах заданного лимита.'}
              </Text>
            )}

            <Card view="filled" style={{ padding: 0 }}>
              <div style={{ padding: '16px 24px' }}>
                <Text variant="subheader-2">Себестоимость по приемам пищи</Text>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>
                        <Text variant="body-1" color="secondary">
                          Прием пищи
                        </Text>
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <Text variant="body-1" color="secondary">
                          Кол-во человек
                        </Text>
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <Text variant="body-1" color="secondary">
                          Стоимость
                        </Text>
                      </th>
                      <th style={{ textAlign: 'right' }}>
                        <Text variant="body-1" color="secondary">
                          Стоимость на человека
                        </Text>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEALS.map((meal) => (
                      <tr key={meal.name}>
                        <td>{meal.name}</td>
                        <td style={{ textAlign: 'right' }}>{meal.headcount} чел.</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(meal.cost)} ₽</td>
                        <td style={{ textAlign: 'right' }}>
                          {formatMoney(Math.round(meal.cost / meal.headcount))} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Flex>
        </div>
      </Card>
    </Flex>
  );
}
