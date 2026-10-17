import { useState } from 'react';
import { Button, Card, Flex, Icon, Label, Text, useToaster } from '@gravity-ui/uikit';
import { Printer } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { JournalDrawer } from './journal-drawer';
import { AUTO_JOURNALS, JOURNAL_SOURCE_KEYS, type AutoJournal } from './types';
import './journals-route.css';

/**
 * Раздел «Автоматические журналы» [ЖУРН]:
 * каталог журналов, которые программа формирует из меню, порционника, накладных и ТТК.
 */
export function JournalsRoute() {
  const { t } = useTranslation();
  const { current } = useOrganizations();
  const toaster = useToaster();
  const [opened, setOpened] = useState<AutoJournal | null>(null);

  const onGenerate = (journal: AutoJournal) => {
    toaster.add({
      name: `journal-generate-${journal.id}`,
      title: t('journals.generating'),
      content: t('journals.generatingContent', { tag: t(journal.tagKey) }),
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
                <Text variant="subheader-2">{t(journal.titleKey)}</Text>
                <Flex gap={1} wrap>
                  {journal.sources.map((source) => (
                    <Label key={source} theme="unknown" size="xs">
                      {t(JOURNAL_SOURCE_KEYS[source])}
                    </Label>
                  ))}
                </Flex>
                <Text
                  variant="body-2"
                  color={journal.manualFieldKeys.length > 0 ? 'primary' : 'secondary'}
                >
                  {journal.manualFieldKeys.length > 0
                    ? t('journals.manual', {
                        fields: journal.manualFieldKeys.map((key) => t(key)).join(', '),
                      })
                    : t('journals.auto')}
                </Text>
              </Flex>
              <Button
                view="normal"
                size="l"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate(journal);
                }}
                title={t('journals.print')}
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
