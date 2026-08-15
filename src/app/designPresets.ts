import { DEFAULT_SPEC, defaultSpec, paramLayout, type MechanismSpec } from '../mechanism/spec';
import optimizedResult from '../synthesis/optimizedResult.json';

/**
 * INITIAL GUESS — the starting geometry, NOT an optimisation result.
 *
 * Produced by the constructive sampler with RNG seed 1, taking the first draw
 * that assembles through a full revolution.  Reproduce it exactly with
 * `npx tsx scripts/genInitial.ts`.
 *
 * Its trajectory is a poor heart on purpose — that is what an unoptimised
 * starting point looks like, and it is what the optimiser improves.
 */
export const INITIAL_GUESS: number[] = [
  146.8132, // phi6
  95.3559, // lAB
  67.2208, // c3r
  -165.7987, // c3a
  97.7986, // lO4B
  180.3029, // d4r
  -73.9887, // d4a
  108.2533, // lCE
  94.2723, // lO6E
  110.1864, // g6r
  -63.243, // g6a
  198.7481, // lDF
  199.3301, // lGF
  111.2995, // p8r
  15.3196, // p8a
  // Measured, not asserted: J = 7.7997, chamfer RMS = 69.82 mm, bounding box
  // 77.8 x 47.6 mm, effective transmission angle 42.47 deg, 720/720 frames,
  // loop closure 1.1e-13 mm, path closure 1.4e-14 mm, 2 assembly layers.
];

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
  /** Dyad count the stored designs belong to. Absent in files predating variable sizing. */
  dyads?: number;
  solutions: StoredSolution[];
};

/**
 * OPTIMIZED RESULT — produced by an actual solver run (`npm run optimize`),
 * which executes the same pipeline the in-app Web Worker runs.  Nothing here is
 * hand-authored; if the file is absent or empty the app falls back to the
 * initial guess and says so.
 */
export const OPTIMIZED: OptimizedResultFile = optimizedResult as OptimizedResultFile;

/** Which mechanism family the shipped designs were optimised for. */
export const OPTIMIZED_SPEC: MechanismSpec = defaultSpec(OPTIMIZED?.dyads ?? 3);

export const hasOptimizedResults = (): boolean => (OPTIMIZED?.solutions?.length ?? 0) > 0;

/**
 * A stored vector only means anything against the spec it was optimised for, so
 * loading one must also switch the spec. Length is checked because a file from
 * a different mechanism size would otherwise be silently misinterpreted.
 */
export function storedDesign(index: number): { spec: MechanismSpec; params: number[] } | null {
  const s = OPTIMIZED?.solutions?.[index];
  if (!s) return null;
  const spec = OPTIMIZED_SPEC;
  if (s.designArray.length !== paramLayout(spec).length) return null;
  return { spec, params: s.designArray };
}

export const DEFAULT_START_SPEC: MechanismSpec = hasOptimizedResults() ? OPTIMIZED_SPEC : DEFAULT_SPEC;
