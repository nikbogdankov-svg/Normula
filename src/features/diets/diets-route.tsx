import { useState } from 'react';
import {
  Table,
  Text,
  TextInput,
  Flex,
  Icon,
  Button,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { Magnifier, Plus } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useDiets } from './api';
import type { Diet } from './types';
import { DietDialog } from './diet-dialog';
import { CreateDietDialog } from './create-diet-dialog';
import './diets-route.css';

const FACILITY_TYPE_LABELS: Record<string, string> = {
  school: 'Школа',
  kindergarten: 'Детский сад',
  hospital: 'Больница',
  warehouse: 'Склад',
};

function formatAppliesTo(diet: Diet): string {
  const labels = diet.appliesTo.map((type) => FACILITY_TYPE_LABELS[type]).filter(Boolean);
  return labels.join(', ') || '—';
}

/** Раздел «Диеты»: справочник рационов питания, использующийся в объектах и меню. */
export function DietsRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<Diet | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = useDiets();

  const diets = (data?.diets ?? []).filter((diet) =>
    diet.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="diets-page">
      <Flex className="diets-page__toolbar" direction="column" gap={3} wrap>
        <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
          <Text variant="body-1" color="secondary"></Text>
          <Button size="l" view="normal-contrast" onClick={() => setCreateOpen(true)}>
            <Icon data={Plus} size={16} />
            Создать диету
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
            {search.trim() ? `Найдено: ${diets.length}` : `Всего диет: ${diets.length}`}
          </Text>
        )}
      </Flex>

      <div className="diets-page__scroll">
        <div className="diets-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && !isPending && !isError && diets.length === 0 && (
            <EmptyState text={search.trim() ? 'Ничего не нашли по запросу' : 'Диет пока нет'} />
          )}

          {data && diets.length > 0 && <DietsTable diets={diets} onOpen={setOpened} />}
        </div>
      </div>

      <DietDialog diet={opened} onClose={() => setOpened(null)} onDietChange={setOpened} />
      <CreateDietDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function DietsTable({ diets, onOpen }: { diets: Diet[]; onOpen: (diet: Diet) => void }) {
  const columns: TableColumnConfig<Diet>[] = [
    {
      id: 'name',
      name: 'Название',
      template: (row) => <Text variant="body-2">{row.name}</Text>,
    },
    {
      id: 'appliesTo',
      name: 'Доступна для',
      template: (row) => (
        <Text variant="body-2" color="secondary">
          {formatAppliesTo(row)}
        </Text>
      ),
    },
  ];

  return (
    <>
      <div className="diets-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap">
        <Table
          width="max"
          className="admin-table diets-page__table-body"
          data={diets}
          onRowClick={(row) => onOpen(row)}
          columns={columns}
        />
      </div>
    </>
  );
}
