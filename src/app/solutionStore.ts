import type { SolutionSummary } from '../workers/optimization.worker';

/**
 * The best-mechanisms table.
 *
 * Until now a finished optimiser run *replaced* the list, so comparing an
 * 8-bar result with a 10-bar one meant writing the numbers down before
 * starting the second run, and a reload lost everything. Results accumulate
 * here instead and survive a refresh.
 *
 * Provenance is carried on every row and never inferred. A number presented as
 * an optimisation result has to come from a solver run, and a design that
 * shipped with the app has to stay distinguishable from one found in this
 * browser five minutes ago — the table is the one place where mixing them up
 * would be easy and invisible.
 */
export type SolutionOrigin =
  /** Shipped with the application: the recorded output of an offline run. */
  | 'shipped'
  /** Produced by the optimiser in this browser. */
  | 'run';

export type SavedSolution = {
  solution: SolutionSummary;
  /** Link count including the frame, so a row says what size it is. */
  links: number;
  origin: SolutionOrigin;
  /** ISO timestamp; absent for shipped results, which have no run time here. */
  savedAt: string | null;
};

const STORAGE_KEY = 'kreamet.solutions';

/**
 * Keeps storage bounded. Fifty rows is far more than anyone compares by eye
 * and still small enough to serialise without thinking about it.
 */
const LIMIT = 50;

export const linksOf = (s: SolutionSummary): number => 2 + 2 * s.spec.dyads.length;

/**
 * Identity of a design: its size and its parameter vector. Two runs that
 * converge on the same mechanism should occupy one row, not two.
 */
const keyOf = (s: SolutionSummary): string =>
  `${linksOf(s)}:${s.x.map((v) => v.toFixed(4)).join(',')}`;

/**
 * Ranking. Kinematic validity first, score second — a mechanism that cannot
 * complete a revolution is not a better answer than one that can, whatever its
 * objective value says.
 */
const compare = (a: SavedSolution, b: SavedSolution): number => {
  if (a.solution.fullRotation !== b.solution.fullRotation) {
    return a.solution.fullRotation ? -1 : 1;
  }
  return a.solution.J - b.solution.J;
};

export const sortSolutions = (rows: SavedSolution[]): SavedSolution[] =>
  [...rows].sort(compare).slice(0, LIMIT);

/**
 * Merge new results into the table.
 *
 * Existing rows win on a collision: the first time a design was found is the
 * honest timestamp for it, and re-running the same search should not make an
 * old result look new.
 */
export function mergeSolutions(
  existing: SavedSolution[],
  incoming: SolutionSummary[],
  origin: SolutionOrigin,
  now: () => string = () => new Date().toISOString(),
): SavedSolution[] {
  const seen = new Map(existing.map((r) => [keyOf(r.solution), r]));
  for (const s of incoming) {
    const key = keyOf(s);
    if (seen.has(key)) continue;
    seen.set(key, {
      solution: s,
      links: linksOf(s),
      origin,
      savedAt: origin === 'shipped' ? null : now(),
    });
  }
  return sortSolutions([...seen.values()]);
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

/**
 * Only rows from a real run are persisted. The shipped ones are re-derived
 * from the source on every load, so a stale copy in a browser can never
 * misrepresent what the application currently claims to ship.
 */
export function loadSaved(): SavedSolution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SavedSolution =>
        !!r &&
        typeof r === 'object' &&
        'solution' in r &&
        'links' in r &&
        (r as SavedSolution).origin === 'run' &&
        Array.isArray((r as SavedSolution).solution?.x),
    );
  } catch {
    return [];
  }
}

export function persistSaved(rows: SavedSolution[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.filter((r) => r.origin === 'run')));
  } catch {
    // Storage blocked or full: the table still works for this session.
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}
