import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/auth';
import { WipPage } from '@/shared/ui/wip-page';
import { AppLayout } from './layout/app-layout';
import { NAV_ITEMS } from './layout/nav';
import { LandingRoute } from './routes/landing';
import { CallbackRoute } from './routes/callback';
import { NotFoundRoute } from './routes/not-found';
import { InvitationRoute } from './routes/invitation';
import { ManagementRoute } from '@/features/organizations/management-route';
import { StaffRoute } from '@/features/staff/staff-route';
import { TtkRoute } from '@/features/ttk/ttk-route';

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
};

const appChildren = NAV_ITEMS.map((item) => ({
  path: item.to.replace('/app/', ''),
  element: DESIGNED_ROUTES[item.to] ?? <WipPage title={item.label} />,
}));

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
