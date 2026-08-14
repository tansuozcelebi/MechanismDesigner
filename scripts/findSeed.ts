/**
 * Sanity harness: verify that the constructive sampler really produces
 * mechanisms that complete a full revolution, and report the raw statistics.
 * Run with:  npm run seed
 */
import { arrayToDesign, buildGeometry, lengthViolation } from '../src/mechanism/mechanism';
import { sweep } from '../src/kinematics/forwardSolver';
import { TOPOLOGY } from '../src/mechanism/topology';
import { mulberry32, trySampleFeasible } from '../src/synthesis/seeding';
import { evaluateDesign } from '../src/synthesis/objective';
import { boundingBox } from '../src/synthesis/heartCurve';

const rng = mulberry32(12345);

console.log('Mobility =', TOPOLOGY.mobility);
console.log('Independent loops =', TOPOLOGY.loopCount);

const N = 400;
let sampled = 0;
let lengthOk = 0;
let fullRot = 0;
let valid = 0;
let bestJ = Infinity;
let bestX: number[] | null = null;
const widths: number[] = [];

const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const x = trySampleFeasible(rng);
  if (!x) continue;
  sampled++;
  const geo = buildGeometry(arrayToDesign(x));
  if (lengthViolation(geo) > 0) continue;
  lengthOk++;
  const sw = sweep(geo, 180, { computeSigma: false });
  if (!sw.fullRotation) continue;
  fullRot++;
  const m = evaluateDesign(x, { level: 'coarse', computeGravity: false });
  if (!m.valid) continue;
  valid++;
  widths.push(Math.max(m.width, m.height));
  if (m.J < bestJ) {
    bestJ = m.J;
    bestX = x;
  }
}
const dt = Date.now() - t0;

console.log(`\nAttempted ${N} constructive draws in ${dt} ms`);
console.log(`  sampler returned a design : ${sampled}`);
console.log(`  all members in [50,200]   : ${lengthOk}`);
console.log(`  completed full 360 deg    : ${fullRot}`);
console.log(`  fully valid (scored)      : ${valid}`);
if (widths.length) {
  widths.sort((a, b) => a - b);
  console.log(
    `  LED path max extent (mm): min ${widths[0].toFixed(1)}, median ${widths[
      Math.floor(widths.length / 2)
    ].toFixed(1)}, max ${widths[widths.length - 1].toFixed(1)}`,
  );
}

if (bestX) {
  const m = evaluateDesign(bestX, { level: 'fine', computeGravity: true });
  const bb = boundingBox(m.ledPath);
  console.log('\nBest random seed:');
  console.log('  J                    =', m.J.toFixed(4));
  console.log('  chamfer RMS          =', m.match.chamferRms.toFixed(3), 'mm');
  console.log('  bbox                 =', bb.width.toFixed(1), 'x', bb.height.toFixed(1), 'mm');
  console.log('  max loop closure err =', m.maxLoopClosureError.toExponential(3), 'mm');
  console.log('  path closure         =', m.pathClosure.toExponential(3), 'mm');
  console.log('  min transmission ang =', m.minTransmissionAngle.toFixed(2), 'deg');
  console.log('  collision frames     =', m.collisionFrames);
  console.log('  peak gravity torque  =', m.peakGravityTorque.toFixed(4), 'N.m');
  console.log('  design               =', JSON.stringify(bestX.map((v) => +v.toFixed(3))));
}
