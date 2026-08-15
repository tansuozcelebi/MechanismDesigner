import { CONFIG } from '../mechanism/config';
import { buildGeometry, type Geometry } from '../mechanism/mechanism';
import { paramLayout, usedExtras, type MechanismSpec, type ParamSpec } from '../mechanism/spec';
import { solvePose } from '../kinematics/forwardSolver';
import { degToRad, dist, thirdSide } from '../utils/math';

/** Deterministic RNG so every reported result is reproducible from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const uniform = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);

/**
 * Minimum transmission angle the sampler aims for.  Slightly above the 40°
 * engineering limit so the optimiser has somewhere to move without immediately
 * falling through the floor.
 */
const SEED_MU_MIN = 45;
/**
 * The input dyad is capped by the frame itself and cannot reach 45°, so it gets
 * its own target — see `partnerLengthInterval` for the derivation.
 */
const DYAD1_MU_MIN = 41;
const PROBE = 90;

/**
 * Exact transmission-angle test for an RRR dyad.
 *
 * With member lengths r0, r1 and anchor separation d,
 *     cos(mu) = (r0² + r1² − d²) / (2 r0 r1),
 * so holding muMin ≤ mu ≤ 180 − muMin across a whole cycle is two inequalities
 * on d², checked at the extremes of d.  This replaces a linear "stay away from
 * the dead point" margin, which does not control mu at all when the two members
 * have very different lengths.
 */
export function dyadTransmissionOk(
  r0: number,
  r1: number,
  dmin: number,
  dmax: number,
  muMin = SEED_MU_MIN,
): boolean {
  const c = Math.cos(degToRad(muMin));
  const sumSq = r0 * r0 + r1 * r1;
  const prod = 2 * r0 * r1 * c;
  return dmax * dmax <= sumSq + prod && dmin * dmin >= sumSq - prod;
}

/**
 * Given one member length, the admissible interval for the other follows in
 * closed form.  Writing c = cos(muMin), the two conditions are quadratics in
 * r1, so the feasible set is an interval.  Sampling it directly matters: for
 * the input dyad that interval is only a few millimetres wide (the crank forces
 * |A·anchorB| across a fixed band every revolution, which caps that dyad's
 * transmission angle), and rejection sampling would essentially never find it.
 */
export function partnerLengthInterval(
  r0: number,
  dmin: number,
  dmax: number,
  muMin = SEED_MU_MIN,
): [number, number] | null {
  const c = Math.cos(degToRad(muMin));
  const k = r0 * r0 * (c * c - 1);

  const disc1 = k + dmax * dmax;
  const lo1 = disc1 <= 0 ? 0 : -r0 * c + Math.sqrt(disc1);

  const disc2 = k + dmin * dmin;
  if (disc2 < 0) return null;
  const s2 = Math.sqrt(disc2);

  const lo = Math.max(CONFIG.Lmin, lo1, r0 * c - s2);
  const hi = Math.min(CONFIG.Lmax, r0 * c + s2);
  return hi > lo ? [lo, hi] : null;
}

/** Pick a length pair whose transmission angle stays acceptable over a band. */
function chooseDyadLengths(
  rng: () => number,
  dmin: number,
  dmax: number,
  muMin: number,
): [number, number] | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const r0 = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
    const iv = partnerLengthInterval(r0, dmin, dmax, muMin);
    if (!iv) continue;
    const r1 = uniform(rng, iv[0], iv[1]);
    if (dyadTransmissionOk(r0, r1, dmin, dmax, muMin)) return [r0, r1];
  }
  return null;
}

/** Grashof + transmission test for the crank-driven first dyad. */
export function isCrankRocker(lA: number, lB: number, muMin = DYAD1_MU_MIN): boolean {
  const s = CONFIG.crankLength;
  const others = [CONFIG.O2O4, lA, lB];
  if (Math.min(...others) <= s) return false;
  const l = Math.max(...others);
  const sum = others.reduce((acc, v) => acc + v, 0) - l;
  if (s + l >= sum) return false;
  return dyadTransmissionOk(lA, lB, CONFIG.O2O4 - s, CONFIG.O2O4 + s, muMin);
}

/**
 * Constructive sampler for designs that assemble through a full revolution.
 *
 * Purely random parameter vectors almost never produce a chain in which every
 * dyad stays assemblable for 360°, so a global search would spend its whole
 * budget in the infeasible band.  Instead the chain is grown one dyad at a
 * time: after each dyad is fixed, the partial mechanism is actually swept, the
 * real travel of the next dyad's anchors is measured, and that dyad's member
 * lengths are chosen to fit the motion they must follow.  Working from the
 * measured band — rather than a guess — is what keeps the success rate high as
 * the mechanism grows.
 */
export function trySampleFeasible(spec: MechanismSpec, rng: () => number): number[] | null {
  const layout = paramLayout(spec);
  const x = new Array<number>(layout.length).fill(0);
  const idx = new Map(layout.map((p, i) => [p.key, i] as const));
  const set = (key: string, v: number) => {
    const i = idx.get(key);
    if (i !== undefined) x[i] = v;
  };
  const has = (key: string) => idx.has(key);

  // Ground pivot headings: keep the frame open so the chain has room.
  for (let g = 2; g < spec.groundPivots; g++) set(`g${g}.phi`, uniform(rng, -150, 150));

  for (let k = 0; k < spec.dyads.length; k++) {
    const muMin = k === 0 ? DYAD1_MU_MIN : SEED_MU_MIN;

    if (k === 0) {
      let ok = false;
      for (let i = 0; i < 80 && !ok; i++) {
        const lA = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        const iv = partnerLengthInterval(
          lA,
          CONFIG.O2O4 - CONFIG.crankLength,
          CONFIG.O2O4 + CONFIG.crankLength,
          muMin,
        );
        if (!iv) continue;
        const lB = uniform(rng, iv[0], iv[1]);
        if (!isCrankRocker(lA, lB, muMin)) continue;
        set('d0.lenA', lA);
        set('d0.lenB', lB);
        ok = true;
      }
      if (!ok) return null;
    } else {
      // Measure how far this dyad's two anchors actually travel apart, using
      // the chain built so far.
      const band = anchorBand(spec, x, k);
      if (!band) return null;
      const lens = chooseDyadLengths(rng, band.min, band.max, muMin);
      if (!lens) return null;
      set(`d${k}.lenA`, lens[0]);
      set(`d${k}.lenB`, lens[1]);
    }

    // Rigid third points, kept inside the printable length band.
    for (const side of ['A', 'B'] as const) {
      if (!has(`d${k}.extra${side}.r`)) continue;
      const base = x[idx.get(`d${k}.len${side}`)!];
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        const r = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        const a = uniform(rng, -180, 180);
        const third = thirdSide(base, r, degToRad(a));
        if (third < CONFIG.Lmin || third > CONFIG.Lmax) continue;
        set(`d${k}.extra${side}.r`, r);
        set(`d${k}.extra${side}.a`, a);
        ok = true;
      }
      if (!ok) return null;
    }
  }

  return x;
}

/**
 * Sweep the partially built chain and measure the separation band of dyad `k`'s
 * anchors.  Only the dyads before `k` are needed, and they are already fixed in
 * `x`, so this is exact rather than an estimate.
 */
function anchorBand(
  spec: MechanismSpec,
  x: number[],
  k: number,
): { min: number; max: number } | null {
  // Keep every attachment point the full chain uses, so the truncated spec's
  // parameter layout still lines up with the full one key for key.
  const partial: MechanismSpec = {
    ...spec,
    dyads: spec.dyads.slice(0, k),
    led: { dyad: k - 1, side: 'B' },
    forceExtras: [...usedExtras(spec)],
  };
  let geo: Geometry;
  try {
    geo = buildGeometry(partial, projectParams(spec, partial, x));
  } catch {
    return null;
  }

  const aRef = spec.dyads[k].a;
  const bRef = spec.dyads[k].b;
  const aId = refId(aRef);
  const bId = refId(bRef);

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < PROBE; i++) {
    const r = solvePose(geo, (2 * Math.PI * i) / PROBE, null, { computeSigma: false });
    if (!r.ok) return null;
    const pa = r.points[aId];
    const pb = r.points[bId];
    if (!pa || !pb) return null;
    const d = dist(pa, pb);
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

function refId(ref: { kind: string; index?: number; dyad?: number; side?: string }): string {
  if (ref.kind === 'crankTip') return 'A';
  if (ref.kind === 'ground') return `G${ref.index}`;
  return `E${ref.dyad}${ref.side}`;
}

/** Copy the parameters that the truncated spec still needs, by layout key. */
function projectParams(full: MechanismSpec, partial: MechanismSpec, x: number[]): number[] {
  const fullLayout = paramLayout(full);
  const byKey = new Map(fullLayout.map((p, i) => [p.key, x[i]] as const));
  return paramLayout(partial).map((p: ParamSpec) => byKey.get(p.key) ?? CONFIG.Lmin);
}

/** Draw `count` constructively feasible designs (best effort). */
export function sampleFeasiblePopulation(
  spec: MechanismSpec,
  count: number,
  rng: () => number,
  maxAttemptsPer = 60,
): number[][] {
  const out: number[][] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * maxAttemptsPer) {
    attempts++;
    const c = trySampleFeasible(spec, rng);
    if (c) out.push(c);
  }
  return out;
}

/**
 * Repair (project) a mutated design back onto feasible dyad geometry.
 *
 * Used only as a rescue for offspring that failed to assemble: projecting every
 * offspring pins coordinates to their interval bounds and measurably stalls the
 * search.  Only the two member lengths of each downstream dyad are clamped;
 * every other coordinate is left exactly as the optimiser produced it.
 */
export function repairDesign(spec: MechanismSpec, x: number[], muMin = 38): number[] | null {
  const layout = paramLayout(spec);
  const idx = new Map(layout.map((p, i) => [p.key, i] as const));
  const out = x.slice();

  const iA0 = idx.get('d0.lenA');
  const iB0 = idx.get('d0.lenB');
  if (iA0 === undefined || iB0 === undefined) return null;
  if (!isCrankRocker(out[iA0], out[iB0], Math.min(muMin, DYAD1_MU_MIN))) return null;

  for (let k = 1; k < spec.dyads.length; k++) {
    const band = anchorBand(spec, out, k);
    if (!band) return null;
    const iA = idx.get(`d${k}.lenA`)!;
    const iB = idx.get(`d${k}.lenB`)!;
    const iv = partnerLengthInterval(out[iA], band.min, band.max, muMin);
    if (!iv) return null;
    out[iB] = Math.min(iv[1], Math.max(iv[0], out[iB]));
  }
  return out;
}
