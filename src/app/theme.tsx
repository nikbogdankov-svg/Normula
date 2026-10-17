import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@gravity-ui/uikit';
import { useTranslation } from '@/shared/i18n';

type AppTheme = 'light';
const STORAGE_KEY = 'onemore.theme';

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Тема Gravity UI. Только светлая тема. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<AppTheme>('light');

  const setTheme = useCallback((next: AppTheme) => {
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'light');
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  const { i18n } = useTranslation();

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme} lang={i18n.language}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme: компонент вне <AppThemeProvider>');
  return ctx;
}
