import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLogto } from '@logto/react';
import { Alert, Button, Card, Flex, Text } from '@gravity-ui/uikit';
import { config } from '@/shared/config';
import { FullPageLoader } from '@/shared/ui/full-page-loader';

/**
 * Приём приглашения из письма.
 *
 * Бэкенд собирает ссылку вида
 *   <origin>/invitation/join?type=registrationInvitation&id=…&token=…&email=…
 * где token — одноразовый токен Logto. Страница отдаёт его серверу
 * авторизации, и приглашённый попадает внутрь даже при выключенной
 * самостоятельной регистрации.
 */
export function InvitationRoute() {
  if (config.authMode === 'logto') {
    return <LogtoInvitation />;
  }

  return <MockInvitation />;
}

function LogtoInvitation() {
  const [params] = useSearchParams();
  const { signIn, isAuthenticated, isLoading } = useLogto();
  const started = useRef(false);

  const token = params.get('token');
  const email = params.get('email');

  useEffect(() => {
    if (started.current || isLoading || isAuthenticated || !token || !email) return;
    started.current = true;

    void signIn({
      redirectUri: `${window.location.origin}/callback`,
      // Одноразовый токен и адрес уходят серверу авторизации как есть:
      // выделенного поля под них в SDK нет, только extraParams.
      extraParams: { one_time_token: token, login_hint: email },
    });
  }, [signIn, isLoading, isAuthenticated, token, email]);

  if (!token || !email) {
    return (
      <Flex justifyContent="center" style={{ padding: 48 }}>
        <Card view="filled" style={{ padding: 24, maxWidth: 560 }}>
          <Flex direction="column" gap={3}>
            <Alert
              theme="danger"
              title="Ссылка неполная"
              message="В приглашении не хватает адреса или одноразового токена. Попросите администратора выслать приглашение повторно."
            />
            <Button view="action" href="/">
              На главную
            </Button>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return <FullPageLoader />;
}

function MockInvitation() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/app', { replace: true });
  }, [navigate]);

  return (
    <Flex justifyContent="center" style={{ padding: 48 }}>
      <Text variant="body-2" color="secondary">
        mock-режим: приглашения принимать не у кого
      </Text>
    </Flex>
  );
}
