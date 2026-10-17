import { Flex, Loader, Text } from '@gravity-ui/uikit';
import { useTranslation } from 'react-i18next';

export function FullPageLoader() {
  const { t } = useTranslation();

  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      gap={4}
      style={{ minHeight: '100vh' }}
    >
      <Loader size="l" />
      <Text variant="body-3">{t('common.loadingPage')}</Text>
    </Flex>
  );
}
