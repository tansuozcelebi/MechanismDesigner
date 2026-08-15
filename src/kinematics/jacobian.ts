import type { Geometry } from '../mechanism/mechanism';
import { dyadJointId } from '../mechanism/spec';
import { degToRad, localPoint, smallestSingularValue, type Vec2 } from '../utils/math';

/**
 * Constraint formulation used for the singularity analysis.
 *
 * The independent unknowns are the dyad joints q = (J0x, J0y, J1x, J1y, …).
 * Every other point (rigid third points, the LED) is a rigid function of those.
 * Each dyad contributes two scalar constraints:
 *
 *     |J_k − anchorA_k|² − lenA_k² = 0
 *     |J_k − anchorB_k|² − lenB_k² = 0
 *
 * so ∂F/∂q is 2N × 2N and block lower-triangular by dyad — its smallest
 * singular value collapses toward zero exactly when some dyad approaches a
 * dead point, at any mechanism size.
 */
export function constraintResiduals(geo: Geometry, q: number[], crankTip: Vec2): number[] {
  const spec = geo.spec;
  const pts: Record<string, Vec2> = { A: crankTip };
  geo.ground.forEach((p, i) => {
    pts[`G${i}`] = p;
  });
  for (let k = 0; k < spec.dyads.length; k++) {
    pts[dyadJointId(k)] = { x: q[2 * k], y: q[2 * k + 1] };
  }

  const out: number[] = [];
  const sq = (p: Vec2, r: Vec2) => (p.x - r.x) ** 2 + (p.y - r.y) ** 2;

  for (let k = 0; k < spec.dyads.length; k++) {
    const aBar = geo.bars[2 * k];
    const bBar = geo.bars[2 * k + 1];
    const J = pts[dyadJointId(k)];

    // Anchors of this dyad must already be expressible from q.
    const pa = pts[aBar.anchorId];
    const pb = pts[bBar.anchorId];
    out.push(pa ? sq(J, pa) - aBar.length ** 2 : 0);
    out.push(pb ? sq(J, pb) - bBar.length ** 2 : 0);

    // Publish this dyad's rigid third points for downstream dyads.
    for (const bar of [aBar, bBar]) {
      if (!bar.extra) continue;
      const anchor = pts[bar.anchorId];
      if (!anchor) continue;
      pts[bar.extra.id] = localPoint(anchor, J, bar.extra.r, degToRad(bar.extra.angleDeg));
    }
  }
  return out;
}

/**
 * Smallest singular value of ∂F/∂q, by central differences.
 *
 * The residuals are quadratic in q, so a central difference is exact to
 * round-off. Rows are normalised by their member length because they carry
 * d(length²); without that the margin would scale with the square of the
 * mechanism size and be incomparable between designs.
 */
export function constraintJacobianSigmaMin(
  geo: Geometry,
  points: Record<string, Vec2>,
): number {
  const n = geo.spec.dyads.length;
  const dim = 2 * n;
  if (dim === 0) return 0;

  const q: number[] = [];
  for (let k = 0; k < n; k++) {
    const J = points[dyadJointId(k)];
    q.push(J.x, J.y);
  }
  const crankTip = points.A;
  const h = 1e-4;

  const J: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (let c = 0; c < dim; c++) {
    const qp = q.slice();
    const qm = q.slice();
    qp[c] += h;
    qm[c] -= h;
    const rp = constraintResiduals(geo, qp, crankTip);
    const rm = constraintResiduals(geo, qm, crankTip);
    for (let r = 0; r < dim; r++) J[r][c] = (rp[r] - rm[r]) / (2 * h);
  }

  for (let k = 0; k < n; k++) {
    for (const [row, bar] of [
      [2 * k, geo.bars[2 * k]],
      [2 * k + 1, geo.bars[2 * k + 1]],
    ] as const) {
      const s = 1 / (2 * Math.max(1e-6, bar.length));
      for (let c = 0; c < dim; c++) J[row][c] *= s;
    }
  }

  return smallestSingularValue(J);
}
