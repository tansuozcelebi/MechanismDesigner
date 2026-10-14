import type { MechanismSpec } from '../mechanism/spec';
import { paramLayout } from '../mechanism/spec';
import type { TargetCurve } from '../synthesis/targetCurve';

/**
 * Favourite mechanisms.
 *
 * A favourite is everything needed to put a design back on screen and run it:
 * the topology, the parameter vector that indexes it, and the target it was
 * judged against. The target travels with it because a design's error figures
 * only mean something against the curve they were measured on — loading the
 * linkage under a different target would show a worse number for the same
 * mechanism and invite the wrong conclusion.
 *
 * The summary figures are a snapshot taken when the design was starred, shown
 * on the favourites page so it can be scanned without solving every entry.
 * They are labelled as recorded, and the runner re-measures on load.
 */
export type FavoriteSummary = {
  links: number;
  fullRotation: boolean;
  /** RMS trajectory error against the stored target, mm. */
  rms: number | null;
  /** Objective value, when the design was scored. */
  J: number | null;
};

export type Favorite = {
  id: string;
  name: string;
  spec: MechanismSpec;
  params: number[];
  target: TargetCurve | null;
  summary: FavoriteSummary;
  addedAt: string;
};

export const FAVORITES_KEY = 'kreamet.favorites';

/** Generous, but bounded: the list is stored whole on every change. */
export const FAVORITES_LIMIT = 100;

/**
 * Identity of a design, independent of its name: size plus parameters. The
 * same mechanism starred twice is one favourite, not two.
 */
export const designKey = (spec: MechanismSpec, params: number[]): string =>
  `${spec.dyads.length}:${params.map((v) => v.toFixed(4)).join(',')}`;

export const favoriteKey = (f: Pick<Favorite, 'spec' | 'params'>): string =>
  designKey(f.spec, f.params);

/** A short, URL-safe id; used in `#/runner/<id>` links. */
export function newFavoriteId(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += Math.floor(rand() * 36).toString(36);
  return `f${s}`;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Validate one stored entry.
 *
 * Storage is outside the program's control — an older build, a hand edit or a
 * truncated write can all leave something that parses but does not describe a
 * mechanism. A parameter vector that does not match its spec's layout would be
 * silently reinterpreted against the wrong variables, so it is rejected here
 * rather than drawn as a different linkage under the same name.
 */
export function isFavorite(v: unknown): v is Favorite {
  if (!v || typeof v !== 'object') return false;
  const f = v as Partial<Favorite>;
  if (typeof f.id !== 'string' || !/^[a-z0-9-]{1,40}$/i.test(f.id)) return false;
  if (typeof f.name !== 'string') return false;
  if (!f.spec || !Array.isArray(f.spec.dyads)) return false;
  if (!Array.isArray(f.params) || !f.params.every(isFiniteNumber)) return false;
  try {
    if (paramLayout(f.spec).length !== f.params.length) return false;
  } catch {
    return false;
  }
  if (!f.summary || typeof f.summary !== 'object') return false;
  return typeof f.addedAt === 'string';
}

export function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isFavorite).slice(0, FAVORITES_LIMIT) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(list: Favorite[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(FAVORITES_KEY);
    else localStorage.setItem(FAVORITES_KEY, JSON.stringify(list.slice(0, FAVORITES_LIMIT)));
  } catch {
    // Blocked or full storage: the list still works until the tab closes.
  }
}

/** Newest first; a design already in the list is not added twice. */
export function withFavorite(list: Favorite[], fav: Favorite): Favorite[] {
  const key = favoriteKey(fav);
  if (list.some((f) => favoriteKey(f) === key)) return list;
  return [fav, ...list].slice(0, FAVORITES_LIMIT);
}

export const withoutFavorite = (list: Favorite[], id: string): Favorite[] =>
  list.filter((f) => f.id !== id);

export const renamed = (list: Favorite[], id: string, name: string): Favorite[] =>
  list.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f));

/* ------------------------------------------------------------------ */
/* Shared, live list                                                   */
/* ------------------------------------------------------------------ */

/**
 * The designer's star button and the favourites page are different components
 * on different routes, and a second tab may be open on either. A tiny
 * subscription keeps them all reading one list: writes notify in-page
 * listeners directly, and the `storage` event covers other tabs.
 */
type Listener = (list: Favorite[]) => void;
const listeners = new Set<Listener>();

export function subscribeFavorites(fn: Listener): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVORITES_KEY) fn(loadFavorites());
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function updateFavorites(change: (list: Favorite[]) => Favorite[]): Favorite[] {
  const next = change(loadFavorites());
  saveFavorites(next);
  for (const fn of listeners) fn(next);
  return next;
}
