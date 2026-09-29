import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoader } from '@/shared/ui/full-page-loader';
import { useAuth } from './auth-context';

/** Пускает дальше только аутентифицированных; остальных — на лендинг. */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth();

  // SDK Logto включает isLoading на каждый свой вызов — в том числе на
  // получение токена перед каждым запросом к API. Лоадер нужен только до
  // первого ответа SDK: иначе он на миг подменял бы страницу, та
  // размонтировалась бы и теряла состояние (выбранный объект, открытые окна).
  const [settled, setSettled] = useState(!isLoading);
  if (!settled && !isLoading) setSettled(true);

  if (!settled) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
