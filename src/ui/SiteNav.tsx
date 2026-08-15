import { hrefFor, useRoute, ROUTES, type Route } from '../app/router';
import { useT } from '../i18n';
import { APP_NAME } from '../i18n/translations';
import { LanguageSwitch } from './LanguageSwitch';

const LABEL_KEY: Record<Route, 'nav.designer' | 'nav.about' | 'nav.theory'> = {
  designer: 'nav.designer',
  about: 'nav.about',
  theory: 'nav.theory',
};

/** The brand lockup, from the single shipped asset. */
export const LOGO_SRC = '/kreamet-logo.svg';

/**
 * The whole header bar: brand, route links, and — on the designer — the
 * subtitle and the design actions.
 *
 * One component owns the bar so the brand and the links never move between
 * pages, and so the lockup is drawn exactly once. The designer passes its
 * extras in rather than laying out a second header beside this one.
 *
 * Plain anchors rather than click handlers: hash links are real URLs, so they
 * can be middle-clicked, copied and bookmarked, and they keep working while
 * JavaScript is still booting.
 */
export function SiteNav({
  subtitle,
  designLabel,
  designKind,
  loadInitial,
  exportDesign,
}: {
  /** The designer's live mechanism summary; absent on the content pages. */
  subtitle?: string;
  designLabel?: string;
  designKind?: 'optimized' | 'initial' | 'manual' | 'sampled';
  loadInitial?: () => void;
  exportDesign?: () => void;
}) {
  const t = useT();
  const { route } = useRoute();

  return (
    <div className="sitenav-container">
      <a className="brand" href={hrefFor('designer')} aria-label={APP_NAME}>
        <img className="logo" src={LOGO_SRC} alt={APP_NAME} />
      </a>

      <nav className="sitenav">
        {ROUTES.map((r) => (
          <a
            key={r}
            href={hrefFor(r)}
            className={r === route ? 'active' : ''}
            aria-current={r === route ? 'page' : undefined}
          >
            {t(LABEL_KEY[r])}
          </a>
        ))}
      </nav>

      {subtitle && <span className="sub">{subtitle}</span>}

      {/* Pushed right; the language switch is always the last control, so it
          sits in the same place whichever page you are on. */}
      <div className="sitenav-actions">
        {designLabel && (
          <span className={`badge ${designKind === 'optimized' ? 'pass' : 'info'}`}>
            {designLabel}
          </span>
        )}
        {loadInitial && <button onClick={loadInitial}>{t('app.loadInitial')}</button>}
        {exportDesign && <button onClick={exportDesign}>{t('app.export')}</button>}
        <LanguageSwitch />
      </div>
    </div>
  );
}
