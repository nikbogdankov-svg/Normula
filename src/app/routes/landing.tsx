import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Text } from '@gravity-ui/uikit';
import { useAuth } from '@/shared/auth';

export function LandingRoute() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/app', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      gap={4}
      style={{ minHeight: '100vh' }}
    >
      <Text variant="display-2">onemore</Text>
      <Text variant="body-2" color="secondary">
        Платформа StyleU
      </Text>
      <Button view="action" size="xl" loading={isLoading} onClick={() => void signIn()}>
        Войти
      </Button>
    </Flex>
  );
}
