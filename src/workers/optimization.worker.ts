/// <reference lib="webworker" />
import { optimize, type OptimizerProgress } from '../synthesis/optimizer';
import { evaluateDesign } from '../synthesis/objective';
import { buildGeometry, arrayToDesign } from '../mechanism/mechanism';

/**
 * Synthesis runs here so the render thread keeps 60 FPS (brief §27 / §54).
 * The worker owns no DOM and no Three.js — it imports the same framework-
 * independent solver the UI uses, so results are bit-identical.
 */

export type WorkerRequest =
  | {
      type: 'run';
      seed: number;
      population: number;
      generations: number;
      localIterations: number;
      runs: number;
    }
  | { type: 'cancel' };

export type SolutionSummary = {
  rank: number;
  x: number[];
  J: number;
  rms: number;
  paramRms: number;
  maxError: number;
  width: number;
  height: number;
  heartMatchPercent: number;
  minTransmissionAngle: number;
  effectiveTransmissionAngle: number;
  singularityMargin: number;
  collisionFrames: number;
  layerCount: number;
  peakGravityTorque: number;
  validFrames: number;
  frames: number;
  fullRotation: boolean;
  maxLoopClosureError: number;
  pathClosure: number;
  memberLengths: { link: string; from: string; to: string; length: number }[];
  fixedPivots: { O2: [number, number]; O4: [number, number]; O6: [number, number] };
};

export type WorkerResponse =
  | { type: 'progress'; progress: OptimizerProgress; run: number; totalRuns: number }
  | { type: 'done'; solutions: SolutionSummary[]; evaluations: number; elapsedMs: number }
  | { type: 'error'; message: string };

let cancelled = false;

const post = (m: WorkerResponse) => (self as unknown as Worker).postMessage(m);

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;

  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (msg.type !== 'run') return;
  cancelled = false;
  const started = Date.now();

  try {
    const pool: { x: number[]; J: number }[] = [];
    let evaluations = 0;

    for (let r = 0; r < msg.runs; r++) {
      if (cancelled) break;
      const res = optimize({
        seed: msg.seed + r * 7919,
        population: msg.population,
        generations: msg.generations,
        localIterations: msg.localIterations,
        onProgress: (progress) => post({ type: 'progress', progress, run: r + 1, totalRuns: msg.runs }),
        shouldStop: () => cancelled,
      });
      pool.push(...res.best);
      evaluations += res.evaluations;
    }

    pool.sort((a, b) => a.J - b.J);

    // Keep only meaningfully different mechanisms.
    const distinct: { x: number[]; J: number }[] = [];
    for (const c of pool) {
      const dup = distinct.some(
        (d) => Math.sqrt(d.x.reduce((s, v, i) => s + (v - c.x[i]) ** 2, 0)) < 5,
      );
      if (!dup) distinct.push(c);
      if (distinct.length >= 20) break;
    }

    const solutions: SolutionSummary[] = distinct.map((c, i) => {
      const m = evaluateDesign(c.x, { level: 'fine', computeSigma: true, computeGravity: true });
      const geo = buildGeometry(arrayToDesign(c.x));
      return {
        rank: i + 1,
        x: c.x,
        J: m.J,
        rms: m.match.chamferRms,
        paramRms: m.match.paramRms,
        maxError: m.match.maxError,
        width: m.width,
        height: m.height,
        heartMatchPercent: m.heartMatchPercent,
        minTransmissionAngle: m.minTransmissionAngle,
        effectiveTransmissionAngle: m.effectiveTransmissionAngle,
        singularityMargin: m.minSigma,
        collisionFrames: m.collisionFrames,
        layerCount: m.layerCount,
        peakGravityTorque: m.peakGravityTorque,
        validFrames: m.validFrames,
        frames: m.frames,
        fullRotation: m.fullRotation,
        maxLoopClosureError: m.maxLoopClosureError,
        pathClosure: m.pathClosure,
        memberLengths: geo.members.map((mm) => ({
          link: mm.linkId,
          from: String(mm.from),
          to: String(mm.to),
          length: mm.length,
        })),
        fixedPivots: {
          O2: [geo.O2.x, geo.O2.y],
          O4: [geo.O4.x, geo.O4.y],
          O6: [geo.O6.x, geo.O6.y],
        },
      };
    });

    post({ type: 'done', solutions, evaluations, elapsedMs: Date.now() - started });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
