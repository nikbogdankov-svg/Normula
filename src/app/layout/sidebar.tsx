import { NavLink } from 'react-router-dom';
import { Button, Flex, Icon, Text, Tooltip } from '@gravity-ui/uikit';
import { EllipsisVertical, LayoutSideContent, Moon, Sun } from '@gravity-ui/icons';
import { useAuth, useOrganizations } from '@/shared/auth';
import { useAppTheme } from '@/app/theme';
import { NAV_GROUPS, type NavItem } from './nav';
import './sidebar.css';

const EXPANDED_WIDTH = 250;
const COLLAPSED_WIDTH = 56;
const ICON_SIZE = 16;
/**
 * Дефолт Gravity — 1000 мс плюс «пауза» курсора (rest), из-за чего подсказка
 * в меню кажется не работающей. Берём обычный Tooltip, а не ActionTooltip:
 * первый красится в --g-color-base-float и потому белый в светлой теме и
 * тёмный в тёмной, как в примерах самого Gravity. ActionTooltip всегда
 * тёмный (--g-color-base-float-heavy).
 */
const TOOLTIP_DELAY = 120;

/**
 * Боковое меню по макету: лого, переключатели темы и сворачивания,
 * сгруппированная навигация, карточка пользователя снизу.
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
  const { current } = useOrganizations();

  return (
    <aside
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
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 4,
          padding: collapsed ? 0 : '0 12px 0 16px',
        }}
      >
        {!collapsed && (
          <Text variant="subheader-2" color="brand">
            ЛОГО
          </Text>
        )}

        <div style={{ display: 'flex', gap: 2 }}>
          {/* В свёрнутом меню остаётся только кнопка разворачивания —
              тема сворачивается вместе с остальным. */}
          {!collapsed && (
            <Tooltip
              content={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              openDelay={TOOLTIP_DELAY}
              rest={0}
            >
              <Button view="flat" size="m" onClick={toggleTheme} aria-label="Переключить тему">
                <Icon data={theme === 'dark' ? Sun : Moon} size={ICON_SIZE} />
              </Button>
            </Tooltip>
          )}

          <Tooltip
            content={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            openDelay={TOOLTIP_DELAY}
            rest={0}
          >
            <Button view="flat" size="m" onClick={onToggleCollapsed} aria-label="Свернуть меню">
              <Icon data={LayoutSideContent} size={ICON_SIZE} />
            </Button>
          </Tooltip>
        </div>
      </div>

      <nav style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {NAV_GROUPS.map((group, index) => (
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

      <div
        style={{
          borderTop: '1px solid var(--g-color-line-generic)',
          padding: collapsed ? '12px 0' : '12px 8px 12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
        }}
      >
        {!collapsed && (
          // Text рендерится инлайновым span, поэтому нужен явный столбец:
          // иначе название организации и роль слипаются в одну строку.
          <Flex direction="column" style={{ overflow: 'hidden' }}>
            <Text variant="body-1" ellipsis>
              {current ? current.name : 'Без организации'}
            </Text>
            <Text variant="caption-2" color="secondary" ellipsis>
              Администратор
            </Text>
          </Flex>
        )}

        <Tooltip content="Выйти" openDelay={TOOLTIP_DELAY} rest={0}>
          <Button view="flat" size="m" onClick={() => void signOut()} aria-label="Выйти">
            <Icon data={EllipsisVertical} size={ICON_SIZE} />
          </Button>
        </Tooltip>
      </div>
    </aside>
  );
}

/** Пункт меню. В свёрнутом виде остаётся только иконка с подсказкой. */
function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) => (isActive ? 'sidebar-item sidebar-item_active' : 'sidebar-item')}
      style={collapsed ? { justifyContent: 'center', padding: 0 } : undefined}
    >
      <span className="sidebar-item__icon">
        <Icon data={item.icon} size={ICON_SIZE} />
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
