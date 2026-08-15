import type { Geometry } from '../mechanism/mechanism';
import { dist, type Vec2 } from '../utils/math';

/**
 * Residual of the rigid-body constraints, in mm.
 *
 * Because the solver is analytic rather than iterative, this is an independent
 * verification: it re-measures every printed member against its nominal length
 * from the solved coordinates.  A pure vector sum around a closed walk is
 * identically zero once the points exist, so the member lengths are what
 * actually catch an error.  Anything above ~1e-9 mm indicates a real
 * inconsistency, not a tolerance.
 */
export function loopClosureResidual(geo: Geometry, points: Record<string, Vec2>): number {
  let worst = 0;
  for (const mem of geo.members) {
    const p = points[mem.from];
    const q = points[mem.to];
    if (!p || !q) return Number.POSITIVE_INFINITY;
    worst = Math.max(worst, Math.abs(dist(p, q) - mem.length));
  }
  return worst;
}

/** Per-loop closure vectors, for the debug overlay: one closed walk per dyad. */
export function loopVectors(
  geo: Geometry,
  points: Record<string, Vec2>,
): { loop: number; from: Vec2; to: Vec2 }[] {
  const out: { loop: number; from: Vec2; to: Vec2 }[] = [];
  geo.spec.dyads.forEach((_, k) => {
    const aBar = geo.bars[2 * k];
    const bBar = geo.bars[2 * k + 1];
    const walk = [aBar.anchorId, aBar.jointId, bBar.anchorId];
    for (let i = 0; i < walk.length; i++) {
      const a = points[walk[i]];
      const b = points[walk[(i + 1) % walk.length]];
      if (!a || !b) continue;
      out.push({ loop: k, from: a, to: b });
    }
  });
  return out;
}
