import type { Geometry } from '../mechanism/mechanism';
import type { JointId } from '../mechanism/types';
import { add, dist, scale, sub, v2, type Vec2 } from '../utils/math';

/**
 * The three independent vector loops of the chain (brief §C / §9).
 * Each entry is a walk that must return to its start: sum of r_i = 0.
 */
export const LOOP_WALKS: JointId[][] = [
  ['O2', 'A', 'B', 'O4'], // I   — via L2, L3, L4, ground
  ['O2', 'A', 'C', 'E', 'O6'], // II  — via L2, L3, L5, L6, ground
  ['O4', 'D', 'F', 'G', 'O6'], // III — via L4, L7, L8, L6, ground
];

/**
 * Residual of the loop-closure equations, in mm.
 *
 * Because the solver is analytic/dyadic rather than iterative, this is an
 * independent verification: it re-walks each loop from the solved joint
 * coordinates and checks that the vector sum returns to the origin, and that
 * every member still has its nominal length.  Anything above ~1e-9 mm would
 * indicate a real inconsistency rather than solver tolerance.
 */
export function loopClosureResidual(
  geo: Geometry,
  joints: Record<JointId, Vec2>,
  led: Vec2,
): number {
  let worst = 0;

  // 1. Vector sums around each independent loop.
  for (const walk of LOOP_WALKS) {
    let sum = v2(0, 0);
    for (let i = 0; i < walk.length; i++) {
      const a = joints[walk[i]];
      const b = joints[walk[(i + 1) % walk.length]];
      sum = add(sum, sub(b, a));
    }
    worst = Math.max(worst, Math.hypot(sum.x, sum.y));
  }

  // 2. Rigid-body length constraints (this is what actually catches errors —
  //    a pure vector sum around a closed walk is identically zero).
  for (const mem of geo.members) {
    const p = mem.from === 'P_LED' ? led : joints[mem.from];
    const q = mem.to === 'P_LED' ? led : joints[mem.to];
    worst = Math.max(worst, Math.abs(dist(p, q) - mem.length));
  }

  return worst;
}

/** Per-loop closure vectors, for the debug overlay. */
export function loopVectors(
  joints: Record<JointId, Vec2>,
): { loop: number; from: Vec2; to: Vec2 }[] {
  const out: { loop: number; from: Vec2; to: Vec2 }[] = [];
  LOOP_WALKS.forEach((walk, li) => {
    for (let i = 0; i < walk.length; i++) {
      const a = joints[walk[i]];
      const b = joints[walk[(i + 1) % walk.length]];
      // Shrink slightly so overlapping loops stay distinguishable on screen.
      const f = 0.92 + li * 0.03;
      const mid = scale(add(a, b), 0.5);
      out.push({
        loop: li,
        from: add(mid, scale(sub(a, mid), f)),
        to: add(mid, scale(sub(b, mid), f)),
      });
    }
  });
  return out;
}
