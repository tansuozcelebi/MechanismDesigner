/** Emits the deterministic INITIAL GUESS design (constructive sampler, seed 1). */
import { mulberry32, trySampleFeasible } from '../src/synthesis/seeding';
import { evaluateDesign } from '../src/synthesis/objective';
import { DESIGN_KEYS } from '../src/mechanism/types';

const rng = mulberry32(1);
let chosen: number[] | null = null;
for (let i = 0; i < 200 && !chosen; i++) {
  const x = trySampleFeasible(rng);
  if (!x) continue;
  const m = evaluateDesign(x, { level: 'fine', computeGravity: true });
  if (m.valid && m.fullRotation && m.assemblyJumps === 0) chosen = x;
}
if (!chosen) throw new Error('no seed found');
const m = evaluateDesign(chosen, { level: 'fine', computeSigma: true, computeGravity: true });
DESIGN_KEYS.forEach((k, i) => console.log(`  ${k}: ${chosen![i].toFixed(4)},`));
console.log('// J=', m.J.toFixed(4), 'RMS=', m.match.chamferRms.toFixed(2), 'bbox=', m.width.toFixed(1), 'x', m.height.toFixed(1));
console.log('// muEff=', m.effectiveTransmissionAngle.toFixed(2), 'layers=', m.layerCount, 'valid=', m.validFrames + '/' + m.frames);
console.log('// loopErr=', m.maxLoopClosureError.toExponential(2), 'pathClosure=', m.pathClosure.toExponential(2), 'tau=', m.peakGravityTorque.toFixed(4));
