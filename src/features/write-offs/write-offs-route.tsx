import { useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  SegmentedRadioGroup,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { Plus, Magnifier, ArrowLeftFromLine } from '@gravity-ui/icons';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useApi } from '@/shared/api/use-api';
import { useWriteOffs } from './api';
import { WriteOffDrawer } from './write-off-drawer';
import type { WriteOff, WriteOffType } from './types';
import './write-offs-route.css';

const MOCK_WAREHOUSE_ID = 'warehouse-central'; // пока захардкодили

export function WriteOffsRoute() {
  const api = useApi();
  const toaster = useToaster();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<WriteOff | null>(null);
  const [type, setType] = useState<WriteOffType>('exceptional');

  const { data, isLoading, error } = useWriteOffs(MOCK_WAREHOUSE_ID, type);

  const onCreateWriteOff = () => {
    toaster.add({
      name: 'write-off-create',
      title: 'Функция пока в разработке',
      theme: 'info',
    });
  };

  if (api.organizationId === null) {
    return (
      <Flex direction="column" className="write-offs-page">
        <NoOrganizationSelectedState />
      </Flex>
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

  if (!data?.writeOffs.length) {
    return (
      <Flex direction="column" alignItems="center" gap={2} style={{ padding: '48px 24px' }}>
        <Text variant="body-1">Нет списаний</Text>
      </Flex>
    );
  }

  const filteredRows = data.writeOffs.filter((writeOff) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return writeOff.reason.toLowerCase().includes(query) || writeOff.date.includes(query);
  });

  return (
    <div className="write-offs-page">
      <Card view="filled" style={{ padding: 0, margin: 16 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={ArrowLeftFromLine} size={16} />
            <Text variant="subheader-2">Списания</Text>
          </Flex>
          <Flex alignItems="center" gap={2} wrap>
            <SegmentedRadioGroup
              size="m"
              value={type}
              onUpdate={(value) => setType(value as WriteOffType)}
            >
              <SegmentedRadioGroup.Option value="exceptional" content="Исключительные" />
              <SegmentedRadioGroup.Option value="daily" content="Обычные" />
            </SegmentedRadioGroup>
            <TextInput
              size="m"
              placeholder="Поиск по причине"
              value={search}
              onUpdate={setSearch}
              hasClear
              startContent={
                <span
                  style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                >
                  <Icon data={Magnifier} size={16} />
                </span>
              }
              style={{ width: 280 }}
            />
            <Button onClick={onCreateWriteOff} size="m">
              <Icon data={Plus} size={16} />
              Списание
            </Button>
          </Flex>
        </Flex>

        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>
                    <Text variant="body-1" color="secondary">
                      Дата
                    </Text>
                  </th>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Причина
                    </Text>
                  </th>
                  <th>
                    <Text variant="body-1" color="secondary">
                      Кол-во товаров
                    </Text>
                  </th>
                  <th style={{ width: 140 }}>
                    <Text variant="body-1" color="secondary">
                      Сумма
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((writeOff, index) => {
                  const totalSum = writeOff.items.reduce((sum, item) => sum + item.totalPrice, 0);
                  return (
                    <tr
                      key={writeOff.id}
                      className={index === filteredRows.length - 1 ? 'admin-table__row_last' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpened(writeOff)}
                    >
                      <td>{new Date(writeOff.date).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <Text variant="body-1" style={{ fontWeight: 600 }}>
                          {writeOff.reason}
                        </Text>
                      </td>
                      <td>
                        <Text variant="body-2" color="secondary">
                          {writeOff.items.length}
                        </Text>
                      </td>
                      <td>{totalSum.toFixed(2)} ₽</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <WriteOffDrawer writeOff={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
