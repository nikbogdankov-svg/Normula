import { Button, Drawer, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { Printer, Xmark } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { JOURNAL_SOURCE_KEYS, type AutoJournal } from './types';

function FieldList({
  title,
  fields,
  theme,
}: {
  title: string;
  fields: string[];
  theme: 'info' | 'warning';
}) {
  if (fields.length === 0) return null;

  return (
    <Flex direction="column" gap={2}>
      <Text variant="subheader-2">{title}</Text>
      <Flex gap={2} wrap>
        {fields.map((field) => (
          <Label key={field} theme={theme}>
            {field}
          </Label>
        ))}
      </Flex>
    </Flex>
  );
}

/** Панель с деталями журнала и действиями печати / формирования. */
export function JournalDrawer({
  journal,
  onClose,
}: {
  journal: AutoJournal | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const requestClose = () => onClose();

  return (
    <Drawer
      open={journal !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) requestClose();
      }}
      placement="right"
      size={560}
      contentOverflow="auto"
    >
      {journal && (
        <div className="journal-drawer">
          <Flex
            className="journal-drawer__header"
            alignItems="flex-start"
            justifyContent="space-between"
            gap={3}
          >
            <Flex direction="column" gap={1}>
              <Text variant="header-1">{t(journal.titleKey)}</Text>
              <Text variant="body-2" color="secondary">
                {t(journal.descriptionKey)}
              </Text>
            </Flex>
            <Button view="flat" size="l" onClick={requestClose} title={t('journals.close')}>
              <Icon data={Xmark} size={16} />
            </Button>
          </Flex>

          <Flex className="journal-drawer__body" direction="column" gap={4}>
            <Flex gap={2} wrap>
              {journal.sources.map((source) => (
                <Label key={source} theme="info" size="m">
                  {t(JOURNAL_SOURCE_KEYS[source])}
                </Label>
              ))}
            </Flex>

            <FieldList
              title={t('journals.drawerAutoTitle')}
              fields={journal.autoFieldKeys.map((key) => t(key))}
              theme="info"
            />
            <FieldList
              title={t('journals.drawerManualTitle')}
              fields={journal.manualFieldKeys.map((key) => t(key))}
              theme="warning"
            />

            <Text variant="body-2" color="secondary">
              {t('journals.drawerDesc')}
            </Text>
          </Flex>

          <Flex className="journal-drawer__footer" gap={2}>
            <Button view="action" size="l" onClick={() => window.print()}>
              <Icon data={Printer} size={16} />
              {t('journals.print')}
            </Button>
          </Flex>
        </div>
      )}
    </Drawer>
  );
}
