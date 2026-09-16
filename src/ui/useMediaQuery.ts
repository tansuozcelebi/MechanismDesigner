import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query from React.
 *
 * The layout itself is done in CSS — that is where it belongs, and it keeps
 * working while the bundle boots. This exists for the parts a stylesheet
 * cannot express: which drawer is open, whether Escape should close it, and
 * whether the panel toggles are in the tab order at all. A control that is
 * `display: none` is still focusable by screen readers if it stays mounted,
 * so on a desktop those buttons should not exist rather than be hidden.
 *
 * Guarded for environments without `matchMedia` (jsdom in the test run, and
 * any server-side render) so importing this module never depends on a browser.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Re-read on subscribe: the query can have changed between the initial
    // state and this effect, e.g. when a phone is rotated during startup.
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * The one breakpoint the app's shell changes at.
 *
 * Below it the three-column grid cannot work: the sidebars are 336 px and
 * 300 px, so on a 390 px phone the canvas column is left with *zero* pixels
 * and the page scrolls sideways instead. Above it there is room for all three.
 */
export const COMPACT_QUERY = '(max-width: 820px)';

export const useCompactLayout = (): boolean => useMediaQuery(COMPACT_QUERY);
