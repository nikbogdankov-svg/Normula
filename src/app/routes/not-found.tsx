import { Link } from 'react-router-dom';
import { Button, Flex, Text } from '@gravity-ui/uikit';

export function NotFoundRoute() {
  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      gap={4}
      style={{ minHeight: '100vh' }}
    >
      <Text variant="display-1">404</Text>
      <Link to="/app">
        <Button view="action">На главную</Button>
      </Link>
    </Flex>
  );
}
