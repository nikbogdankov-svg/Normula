import { Flex, Loader } from '@gravity-ui/uikit';

export function FullPageLoader() {
  return (
    <Flex justifyContent="center" alignItems="center" style={{ minHeight: '100vh' }}>
      <Loader size="l" />
    </Flex>
  );
}
