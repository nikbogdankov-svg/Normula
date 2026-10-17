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
import { useTranslation, setLanguage, LANGUAGES } from '@/shared/i18n';
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
  const { signOut, user } = useAuth();
  const { current, scopes } = useOrganizations();
  const { t, i18n } = useTranslation();

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
          content={collapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
          openDelay={TOOLTIP_DELAY}
          rest={0}
        >
          <Button
            view="flat"
            size="m"
            onClick={onToggleCollapsed}
            aria-label={t('sidebar.collapseMenu')}
          >
            <Icon data={LayoutSideContent} size={BUTTON_ICON_SIZE} />
          </Button>
        </Tooltip>

        {!collapsed && (
          <Text variant="subheader-2" color="brand" style={{ marginInlineStart: 'auto' }}>
            {t('sidebar.logo')}
          </Text>
        )}
      </div>

      <nav style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {groups.map((group, index) => (
          <div key={group.title}>
            {!collapsed && <div className="sidebar-group__title">{t(group.title)}</div>}
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
            <Button {...props} view="flat" size="m" aria-label={t('sidebar.accountMenu')}>
              <Icon data={EllipsisVertical} size={BUTTON_ICON_SIZE} />
            </Button>
          )}
          items={[
            {
              text: t('sidebar.language'),
              items: LANGUAGES.map((language) => ({
                text: language.label,
                active: language.code === i18n.language,
                action: () => setLanguage(language.code),
              })),
            },
            {
              text: theme === 'dark' ? t('sidebar.lightTheme') : t('sidebar.darkTheme'),
              iconStart: <Icon data={theme === 'dark' ? Sun : Moon} size={BUTTON_ICON_SIZE} />,
              action: () => toggleTheme(),
            },
            {
              text: t('sidebar.logout'),
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
              {user?.name || user?.email || t('common.user')}
            </Text>
            {current && roleCaption(scopes) && (
              <Text variant="caption-2" color="secondary" ellipsis>
                {t(roleCaption(scopes)!)}
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
 * Возвращает ключ перевода, null — пока скоупы не прочитаны: лучше без
 * подписи, чем с неверной.
 */
function roleCaption(scopes: string[] | null): string | null {
  if (!scopes) return null;
  if (scopes.includes('manage:platform')) return 'sidebar.rolePlatformAdmin';
  if (scopes.includes('manage:organization')) return 'sidebar.roleAdmin';

  return 'sidebar.roleEmployee';
}

/** Пункт меню. В свёрнутом виде остаётся только иконка с подсказкой. */
function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t } = useTranslation();
  const label = t(item.label);

  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) => (isActive ? 'sidebar-item sidebar-item_active' : 'sidebar-item')}
    >
      <span className="sidebar-item__icon">
        <Icon data={item.icon} size={NAV_ICON_SIZE} />
      </span>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip content={label} placement="right" openDelay={TOOLTIP_DELAY} rest={0}>
      {link}
    </Tooltip>
  );
}
