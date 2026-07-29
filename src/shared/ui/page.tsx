import type { ReactNode } from 'react';
import { Flex, Text } from '@gravity-ui/uikit';

/**
 * Каркас страницы: заголовок + опциональные действия справа + контент.
 * Все страницы приложения используют его — единые отступы и типографика.
 */
export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap={4} style={{ padding: '24px 32px', maxWidth: 960 }}>
      <Flex justifyContent="space-between" alignItems="center">
        <Text variant="header-1">{title}</Text>
        {actions}
      </Flex>
      {children}
    </Flex>
  );
}
