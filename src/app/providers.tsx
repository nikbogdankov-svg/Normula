import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, ToasterComponent, ToasterProvider } from '@gravity-ui/uikit';
import { settings as dateSettings } from '@gravity-ui/date-utils';
import { AuthProvider, OrgProvider } from '@/shared/auth';
import { ObjectSelectionProvider } from '@/shared/object-selection';
import { useTranslation } from '@/shared/i18n';
import { ApiError } from '@/shared/api/client';
import { AppThemeProvider } from './theme';
import { ErrorBoundary } from './error-boundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx ретраить бессмысленно: 401/403/404 сами не «починятся».
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 1;
      },
    },
    mutations: { retry: false },
  },
});

const toaster = new Toaster();

/** Держит локаль Gravity date-utils в актуальном состоянии при смене языка. */
function DateLocaleSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    void dateSettings.loadLocale(i18n.language).catch(() => {
      // Локаль не подгрузилась — дата остаётся на прежнем языке.
    });
  }, [i18n.language]);

  return null;
}

/** Композиция провайдеров. Порядок важен: тема снаружи, org зависит от auth. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppThemeProvider>
      <ErrorBoundary>
        <ToasterProvider toaster={toaster}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <OrgProvider>
                <ObjectSelectionProvider>
                  <DateLocaleSync />
                  {children}
                </ObjectSelectionProvider>
              </OrgProvider>
            </AuthProvider>
          </QueryClientProvider>
          <ToasterComponent />
        </ToasterProvider>
      </ErrorBoundary>
    </AppThemeProvider>
  );
}
