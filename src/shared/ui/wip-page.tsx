import { useState } from 'react';
import { Card, Flex, Text } from '@gravity-ui/uikit';

/** Путь к картинке-заглушке; лежит в public/ и отдаётся статикой. */
const CAT_SRC = '/wip-cat.jpg';

/**
 * Заглушка для разделов, дизайн которых ещё не нарисован.
 *
 * Если картинки нет (её кладут в public/wip-cat.jpg), показываем текст —
 * пустая страница с битым изображением выглядела бы как поломка.
 */
export function WipPage({ title }: { title: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Flex direction="column" gap={4} style={{ padding: 16 }}>
      <Text variant="header-1">{title}</Text>

      <Card view="filled" style={{ padding: 24 }}>
        <Flex direction="column" alignItems="center" gap={4}>
          {imageFailed ? (
            <Text variant="display-1">🐱</Text>
          ) : (
            <img
              src={CAT_SRC}
              alt="Ваш проект находится на этапе «пупупу». Ожидайте"
              onError={() => setImageFailed(true)}
              style={{ maxWidth: 420, width: '100%', borderRadius: 'var(--g-border-radius-l)' }}
            />
          )}

          <Text variant="body-2" color="secondary">
            Раздел «{title}» ещё не нарисован — работы ведутся.
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
