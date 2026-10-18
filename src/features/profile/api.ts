import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/api/use-api';

/** Своя карточка в текущей организации — StaffService.GetMyProfile. */
export interface MyProfile {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Карточка вошедшего: имя, фамилия, почта. У администратора платформы
 * карточки может не быть — бэкенд отвечает 404, страница показывает почту
 * из профиля входа.
 */
export function useMyProfile() {
  const api = useApi();

  return useQuery({
    queryKey: ['profile', api.organizationId],
    queryFn: () => api.request<MyProfile>('/v1/profile'),
    enabled: api.organizationId !== null,
  });
}
