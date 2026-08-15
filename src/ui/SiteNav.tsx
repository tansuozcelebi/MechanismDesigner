import { hrefFor, useRoute, ROUTES, type Route } from '../app/router';
import { useT } from '../i18n';
import { APP_NAME } from '../i18n/translations';

const LABEL_KEY: Record<Route, 'nav.designer' | 'nav.about' | 'nav.theory'> = {
  designer: 'nav.designer',
  about: 'nav.about',
  theory: 'nav.theory',
};

/** The brand lockup, from the single shipped asset. */
export const LOGO_SRC = '/kreamet-logo.svg';

/**
 * Brand and route links, shared by the designer header and the content pages so
 * navigation sits in the same place everywhere.  Plain anchors rather than click
 * handlers: hash links are real URLs, so they can be middle-clicked, copied and
 * bookmarked, and they keep working with JavaScript still booting.
 *
 * `brand` is optional because the designer renders the lockup itself, as its
 * page heading. Drawing it here as well would put the same logo on screen
 * twice, side by side.
 */
export function SiteNav({ brand = true }: { brand?: boolean }) {
  const t = useT();
  const { route } = useRoute();

  return (
    <>
      {brand && (
        <a className="brand" href={hrefFor('designer')} aria-label={APP_NAME}>
          <img className="logo" src={LOGO_SRC} alt={APP_NAME} />
        </a>
      )}
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
