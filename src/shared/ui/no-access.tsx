import { Button, Flex, Icon, Text } from '@gravity-ui/uikit';
import { Lock } from '@gravity-ui/icons';
import { useNavigate } from 'react-router-dom';

/**
 * Раздел есть, но этому человеку он не выдан.
 *
 * Показывается, когда на скрытый пункт меню зашли по прямой ссылке —
 * из закладки, из переписки или просто набрав адрес. Пустой экран или 404
 * тут врали бы: страница существует, просто не для вас.
 *
 * Текст намеренно не объясняет, что именно за разделом находится: человеку
 * это не поможет, а формулировка «вам не хватает scope manage:platform»
 * пугает и ничего не значит для того, кто про скоупы не знает.
 */
export function NoAccessPage({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap={3}
      style={{ padding: 64, textAlign: 'center' }}
    >
      <Icon data={Lock} size={32} />

      <Flex direction="column" gap={1}>
        <Text variant="subheader-3">Раздел «{title}» вам не открыт</Text>
        <Text variant="body-1" color="secondary">
          Доступ выдаёт администратор организации. Если раздел нужен для работы — попросите его
          добавить.
        </Text>
      </Flex>

      <Button view="action" size="l" onClick={() => void navigate('/app')}>
        На главную
      </Button>
    </Flex>
  );
}
