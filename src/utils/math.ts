/**
 * Framework-independent 2D geometry / numeric helpers.
 * All geometric quantities here are unitless; the mechanism layer uses millimetres.
 */

export type Vec2 = { x: number; y: number };

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const len2 = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
export const angleOf = (a: Vec2): number => Math.atan2(a.y, a.x);
export const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export const midpoint = (a: Vec2, b: Vec2): Vec2 => lerp2(a, b, 0.5);

export function normalize(a: Vec2): Vec2 {
  const l = len(a);
  return l < 1e-12 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Rotate `a` by `ang` radians about the origin. */
export function rotate(a: Vec2, ang: number): Vec2 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

/** Rotate `a` by `ang` radians about `about`. */
export function rotateAbout(a: Vec2, about: Vec2, ang: number): Vec2 {
  return add(about, rotate(sub(a, about), ang));
}

export const degToRad = (d: number): number => (d * Math.PI) / 180;
export const radToDeg = (r: number): number => (r * 180) / Math.PI;

/** Wrap to (-pi, pi]. */
export function wrapPi(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x <= -Math.PI) x += 2 * Math.PI;
  return x;
}

/** Wrap to [0, 2pi). */
export function wrapTwoPi(a: number): number {
  const t = a % (2 * Math.PI);
  return t < 0 ? t + 2 * Math.PI : t;
}

/**
 * Continue `next` from `prev` without a 2pi jump. Essential for mouse dragging
 * the crank across the +/-pi seam and for accumulating motor revolutions.
 */
export function unwrapAngle(prev: number, next: number): number {
  return prev + wrapPi(next - prev);
}

export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

/**
 * Rigid attachment: a point defined in the local frame of a link whose local
 * x-axis runs from `p0` toward `p1`.  `r` is the distance from `p0`, `a` the
 * angle (rad) measured from the p0->p1 direction (CCW positive).
 *
 * This is how every ternary link's third joint (and the LED point) is defined,
 * so a link's shape is invariant under the body's rigid motion by construction.
 */
export function localPoint(p0: Vec2, p1: Vec2, r: number, a: number): Vec2 {
  const base = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  const th = base + a;
  return { x: p0.x + r * Math.cos(th), y: p0.y + r * Math.sin(th) };
}

/** Law of cosines: third side of a triangle with sides r0, r1 and included angle a. */
export function thirdSide(r0: number, r1: number, a: number): number {
  return Math.sqrt(Math.max(0, r0 * r0 + r1 * r1 - 2 * r0 * r1 * Math.cos(a)));
}

export type CircleIntersection = {
  /** The two intersection points (identical when tangent). */
  points: [Vec2, Vec2];
  /**
   * Assembly slack in length units: how far the configuration is from a dead
   * point.  Zero when the circles are tangent (dyad singularity).
   */
  slack: number;
};

export type CircleIntersectionFailure = {
  points: null;
  /**
   * How much the radii/centre distance violate the triangle inequality, in
   * length units. Non-zero and smooth, which lets the optimiser climb out of
   * non-assemblable regions instead of seeing a flat infeasible plateau.
   */
  gap: number;
};

/**
 * Circle-circle intersection.  Returns both solutions ordered so that
 * `points[0]` lies on the +normal side of the centre line (CCW from c0->c1).
 */
export function circleCircleIntersectionEx(
  c0: Vec2,
  r0: number,
  c1: Vec2,
  r1: number,
): CircleIntersection | CircleIntersectionFailure {
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);

  if (!Number.isFinite(d)) return { points: null, gap: 1e6 };

  // Concentric (or nearly) -> no isolated solution.
  if (d < 1e-9) return { points: null, gap: Math.abs(r0 - r1) + 1e-9 };

  const outer = d - (r0 + r1); // > 0 -> circles too far apart
  const inner = Math.abs(r0 - r1) - d; // > 0 -> one circle inside the other
  if (outer > 0) return { points: null, gap: outer };
  if (inner > 0) return { points: null, gap: inner };

  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = r0 * r0 - a * a;
  const h = Math.sqrt(Math.max(0, h2));

  const ux = dx / d;
  const uy = dy / d;
  const mx = c0.x + a * ux;
  const my = c0.y + a * uy;

  // Perpendicular (left normal of u).
  const px = -uy * h;
  const py = ux * h;

  return {
    points: [
      { x: mx + px, y: my + py },
      { x: mx - px, y: my - py },
    ],
    // Distance to the nearest dead point, in length units.
    slack: Math.min(-outer, -inner),
  };
}

/** Convenience wrapper matching the signature required by the spec (section 57). */
export function circleCircleIntersection(
  c0: Vec2,
  r0: number,
  c1: Vec2,
  r1: number,
): [Vec2, Vec2] | null {
  const res = circleCircleIntersectionEx(c0, r0, c1, r1);
  return res.points;
}

/** Pick the candidate closest to `previous` — the branch-continuity rule. */
export function pickBranch(candidates: [Vec2, Vec2], previous: Vec2): Vec2 {
  return dist2(candidates[0], previous) <= dist2(candidates[1], previous)
    ? candidates[0]
    : candidates[1];
}

/** Interior angle at `b` in the path a-b-c, in radians, always in [0, pi]. */
export function interiorAngle(a: Vec2, b: Vec2, c: Vec2): number {
  const u = sub(a, b);
  const w = sub(c, b);
  const lu = len(u);
  const lw = len(w);
  if (lu < 1e-12 || lw < 1e-12) return 0;
  return Math.acos(clamp(dot(u, w) / (lu * lw), -1, 1));
}

/* ------------------------------------------------------------------ */
/* Small dense linear algebra (used for the constraint Jacobian)        */
/* ------------------------------------------------------------------ */

/** Symmetric eigenvalues via the cyclic Jacobi method. Input is not modified. */
export function symmetricEigenvalues(mIn: number[][], sweeps = 60): number[] {
  const n = mIn.length;
  const a = mIn.map((row) => row.slice());

  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-24) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => a[i][i]);
}

/** Smallest singular value of a square matrix, via eigenvalues of J^T J. */
export function smallestSingularValue(J: number[][]): number {
  const n = J.length;
  const jtj: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += J[k][i] * J[k][j];
      jtj[i][j] = s;
    }
  const ev = symmetricEigenvalues(jtj);
  return Math.sqrt(Math.max(0, Math.min(...ev)));
}
