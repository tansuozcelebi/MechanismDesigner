import { LogoMark } from './Logo';
import { hrefFor, useRoute, ROUTES, type Route } from '../app/router';
import { useT } from '../i18n';
import { APP_NAME } from '../i18n/translations';

const LABEL_KEY: Record<Route, 'nav.designer' | 'nav.about' | 'nav.theory'> = {
  designer: 'nav.designer',
  about: 'nav.about',
  theory: 'nav.theory',
};

/**
 * Brand and route links, shared by the designer header and the content pages so
 * navigation sits in the same place everywhere.  Plain anchors rather than click
 * handlers: hash links are real URLs, so they can be middle-clicked, copied and
 * bookmarked, and they keep working with JavaScript still booting.
 */
export function SiteNav({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { route } = useRoute();

  return (
    <>
      <a className="brand" href={hrefFor('designer')} aria-label={APP_NAME}>
        <LogoMark size={compact ? 26 : 30} />
        {/* The designer has no other page title, so the wordmark is its <h1>.
            The content pages carry their own headings, and a second h1 there
            would compete with them. */}
        {compact ? (
          <span className="brandtext">
            <span className="krea">KREA</span>
            <span className="met">MET</span>
          </span>
        ) : (
          <h1 className="brandtext">
            <span className="krea">KREA</span>
            <span className="met">MET</span>
          </h1>
        )}
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
    </>
  );
}
