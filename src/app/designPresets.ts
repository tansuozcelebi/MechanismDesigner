import type { DesignVector } from '../mechanism/types';
import { DESIGN_KEYS } from '../mechanism/types';
import { arrayToDesign, designToArray } from '../mechanism/mechanism';
import optimizedResult from '../synthesis/optimizedResult.json';

/**
 * INITIAL GUESS — the starting geometry, NOT an optimisation result.
 *
 * Produced by the constructive sampler (`trySampleFeasible`) with RNG seed 1,
 * taking the first draw that assembles through a full revolution.  Reproduce
 * it exactly with `npx tsx scripts/genInitial.ts`.
 *
 * Verified properties of this geometry (all measured, none asserted):
 *   full rotation 720/720 frames, assembly jumps 0, mobility 1,
 *   max loop closure error 1.14e-13 mm, path closure 0.00 mm,
 *   effective transmission angle 41.59 deg, 2 assembly layers,
 *   peak gravity torque 0.1597 N.m.
 *
 * Its trajectory is a poor heart on purpose — bounding box 117.0 x 18.5 mm
 * against a 250 x 250 mm target, chamfer RMS 72.80 mm.  That is what an
 * unoptimised starting point looks like, and it is what the optimiser improves.
 */
export const INITIAL_GUESS: DesignVector = arrayToDesign([
  12.7663, // phi6
  87.5913, // lAB
  83.1209, // c3r
  -145.3453, // c3a
  104.4904, // lO4B
  72.3706, // d4r
  -32.8812, // d4a
  182.6805, // lCE
  188.2371, // lO6E
  144.9458, // g6r
  60.8628, // g6a
  85.1835, // lDF
  123.5765, // lGF
  96.1278, // p8r
  -106.3400, // p8a
]);

export type StoredSolution = {
  rank: number;
  score: number;
  designArray: number[];
  metrics: Record<string, number | boolean>;
  fixedPivots: Record<string, { x: number; y: number }>;
  members: { link: string; from: string; to: string; length_mm: number }[];
};

export type OptimizedResultFile = {
  generatedAt: string;
  solver: Record<string, unknown>;
  topology: Record<string, unknown>;
  target: { type: string; width_mm: number; height_mm: number };
  solutions: StoredSolution[];
};

/**
 * OPTIMIZED RESULT — produced by an actual solver run.
 *
 * Written by `npm run optimize`, which executes the same Differential
 * Evolution + Nelder-Mead pipeline the in-app Web Worker runs.  Nothing in this
 * file is hand-authored; if the file is absent or empty the app falls back to
 * the initial guess and says so.
 */
export const OPTIMIZED: OptimizedResultFile = optimizedResult as OptimizedResultFile;

export const hasOptimizedResults = (): boolean => (OPTIMIZED?.solutions?.length ?? 0) > 0;

export const bestOptimizedDesign = (): DesignVector | null =>
  hasOptimizedResults() ? arrayToDesign(OPTIMIZED.solutions[0].designArray) : null;

export const designAt = (index: number): DesignVector | null => {
  const s = OPTIMIZED?.solutions?.[index];
  return s ? arrayToDesign(s.designArray) : null;
};

/** Human-readable design vector, for the parameter table. */
export function designEntries(d: DesignVector): { key: string; value: number; unit: string }[] {
  const arr = designToArray(d);
  return DESIGN_KEYS.map((k, i) => ({
    key: k,
    value: arr[i],
    unit: k === 'phi6' || k.endsWith('a') ? '°' : 'mm',
  }));
}
