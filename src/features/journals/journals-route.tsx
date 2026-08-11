import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  Label,
  SegmentedRadioGroup,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { BookOpen, Magnifier, Printer } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { JournalDrawer } from './journal-drawer';
import {
  AUTO_JOURNALS,
  JOURNAL_PRIORITY_LABELS,
  JOURNAL_SOURCE_LABELS,
  type AutoJournal,
  type JournalPriority,
} from './types';
import './journals-route.css';

type PriorityFilter = 'all' | JournalPriority;

/**
 * Раздел «Автоматические журналы» [ЖУРН]:
 * каталог журналов, которые программа формирует из меню, порционника, накладных и ТТК.
 */
export function JournalsRoute() {
  const { current } = useOrganizations();
  const toaster = useToaster();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [opened, setOpened] = useState<AutoJournal | null>(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return AUTO_JOURNALS.filter((journal) => {
      if (priority !== 'all' && journal.priority !== priority) return false;
      if (!query) return true;
      return (
        journal.tag.toLowerCase().includes(query) ||
        journal.title.toLowerCase().includes(query) ||
        journal.description.toLowerCase().includes(query)
      );
    });
  }, [priority, search]);

  const onGenerate = (journal: AutoJournal) => {
    toaster.add({
      name: `journal-generate-${journal.id}`,
      title: 'Журнал формируется',
      content: `${journal.tag}: данные подтягиваются из связанных разделов.`,
      theme: 'info',
    });
  };

  if (current === null) {
    return (
      <Flex direction="column" className="journals-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  return (
    <div className="journals-page">
      <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
        <Flex direction="column" gap={1}>
          <Text variant="header-1">Автоматические журналы</Text>
          <Text variant="body-2" color="secondary">
            Журналы формируются программой из меню, порционника, накладных и ТТК.
          </Text>
        </Flex>
        <Button view="normal" size="l" onClick={() => window.print()} title="Печать">
          <Icon data={Printer} size={16} />
        </Button>
      </Flex>

      <div className="journals-page__intro">
        <Text variant="body-2" color="secondary">
          Часть полей заполняется автоматически, часть — вручную: оценка, подпись, разрешение на
          выдачу. Обязательные журналы отмечены как «Обязательно», остальные — «Желательно».
        </Text>
      </div>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={3}
          wrap
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={BookOpen} size={16} />
            <Text variant="subheader-2">Каталог журналов</Text>
          </Flex>
          <Flex alignItems="center" gap={2} wrap>
            <TextInput
              size="l"
              placeholder="Поиск по тегу или названию"
              value={search}
              onUpdate={setSearch}
              hasClear
              startContent={
                <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                  <Icon data={Magnifier} size={16} />
                </span>
              }
              style={{ width: 280 }}
            />
            <SegmentedRadioGroup
              size="l"
              value={priority}
              onUpdate={(value) => setPriority(value as PriorityFilter)}
            >
              <SegmentedRadioGroup.Option value="all" content="Все" />
              <SegmentedRadioGroup.Option value="required" content="Обязательные" />
              <SegmentedRadioGroup.Option value="optional" content="Желательные" />
            </SegmentedRadioGroup>
          </Flex>
        </Flex>

        <div style={{ borderTop: '1px solid var(--g-color-line-generic)', paddingBottom: 8 }}>
          <div className="admin-table-wrap">
            <Table
              width="max"
              className="admin-table"
              data={rows}
              onRowClick={(row) => setOpened(row)}
              getRowDescriptor={(row) => ({ id: row.id, interactive: true })}
              columns={[
                {
                  id: 'tag',
                  name: 'Тег',
                  width: 120,
                  template: (row) => (
                    <Text variant="body-1" style={{ fontWeight: 600 }}>
                      {row.tag}
                    </Text>
                  ),
                },
                {
                  id: 'title',
                  name: 'Журнал',
                  template: (row) => (
                    <Flex direction="column" gap={1}>
                      <Text variant="body-1">{row.title}</Text>
                      <Text variant="caption-2" color="secondary">
                        {row.description}
                      </Text>
                    </Flex>
                  ),
                },
                {
                  id: 'sources',
                  name: 'Источники',
                  width: 220,
                  template: (row) => (
                    <Flex gap={1} wrap>
                      {row.sources.map((source) => (
                        <Label key={source} theme="unknown" size="xs">
                          {JOURNAL_SOURCE_LABELS[source]}
                        </Label>
                      ))}
                    </Flex>
                  ),
                },
                {
                  id: 'manual',
                  name: 'Вручную',
                  width: 160,
                  template: (row) =>
                    row.manualFields.length > 0 ? (
                      <Text variant="body-2">{row.manualFields.join(', ')}</Text>
                    ) : (
                      <Text variant="body-2" color="secondary">
                        —
                      </Text>
                    ),
                },
                {
                  id: 'priority',
                  name: 'Приоритет',
                  width: 140,
                  template: (row) => (
                    <Label theme={row.priority === 'required' ? 'danger' : 'utility'} size="s">
                      {JOURNAL_PRIORITY_LABELS[row.priority]}
                    </Label>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </Card>

      <JournalDrawer
        journal={opened}
        onClose={() => setOpened(null)}
        onGenerate={onGenerate}
      />
    </div>
  );
}
