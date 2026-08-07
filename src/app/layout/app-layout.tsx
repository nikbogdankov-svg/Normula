import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useOrganizations } from '@/shared/auth';
import { NoOrganizationsBanner } from '@/shared/ui/states';
import { Sidebar } from './sidebar';

const COLLAPSED_KEY = 'onemore.sidebarCollapsed';

/**
 * Каркас авторизованной части по макету: боковое меню слева, контент справа
 * на сером фоне. Состояние свёрнутости переживает перезагрузку.
 */
export function AppLayout() {
  const { organizations } = useOrganizations();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSED_KEY, String(!value));

      return !value;
    });
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      <main
        style={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          background: 'var(--g-color-base-generic-ultralight)',
        }}
      >
        {organizations?.length === 0 && (
          <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
            <NoOrganizationsBanner />
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
