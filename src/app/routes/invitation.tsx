import { useCallback, useEffect, useRef, useState } from 'react';
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
  const { signIn, signOut, isAuthenticated, isLoading } = useLogto();
  const started = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);

  const token = params.get('token');
  const email = params.get('email');

  const accept = useCallback(() => {
    setFailure(null);

    void signIn({
      redirectUri: `${window.location.origin}/callback`,
      // Одноразовый токен и адрес уходят серверу авторизации как есть:
      // выделенного поля под них в SDK нет, только extraParams.
      extraParams: { one_time_token: token ?? '', login_hint: email ?? '' },
    }).catch((error: unknown) => {
      setFailure(error instanceof Error ? error.message : 'неизвестная ошибка');
    });
  }, [signIn, token, email]);

  // Переход в Logto запускаем сами, но только если войти реально можно.
  useEffect(() => {
    if (started.current || isLoading || isAuthenticated || !token || !email) return;
    started.current = true;
    accept();
  }, [accept, isLoading, isAuthenticated, token, email]);

  if (!token || !email) {
    return (
      <InvitationCard>
        <Alert
          theme="danger"
          title="Ссылка неполная"
          message="В приглашении не хватает адреса или одноразового токена. Попросите администратора выслать приглашение заново."
        />
        <Button view="action" href="/">
          На главную
        </Button>
      </InvitationCard>
    );
  }

  if (isLoading) return <FullPageLoader />;

  // Уже вошли — почти наверняка другим аккаунтом: приглашение открывают из
  // почты, а в браузере остаётся сессия того, кто это приглашение и выслал.
  // Молча подменять аккаунт нельзя, поэтому спрашиваем явно.
  if (isAuthenticated) {
    return (
      <InvitationCard>
        <Alert
          theme="warning"
          title="Вы уже вошли под другим аккаунтом"
          message={`Приглашение выписано на ${email}. Чтобы принять его, выйдите из текущего аккаунта и откройте ссылку из письма ещё раз.`}
        />
        <Flex gap={2}>
          <Button view="action" onClick={() => void signOut(`${window.location.origin}/`)}>
            Выйти
          </Button>
          <Button view="outlined" href="/app">
            Остаться в текущем аккаунте
          </Button>
        </Flex>
      </InvitationCard>
    );
  }

  if (failure) {
    return (
      <InvitationCard>
        <Alert theme="danger" title="Не удалось начать вход" message={failure} />
        <Button view="action" onClick={accept}>
          Попробовать снова
        </Button>
      </InvitationCard>
    );
  }

  // Редирект в Logto уже запущен. Кнопка — страховка на случай, если браузер
  // его заблокировал: без неё страница выглядела бы зависшей.
  return (
    <InvitationCard>
      <Text variant="subheader-2">Принимаем приглашение…</Text>
      <Text variant="body-1" color="secondary">
        Сейчас откроется страница входа для {email}.
      </Text>
      <Button view="outlined" onClick={accept}>
        Продолжить вручную
      </Button>
    </InvitationCard>
  );
}

function InvitationCard({ children }: { children: React.ReactNode }) {
  return (
    <Flex justifyContent="center" style={{ padding: 48 }}>
      <Card view="filled" style={{ padding: 24, maxWidth: 560, width: '100%' }}>
        <Flex direction="column" gap={3}>
          {children}
        </Flex>
      </Card>
    </Flex>
  );
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
