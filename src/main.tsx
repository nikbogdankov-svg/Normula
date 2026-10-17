import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { settings } from '@gravity-ui/date-utils';
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './app/brand.css';
import './shared/i18n';
import { AppProviders } from './app/providers';
import { router } from './app/router';

async function bootstrap() {
  try {
    await settings.loadLocale('ru');
  } catch {
    // If locale load fails, app still renders with default locale.
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>
  );
}

bootstrap();
