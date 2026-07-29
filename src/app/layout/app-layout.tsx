import { Outlet, NavLink } from 'react-router-dom';
import { Button, Flex, Icon, Select, Text } from '@gravity-ui/uikit';
import { ArrowRightFromSquare, Moon, Sun } from '@gravity-ui/icons';
import { useAuth, useOrganizations } from '@/shared/auth';
import { NoOrganizationsBanner } from '@/shared/ui/states';
import { useAppTheme } from '@/app/theme';

/** Разделы шапки. Пока страница одна, поэтому навигация пустая. */
const NAV: { to: string; label: string; end?: boolean }[] = [];

/**
 * Каркас авторизованной части: шапка (лого, навигация, переключатель
 * организации, тема, выход) + контент через <Outlet/>.
 * Новые разделы добавляются строчкой в NAV + роутом в router.tsx.
 */
export function AppLayout() {
  const { signOut } = useAuth();
  const { organizations, current, setCurrent } = useOrganizations();
  const { theme, toggleTheme } = useAppTheme();

  return (
    <Flex direction="column" style={{ minHeight: '100vh' }}>
      <Flex
        alignItems="center"
        gap={6}
        style={{
          padding: '0 24px',
          height: 56,
          borderBottom: '1px solid var(--g-color-line-generic)',
        }}
      >
        <Text variant="subheader-2">onemore</Text>

        <Flex gap={2} grow={1}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <Button view={isActive ? 'normal' : 'flat'} size="m">
                  {item.label}
                </Button>
              )}
            </NavLink>
          ))}
        </Flex>

        {organizations && organizations.length > 0 && (
          <Select
            size="m"
            width={200}
            value={current ? [current.id] : []}
            onUpdate={(v) => v[0] && setCurrent(v[0])}
            options={organizations.map((o) => ({ value: o.id, content: o.name }))}
            placeholder="Организация"
          />
        )}

        <Button view="flat" onClick={toggleTheme} aria-label="Переключить тему">
          <Icon data={theme === 'dark' ? Sun : Moon} />
        </Button>

        <Button view="flat" onClick={() => void signOut()} aria-label="Выйти">
          <Icon data={ArrowRightFromSquare} />
        </Button>
      </Flex>

      {/* Предупреждение, а не заглушка: страницы на 'api'-токене работают и без
          организаций, а организационные сами покажут, что данных не будет. */}
      {organizations?.length === 0 && <NoOrganizationsBanner />}

      <Outlet />
    </Flex>
  );
}
