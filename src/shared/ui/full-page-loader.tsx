import { Flex, Loader, Text } from '@gravity-ui/uikit';

export function FullPageLoader() {
  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      gap={4}
      style={{ minHeight: '100vh' }}
    >
      <Loader size="l" />
      <Text variant="body-3">Страница загружается. Пожалуйста, подождите...</Text>
    </Flex>
  );
}
