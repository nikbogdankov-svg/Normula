import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoader } from '@/shared/ui/full-page-loader';
import { useAuth } from './auth-context';

/** Пускает дальше только аутентифицированных; остальных — на лендинг. */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
