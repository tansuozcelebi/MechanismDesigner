import { useEffect, useState } from 'react';

/**
 * Hash routing, deliberately hand-rolled and tiny.
 *
 * The app is a static bundle that has to work when opened from a file path or
 * served from a project subdirectory (GitHub Pages, a shared drive), where the
 * History API needs server-side rewrites that will not exist. A hash route needs
 * none of that and still gives every page a real, linkable URL.
 */
export const ROUTES = ['designer', 'about', 'theory'] as const;
export type Route = (typeof ROUTES)[number];

const isRoute = (v: string): v is Route => (ROUTES as readonly string[]).includes(v);

/** `#/theory/ch-04` → { route: 'theory', anchor: 'ch-04' } */
export function parseHash(hash: string): { route: Route; anchor: string | null } {
  const raw = hash.replace(/^#\/?/, '');
  const [head, ...rest] = raw.split('/');
  return {
    route: isRoute(head) ? head : 'designer',
    anchor: rest.length ? rest.join('/') : null,
  };
}

export const hrefFor = (route: Route, anchor?: string): string =>
  `#/${route}${anchor ? `/${anchor}` : ''}`;

export function navigate(route: Route, anchor?: string): void {
  window.location.hash = hrefFor(route, anchor);
}

export function useRoute(): { route: Route; anchor: string | null } {
  const [state, setState] = useState(() =>
    parseHash(typeof window === 'undefined' ? '' : window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setState(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    // The hash can already have changed between first render and this effect.
    onChange();
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}
