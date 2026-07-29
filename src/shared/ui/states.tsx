import { Alert, Flex, Loader, Text } from '@gravity-ui/uikit';

/** Стандартные состояния данных — чтобы фичи не изобретали свои. */

export function LoadingState() {
  return (
    <Flex justifyContent="center" style={{ padding: 48 }}>
      <Loader size="m" />
    </Flex>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
  return (
    <Alert
      theme="danger"
      title="Не удалось загрузить данные"
      message={message}
      actions={onRetry ? <Alert.Action onClick={onRetry}>Повторить</Alert.Action> : undefined}
    />
  );
}

/**
 * Пользователь есть, а организаций у него нет: организационный токен получить
 * не из чего, поэтому запросы с tokenKind='organization' не стартуют вообще.
 * Показываем это явно, иначе такие страницы молча «висят» в загрузке.
 */
export function NoOrganizationsBanner() {
  return (
    <div style={{ padding: '16px 32px 0' }}>
      <Alert
        theme="warning"
        title="Нет доступных организаций"
        message="Аккаунт не состоит ни в одной организации — разделы с организационными данными работать не будут."
      />
    </div>
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
