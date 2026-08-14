/**
 * Offline synthesis run.  Produces the OPTIMIZED RESULT that ships with the
 * app.  Every number written here comes from the solver — nothing is authored
 * by hand.
 *
 *   npm run optimize -- [--seed N] [--pop N] [--gen N] [--out path] [--runs N]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { optimize } from '../src/synthesis/optimizer';
import { evaluateDesign } from '../src/synthesis/objective';
import { arrayToDesign, buildGeometry } from '../src/mechanism/mechanism';
import { DESIGN_KEYS } from '../src/mechanism/types';
import { CONFIG } from '../src/mechanism/config';
import { TOPOLOGY } from '../src/mechanism/topology';

const argv = process.argv.slice(2);
const arg = (name: string, dflt: number): number => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : dflt;
};
const argStr = (name: string, dflt: string): string => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};

const runs = arg('runs', 1);
const baseSeed = arg('seed', 20260814);
const population = arg('pop', CONFIG.optimizer.dePopulation);
const generations = arg('gen', CONFIG.optimizer.deGenerations);
const localIterations = arg('local', CONFIG.optimizer.localIterations);
const outPath = resolve(process.cwd(), argStr('out', 'src/synthesis/optimizedResult.json'));

console.log('=== HEART LINKAGE SYNTHESIS — offline optimisation ===');
console.log(`Mobility = ${TOPOLOGY.mobility}  |  independent loops = ${TOPOLOGY.loopCount}`);
console.log(
  `runs=${runs} seed=${baseSeed} pop=${population} gen=${generations} local=${localIterations}`,
);

const pool: { x: number[]; J: number }[] = [];
const t0 = Date.now();

for (let r = 0; r < runs; r++) {
  const seed = baseSeed + r * 7919;
  let last = '';
  const res = optimize({
    seed,
    population,
    generations,
    localIterations,
    keepBest: CONFIG.optimizer.keepBest,
    onProgress: (p) => {
      const line = `[run ${r + 1}/${runs}] ${p.phase} ${p.generation}/${p.totalGenerations} bestJ=${
        Number.isFinite(p.bestJ) ? p.bestJ.toFixed(4) : 'inf'
      } feasible=${p.feasibleCount} evals=${p.evaluations}`;
      if (line !== last) {
        console.log(line);
        last = line;
      }
    },
  });
  pool.push(...res.best);
  console.log(
    `[run ${r + 1}] finished, ${res.best.length} candidates, ${res.evaluations} evaluations, ${(
      (Date.now() - t0) /
      1000
    ).toFixed(1)}s elapsed`,
  );
}

pool.sort((a, b) => a.J - b.J);

// Deduplicate and keep the requested number of distinct mechanisms.
const distinct: { x: number[]; J: number }[] = [];
for (const c of pool) {
  const dup = distinct.some(
    (d) => Math.sqrt(d.x.reduce((s, v, i) => s + (v - c.x[i]) ** 2, 0)) < 5,
  );
  if (!dup) distinct.push(c);
  if (distinct.length >= CONFIG.optimizer.keepBest) break;
}

console.log(`\n=== ${distinct.length} distinct mechanisms retained ===\n`);

const solutions = distinct.map((c, idx) => {
  const m = evaluateDesign(c.x, { level: 'fine', computeSigma: true, computeGravity: true });
  const geo = buildGeometry(arrayToDesign(c.x));
  const design: Record<string, number> = {};
  DESIGN_KEYS.forEach((k, i) => {
    design[k] = +c.x[i].toFixed(4);
  });

  if (idx < 8) {
    console.log(
      `#${idx + 1}  J=${m.J.toFixed(4)}  RMS=${m.match.chamferRms.toFixed(2)}mm  ` +
        `max=${m.match.maxError.toFixed(2)}mm  bbox=${m.width.toFixed(1)}x${m.height.toFixed(1)}  ` +
        `mu_min=${m.minTransmissionAngle.toFixed(1)}deg  sigma=${m.minSigma.toFixed(3)}  ` +
        `coll=${m.collisionFrames}  tau=${m.peakGravityTorque.toFixed(3)}N.m  ` +
        `valid=${m.validFrames}/${m.frames}`,
    );
  }

  return {
    rank: idx + 1,
    score: +m.J.toFixed(6),
    design,
    designArray: c.x.map((v) => +v.toFixed(4)),
    metrics: {
      objective: +m.J.toFixed(6),
      rmsError_mm: +m.match.chamferRms.toFixed(4),
      paramRms_mm: +m.match.paramRms.toFixed(4),
      maxError_mm: +m.match.maxError.toFixed(4),
      rmsLedToTarget_mm: +m.match.rmsLedToTarget.toFixed(4),
      rmsTargetToLed_mm: +m.match.rmsTargetToLed.toFixed(4),
      width_mm: +m.width.toFixed(3),
      height_mm: +m.height.toFixed(3),
      heartMatchPercent: +m.heartMatchPercent.toFixed(2),
      minTransmissionAngle_deg: +m.minTransmissionAngle.toFixed(3),
      singularityMargin: +m.minSigma.toFixed(5),
      collisionFrames: m.collisionFrames,
      validFrames: m.validFrames,
      frames: m.frames,
      fullRotation: m.fullRotation,
      assemblyJumps: m.assemblyJumps,
      maxLoopClosureError_mm: m.maxLoopClosureError,
      pathClosure_mm: m.pathClosure,
      peakGravityTorque_Nm: +m.peakGravityTorque.toFixed(5),
    },
    fixedPivots: {
      O2: { x: +geo.O2.x.toFixed(3), y: +geo.O2.y.toFixed(3) },
      O4: { x: +geo.O4.x.toFixed(3), y: +geo.O4.y.toFixed(3) },
      O6: { x: +geo.O6.x.toFixed(3), y: +geo.O6.y.toFixed(3) },
    },
    members: geo.members.map((mm) => ({
      link: mm.linkId,
      from: mm.from,
      to: mm.to,
      length_mm: +mm.length.toFixed(3),
    })),
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  solver: {
    method: 'Differential Evolution (rand/1/bin) + bounded Nelder-Mead refinement',
    seed: baseSeed,
    runs,
    population,
    generations,
    localIterations,
    samplesSchedule: [CONFIG.samplesCoarse, CONFIG.samplesMedium, CONFIG.samplesFine],
    weights: CONFIG.weights,
  },
  topology: {
    links: TOPOLOGY.links.length,
    joints: TOPOLOGY.joints.length,
    mobility: TOPOLOGY.mobility,
    loops: TOPOLOGY.loops,
  },
  target: { type: 'heart', width_mm: CONFIG.targetWidth, height_mm: CONFIG.targetHeight },
  solutions,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`\nWrote ${solutions.length} solutions to ${outPath}`);
console.log(`Total wall time: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
