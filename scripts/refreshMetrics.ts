/**
 * Re-evaluate the shipped optimisation result with the CURRENT engine.
 *
 *   npx tsx scripts/refreshMetrics.ts [file]
 *
 * The design vectors are the real output of the offline solver runs and are
 * never touched here; only the recorded metrics are recomputed, so the numbers
 * in the file always describe what the code in the repository actually produces
 * for those designs.  Provenance (`solver.mergedFrom`, the seeds) is carried
 * over unchanged — this is a re-measurement, not a new search, and the file must
 * not claim otherwise.
 *
 * Needed whenever a scoring definition changes: an objective term whose formula
 * moved makes the stored J stale, and a stale J is worse than no J because it
 * looks authoritative.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { CONFIG } from '../src/mechanism/config';
import { buildGeometry } from '../src/mechanism/mechanism';
import { defaultSpec, groundJointId, paramLayout } from '../src/mechanism/spec';
import { topologyOf } from '../src/mechanism/topology';
import { evaluateDesign } from '../src/synthesis/objective';

const path = process.argv[2] ?? 'src/synthesis/optimizedResult.json';
const file = JSON.parse(readFileSync(path, 'utf8'));

const dyads = Number(file.dyads ?? 3);
const spec = defaultSpec(dyads);
const layout = paramLayout(spec);
const topo = topologyOf(spec);

type Stored = { designArray: number[] };
const designs: Stored[] = file.solutions ?? [];
if (!designs.length) throw new Error(`${path} contains no solutions`);
for (const s of designs) {
  if (s.designArray.length !== layout.length) {
    throw new Error(
      `Design vector of length ${s.designArray.length} does not fit the ${dyads}-dyad layout (${layout.length}).`,
    );
  }
}

const scored = designs.map((s) => {
  const m = evaluateDesign(s.designArray, {
    level: 'fine',
    spec,
    computeSigma: true,
    computeGravity: true,
  });
  return { x: s.designArray, m };
});

// Rank by the recomputed objective: keeping the old order would leave the file
// claiming a ranking its own numbers contradict.
scored.sort((a, b) => a.m.J - b.m.J);

let maxDeltaJ = 0;
scored.forEach(({ x, m }, i) => {
  const before = designs.find((d) => d.designArray === x) as unknown as {
    metrics?: { objective?: number };
  };
  const old = before?.metrics?.objective;
  if (typeof old === 'number') maxDeltaJ = Math.max(maxDeltaJ, Math.abs(old - m.J));
  console.log(
    `#${i + 1}  J=${m.J.toFixed(6)}  RMS=${m.match.chamferRms.toFixed(3)}mm  ` +
      `bbox=${m.width.toFixed(1)}x${m.height.toFixed(1)}  ` +
      `muEff=${m.effectiveTransmissionAngle.toFixed(1)}  layers=${m.layerCount}  ` +
      `frames=${m.validFrames}/${m.frames}`,
  );
});

const solutions = scored.map(({ x, m }, idx) => {
  const geo = buildGeometry(spec, x);
  const design: Record<string, number> = {};
  layout.forEach((p, i) => {
    design[p.label] = +x[i].toFixed(4);
  });

  return {
    rank: idx + 1,
    score: +m.J.toFixed(6),
    design,
    designArray: x.map((v) => +v.toFixed(4)),
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
      effectiveTransmissionAngle_deg: +m.effectiveTransmissionAngle.toFixed(3),
      singularityMargin: +m.minSigma.toFixed(5),
      collisionFrames: m.collisionFrames,
      assemblyLayers: m.layerCount,
      maxPinSpan: m.maxPinSpan,
      validFrames: m.validFrames,
      frames: m.frames,
      fullRotation: m.fullRotation,
      assemblyJumps: m.assemblyJumps,
      maxLoopClosureError_mm: m.maxLoopClosureError,
      pathClosure_mm: m.pathClosure,
      peakGravityTorque_Nm: +m.peakGravityTorque.toFixed(5),
    },
    fixedPivots: Object.fromEntries(
      geo.ground.map((p, i) => [
        spec.labels?.[groundJointId(i)] ?? groundJointId(i),
        { x: +p.x.toFixed(3), y: +p.y.toFixed(3) },
      ]),
    ),
    members: geo.members.map((mm) => ({
      link: mm.linkId,
      from: mm.from,
      to: mm.to,
      length_mm: +mm.length.toFixed(3),
    })),
  };
});

writeFileSync(
  path,
  JSON.stringify(
    {
      ...file,
      metricsRefreshedAt: new Date().toISOString(),
      solver: {
        ...file.solver,
        weights: CONFIG.weights,
        scales: CONFIG.scales,
      },
      dyads,
      topology: {
        links: topo.links.length,
        joints: topo.joints.length,
        mobility: topo.mobility,
        loops: topo.loops,
      },
      solutions,
    },
    null,
    2,
  ),
);

console.log(`\nLargest change in the recorded objective: ${maxDeltaJ.toExponential(3)}`);
console.log(`Rewrote ${solutions.length} solutions in ${path}`);
