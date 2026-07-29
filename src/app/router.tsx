import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/auth';
import { AppLayout } from './layout/app-layout';
import { LandingRoute } from './routes/landing';
import { CallbackRoute } from './routes/callback';
import { HelloRoute } from '@/features/hello/hello-route';
import { NotFoundRoute } from './routes/not-found';

/**
 * Маршруты приложения. Новая страница = роут здесь + пункт в NAV
 * (app/layout/app-layout.tsx), контент — в features/<имя>/.
 */
export const router = createBrowserRouter([
  { path: '/', element: <LandingRoute /> },
  { path: '/callback', element: <CallbackRoute /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [{ index: true, element: <HelloRoute /> }],
      },
    ],
  },
  { path: '*', element: <NotFoundRoute /> },
]);
