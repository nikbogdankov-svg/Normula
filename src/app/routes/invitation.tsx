import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FullPageLoader } from '@/shared/ui/full-page-loader';

/**
 * Приём приглашения из письма.
 *
 * ПРОТОТИП: приглашения и вход через Logto подменены — отдельного сценария
 * регистрации нет, пользователь и так «вошёл». Поэтому просто уводим в
 * приложение; адрес оставлен, чтобы ссылки из писем не падали в 404.
 */
export function InvitationRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/app', { replace: true });
  }, [navigate]);

  return <FullPageLoader />;
}
