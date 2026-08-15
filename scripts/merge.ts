/**
 * Merge several offline optimisation runs into the single result file the app
 * ships with, keeping the best 20 distinct mechanisms.
 *
 *   npx tsx scripts/merge.ts out.json in1.json in2.json ...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { evaluateDesign } from '../src/synthesis/objective';
import { buildGeometry } from '../src/mechanism/mechanism';
import { defaultSpec, groundJointId, paramLayout } from '../src/mechanism/spec';
import { CONFIG } from '../src/mechanism/config';
import { topologyOf } from '../src/mechanism/topology';

const DYADS = Number(process.env.KREAMET_DYADS ?? 3);
const SPEC = defaultSpec(DYADS);
const LAYOUT = paramLayout(SPEC);
const TOPOLOGY = topologyOf(SPEC);

const [outPath, ...inputs] = process.argv.slice(2);
if (!outPath || inputs.length === 0) {
  console.error('usage: merge.ts <out.json> <in.json...>');
  process.exit(1);
}

type Sol = { designArray: number[]; score: number };
const all: Sol[] = [];
const sources: string[] = [];

for (const f of inputs) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  sources.push(`${f} (seed ${data.solver?.seed}, ${data.solutions?.length ?? 0} solutions)`);
  for (const s of data.solutions ?? []) all.push({ designArray: s.designArray, score: s.score });
}

all.sort((a, b) => a.score - b.score);

const distinct: Sol[] = [];
for (const c of all) {
  const dup = distinct.some(
    (d) => Math.sqrt(d.designArray.reduce((s, v, i) => s + (v - c.designArray[i]) ** 2, 0)) < 8,
  );
  if (!dup) distinct.push(c);
  if (distinct.length >= CONFIG.optimizer.keepBest) break;
}

console.log(`Merged ${all.length} candidates from ${inputs.length} runs -> ${distinct.length} distinct`);

const solutions = distinct.map((c, idx) => {
  const m = evaluateDesign(c.designArray, {
    level: 'fine',
    spec: SPEC,
    computeSigma: true,
    computeGravity: true,
  });
  const geo = buildGeometry(SPEC, c.designArray);
  const design: Record<string, number> = {};
  LAYOUT.forEach((p, i) => {
    design[p.label] = +c.designArray[i].toFixed(4);
  });

  console.log(
    `#${idx + 1}  J=${m.J.toFixed(4)}  RMS=${m.match.chamferRms.toFixed(2)}mm  ` +
      `max=${m.match.maxError.toFixed(1)}  bbox=${m.width.toFixed(1)}x${m.height.toFixed(1)}  ` +
      `muEff=${m.effectiveTransmissionAngle.toFixed(1)}  sigma=${m.minSigma.toFixed(3)}  ` +
      `layers=${m.layerCount}  tau=${m.peakGravityTorque.toFixed(3)}  ` +
      `frames=${m.validFrames}/${m.frames}  jumps=${m.assemblyJumps}`,
  );

  return {
    rank: idx + 1,
    score: +m.J.toFixed(6),
    design,
    designArray: c.designArray.map((v) => +v.toFixed(4)),
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
        SPEC.labels?.[groundJointId(i)] ?? groundJointId(i),
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
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      solver: {
        method:
          'Differential Evolution (rand/1/bin + current-to-best/1/bin) with constructive feasible seeding and Lamarckian rescue repair, followed by bounded Nelder-Mead refinement',
        mergedFrom: sources,
        samplesSchedule: [CONFIG.samplesCoarse, CONFIG.samplesMedium, CONFIG.samplesFine],
        weights: CONFIG.weights,
        scales: CONFIG.scales,
      },
      dyads: DYADS,
      topology: {
        links: TOPOLOGY.links.length,
        joints: TOPOLOGY.joints.length,
        mobility: TOPOLOGY.mobility,
        loops: TOPOLOGY.loops,
      },
      target: { type: 'heart', width_mm: CONFIG.targetWidth, height_mm: CONFIG.targetHeight },
      solutions,
    },
    null,
    2,
  ),
);
console.log(`\nWrote ${solutions.length} solutions to ${outPath}`);
