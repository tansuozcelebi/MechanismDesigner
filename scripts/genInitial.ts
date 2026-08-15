/** Emits the deterministic INITIAL GUESS design (constructive sampler, seed 1). */
import { mulberry32, trySampleFeasible } from '../src/synthesis/seeding';
import { evaluateDesign } from '../src/synthesis/objective';
import { defaultSpec, paramLayout } from '../src/mechanism/spec';

const dyads = Number(process.argv[2] ?? 3);
const spec = defaultSpec(dyads);
const layout = paramLayout(spec);
const rng = mulberry32(1);

let chosen: number[] | null = null;
for (let i = 0; i < 400 && !chosen; i++) {
  const x = trySampleFeasible(spec, rng);
  if (!x) continue;
  const m = evaluateDesign(x, { level: 'fine', spec, computeGravity: true });
  if (m.valid && m.fullRotation && m.assemblyJumps === 0) chosen = x;
}
if (!chosen) throw new Error('no seed found');

const m = evaluateDesign(chosen, { level: 'fine', spec, computeSigma: true, computeGravity: true });
layout.forEach((p, i) => console.log(`  ${chosen![i].toFixed(4)}, // ${p.label}`));
console.log('// dyads=', dyads, 'links=', 2 + 2 * dyads);
console.log('// J=', m.J.toFixed(4), 'RMS=', m.match.chamferRms.toFixed(2), 'bbox=', m.width.toFixed(1), 'x', m.height.toFixed(1));
console.log('// muEff=', m.effectiveTransmissionAngle.toFixed(2), 'layers=', m.layerCount, 'valid=', m.validFrames + '/' + m.frames);
console.log('// loopErr=', m.maxLoopClosureError.toExponential(2), 'pathClosure=', m.pathClosure.toExponential(2), 'tau=', m.peakGravityTorque.toFixed(4));
