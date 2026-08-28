import { useState } from 'react';
import { Button, Card, Flex, Icon, Label, Text, useToaster } from '@gravity-ui/uikit';
import { Printer } from '@gravity-ui/icons';
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
  const [opened, setOpened] = useState<AutoJournal | null>(null);

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
      <div className="journals-grid">
        {AUTO_JOURNALS.map((journal) => (
          <Card
            key={journal.id}
            view="filled"
            className="journals-card"
            onClick={() => setOpened(journal)}
          >
            <Flex gap={2}>
              <Flex direction="column" gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text variant="subheader-2">{journal.title}</Text>
                <Flex gap={1} wrap>
                  {journal.sources.map((source) => (
                    <Label key={source} theme="unknown" size="xs">
                      {JOURNAL_SOURCE_LABELS[source]}
                    </Label>
                  ))}
                </Flex>
                <Text
                  variant="body-2"
                  color={journal.manualFields.length > 0 ? 'primary' : 'secondary'}
                >
                  {journal.manualFields.length > 0
                    ? `Дозаполнить: ${journal.manualFields.join(', ')}`
                    : 'Заполняется автоматически'}
                </Text>
              </Flex>
              <Button
                view="normal"
                size="l"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate(journal);
                }}
                title="Печать"
              >
                <Icon data={Printer} size={16} />
              </Button>
            </Flex>
          </Card>
        ))}
      </div>

      <JournalDrawer journal={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
