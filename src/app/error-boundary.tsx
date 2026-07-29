import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Button, Flex } from '@gravity-ui/uikit';

interface State {
  error: Error | null;
}

/**
 * Ловит ошибки рендера, чтобы вместо белого экрана было видно, что сломалось.
 * Стоит внутри темы, но снаружи всех остальных провайдеров.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[onemore] необработанная ошибка рендера', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Flex justifyContent="center" style={{ padding: 48 }}>
        <Alert
          theme="danger"
          title="Приложение упало"
          message={error.message}
          actions={
            <Button view="outlined" onClick={() => window.location.reload()}>
              Перезагрузить
            </Button>
          }
        />
      </Flex>
    );
  }
}
