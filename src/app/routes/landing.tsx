import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Icon, Text } from '@gravity-ui/uikit';
import { BookOpen, Boxes3, CircleRuble } from '@gravity-ui/icons';
import { useAuth } from '@/shared/auth';

/**
 * Чем платформа занимается — вместо пустого экрана с одной кнопкой.
 * Названия повторяют разделы левого меню, чтобы обещание совпадало
 * с тем, что человек увидит после входа.
 */
const FEATURES = [
  { icon: BookOpen, title: 'Меню и ТТК', text: 'Планирование меню и технологические карты' },
  { icon: Boxes3, title: 'Склад', text: 'Приход, остатки и списания' },
  { icon: CircleRuble, title: 'Финансы', text: 'Себестоимость и счета' },
];

export function LandingRoute() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/app', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      style={{
        minHeight: '100vh',
        padding: 24,
        // Мягкое брендовое свечение сверху; base-selection задан в обеих
        // темах, поэтому и тёмная выглядит осознанно, а не чёрным провалом.
        background:
          'radial-gradient(900px 520px at 50% -10%, var(--g-color-base-selection), transparent)',
      }}
    >
      <Text variant="display-3">
        one
        <Text variant="display-3" color="brand">
          more
        </Text>
      </Text>

      <Text
        variant="body-2"
        color="secondary"
        style={{ marginTop: 12, maxWidth: 420, textAlign: 'center' }}
      >
        Управление производством питания: меню, технологические карты, склад и финансы — в одном
        месте.
      </Text>

      <Button
        view="action"
        size="xl"
        loading={isLoading}
        onClick={() => void signIn()}
        style={{ marginTop: 32 }}
      >
        Войти
      </Button>

      <Flex gap={10} wrap justifyContent="center" style={{ marginTop: 64 }}>
        {FEATURES.map((feature) => (
          <Flex
            key={feature.title}
            direction="column"
            alignItems="center"
            gap={2}
            style={{ width: 200 }}
          >
            <Flex
              alignItems="center"
              justifyContent="center"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--g-color-base-selection)',
                color: 'var(--g-color-text-brand)',
              }}
            >
              <Icon data={feature.icon} size={20} />
            </Flex>
            <Text variant="subheader-2">{feature.title}</Text>
            <Text variant="body-1" color="secondary" style={{ textAlign: 'center' }}>
              {feature.text}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
