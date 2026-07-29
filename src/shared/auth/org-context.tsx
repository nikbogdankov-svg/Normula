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
  setCurrent: (organizationId: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * Держит список организаций пользователя и текущий выбор (переживает
 * перезагрузку через localStorage). Токен текущей организации получает
 * useApi — здесь только выбор.
 */
export function OrgProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, fetchOrganizations } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
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

  const setCurrent = useCallback((organizationId: string) => {
    localStorage.setItem(STORAGE_KEY, organizationId);
    setCurrentId(organizationId);
  }, []);

  const value = useMemo<OrgContextValue>(
    () => ({
      organizations,
      current: organizations?.find((o) => o.id === currentId) ?? null,
      setCurrent,
    }),
    [organizations, currentId, setCurrent]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganizations(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrganizations: компонент вне <OrgProvider>');
  }
  return ctx;
}
