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
  /** Ключ перевода (см. `src/shared/i18n/locales.ts`). */
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
  /** Ключ перевода (см. `src/shared/i18n/locales.ts`). */
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
    title: 'nav.groups.planning',
    items: [
      { to: '/app/menu', label: 'nav.items.menu', icon: SquareListUl },
      { to: '/app/portions', label: 'nav.items.portions', icon: Receipt },
      { to: '/app/products-spread', label: 'nav.items.productsSpread', icon: ShoppingBasket },
      { to: '/app/ttk', label: 'nav.items.ttk', icon: FileText },
    ],
  },
  {
    title: 'nav.groups.warehouse',
    items: [
      { to: '/app/warehouse-receipts', label: 'nav.items.receipts', icon: ArrowRightToLine },
      { to: '/app/warehouse-balances', label: 'nav.items.balances', icon: Archive },
      { to: '/app/write-offs', label: 'nav.items.writeOffs', icon: ArrowLeftFromLine },
      { to: '/app/warehouse-transfers', label: 'nav.items.transfers', icon: ArrowRightArrowLeft },
    ],
  },
  {
    title: 'nav.groups.finance',
    items: [{ to: '/app/accounts', label: 'nav.items.accounts', icon: Wallet, wip: true }],
  },
  {
    title: 'nav.groups.journals',
    items: [{ to: '/app/journals', label: 'nav.items.journals', icon: BookOpen }],
  },
  {
    title: 'nav.groups.references',
    items: [
      { to: '/app/objects', label: 'nav.items.objects', icon: Layers3Diagonal },
      { to: '/app/products', label: 'nav.items.products', icon: Box },
      { to: '/app/diets', label: 'nav.items.diets', icon: Heart },
    ],
  },
  {
    title: 'nav.groups.administration',
    items: [
      // Администрирование организаций платформы: доступно только
      // платформенному администратору, у администратора организации
      // этого скоупа в токене нет.
      {
        to: '/app/management',
        label: 'nav.items.management',
        icon: Cubes3Overlap,
        scope: 'manage:platform',
      },
      { to: '/app/administration', label: 'nav.items.administration', icon: Gear },
      { to: '/app/profile', label: 'nav.items.profile', icon: Person },
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
