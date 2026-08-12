import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  Label,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { BookOpen, Magnifier, Printer } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { JournalDrawer } from './journal-drawer';
import { AUTO_JOURNALS, JOURNAL_SOURCE_LABELS, type AutoJournal } from './types';
import './journals-route.css';

/**
 * Раздел «Автоматические журналы» [ЖУРН]:
 * каталог журналов, которые программа формирует из меню, порционника, накладных и ТТК.
 */
export function JournalsRoute() {
  const { current } = useOrganizations();
  const toaster = useToaster();
  const [search, setSearch] = useState('');
  const [opened, setOpened] = useState<AutoJournal | null>(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return AUTO_JOURNALS.filter((journal) => {
      if (!query) return true;
      return (
        journal.tag.toLowerCase().includes(query) ||
        journal.title.toLowerCase().includes(query) ||
        journal.description.toLowerCase().includes(query)
      );
    });
  }, [search]);

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
            <Button view="normal" size="m" onClick={() => window.print()} title="Печать">
              <Icon data={Printer} size={16} />
            </Button>
            <TextInput
              size="m"
              placeholder="Поиск по тегу или названию"
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
                  id: 'title',
                  name: 'Журнал',
                  template: (row) => <Text variant="body-1">{row.title}</Text>,
                },
                {
                  id: 'sources',
                  name: 'Источники',
                  width: 300,
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
                  width: 240,
                  template: (row) =>
                    row.manualFields.length > 0 ? (
                      <Text variant="body-1">{row.manualFields.join(', ')}</Text>
                    ) : (
                      <Text variant="body-1" color="secondary">
                        —
                      </Text>
                    ),
                },
              ]}
            />
          </div>
        </div>
      </Card>

      <JournalDrawer journal={opened} onClose={() => setOpened(null)} onGenerate={onGenerate} />
    </div>
  );
}
