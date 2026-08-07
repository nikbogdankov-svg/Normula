import {
  Archive,
  ArrowLeftFromLine,
  ArrowRightArrowLeft,
  ArrowRightToLine,
  Box,
  Calendar,
  CircleRuble,
  Cubes3Overlap,
  Files,
  FileText,
  Gear,
  Heart,
  Layers3Diagonal,
  ListCheck,
  Person,
  Receipt,
  ShoppingCart,
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
}

/** Группа пунктов с заголовком, как в макете. */
export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Навигация из макета «Учет и планирование питания на пищеблоке».
 * Раздел «Управление» добавлен сверх макета — там администрирование
 * организаций платформы.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Планирование',
    items: [
      { to: '/app/menu', label: 'Меню', icon: SquareListUl },
      { to: '/app/ttk', label: 'ТТК', icon: FileText },
    ],
  },
  {
    title: 'Производство',
    items: [
      { to: '/app/objects', label: 'Объекты', icon: Layers3Diagonal },
      { to: '/app/portions', label: 'Порционник', icon: Receipt, wip: true },
      { to: '/app/cooking-plan', label: 'План приготовления', icon: Calendar, wip: true },
      { to: '/app/products-layout', label: 'Раскладка продуктов', icon: Box, wip: true },
      {
        to: '/app/dishes-distribution',
        label: 'Распределение блюд',
        icon: ArrowRightArrowLeft,
        wip: true,
      },
    ],
  },
  {
    title: 'Склад',
    items: [
      { to: '/app/receipts', label: 'Приход', icon: ArrowRightToLine, wip: true },
      { to: '/app/stock', label: 'Остатки', icon: Archive, wip: true },
      { to: '/app/write-offs', label: 'Списание', icon: ArrowLeftFromLine, wip: true },
    ],
  },
  {
    title: 'Финансы',
    items: [
      { to: '/app/cost', label: 'Себестоимость', icon: CircleRuble, wip: true },
      { to: '/app/accounts', label: 'Счета', icon: Wallet, wip: true },
    ],
  },
  {
    title: 'Документы',
    items: [{ to: '/app/documents', label: 'Документы', icon: Files, wip: true }],
  },
  {
    title: 'Справочники',
    items: [
      { to: '/app/norms', label: 'Нормы', icon: ListCheck, wip: true },
      { to: '/app/products', label: 'Продукты', icon: ShoppingCart, wip: true },
      { to: '/app/diets', label: 'Диеты', icon: Heart, wip: true },
    ],
  },
  {
    title: 'Администрирование',
    items: [
      { to: '/app/management', label: 'Управление', icon: Cubes3Overlap },
      { to: '/app/administration', label: 'Администрирование', icon: Gear },
      { to: '/app/profile', label: 'Мой профиль', icon: Person },
    ],
  },
];

/** Плоский список пунктов — из него собираются роуты. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
