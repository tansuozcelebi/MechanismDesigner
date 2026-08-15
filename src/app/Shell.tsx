import { Suspense, lazy, useEffect } from 'react';
import App from './App';
import { useRoute } from './router';
import { SiteNav } from '../ui/SiteNav';
import { LanguageSwitch } from '../ui/LanguageSwitch';
import { useT } from '../i18n';

/**
 * Route shell.
 *
 * The designer is imported eagerly — it is the landing route and the reason the
 * app exists — while the content pages are code-split, so the reference document
 * and its renderer are only fetched by someone who actually opens them.
 *
 * The designer keeps its own full-height header because it needs the design
 * badges and export buttons in the same bar; the content pages share a slimmer
 * one. Both render the same `SiteNav`, so the brand and the links never move.
 */
const AboutPage = lazy(() => import('../pages/AboutPage'));
const TheoryPage = lazy(() => import('../pages/TheoryPage'));

export default function Shell() {
  const { route } = useRoute();
  const t = useT();

  // The designer manages its own scrolling inside a fixed grid; the content
  // pages scroll normally. Toggling this on <body> avoids two scrollbars.
  useEffect(() => {
    document.body.classList.toggle('scrolls', route !== 'designer');
    return () => document.body.classList.remove('scrolls');
  }, [route]);

  if (route === 'designer') return <App />;

  return (
    <div className="site">
      <header className="siteheader">
        <SiteNav compact />
        <span className="spacer" />
        <LanguageSwitch />
      </header>
      <Suspense fallback={<div className="loading">{t('theory.loading')}</div>}>
        {route === 'about' ? <AboutPage /> : <TheoryPage />}
      </Suspense>
    </div>
  );
}
