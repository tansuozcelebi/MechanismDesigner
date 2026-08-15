import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { I18nProvider } from './i18n';
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(I18nProvider, { children: _jsx(App, {}) }) }));
