import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useHandleSignInCallback } from '@logto/react';
import { Alert, Button, Flex, Text } from '@gravity-ui/uikit';
import { config } from '@/shared/config';
import { FullPageLoader } from '@/shared/ui/full-page-loader';

/**
 * Завершение OIDC-редиректа. Часть авторизации живёт здесь, а не в роутах:
 * страница /callback просто рендерит <AuthCallback/>.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Logto возвращает причину отказа в query (RFC 6749 §4.1.2.1), а SDK
  // сводит её к невнятному «Error found in the callback URI». Показываем
  // исходные error/error_description — по ним сразу видно, что чинить
  // в Logto Console (скоупы, resource, redirect URI).
  const oidcError = params.get('error');
  const oidcErrorDescription = params.get('error_description');

  const { isLoading, error } = useHandleSignInCallback(() => {
    navigate('/app', { replace: true });
  });

  if (oidcError || error) {
    return (
      <Flex justifyContent="center" style={{ padding: 48 }}>
        <Flex direction="column" gap={3} style={{ maxWidth: 640 }}>
          <Alert
            theme="danger"
            title="Ошибка входа"
            message={
              oidcError
                ? `${oidcError}: ${oidcErrorDescription ?? 'без описания'}`
                : (error?.message ?? 'неизвестная ошибка')
            }
          />
          <Text variant="body-1" color="secondary">
            Ответ вернул сервер авторизации ({config.logto?.endpoint}). Обычные причины — приложению
            не разрешены запрошенные скоупы, не заведён API resource {config.logto?.apiResource} или
            не прописан redirect URI {window.location.origin}
            /callback.
          </Text>
          <Link to="/">
            <Button view="action">На главную</Button>
          </Link>
        </Flex>
      </Flex>
    );
  }

  if (isLoading) return <FullPageLoader />;
  return <FullPageLoader />;
}
