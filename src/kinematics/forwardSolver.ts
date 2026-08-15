import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import type { JointId, Pose, PoseResult } from '../mechanism/types';
import {
  angleOf,
  circleCircleIntersectionEx,
  degToRad,
  dist,
  interiorAngle,
  localPoint,
  radToDeg,
  sub,
  v2,
  type Vec2,
} from '../utils/math';
import { loopClosureResidual } from './loopClosure';
import { constraintJacobianSigmaMin } from './jacobian';

/**
 * Previous-configuration memory used for branch continuity.  Holding the three
 * dyad output joints is sufficient: everything else on each body follows
 * rigidly once its two defining joints are known.
 */
export type BranchState = { B: Vec2; E: Vec2; F: Vec2 } | null;

/**
 * Solve one RRR dyad.  With no previous state we fall back to the explicit
 * assembly selector (+1 picks the CCW-side root), which is what defines the
 * assembly mode of the very first frame.
 */
function solveDyad(
  c0: Vec2,
  r0: number,
  c1: Vec2,
  r1: number,
  previous: Vec2 | null,
  selector: number,
): { p: Vec2; slack: number } | { p: null; gap: number } {
  const res = circleCircleIntersectionEx(c0, r0, c1, r1);
  if (res.points === null) return { p: null, gap: res.gap };
  const [p0, p1] = res.points;
  if (previous === null) return { p: selector >= 0 ? p0 : p1, slack: res.slack };
  const d0 = dist(p0, previous);
  const d1 = dist(p1, previous);
  return { p: d0 <= d1 ? p0 : p1, slack: res.slack };
}

/**
 * Forward kinematics at one motor angle.
 *
 * The chain decomposes into three RRR Assur dyads solved in series, so every
 * joint is obtained in closed form by circle-circle intersection.  No Newton
 * iteration is used anywhere; the loop-closure residual is therefore a genuine
 * independent check of the solution rather than the solver's own stopping
 * criterion.
 */
export function solvePose(
  geo: Geometry,
  theta: number,
  previous: BranchState = null,
  opts: { computeSigma?: boolean } = {},
): PoseResult {
  const d = geo.design;
  const { O2, O4, O6 } = geo;

  // --- Driver -------------------------------------------------------------
  const A = v2(
    O2.x + CONFIG.crankLength * Math.cos(theta),
    O2.y + CONFIG.crankLength * Math.sin(theta),
  );

  // --- Dyad I: links 3 & 4, unknown joint B ------------------------------
  const s1 = solveDyad(A, d.lAB, O4, d.lO4B, previous?.B ?? null, d.branch1);
  if (s1.p === null)
    return { theta, ok: false, reason: 'Dyad I (A-B-O4) cannot assemble', gap: s1.gap };
  const B = s1.p;

  // Rigid points carried by links 3 and 4.
  const C = localPoint(A, B, d.c3r, degToRad(d.c3a));
  const D = localPoint(O4, B, d.d4r, degToRad(d.d4a));

  // --- Dyad II: links 5 & 6, unknown joint E ------------------------------
  const s2 = solveDyad(C, d.lCE, O6, d.lO6E, previous?.E ?? null, d.branch2);
  if (s2.p === null)
    return { theta, ok: false, reason: 'Dyad II (C-E-O6) cannot assemble', gap: s2.gap };
  const E = s2.p;

  const G = localPoint(O6, E, d.g6r, degToRad(d.g6a));

  // --- Dyad III: links 7 & 8, unknown joint F -----------------------------
  const s3 = solveDyad(D, d.lDF, G, d.lGF, previous?.F ?? null, d.branch3);
  if (s3.p === null)
    return { theta, ok: false, reason: 'Dyad III (D-F-G) cannot assemble', gap: s3.gap };
  const F = s3.p;

  // --- Output point -------------------------------------------------------
  const led = localPoint(G, F, d.p8r, degToRad(d.p8a));

  const joints: Record<JointId, Vec2> = { O2, O4, O6, A, B, C, D, E, F, G };

  for (const key of Object.keys(joints) as JointId[]) {
    const p = joints[key];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
      return { theta, ok: false, reason: `Non-finite coordinate at ${key}`, gap: 1e6 };
  }
  if (!Number.isFinite(led.x) || !Number.isFinite(led.y))
    return { theta, ok: false, reason: 'Non-finite LED coordinate', gap: 1e6 };

  const linkAngles = {
    L2: angleOf(sub(A, O2)),
    L3: angleOf(sub(B, A)),
    L4: angleOf(sub(B, O4)),
    L5: angleOf(sub(E, C)),
    L6: angleOf(sub(E, O6)),
    L7: angleOf(sub(F, D)),
    L8: angleOf(sub(F, G)),
  };

  // Transmission angle of each dyad = interior angle at its output joint.
  const transmissionAngles: [number, number, number] = [
    radToDeg(interiorAngle(A, B, O4)),
    radToDeg(interiorAngle(C, E, O6)),
    radToDeg(interiorAngle(D, F, G)),
  ];

  return {
    theta,
    joints,
    led,
    linkAngles,
    loopClosureError: loopClosureResidual(geo, joints, led),
    sigmaMin: opts.computeSigma === false ? Number.NaN : constraintJacobianSigmaMin(geo, joints),
    transmissionAngles,
    ok: true,
  };
}

export type Sweep = {
  poses: Pose[];
  failures: PoseFailureRecord[];
  /** Number of angles attempted. */
  frames: number;
  validFrames: number;
  fullRotation: boolean;
  /** Accumulated assembly gap over failed frames (mm) — smooth infeasibility measure. */
  totalGap: number;
  assemblyJumps: number;
  maxLoopClosureError: number;
  minSigma: number;
  minTransmissionAngle: number;
  /** |P_LED(0) - P_LED(2pi)| in mm. */
  pathClosure: number;
};

export type PoseFailureRecord = { theta: number; reason: string; gap: number };

/**
 * Sweep the motor through a full revolution.
 *
 * Two passes: the first frame fixes the assembly mode from the explicit
 * selectors, then each subsequent frame is seeded with the previous solution so
 * the solver stays on one branch (brief §10).  A second lap is used to seed the
 * start point so that theta = 0 is solved with the same continuity the rest of
 * the cycle enjoys, which makes the path-closure test meaningful.
 */
export function sweep(
  geo: Geometry,
  samples: number = CONFIG.samplesFine,
  opts: { computeSigma?: boolean; stopOnFailure?: boolean } = {},
): Sweep {
  const computeSigma = opts.computeSigma !== false;
  const stopOnFailure = opts.stopOnFailure === true;

  const step = (2 * Math.PI) / samples;
  const poses: Pose[] = [];
  const failures: PoseFailureRecord[] = [];
  let totalGap = 0;
  let prev: BranchState = null;

  // Warm-up lap (cheap, no sigma) so the reported cycle starts on a settled branch.
  let warm: BranchState = null;
  for (let i = 0; i < samples; i++) {
    const r = solvePose(geo, i * step, warm, { computeSigma: false });
    if (r.ok) warm = { B: r.joints.B, E: r.joints.E, F: r.joints.F };
    else {
      // Warm-up failed: report on the real pass, don't mask it.
      warm = null;
      break;
    }
  }
  prev = warm;

  let assemblyJumps = 0;
  let maxLoop = 0;
  let minSigma = Number.POSITIVE_INFINITY;
  let minMu = 180;

  for (let i = 0; i < samples; i++) {
    const theta = i * step;
    const r = solvePose(geo, theta, prev, { computeSigma });
    if (!r.ok) {
      failures.push({ theta, reason: r.reason, gap: r.gap });
      totalGap += r.gap;
      prev = null; // force re-seeding from the explicit selectors
      if (stopOnFailure) break;
      continue;
    }
    if (prev) {
      const jump = Math.max(
        dist(prev.B, r.joints.B),
        dist(prev.E, r.joints.E),
        dist(prev.F, r.joints.F),
      );
      if (jump > CONFIG.assemblyJumpTol) assemblyJumps++;
    }
    prev = { B: r.joints.B, E: r.joints.E, F: r.joints.F };
    poses.push(r);
    maxLoop = Math.max(maxLoop, r.loopClosureError);
    if (computeSigma) minSigma = Math.min(minSigma, r.sigmaMin);
    minMu = Math.min(minMu, ...r.transmissionAngles);
  }

  const validFrames = poses.length;
  const fullRotation = validFrames === samples && failures.length === 0;

  // Path closure: distance between the first sample and the wrap-around sample.
  let pathClosure = Number.POSITIVE_INFINITY;
  if (fullRotation) {
    const first = poses[0];
    const wrap = solvePose(geo, 2 * Math.PI, {
      B: poses[poses.length - 1].joints.B,
      E: poses[poses.length - 1].joints.E,
      F: poses[poses.length - 1].joints.F,
    });
    pathClosure = wrap.ok ? dist(first.led, wrap.led) : Number.POSITIVE_INFINITY;
  }

  return {
    poses,
    failures,
    frames: samples,
    validFrames,
    fullRotation,
    totalGap,
    assemblyJumps,
    maxLoopClosureError: maxLoop,
    minSigma: Number.isFinite(minSigma) ? minSigma : 0,
    minTransmissionAngle: validFrames ? minMu : 0,
    pathClosure,
  };
}

export const ledPath = (s: Sweep): Vec2[] => s.poses.map((p) => p.led);
