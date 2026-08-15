import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './app/Shell';
import { I18nProvider } from './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Shell />
    </I18nProvider>
  </StrictMode>,
);
