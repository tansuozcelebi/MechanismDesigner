import { CONFIG } from '../mechanism/config';
import {
  buildGeometry,
  lengthViolation,
  ratioPenalty,
  type Geometry,
} from '../mechanism/mechanism';
import { DEFAULT_SPEC, type MechanismSpec } from '../mechanism/spec';
import { sweep, type Sweep } from '../kinematics/forwardSolver';
import { sweepCollisionPenalty } from '../collision/collisionDetector';
import { buildability } from '../collision/layering';
import { gravityTorque } from '../dynamics/gravity';
import { boundingBox } from './heartCurve';
import { heartTarget, resolveTarget, type ResolvedTarget, type TargetCurve } from './targetCurve';
import {
  bestRigidAlignment,
  chamferError,
  invertTransform,
  sizeError,
  transformAll,
  type MatchErrors,
  type RigidTransform,
} from './curveMatching';
import type { Vec2 } from '../utils/math';

export type EvalLevel = 'coarse' | 'medium' | 'fine';

const SAMPLES: Record<EvalLevel, number> = {
  coarse: CONFIG.samplesCoarse,
  medium: CONFIG.samplesMedium,
  fine: CONFIG.samplesFine,
};

/**
 * Penalty bands.  Ordering matters: any design that violates a hard constraint
 * must score strictly worse than every feasible design, but the penalty inside
 * each band still varies smoothly so the global search can climb out of the
 * infeasible region instead of seeing a flat plateau.
 */
export const BAND_LENGTH = 1e6;
export const BAND_ASSEMBLY = 1e4;

/**
 * The active target.  Held module-side and resolved once, because the spatial
 * index behind it is reused across tens of thousands of evaluations; rebuilding
 * it per call would dominate the optimiser's runtime.
 */
let activeTarget: ResolvedTarget = resolveTarget(heartTarget());

export function setTarget(curve: TargetCurve): ResolvedTarget {
  activeTarget = resolveTarget(curve);
  return activeTarget;
}

export const getTarget = (): ResolvedTarget => activeTarget;

export type Metrics = {
  J: number;
  valid: boolean;
  rejectReason: string | null;

  /* Trajectory */
  ledPath: Vec2[];
  /** Target rigidly placed onto the LED path (rotation + translation only). */
  alignedTarget: Vec2[];
  alignment: RigidTransform;
  match: MatchErrors;
  width: number;
  height: number;
  sizeError: number;
  heartMatchPercent: number;

  /* Kinematic health */
  frames: number;
  validFrames: number;
  fullRotation: boolean;
  assemblyJumps: number;
  maxLoopClosureError: number;
  pathClosure: number;
  minTransmissionAngle: number;
  effectiveTransmissionAngle: number;
  minSigma: number;

  /* Interference / buildability */
  collisionFrames: number;
  collisionPenalty: number;
  layerCount: number;
  maxPinSpan: number;
  stackThickness: number;
  layerOf: Record<string, number>;

  /* Dynamics */
  peakGravityTorque: number;

  terms: {
    curve: number;
    size: number;
    closure: number;
    singularity: number;
    collision: number;
    ratio: number;
    gravity: number;
  };
};

export function emptyMetrics(J: number, reason: string): Metrics {
  return {
    J,
    valid: false,
    rejectReason: reason,
    ledPath: [],
    alignedTarget: [],
    alignment: { angle: 0, tx: 0, ty: 0 },
    match: {
      chamferRms: Infinity,
      rmsLedToTarget: Infinity,
      rmsTargetToLed: Infinity,
      maxError: Infinity,
      paramRms: Infinity,
    },
    width: 0,
    height: 0,
    sizeError: Infinity,
    heartMatchPercent: 0,
    frames: 0,
    validFrames: 0,
    fullRotation: false,
    assemblyJumps: 0,
    maxLoopClosureError: Infinity,
    pathClosure: Infinity,
    minTransmissionAngle: 0,
    effectiveTransmissionAngle: 0,
    minSigma: 0,
    collisionFrames: 0,
    collisionPenalty: 0,
    layerCount: 0,
    maxPinSpan: 0,
    stackThickness: 0,
    layerOf: {},
    peakGravityTorque: 0,
    terms: { curve: 0, size: 0, closure: 0, singularity: 0, collision: 0, ratio: 0, gravity: 0 },
  };
}

export type EvalOptions = {
  level?: EvalLevel;
  spec?: MechanismSpec;
  weights?: typeof CONFIG.weights;
  computeSigma?: boolean;
  computeGravity?: boolean;
  target?: ResolvedTarget;
};

/**
 * Evaluate a parameter vector.  Single entry point shared by the UI, the Web
 * Worker and the offline scripts, so the number shown on screen comes from
 * exactly the code path the optimiser minimised.
 */
export function evaluateDesign(x: number[], options: EvalOptions = {}): Metrics {
  const level = options.level ?? 'coarse';
  const spec = options.spec ?? DEFAULT_SPEC;
  const w = options.weights ?? CONFIG.weights;
  const n = SAMPLES[level];

  let geo: Geometry;
  try {
    geo = buildGeometry(spec, x);
  } catch (e) {
    return emptyMetrics(BAND_LENGTH * 10, `Geometry error: ${(e as Error).message}`);
  }

  const lenVio = lengthViolation(geo);
  if (lenVio > 1e-9) {
    return emptyMetrics(BAND_LENGTH + lenVio, `Link length out of range by ${lenVio.toFixed(1)} mm`);
  }

  const sw = sweep(geo, n, { computeSigma: options.computeSigma === true });
  if (!sw.fullRotation) {
    const failFrac = 1 - sw.validFrames / sw.frames;
    const meanGap = sw.failures.length ? sw.totalGap / sw.failures.length : 0;
    return emptyMetrics(
      BAND_ASSEMBLY * (1 + failFrac) + Math.min(1000, meanGap),
      `Full rotation FAILED: ${sw.validFrames}/${sw.frames} frames`,
    );
  }
  if (sw.assemblyJumps > 0) {
    return emptyMetrics(
      BAND_ASSEMBLY * 0.9 + sw.assemblyJumps,
      `ASSEMBLY MODE JUMP on ${sw.assemblyJumps} frame(s)`,
    );
  }

  return scoreSweep(geo, sw, w, options);
}

/** Score an already-computed sweep. Split out so the UI can reuse a live sweep. */
export function scoreSweep(
  geo: Geometry,
  sw: Sweep,
  w: typeof CONFIG.weights = CONFIG.weights,
  options: EvalOptions = {},
): Metrics {
  const target = options.target ?? activeTarget;
  const ledPath = sw.poses.map((p) => p.led);
  const bb = boundingBox(ledPath);

  // Curve matching, after the best RIGID placement (never scale — the target
  // size is a physical requirement, not a free parameter).
  const alignment = bestRigidAlignment(target.points, ledPath);
  const alignedTarget = transformAll(target.points, alignment);
  const ledInTargetFrame = transformAll(ledPath, invertTransform(alignment));
  const match = target.degenerate
    ? {
        chamferRms: Infinity,
        rmsLedToTarget: Infinity,
        rmsTargetToLed: Infinity,
        maxError: Infinity,
        paramRms: Infinity,
      }
    : chamferError(ledInTargetFrame, target.points, target.query);

  const eCurve = Number.isFinite(match.chamferRms) ? match.chamferRms : 1e4;
  const eSize = sizeError(ledPath, target.width || CONFIG.targetWidth, target.height || CONFIG.targetHeight);

  const eClosure =
    sw.maxLoopClosureError / CONFIG.loopClosureTol +
    (Number.isFinite(sw.pathClosure) ? sw.pathClosure / CONFIG.pathClosureTol : 100);

  // Transmission angle is an exact, free proxy for the dyad determinant: each
  // 2x2 dyad block of dF/dq has determinant proportional to sin(mu).
  let muEff = 90;
  for (const p of sw.poses) {
    for (const mu of p.transmissionAngles) muEff = Math.min(muEff, Math.min(mu, 180 - mu));
  }
  const eSing =
    muEff < CONFIG.scales.muReference
      ? (CONFIG.scales.muReference / Math.max(muEff, 0.5)) ** 2 - 1
      : 0;

  const stride = sw.poses.length > 240 ? 2 : 1;
  const sampled = sw.poses.filter((_, i) => i % stride === 0);
  const coll = sweepCollisionPenalty(geo, sampled);
  const build = buildability(geo, sampled);

  const eRatio = ratioPenalty(geo);

  let peakTau = 0;
  if (options.computeGravity !== false) {
    const gstride = Math.max(1, Math.floor(sw.poses.length / 60));
    for (let i = 0; i < sw.poses.length; i += gstride) {
      const t = gravityTorque(geo, sw.poses[i]);
      if (Number.isFinite(t)) peakTau = Math.max(peakTau, Math.abs(t));
    }
  }

  const terms = {
    curve: w.w1_curve * (eCurve / CONFIG.scales.curveScale),
    size: w.w2_size * eSize,
    closure: w.w3_closure * eClosure,
    singularity: w.w4_singularity * eSing,
    collision: w.w5_collision * build.penalty,
    ratio: w.w6_ratio * eRatio,
    gravity: w.w7_gravity * peakTau,
  };

  let J = Object.values(terms).reduce((s, t) => s + t, 0);

  // Hard rejection: a mechanism this close to a dead point cannot be driven
  // through the cycle by a real motor, whatever its trajectory looks like.
  const rejected = muEff < CONFIG.scales.muHardReject;
  if (rejected) J += BAND_ASSEMBLY * 0.5 + (CONFIG.scales.muHardReject - muEff);

  return {
    J,
    valid: !rejected,
    rejectReason: rejected
      ? `Severe singularity: effective transmission angle ${muEff.toFixed(1)}° < ${CONFIG.scales.muHardReject}°`
      : null,
    ledPath,
    alignedTarget,
    alignment,
    match,
    width: bb.width,
    height: bb.height,
    sizeError: eSize,
    heartMatchPercent: 100 * Math.exp(-eCurve / CONFIG.scoreCharacteristicLength),
    frames: sw.frames,
    validFrames: sw.validFrames,
    fullRotation: sw.fullRotation,
    assemblyJumps: sw.assemblyJumps,
    maxLoopClosureError: sw.maxLoopClosureError,
    pathClosure: sw.pathClosure,
    minTransmissionAngle: sw.minTransmissionAngle,
    effectiveTransmissionAngle: muEff,
    minSigma: sw.minSigma,
    collisionFrames: coll.framesWithCollision * stride,
    collisionPenalty: coll.penalty,
    layerCount: build.layerCount,
    maxPinSpan: build.maxPinSpan,
    stackThickness: build.stackThickness,
    layerOf: build.layer,
    peakGravityTorque: peakTau,
    terms,
  };
}

/** Scalar-only fast path used inside the optimiser's inner loop. */
export function objectiveValue(
  x: number[],
  level: EvalLevel = 'coarse',
  spec: MechanismSpec = DEFAULT_SPEC,
): number {
  return evaluateDesign(x, { level, spec, computeSigma: false, computeGravity: false }).J;
}
