import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/auth';
import { WipPage } from '@/shared/ui/wip-page';
import { NoAccessPage } from '@/shared/ui/no-access';
import { useOrganizations } from '@/shared/auth';
import { AppLayout } from './layout/app-layout';
import { NAV_ITEMS, isNavItemVisible, type NavItem } from './layout/nav';
import { LandingRoute } from './routes/landing';
import { CallbackRoute } from './routes/callback';
import { NotFoundRoute } from './routes/not-found';
import { InvitationRoute } from './routes/invitation';
import { ManagementRoute } from '@/features/organizations/management-route';
import { StaffRoute } from '@/features/staff/staff-route';
import { TtkRoute } from '@/features/ttk/ttk-route';
import { ProfileRoute } from '@/features/profile/profile-route';
import { MenuRoute } from '@/features/menu/menu-route';
import { ObjectsRoute } from '@/features/objects/objects-route';
import { PortionsRoute } from '@/features/portions/portions-route';
import { JournalsRoute } from '@/features/journals/journals-route';
import { WarehouseReceiptsRoute } from '@/features/warehouse-receipts/warehouse-receipts-route';
import { WarehouseBalancesRoute } from '@/features/warehouse-balances/warehouse-balances-route';
import { WriteOffsRoute } from '@/features/write-offs/write-offs-route';
import { AccountsRoute } from '@/features/accounts/accounts-route';

/**
 * Маршруты приложения.
 *
 * Разделы левого меню объявлены один раз в layout/nav.ts: у кого стоит
 * wip — получает заглушку, остальные перечислены здесь явно. Так пункт меню
 * и роут не разъезжаются.
 */
const DESIGNED_ROUTES: Record<string, React.ReactElement> = {
  '/app/management': <ManagementRoute />,
  '/app/administration': <StaffRoute />,
  '/app/ttk': <TtkRoute />,
  '/app/profile': <ProfileRoute />,
  '/app/menu': <MenuRoute />,
  '/app/objects': <ObjectsRoute />,
  '/app/portions': <PortionsRoute />,
  '/app/journals': <JournalsRoute />,
  '/app/warehouse-receipts': <WarehouseReceiptsRoute />,
  '/app/warehouse-balances': <WarehouseBalancesRoute />,
  '/app/write-offs': <WriteOffsRoute />,
  '/app/accounts': <AccountsRoute />,
};

/**
 * Роут пункта, закрытого скоупом.
 *
 * Скрыть пункт в меню недостаточно: адрес остаётся рабочим, и по прямой
 * ссылке человек попал бы на страницу, которая всё равно получит отказ от
 * бэкенда и покажет ошибку загрузки. Лучше сказать честно и сразу.
 */
function GuardedRoute({ item, children }: { item: NavItem; children: React.ReactElement }) {
  const { scopes } = useOrganizations();

  if (!isNavItemVisible(item, scopes)) {
    return <NoAccessPage title={item.label} />;
  }

  return children;
}

const appChildren = NAV_ITEMS.map((item) => {
  const element = DESIGNED_ROUTES[item.to] ?? <WipPage title={item.label} />;

  return {
    path: item.to.replace('/app/', ''),
    element: item.scope ? <GuardedRoute item={item}>{element}</GuardedRoute> : element,
  };
});

export const router = createBrowserRouter([
  { path: '/', element: <LandingRoute /> },
  { path: '/callback', element: <CallbackRoute /> },
  // Приём приглашения из письма — до авторизации, её как раз и запускает.
  { path: '/invitation/join', element: <InvitationRoute /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/management" replace /> },
          ...appChildren,
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundRoute /> },
]);
