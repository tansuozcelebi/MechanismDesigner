/**
 * Sanity harness: verify that the constructive sampler really produces
 * mechanisms that complete a full revolution, at any size.
 *   npm run seed [dyads]
 */
import { buildGeometry, lengthViolation } from '../src/mechanism/mechanism';
import { sweep } from '../src/kinematics/forwardSolver';
import { defaultSpec, linkCount, paramLayout } from '../src/mechanism/spec';
import { topologyOf } from '../src/mechanism/topology';
import { mulberry32, trySampleFeasible } from '../src/synthesis/seeding';
import { evaluateDesign } from '../src/synthesis/objective';

const only = process.argv[2] ? [Number(process.argv[2])] : [1, 2, 3, 4, 5];
const N = Number(process.argv[3] ?? 200);

for (const dyads of only) {
  const spec = defaultSpec(dyads);
  const topo = topologyOf(spec);
  const rng = mulberry32(12345);

  let sampled = 0;
  let lengthOk = 0;
  let fullRot = 0;
  let valid = 0;
  const extents: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < N; i++) {
    const x = trySampleFeasible(spec, rng);
    if (!x) continue;
    sampled++;
    const geo = buildGeometry(spec, x);
    if (lengthViolation(geo) > 0) continue;
    lengthOk++;
    const sw = sweep(geo, 180, { computeSigma: false });
    if (!sw.fullRotation) continue;
    fullRot++;
    const m = evaluateDesign(x, { level: 'coarse', spec, computeGravity: false });
    if (!m.valid) continue;
    valid++;
    extents.push(Math.max(m.width, m.height));
  }

  extents.sort((a, b) => a - b);
  const median = extents.length ? extents[Math.floor(extents.length / 2)] : NaN;
  console.log(
    `dyads=${dyads} links=${linkCount(spec)} params=${paramLayout(spec).length} M=${topo.mobility} | ` +
      `drew ${sampled}/${N}, lengths ok ${lengthOk}, full 360° ${fullRot}, valid ${valid} | ` +
      `median LED extent ${Number.isFinite(median) ? median.toFixed(0) : '—'} mm | ${Date.now() - t0} ms`,
  );
}
