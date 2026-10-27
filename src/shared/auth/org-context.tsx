import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth, type Organization } from './auth-context';

const STORAGE_KEY = 'onemore.currentOrgId';

interface OrgContextValue {
  /** Организации пользователя (null — ещё грузятся). */
  organizations: Organization[] | null;
  /** Текущая выбранная организация (null — ещё не выбрана / нет ни одной). */
  current: Organization | null;
  /**
   * Скоупы токена текущей организации (null — ещё грузятся).
   *
   * По ним меню прячет разделы, которых у человека нет. Пока null, меню
   * показывает только заведомо общедоступное: показать лишнее и убрать —
   * хуже, чем дорисовать пункт с задержкой.
   */
  scopes: string[] | null;
  /** Возможности организации: склад и finance */
  organizationFeatures: {
    warehouseEnabled: boolean;
    financeEnabled: boolean;
    objectsEnabled: boolean;
  } | null;
  setOrganizationFeatures: (
    organizationId: string,
    features: NonNullable<Organization['features']>
  ) => void;
  setCurrent: (organizationId: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * Держит список организаций пользователя и текущий выбор (переживает
 * перезагрузку через localStorage). Токен текущей организации получает
 * useApi — здесь только выбор.
 */
export function OrgProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, fetchOrganizations, getOrganizationScopes } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [scopes, setScopes] = useState<string[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setOrganizations(null);
      return;
    }
    let cancelled = false;
    fetchOrganizations()
      .then((orgs) => {
        if (!cancelled) setOrganizations(orgs);
      })
      .catch(() => {
        if (!cancelled) setOrganizations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchOrganizations]);

  // Если сохранённый выбор невалиден (выгнали из организации) — берём первую.
  useEffect(() => {
    if (!organizations || organizations.length === 0) return;
    if (!currentId || !organizations.some((o) => o.id === currentId)) {
      setCurrentId(organizations[0].id);
    }
  }, [organizations, currentId]);

  // Скоупы перечитываются при смене организации: в разных организациях у
  // одного человека могут быть разные роли.
  useEffect(() => {
    if (!isAuthenticated || !currentId) {
      setScopes(null);
      return;
    }

    let cancelled = false;
    setScopes(null);

    getOrganizationScopes(currentId)
      .then((value) => {
        if (!cancelled) setScopes(value);
      })
      .catch(() => {
        // Не смогли прочитать — считаем, что особых прав нет. Так меню
        // недосчитается пункта, но не покажет недоступный.
        if (!cancelled) setScopes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentId, getOrganizationScopes]);

  const setCurrent = useCallback((organizationId: string) => {
    localStorage.setItem(STORAGE_KEY, organizationId);
    setCurrentId(organizationId);
  }, []);

  const setOrganizationFeatures = useCallback(
    (organizationId: string, features: NonNullable<Organization['features']>) => {
      setOrganizations(
        (currentOrganizations) =>
          currentOrganizations?.map((organization) =>
            organization.id === organizationId ? { ...organization, features } : organization
          ) ?? null
      );
    },
    []
  );

  const value = useMemo<OrgContextValue>(() => {
    const current = organizations?.find((organization) => organization.id === currentId) ?? null;

    return {
      organizations,
      current,
      scopes,
      organizationFeatures: current
        ? {
            warehouseEnabled: current.features?.warehouseEnabled ?? true,
            financeEnabled: current.features?.financeEnabled ?? true,
            objectsEnabled: current.features?.objectsEnabled ?? false,
          }
        : null,
      setOrganizationFeatures,
      setCurrent,
    };
  }, [organizations, currentId, scopes, setCurrent, setOrganizationFeatures]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganizations(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrganizations: компонент вне <OrgProvider>');
  }
  return ctx;
}
