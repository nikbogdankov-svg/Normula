import { Alert, Flex, Loader, Text } from '@gravity-ui/uikit';
import { useTranslation } from '@/shared/i18n';

/** Стандартные состояния данных — чтобы фичи не изобретали свои. */

export function LoadingState() {
  return (
    <Flex justifyContent="center" style={{ padding: 48 }}>
      <Loader size="m" />
    </Flex>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : t('common.unknownError');
  return (
    <Alert
      theme="danger"
      title={t('states.loadFailed')}
      message={message}
      actions={
        onRetry ? <Alert.Action onClick={onRetry}>{t('common.retry')}</Alert.Action> : undefined
      }
    />
  );
}

/**
 * Пользователь есть, а организаций у него нет: организационный токен получить
 * не из чего, поэтому запросы с tokenKind='organization' не стартуют вообще.
 * Показываем это явно, иначе такие страницы молча «висят» в загрузке.
 */
export function NoOrganizationsBanner() {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '16px 32px 0' }}>
      <Alert theme="warning" title={t('states.noOrgTitle')} message={t('states.noOrgMessage')} />
    </div>
  );
}

/**
 * Запрос не стартовал, потому что нет организации (enabled: false у useQuery).
 * Без отдельного состояния страница бесконечно крутила бы лоадер: у
 * отключённого запроса isPending остаётся true.
 */
export function NoOrganizationSelectedState() {
  const { t } = useTranslation();
  return (
    <Flex justifyContent="center" style={{ padding: 48 }}>
      <Text variant="body-2" color="secondary">
        {t('states.noOrgSelected')}
      </Text>
    </Flex>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Flex justifyContent="center" style={{ padding: 48 }}>
      <Text variant="body-2" color="secondary">
        {text}
      </Text>
    </Flex>
  );
}
