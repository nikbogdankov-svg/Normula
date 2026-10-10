import {
  Archive,
  ArrowLeftFromLine,
  ArrowRightArrowLeft,
  ArrowRightToLine,
  Box,
  Cubes3Overlap,
  BookOpen,
  FileText,
  Gear,
  Heart,
  Layers3Diagonal,
  Person,
  Receipt,
  ShoppingBasket,
  SquareListUl,
  Wallet,
} from '@gravity-ui/icons';
import type { IconData } from '@gravity-ui/uikit';

/** Пункт бокового меню. */
export interface NavItem {
  to: string;
  label: string;
  icon: IconData;
  /** Раздел ещё не нарисован — страница показывает заглушку. */
  wip?: boolean;
  /**
   * Организационный скоуп, без которого пункт не показывается и роут
   * отдаёт заглушку «нет доступа».
   *
   * Это вежливость, а не защита: по-настоящему доступ закрывают
   * перехватчики на бэкенде. Смысл в том, чтобы не рекламировать раздел,
   * который всё равно ответит отказом.
   */
  scope?: string;
}

/** Группа пунктов с заголовком, как в макете. */
export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Навигация из макета «Учёт и планирование питания на объектах».
 * Раздел «Управление» добавлен сверх макета — там администрирование
 * организаций платформы.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Планирование',
    items: [
      { to: '/app/menu', label: 'Меню', icon: SquareListUl },
      { to: '/app/portions', label: 'Порционник', icon: Receipt },
      { to: '/app/products-spread', label: 'Раскладка продуктов', icon: ShoppingBasket },
      { to: '/app/ttk', label: 'ТТК', icon: FileText },
    ],
  },
  {
    title: 'Склад',
    items: [
      { to: '/app/warehouse-receipts', label: 'Приход', icon: ArrowRightToLine },
      { to: '/app/warehouse-balances', label: 'Остатки', icon: Archive },
      { to: '/app/write-offs', label: 'Списание', icon: ArrowLeftFromLine },
      { to: '/app/warehouse-transfers', label: 'Перемещение', icon: ArrowRightArrowLeft },
    ],
  },
  {
    title: 'Финансы',
    items: [{ to: '/app/accounts', label: 'Счета', icon: Wallet, wip: true }],
  },
  {
    title: 'Журналы',
    items: [{ to: '/app/journals', label: 'Журналы', icon: BookOpen }],
  },
  {
    title: 'Справочники',
    items: [
      { to: '/app/objects', label: 'Объекты', icon: Layers3Diagonal },
      { to: '/app/products', label: 'Продукты', icon: Box },
      { to: '/app/diets', label: 'Диеты', icon: Heart },
    ],
  },
  {
    title: 'Администрирование',
    items: [
      // Администрирование организаций платформы: доступно только
      // платформенному администратору, у администратора организации
      // этого скоупа в токене нет.
      { to: '/app/management', label: 'Управление', icon: Cubes3Overlap, scope: 'manage:platform' },
      { to: '/app/administration', label: 'Администрирование', icon: Gear },
      { to: '/app/profile', label: 'Мой профиль', icon: Person },
    ],
  },
];

/** Плоский список пунктов — из него собираются роуты. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * Виден ли пункт при таком наборе скоупов.
 *
 * scopes === null означает «ещё не знаем»: пункты со скоупом прячем до
 * выяснения. Показать и тут же убрать — хуже, чем дорисовать с задержкой.
 */
export function isNavItemVisible(item: NavItem, scopes: string[] | null): boolean {
  if (!item.scope) return true;

  return scopes !== null && scopes.includes(item.scope);
}

/** Группы без скрытых пунктов; пустые группы отбрасываются целиком. */
export function visibleNavGroups(scopes: string[] | null): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isNavItemVisible(item, scopes)),
  })).filter((group) => group.items.length > 0);
}
