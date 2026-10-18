/**
 * Free-form planar linkages: any number of ground pivots, joints and links,
 * driven by one motor crank.
 *
 * The parametric workbench builds its mechanisms out of Assur dyads, which is
 * what lets it solve every pose in closed form — and what stops it describing
 * a linkage that is not a chain of dyads. A sketch makes no such promise, so
 * it is solved numerically instead: every link is a distance constraint
 * between two points, the crank tip is placed by the motor angle, and the
 * free points are found by damped least squares (Levenberg–Marquardt),
 * started from the previous pose so the solution stays on one assembly
 * branch as the motor turns.
 *
 * Coordinates are millimetres, +x right, +y up — the same frame as the
 * workbench.
 */

export type SketchJoint = { id: string; x: number; y: number; ground: boolean };
export type SketchLink = { id: string; a: string; b: string; length: number };

export type Sketch = {
  joints: SketchJoint[];
  links: SketchLink[];
  /** The driven link: one end must be a ground pivot. */
  motor: string | null;
  /** Joints whose path is drawn. */
  tracers: string[];
};

export type Vec = { x: number; y: number };
export type Pose = Record<string, Vec>;

export const EMPTY_SKETCH: Sketch = { joints: [], links: [], motor: null, tracers: [] };

const dist = (p: Vec, q: Vec) => Math.hypot(p.x - q.x, p.y - q.y);

export const jointById = (s: Sketch, id: string) => s.joints.find((j) => j.id === id);

/** The next unused id with a prefix: `P1`, `P2`, … and `L1`, `L2`, … */
export function nextId(s: Sketch, prefix: 'P' | 'L'): string {
  const used = new Set([...s.joints.map((j) => j.id), ...s.links.map((l) => l.id)]);
  for (let i = 1; ; i++) if (!used.has(`${prefix}${i}`)) return `${prefix}${i}`;
}

export const poseOf = (s: Sketch): Pose =>
  Object.fromEntries(s.joints.map((j) => [j.id, { x: j.x, y: j.y }]));

/* ------------------------------------------------------------------ */
/* The motor                                                           */
/* ------------------------------------------------------------------ */

export type MotorInfo = { link: SketchLink; pivot: string; tip: string; theta0: number };

/**
 * The motor's pivot, its driven tip and the crank angle in the sketch as
 * drawn. Null when there is no motor or it is not attached to ground at
 * exactly one end — a crank between two ground pivots cannot turn, and one
 * between two free points has nothing to turn against.
 */
export function motorOf(s: Sketch): MotorInfo | null {
  const link = s.links.find((l) => l.id === s.motor);
  if (!link) return null;
  const a = jointById(s, link.a);
  const b = jointById(s, link.b);
  if (!a || !b || a.ground === b.ground) return null;
  const [pivot, tip] = a.ground ? [a, b] : [b, a];
  return { link, pivot: pivot.id, tip: tip.id, theta0: Math.atan2(tip.y - pivot.y, tip.x - pivot.x) };
}

/* ------------------------------------------------------------------ */
/* Mobility                                                            */
/* ------------------------------------------------------------------ */

export type Mobility = {
  /** Points that are not ground pivots. */
  free: number;
  /** Links that constrain at least one free point. */
  constraints: number;
  /** M = 2·free − constraints, before the motor fixes one freedom. */
  dof: number;
};

/**
 * Mobility in the point-and-distance form: every free point has two
 * coordinates, every link removes one. For a linkage of binary links this is
 * the Grübler–Kutzbach count; a rigid triangle of three links is a ternary
 * body. A motor needs M = 1 to drive a determinate motion: more and some
 * part flops, less and the linkage is a structure.
 */
export function mobility(s: Sketch): Mobility {
  const ground = new Set(s.joints.filter((j) => j.ground).map((j) => j.id));
  const free = s.joints.length - ground.size;
  const constraints = s.links.filter((l) => !(ground.has(l.a) && ground.has(l.b))).length;
  return { free, constraints, dof: 2 * free - constraints };
}

/* ------------------------------------------------------------------ */
/* Solver                                                              */
/* ------------------------------------------------------------------ */

/** Solve A·x = b in place by Gaussian elimination with partial pivoting. */
function linsolve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-14) return null;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let v = b[r];
    for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k];
    x[r] = v / A[r][r];
  }
  return x;
}

export type SolveResult = { ok: boolean; pose: Pose; residual: number };

/** Largest permitted length error, mm, for a pose to count as assembled. */
export const TOLERANCE = 1e-6;

/**
 * Place every free point so each link has its length, with the ground pivots
 * fixed and — when `theta` is given — the crank tip set by the motor angle.
 *
 * `start` is the initial guess; passing the previous frame's pose is what
 * keeps the solver on the same assembly branch from one angle to the next.
 */
export function solve(s: Sketch, start: Pose, theta?: number): SolveResult {
  const motor = motorOf(s);
  const pose: Pose = Object.fromEntries(Object.entries(start).map(([k, v]) => [k, { ...v }]));
  for (const j of s.joints) {
    if (!pose[j.id]) pose[j.id] = { x: j.x, y: j.y };
    if (j.ground) pose[j.id] = { x: j.x, y: j.y };
  }
  const fixed = new Set(s.joints.filter((j) => j.ground).map((j) => j.id));
  if (motor && theta !== undefined) {
    const g = pose[motor.pivot];
    const L = motor.link.length;
    pose[motor.tip] = { x: g.x + L * Math.cos(theta), y: g.y + L * Math.sin(theta) };
    fixed.add(motor.tip);
  }

  const unknowns = s.joints.filter((j) => !fixed.has(j.id)).map((j) => j.id);
  const index = new Map(unknowns.map((id, i) => [id, i]));
  const links = s.links.filter(
    (l) => !(fixed.has(l.a) && fixed.has(l.b)) && !(motor && theta !== undefined && l.id === motor.link.id),
  );
  const n = unknowns.length * 2;

  const residuals = () => links.map((l) => dist(pose[l.a], pose[l.b]) - l.length);
  const worst = (r: number[]) => r.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

  // Links between two fixed points are not unknowns, but they still have to
  // hold: a crank angle that pulls two driven points apart is a failure.
  const groundIds = new Set(s.joints.filter((j) => j.ground).map((j) => j.id));
  const rigid = s.links.filter(
    (l) =>
      fixed.has(l.a) &&
      fixed.has(l.b) &&
      l.id !== motor?.link.id &&
      !(groundIds.has(l.a) && groundIds.has(l.b)),
  );
  const rigidError = () => rigid.reduce((m, l) => Math.max(m, Math.abs(dist(pose[l.a], pose[l.b]) - l.length)), 0);

  let r = residuals();
  let err = worst(r);
  if (n === 0) {
    const e = Math.max(err, rigidError());
    return { ok: e < TOLERANCE * 100, pose, residual: e };
  }

  let lambda = 1e-3;
  for (let iter = 0; iter < 100 && err > TOLERANCE; iter++) {
    // J (m × n) and the normal equations JᵀJ δ = −Jᵀr.
    const JtJ = Array.from({ length: n }, () => new Array(n).fill(0));
    const Jtr = new Array(n).fill(0);
    links.forEach((l, k) => {
      const p = pose[l.a];
      const q = pose[l.b];
      const d = Math.max(dist(p, q), 1e-9);
      const ux = (p.x - q.x) / d;
      const uy = (p.y - q.y) / d;
      const cols: [number, number][] = [];
      const ia = index.get(l.a);
      const ib = index.get(l.b);
      if (ia !== undefined) cols.push([2 * ia, ux], [2 * ia + 1, uy]);
      if (ib !== undefined) cols.push([2 * ib, -ux], [2 * ib + 1, -uy]);
      for (const [c1, v1] of cols) {
        Jtr[c1] += v1 * r[k];
        for (const [c2, v2] of cols) JtJ[c1][c2] += v1 * v2;
      }
    });

    let improved = false;
    for (let tries = 0; tries < 8 && !improved; tries++) {
      const A = JtJ.map((row, i) => row.map((v, j) => (i === j ? v + lambda * (1 + v) : v)));
      const delta = linsolve(A, Jtr.map((v) => -v));
      if (!delta) {
        lambda *= 10;
        continue;
      }
      const saved = unknowns.map((id) => ({ ...pose[id] }));
      unknowns.forEach((id, i) => {
        pose[id].x += delta[2 * i];
        pose[id].y += delta[2 * i + 1];
      });
      const r2 = residuals();
      const e2 = worst(r2);
      if (e2 < err) {
        r = r2;
        err = e2;
        lambda = Math.max(lambda / 3, 1e-9);
        improved = true;
      } else {
        unknowns.forEach((id, i) => (pose[id] = saved[i]));
        lambda *= 10;
      }
    }
    if (!improved) break;
  }

  const residual = Math.max(err, rigidError());
  return { ok: residual < TOLERANCE * 100, pose, residual };
}

/* ------------------------------------------------------------------ */
/* Sweep                                                               */
/* ------------------------------------------------------------------ */

export type SketchSweep = {
  /** Solved poses, in motor order from the drawn crank angle. */
  frames: Pose[];
  /** Crank angle of each frame, radians. */
  angles: number[];
  /** True when the crank turned all the way round and came back. */
  fullRotation: boolean;
  /** Crank angle (degrees from the drawn position) where assembly failed. */
  lockedAt: number | null;
  /** Smallest transmission angle seen at any two-link joint, degrees. */
  minTransmission: number | null;
};

/**
 * Turn the motor one revolution from the drawn crank angle, solving each
 * frame from the one before. Stops at the first angle that cannot be
 * assembled, and reports it: a crank that locks is a rocker, or a mistake.
 */
export function sweepSketch(s: Sketch, samples = 180): SketchSweep {
  const motor = motorOf(s);
  const empty = { frames: [], angles: [], fullRotation: false, lockedAt: null, minTransmission: null };
  if (!motor) return empty;
  const frames: Pose[] = [];
  const angles: number[] = [];
  let prev = poseOf(s);
  let lockedAt: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const th = motor.theta0 + (i / samples) * 2 * Math.PI;
    const r = solve(s, prev, th);
    if (!r.ok) {
      lockedAt = (i / samples) * 360;
      break;
    }
    // A jump between consecutive frames means the solver changed assembly
    // branch — the linkage passed through a dead point. Treat it as a lock
    // rather than draw a path that teleports.
    if (frames.length) {
      const last = frames[frames.length - 1];
      const jump = Math.max(...Object.keys(r.pose).map((k) => dist(r.pose[k], last[k])));
      if (jump > Math.max(5, motor.link.length * 0.6)) {
        lockedAt = (i / samples) * 360;
        break;
      }
    }
    frames.push(r.pose);
    angles.push(th);
    prev = r.pose;
  }
  const fullRotation = lockedAt === null;
  // The closing frame repeats the first; keep it only to test closure.
  if (fullRotation) {
    frames.pop();
    angles.pop();
  }
  return { frames, angles, fullRotation, lockedAt, minTransmission: minTransmissionAngle(s, frames) };
}

/**
 * Transmission angle at every free joint that joins exactly two links: the
 * acute angle between them, reported as its smallest value over the cycle.
 * Below about 40° the joint transmits force badly and the linkage is close
 * to a dead point (the usual design band is 40°–140°).
 */
export function minTransmissionAngle(s: Sketch, frames: Pose[]): number | null {
  const motor = motorOf(s);
  const ground = new Set(s.joints.filter((j) => j.ground).map((j) => j.id));
  const pairs: { at: string; u: string; v: string }[] = [];
  for (const j of s.joints) {
    if (ground.has(j.id) || j.id === motor?.tip) continue;
    const inc = s.links.filter((l) => l.a === j.id || l.b === j.id);
    if (inc.length !== 2) continue;
    const other = (l: SketchLink) => (l.a === j.id ? l.b : l.a);
    pairs.push({ at: j.id, u: other(inc[0]), v: other(inc[1]) });
  }
  if (!pairs.length || !frames.length) return null;
  let min = 90;
  for (const f of frames) {
    for (const p of pairs) {
      const a = f[p.at];
      const u = f[p.u];
      const v = f[p.v];
      const ang =
        (Math.abs(Math.atan2((u.x - a.x) * (v.y - a.y) - (u.y - a.y) * (v.x - a.x), (u.x - a.x) * (v.x - a.x) + (u.y - a.y) * (v.y - a.y))) *
          180) /
        Math.PI;
      min = Math.min(min, Math.min(ang, 180 - ang));
    }
  }
  return min;
}

/* ------------------------------------------------------------------ */
/* Grashof                                                             */
/* ------------------------------------------------------------------ */

export type FourBar = {
  ground: number;
  crank: number;
  coupler: number;
  rocker: number;
  /** s + l ≤ p + q: some link can turn fully. */
  grashof: boolean;
  /** Whether the motor's crank, specifically, can make full turns. */
  crankTurns: boolean;
  kind: 'crank-rocker' | 'double-crank' | 'double-rocker' | 'change-point' | 'triple-rocker';
};

/**
 * When the sketch contains the four-bar the motor drives — crank, a coupler
 * from its tip to a free point, and a rocker from that point back to a second
 * ground pivot — classify it by Grashof's criterion, the first thing to check
 * before asking a crank to turn.
 */
export function fourBarOf(s: Sketch): FourBar | null {
  const m = motorOf(s);
  if (!m) return null;
  const ground = new Set(s.joints.filter((j) => j.ground).map((j) => j.id));
  for (const c of s.links) {
    if (c.id === m.link.id || (c.a !== m.tip && c.b !== m.tip)) continue;
    const B = c.a === m.tip ? c.b : c.a;
    if (ground.has(B)) continue;
    for (const r of s.links) {
      if (r.id === c.id || r.id === m.link.id || (r.a !== B && r.b !== B)) continue;
      const G = r.a === B ? r.b : r.a;
      if (!ground.has(G) || G === m.pivot) continue;
      const gp = jointById(s, m.pivot)!;
      const gq = jointById(s, G)!;
      const g = dist(gp, gq);
      const L = [g, m.link.length, c.length, r.length];
      const sorted = [...L].sort((x, y) => x - y);
      const sum = sorted[0] + sorted[3];
      const rest = sorted[1] + sorted[2];
      const eps = 1e-9 * sum;
      const shortest = L.indexOf(sorted[0]);
      let kind: FourBar['kind'];
      if (Math.abs(sum - rest) < eps) kind = 'change-point';
      else if (sum > rest) kind = 'triple-rocker';
      else if (shortest === 0) kind = 'double-crank';
      else if (shortest === 1 || shortest === 3) kind = 'crank-rocker';
      else kind = 'double-rocker';
      const grashof = sum <= rest + eps;
      // The crank turns fully only in a Grashof linkage where it is the
      // shortest link (crank-rocker) or the ground is (double crank).
      const crankTurns = grashof && (shortest === 1 || shortest === 0);
      return { ground: g, crank: m.link.length, coupler: c.length, rocker: r.length, grashof, crankTurns, kind };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Edits                                                               */
/* ------------------------------------------------------------------ */

/** Move a joint, re-deriving the length of every link it carries. */
export function moveJoint(s: Sketch, id: string, to: Vec): Sketch {
  const joints = s.joints.map((j) => (j.id === id ? { ...j, x: to.x, y: to.y } : j));
  const at = (k: string) => joints.find((j) => j.id === k)!;
  const links = s.links.map((l) => (l.a === id || l.b === id ? { ...l, length: dist(at(l.a), at(l.b)) } : l));
  return { ...s, joints, links };
}

/**
 * Change one link's length and re-assemble the drawn pose around it, keeping
 * every other length, the ground pivots and the crank angle. Returns null
 * when no assembly exists at that length — the caller keeps the old one.
 */
export function setLinkLength(s: Sketch, id: string, length: number): Sketch | null {
  if (!(length > 0.5)) return null;
  const next: Sketch = { ...s, links: s.links.map((l) => (l.id === id ? { ...l, length } : l)) };
  const m = motorOf(next);
  const r = solve(next, poseOf(s), m ? m.theta0 : undefined);
  if (!r.ok) return null;
  return { ...next, joints: next.joints.map((j) => ({ ...j, x: r.pose[j.id].x, y: r.pose[j.id].y })) };
}

export function removeJoint(s: Sketch, id: string): Sketch {
  const links = s.links.filter((l) => l.a !== id && l.b !== id);
  return {
    joints: s.joints.filter((j) => j.id !== id),
    links,
    motor: links.some((l) => l.id === s.motor) ? s.motor : null,
    tracers: s.tracers.filter((t) => t !== id),
  };
}

export function removeLink(s: Sketch, id: string): Sketch {
  return { ...s, links: s.links.filter((l) => l.id !== id), motor: s.motor === id ? null : s.motor };
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validate a sketch read from storage or a file; null when it is not one. */
export function parseSketch(v: unknown): Sketch | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Partial<Sketch>;
  if (!Array.isArray(o.joints) || !Array.isArray(o.links)) return null;
  const joints = o.joints.filter(
    (j): j is SketchJoint => !!j && typeof j.id === 'string' && finite(j.x) && finite(j.y) && typeof j.ground === 'boolean',
  );
  const ids = new Set(joints.map((j) => j.id));
  const links = o.links.filter(
    (l): l is SketchLink =>
      !!l && typeof l.id === 'string' && ids.has(l.a) && ids.has(l.b) && l.a !== l.b && finite(l.length) && l.length > 0,
  );
  return {
    joints,
    links,
    motor: typeof o.motor === 'string' && links.some((l) => l.id === o.motor) ? o.motor : null,
    tracers: Array.isArray(o.tracers) ? o.tracers.filter((t): t is string => typeof t === 'string' && ids.has(t)) : [],
  };
}
