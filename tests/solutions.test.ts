import { describe, expect, it } from 'vitest';
import {
  linksOf,
  mergeSolutions,
  sortSolutions,
  type SavedSolution,
} from '../src/app/solutionStore';
import type { SolutionSummary } from '../src/workers/optimization.worker';

/** A solution summary with only the fields the store looks at. */
const sol = (over: Partial<SolutionSummary> & { dyads: number }): SolutionSummary =>
  ({
    rank: 0,
    x: over.x ?? [1, 2, 3],
    J: over.J ?? 1,
    rms: over.rms ?? 10,
    fullRotation: over.fullRotation ?? true,
    width: 250,
    height: 250,
    spec: { dyads: Array.from({ length: over.dyads }, () => ({})) },
    ...over,
  }) as unknown as SolutionSummary;

const row = (s: SolutionSummary, origin: 'shipped' | 'run' = 'run'): SavedSolution => ({
  solution: s,
  links: linksOf(s),
  origin,
  savedAt: origin === 'run' ? '2026-01-01T00:00:00.000Z' : null,
});

describe('link count', () => {
  it('counts the frame and two links per dyad', () => {
    // n = 2 + 2N: the frame, the crank, and two bodies per RRR dyad. This is
    // what the table shows, so it has to agree with the mechanism's own count.
    expect(linksOf(sol({ dyads: 3 }))).toBe(8);
    expect(linksOf(sol({ dyads: 1 }))).toBe(4);
    expect(linksOf(sol({ dyads: 6 }))).toBe(14);
  });
});

describe('the best-mechanisms table', () => {
  it('accumulates across runs instead of replacing', () => {
    // The behaviour this replaces: a finished run overwrote the list, so
    // comparing an 8-bar result with a 10-bar one meant copying the numbers
    // out before starting the second run.
    const first = mergeSolutions([], [sol({ dyads: 3, J: 2, x: [1] })], 'run');
    const second = mergeSolutions(first, [sol({ dyads: 4, J: 3, x: [2] })], 'run');
    expect(second).toHaveLength(2);
    expect(second.map((r) => r.links).sort((a, b) => a - b)).toEqual([8, 10]);
  });

  it('keeps one row per design', () => {
    const a = sol({ dyads: 3, J: 2, x: [1, 2, 3] });
    const again = sol({ dyads: 3, J: 2, x: [1, 2, 3] });
    expect(mergeSolutions(mergeSolutions([], [a], 'run'), [again], 'run')).toHaveLength(1);
  });

  it('keeps the first time a design was found, not the latest', () => {
    // Re-running the same search must not make an old result look new.
    const s = sol({ dyads: 3, x: [1, 2, 3] });
    const first = mergeSolutions([], [s], 'run', () => '2026-01-01T00:00:00.000Z');
    const again = mergeSolutions(first, [s], 'run', () => '2026-06-06T00:00:00.000Z');
    expect(again[0].savedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('ranks a mechanism that turns above one that scores better but does not', () => {
    // The project's standing rule: kinematic validity outranks a low score.
    const broken = row(sol({ dyads: 3, J: 0.1, fullRotation: false, x: [9] }));
    const works = row(sol({ dyads: 3, J: 5, fullRotation: true, x: [8] }));
    expect(sortSolutions([broken, works])[0].solution.J).toBe(5);
  });

  it('orders by score among mechanisms that all turn', () => {
    const rows = [
      row(sol({ dyads: 3, J: 7, x: [1] })),
      row(sol({ dyads: 3, J: 2, x: [2] })),
      row(sol({ dyads: 3, J: 4, x: [3] })),
    ];
    expect(sortSolutions(rows).map((r) => r.solution.J)).toEqual([2, 4, 7]);
  });

  it('marks where every row came from', () => {
    // A design that shipped with the app and one found in this browser five
    // minutes ago must stay distinguishable — this table is the one place
    // where mixing them up would be easy and invisible.
    const merged = mergeSolutions(
      mergeSolutions([], [sol({ dyads: 3, x: [1] })], 'shipped'),
      [sol({ dyads: 3, x: [2] })],
      'run',
    );
    expect(merged.filter((r) => r.origin === 'shipped')).toHaveLength(1);
    expect(merged.filter((r) => r.origin === 'run')).toHaveLength(1);
    // Shipped rows carry no timestamp: there is no run time for them here.
    expect(merged.find((r) => r.origin === 'shipped')?.savedAt).toBeNull();
    expect(merged.find((r) => r.origin === 'run')?.savedAt).toBeTruthy();
  });

  it('bounds what it keeps', () => {
    const many = Array.from({ length: 80 }, (_, i) => sol({ dyads: 3, J: i, x: [i] }));
    expect(mergeSolutions([], many, 'run')).toHaveLength(50);
  });
});
