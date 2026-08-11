import { Button, Drawer, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { Printer, Xmark } from '@gravity-ui/icons';
import {
  JOURNAL_PRIORITY_LABELS,
  JOURNAL_SOURCE_LABELS,
  type AutoJournal,
} from './types';

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
  onGenerate,
}: {
  journal: AutoJournal | null;
  onClose: () => void;
  onGenerate: (journal: AutoJournal) => void;
}) {
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
              <Text variant="caption-2" color="secondary">
                {journal.tag}
              </Text>
              <Text variant="header-1">{journal.title}</Text>
              <Text variant="body-2" color="secondary">
                {journal.description}
              </Text>
            </Flex>
            <Button view="flat" size="l" onClick={requestClose} title="Закрыть">
              <Icon data={Xmark} size={16} />
            </Button>
          </Flex>

          <Flex className="journal-drawer__body" direction="column" gap={4}>
            <Flex gap={2} wrap>
              <Label theme={journal.priority === 'required' ? 'danger' : 'utility'} size="m">
                {JOURNAL_PRIORITY_LABELS[journal.priority]}
              </Label>
              {journal.sources.map((source) => (
                <Label key={source} theme="info" size="m">
                  {JOURNAL_SOURCE_LABELS[source]}
                </Label>
              ))}
            </Flex>

            <FieldList title="Заполняет программа" fields={journal.autoFields} theme="info" />
            <FieldList title="Заполняет вручную" fields={journal.manualFields} theme="warning" />

            <Text variant="body-2" color="secondary">
              Журнал формируется из данных меню, порционника, накладных и ТТК. Поля с оценкой и
              подписью заполняются на месте после печати или в электронном виде.
            </Text>
          </Flex>

          <Flex className="journal-drawer__footer" gap={2}>
            <Button view="action" size="l" onClick={() => onGenerate(journal)}>
              Сформировать
            </Button>
            <Button view="normal" size="l" onClick={() => window.print()}>
              <Icon data={Printer} size={16} />
              Печать
            </Button>
          </Flex>
        </div>
      )}
    </Drawer>
  );
}
