import { NavLink } from 'react-router-dom';
import { Button, DropdownMenu, Flex, Icon, Text, Tooltip } from '@gravity-ui/uikit';
import {
  ArrowRightFromSquare,
  EllipsisVertical,
  LayoutSideContent,
  Moon,
  Sun,
} from '@gravity-ui/icons';
import { useAuth, useOrganizations } from '@/shared/auth';
import { useAppTheme } from '@/app/theme';
import { visibleNavGroups, type NavItem } from './nav';
import './sidebar.css';

const EXPANDED_WIDTH = 250;
const COLLAPSED_WIDTH = 56;
/** Иконки в кнопках шапки/футера — без увеличения кнопок. */
const BUTTON_ICON_SIZE = 16;
/** Иконки пунктов навигации. */
const NAV_ICON_SIZE = 18;
/**
 * Дефолт Gravity — 1000 мс плюс «пауза» курсора (rest), из-за чего подсказка
 * в меню кажется не работающей. Берём обычный Tooltip, а не ActionTooltip:
 * первый красится в --g-color-base-float и потому белый в светлой теме и
 * тёмный в тёмной, как в примерах самого Gravity. ActionTooltip всегда
 * тёмный (--g-color-base-float-heavy).
 */
const TOOLTIP_DELAY = 120;

/**
 * Боковое меню по макету: лого, сворачивание, сгруппированная навигация,
 * меню пользователя (тема / выход) в трёх точках.
 *
 * Лого — временная текстовая заглушка «ЛОГО» вместо картинки.
 */
export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { theme, toggleTheme } = useAppTheme();
  const { signOut } = useAuth();
  const { current, scopes } = useOrganizations();

  // Пункты, которых у человека нет, не рисуем вовсе: показать и убрать
  // после загрузки скоупов было бы заметнее, чем дорисовать с задержкой.
  const groups = visibleNavGroups(scopes);

  return (
    <aside
      className={collapsed ? 'sidebar sidebar_collapsed' : 'sidebar'}
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--g-color-base-background)',
        borderRight: '1px solid var(--g-color-line-generic)',
        transition: 'width 0.15s ease',
      }}
    >
      <div className="sidebar-header">
        <Tooltip
          content={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          openDelay={TOOLTIP_DELAY}
          rest={0}
        >
          <Button view="flat" size="m" onClick={onToggleCollapsed} aria-label="Свернуть меню">
            <Icon data={LayoutSideContent} size={BUTTON_ICON_SIZE} />
          </Button>
        </Tooltip>

        {!collapsed && (
          <Text variant="subheader-2" color="brand" style={{ marginInlineStart: 'auto' }}>
            ЛОГО
          </Text>
        )}
      </div>

      <nav style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {groups.map((group, index) => (
          <div key={group.title}>
            {!collapsed && <div className="sidebar-group__title">{group.title}</div>}
            {collapsed &&
              (index === 0 ? <div style={{ height: 8 }} /> : <div className="sidebar-separator" />)}
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <DropdownMenu
          size="m"
          popupProps={{ placement: collapsed ? 'right-end' : 'top-start' }}
          renderSwitcher={(props) => (
            <Button {...props} view="flat" size="m" aria-label="Меню аккаунта">
              <Icon data={EllipsisVertical} size={BUTTON_ICON_SIZE} />
            </Button>
          )}
          items={[
            {
              text: theme === 'dark' ? 'Светлая тема' : 'Тёмная тема',
              iconStart: <Icon data={theme === 'dark' ? Sun : Moon} size={BUTTON_ICON_SIZE} />,
              action: () => toggleTheme(),
            },
            {
              text: 'Выйти',
              iconStart: <Icon data={ArrowRightFromSquare} size={BUTTON_ICON_SIZE} />,
              action: () => void signOut(),
            },
          ]}
        />

        {!collapsed && (
          // Text рендерится инлайновым span, поэтому нужен явный столбец:
          // иначе название организации и роль слипаются в одну строку.
          <Flex direction="column" style={{ overflow: 'hidden', minWidth: 0 }}>
            <Text variant="body-1" ellipsis>
              {current ? current.name : 'Без организации'}
            </Text>
            {current && roleCaption(scopes) && (
              <Text variant="caption-2" color="secondary" ellipsis>
                {roleCaption(scopes)}
              </Text>
            )}
          </Flex>
        )}
      </div>
    </aside>
  );
}

/**
 * Подпись под названием организации — кто человек в ней, по скоупам токена.
 * null, пока скоупы не прочитаны: лучше без подписи, чем с неверной.
 */
function roleCaption(scopes: string[] | null): string | null {
  if (!scopes) return null;
  if (scopes.includes('manage:platform')) return 'Администратор платформы';
  if (scopes.includes('manage:organization')) return 'Администратор';

  return 'Сотрудник';
}

/** Пункт меню. В свёрнутом виде остаётся только иконка с подсказкой. */
function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) => (isActive ? 'sidebar-item sidebar-item_active' : 'sidebar-item')}
    >
      <span className="sidebar-item__icon">
        <Icon data={item.icon} size={NAV_ICON_SIZE} />
      </span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip content={item.label} placement="right" openDelay={TOOLTIP_DELAY} rest={0}>
      {link}
    </Tooltip>
  );
}
