import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { CRANK_ID, dyadJointId, groundJointId } from '../mechanism/spec';
import type { LinkId, Pose, PoseResult } from '../mechanism/types';
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
 * Previous-configuration memory used for branch continuity: the unknown joint
 * of every dyad. Everything else on a body follows rigidly once its anchor and
 * dyad joint are known.
 */
export type BranchState = Vec2[] | null;

/**
 * Forward kinematics at one motor angle, for any dyad count.
 *
 * The chain is a series of RRR Assur dyads, so each unknown joint comes from a
 * closed-form circle-circle intersection against points that are already known.
 * No Newton iteration is used at any size; the loop-closure residual therefore
 * remains a genuine independent check rather than a solver tolerance.
 */
export function solvePose(
  geo: Geometry,
  theta: number,
  previous: BranchState = null,
  opts: { computeSigma?: boolean } = {},
): PoseResult {
  const spec = geo.spec;
  const points: Record<string, Vec2> = {};

  geo.ground.forEach((p, i) => {
    points[groundJointId(i)] = p;
  });

  const O2 = geo.ground[0];
  points.A = v2(
    O2.x + geo.crankLength * Math.cos(theta),
    O2.y + geo.crankLength * Math.sin(theta),
  );

  const jointPositions: Vec2[] = [];
  const transmissionAngles: number[] = [];

  for (let k = 0; k < spec.dyads.length; k++) {
    const aBar = geo.bars[2 * k];
    const bBar = geo.bars[2 * k + 1];

    const pa = points[aBar.anchorId];
    const pb = points[bBar.anchorId];
    if (!pa || !pb) {
      return {
        theta,
        ok: false,
        reason: `Dyad ${k + 1} anchor is not resolved (${aBar.anchorId}, ${bBar.anchorId})`,
        gap: 1e6,
      };
    }

    const res = circleCircleIntersectionEx(pa, aBar.length, pb, bBar.length);
    if (res.points === null) {
      return {
        theta,
        ok: false,
        reason: `Dyad ${k + 1} cannot assemble`,
        gap: res.gap,
      };
    }

    const prev = previous?.[k] ?? null;
    const [p0, p1] = res.points;
    const J = prev === null ? p0 : dist(p0, prev) <= dist(p1, prev) ? p0 : p1;

    points[dyadJointId(k)] = J;
    jointPositions.push(J);
    transmissionAngles.push(radToDeg(interiorAngle(pa, J, pb)));

    // Rigid third points ride on their bar's local frame.
    for (const bar of [aBar, bBar]) {
      if (!bar.extra) continue;
      points[bar.extra.id] = localPoint(
        points[bar.anchorId],
        J,
        bar.extra.r,
        degToRad(bar.extra.angleDeg),
      );
    }
  }

  for (const [id, p] of Object.entries(points)) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
      return { theta, ok: false, reason: `Non-finite coordinate at ${id}`, gap: 1e6 };
  }

  const led = points[geo.ledId];
  if (!led) return { theta, ok: false, reason: 'LED point is not defined by this spec', gap: 1e6 };

  const linkAngles: Record<LinkId, number> = {
    [CRANK_ID]: angleOf(sub(points.A, O2)),
  };
  for (const bar of geo.bars) {
    linkAngles[bar.id] = angleOf(sub(points[bar.jointId], points[bar.anchorId]));
  }

  return {
    theta,
    points,
    led,
    linkAngles,
    loopClosureError: loopClosureResidual(geo, points),
    sigmaMin:
      opts.computeSigma === false ? Number.NaN : constraintJacobianSigmaMin(geo, points),
    transmissionAngles,
    ok: true,
  };
}

export type PoseFailureRecord = { theta: number; reason: string; gap: number };

export type Sweep = {
  poses: Pose[];
  failures: PoseFailureRecord[];
  frames: number;
  validFrames: number;
  fullRotation: boolean;
  /** Accumulated assembly gap over failed frames (mm). */
  totalGap: number;
  assemblyJumps: number;
  maxLoopClosureError: number;
  minSigma: number;
  minTransmissionAngle: number;
  /** |P_LED(0) − P_LED(2π)| in mm. */
  pathClosure: number;
};

const stateOf = (p: Pose, n: number): Vec2[] =>
  Array.from({ length: n }, (_, k) => p.points[dyadJointId(k)]);

/**
 * Sweep the motor through a full revolution.
 *
 * A warm-up lap settles the assembly mode before the reported cycle starts, so
 * theta = 0 is solved with the same branch continuity as every other frame and
 * the path-closure test is meaningful.
 */
export function sweep(
  geo: Geometry,
  samples: number = CONFIG.samplesFine,
  opts: { computeSigma?: boolean; stopOnFailure?: boolean } = {},
): Sweep {
  const computeSigma = opts.computeSigma !== false;
  const stopOnFailure = opts.stopOnFailure === true;
  const nDyads = geo.spec.dyads.length;
  const step = (2 * Math.PI) / samples;

  const poses: Pose[] = [];
  const failures: PoseFailureRecord[] = [];
  let totalGap = 0;

  let warm: BranchState = null;
  for (let i = 0; i < samples; i++) {
    const r = solvePose(geo, i * step, warm, { computeSigma: false });
    if (r.ok) warm = stateOf(r, nDyads);
    else {
      warm = null;
      break;
    }
  }
  let prev: BranchState = warm;

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
      prev = null;
      if (stopOnFailure) break;
      continue;
    }
    const next = stateOf(r, nDyads);
    if (prev) {
      let jump = 0;
      for (let k = 0; k < nDyads; k++) jump = Math.max(jump, dist(prev[k], next[k]));
      if (jump > CONFIG.assemblyJumpTol) assemblyJumps++;
    }
    prev = next;
    poses.push(r);
    maxLoop = Math.max(maxLoop, r.loopClosureError);
    if (computeSigma) minSigma = Math.min(minSigma, r.sigmaMin);
    minMu = Math.min(minMu, ...r.transmissionAngles);
  }

  const validFrames = poses.length;
  const fullRotation = validFrames === samples && failures.length === 0;

  let pathClosure = Number.POSITIVE_INFINITY;
  if (fullRotation) {
    const last = poses[poses.length - 1];
    const wrap = solvePose(geo, 2 * Math.PI, stateOf(last, nDyads), { computeSigma: false });
    pathClosure = wrap.ok ? dist(poses[0].led, wrap.led) : Number.POSITIVE_INFINITY;
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
