import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FullPageLoader } from '@/shared/ui/full-page-loader';

/**
 * Завершение OIDC-редиректа.
 *
 * ПРОТОТИП: реального редиректа Logto нет (авторизация моковая), но адрес
 * /callback остаётся рабочим — сразу уводим в приложение. Страница сохранена,
 * чтобы прямые ссылки и закладки не падали в 404.
 */
export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/app', { replace: true });
  }, [navigate]);

  return <FullPageLoader />;
}
