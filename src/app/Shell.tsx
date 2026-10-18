import { Suspense, lazy, useEffect } from 'react';
import App from './App';
import { isWorkspace, useRoute } from './router';
import { SiteNav } from '../ui/SiteNav';
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
const FavoritesPage = lazy(() => import('../pages/FavoritesPage'));
const SketchPage = lazy(() => import('../pages/SketchPage'));

export default function Shell() {
  const { route, anchor } = useRoute();
  const t = useT();
  const workbench = isWorkspace(route);

  // The workbench manages its own scrolling inside a fixed grid; the content
  // pages scroll normally. Toggling this on <body> avoids two scrollbars.
  useEffect(() => {
    document.body.classList.toggle('scrolls', !workbench && route !== 'sketch');
    return () => document.body.classList.remove('scrolls');
  }, [workbench, route]);

  // A title per view, so a tab, a bookmark and a shared link each say which
  // part of the application they are. The static pages carry their own.
  useEffect(() => {
    document.title = `${t(`nav.${route}`)} — KREAMET`;
  }, [route, t]);

  // Designer, Optimiser and Runner are one element in one position, so React
  // keeps the same App mounted across them: switching view changes the
  // panels on screen, not the mechanism, the playback or a running search.
  if (workbench) return <App workspace={route} anchor={anchor} />;

  // The sketcher, like the workbench, owns the whole window below the bar.
  if (route === 'sketch') {
    return (
      <div className="sketch-app">
        <header className="siteheader">
          <SiteNav />
        </header>
        <Suspense fallback={<div className="loading">{t('theory.loading')}</div>}>
          <SketchPage />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="site">
      <header className="siteheader">
        <SiteNav />
      </header>
      <Suspense fallback={<div className="loading">{t('theory.loading')}</div>}>
        {route === 'about' ? (
          <AboutPage />
        ) : route === 'favorites' ? (
          <FavoritesPage />
        ) : (
          <TheoryPage />
        )}
      </Suspense>
    </div>
  );
}
