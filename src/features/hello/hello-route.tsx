import { useState } from 'react';
import { Button, Card, Flex, Text, TextInput } from '@gravity-ui/uikit';
import { Page } from '@/shared/ui/page';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import { useOrganizations } from '@/shared/auth';
import { config } from '@/shared/config';
import { useHello } from './api';

/**
 * Единственная страница за авторизацией: дёргает GET /hello и показывает ответ.
 * Одновременно это дымовой тест всей цепочки — Logto → токен → nginx/vite-proxy
 * → grpc-gateway onemore-admin.
 */
export function HelloRoute() {
  const [name, setName] = useState('onemore');
  const [submitted, setSubmitted] = useState('onemore');
  const { current } = useOrganizations();

  const { data, isPending, isFetching, isError, error, refetch } = useHello(submitted);

  const send = () => setSubmitted(name.trim());

  return (
    <Page title="Hello">
      <Card view="outlined" style={{ padding: 16 }}>
        <Flex gap={2}>
          <TextInput
            value={name}
            onUpdate={setName}
            placeholder="name"
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <Button view="action" loading={isFetching} onClick={send}>
            GET /hello
          </Button>
        </Flex>
      </Card>

      {isPending && <LoadingState />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && (
        <Card view="filled" style={{ padding: 24 }}>
          <Text variant="header-2">{data.greeting}</Text>
        </Card>
      )}

      <Text variant="body-1" color="secondary">
        среда {config.env} · авторизация {config.authMode} · организация{' '}
        {current ? current.name : '—'}
      </Text>
    </Page>
  );
}
