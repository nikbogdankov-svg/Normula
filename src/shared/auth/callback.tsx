import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHandleSignInCallback } from '@logto/react';
import { Alert, Button, Flex, Text } from '@gravity-ui/uikit';
import { config } from '@/shared/config';
import { FullPageLoader } from '@/shared/ui/full-page-loader';

/**
 * Завершение OIDC-редиректа. Часть авторизации живёт здесь, а не в роутах:
 * страница /callback просто рендерит <AuthCallback/>.
 */
export function AuthCallback() {
  const { t } = useTranslation();
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
            title={t('callback.title')}
            message={
              oidcError
                ? `${oidcError}: ${oidcErrorDescription ?? t('callback.noDescription')}`
                : (error?.message ?? t('callback.unknownError'))
            }
          />
          <Text variant="body-1" color="secondary">
            {t('callback.diagnostic', {
              endpoint: config.logto?.endpoint,
              apiResource: config.logto?.apiResource,
              origin: window.location.origin,
            })}
          </Text>
          <Link to="/">
            <Button view="action">{t('notFound.goHome')}</Button>
          </Link>
        </Flex>
      </Flex>
    );
  }

  if (isLoading) return <FullPageLoader />;
  return <FullPageLoader />;
}
