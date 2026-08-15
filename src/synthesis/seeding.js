import { CONFIG } from '../mechanism/config';
import { DESIGN_KEYS } from '../mechanism/types';
import { BOUNDS } from '../mechanism/mechanism';
import { circleCircleIntersectionEx, degToRad, dist, localPoint, thirdSide, v2, } from '../utils/math';
/** Deterministic RNG so every reported result is reproducible from its seed. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const uniform = (rng, lo, hi) => lo + rng() * (hi - lo);
/**
 * Constructive sampler for designs that assemble through a full revolution.
 *
 * Purely random 15-vectors almost never produce a chain in which all three RRR
 * dyads stay assemblable for 360 degrees, so the global search would spend its
 * whole budget in the infeasible band.  Instead each dyad is built to fit the
 * motion it must actually follow:
 *
 *   1. Dyad I is forced to be a Grashof crank-rocker so the 50 mm crank can
 *      make complete revolutions.
 *   2. The driving point of dyad II (joint C) is swept over a full turn, its
 *      distance to O6 measured, and |CE| / |O6E| chosen so the triangle
 *      inequality holds with margin at every angle.
 *   3. The same is done for dyad III, using the D and G trajectories that
 *      follow from the first two dyads.
 *
 * The margin is what keeps the dyad away from tangency, which is precisely the
 * condition that would otherwise cause an assembly-mode jump.
 */
/**
 * Minimum transmission angle the sampler aims for, in degrees.  Set slightly
 * above the 40 deg hard limit of brief §18 so that the optimiser has somewhere
 * to move without immediately falling through the floor.
 */
const SEED_MU_MIN = 45;
/**
 * Dyad I cannot do better than ~44.75 deg with the fixed 120 mm frame and
 * 50 mm crank, so it gets its own slightly looser target.
 */
const DYAD1_MU_MIN = 41;
const PROBE = 120; // angles used while constructing
/**
 * Exact transmission-angle test for an RRR dyad.
 *
 * For a dyad with member lengths r0, r1 whose end points are a distance d
 * apart, the angle at the intermediate joint satisfies
 *     cos(mu) = (r0^2 + r1^2 - d^2) / (2 r0 r1).
 * Requiring muMin <= mu <= 180 - muMin over the whole cycle is therefore just
 * two inequalities on d^2, checked at the extremes of d.  This replaces a
 * linear "stay away from the dead point" margin, which does not control mu at
 * all when the two members have very different lengths.
 */
export function dyadTransmissionOk(r0, r1, dmin, dmax, muMin = SEED_MU_MIN) {
    const c = Math.cos(degToRad(muMin));
    const sumSq = r0 * r0 + r1 * r1;
    const prod = 2 * r0 * r1 * c;
    // mu >= muMin at the far extreme, mu <= 180-muMin at the near extreme.
    return dmax * dmax <= sumSq + prod && dmin * dmin >= sumSq - prod;
}
/** Worst (folded) transmission angle of a dyad over d in [dmin, dmax], degrees. */
export function dyadWorstMu(r0, r1, dmin, dmax) {
    const muAt = (d) => {
        const c = (r0 * r0 + r1 * r1 - d * d) / (2 * r0 * r1);
        const mu = Math.acos(Math.max(-1, Math.min(1, c)));
        return Math.min(mu, Math.PI - mu);
    };
    return (Math.min(muAt(dmin), muAt(dmax)) * 180) / Math.PI;
}
/**
 * Given one member length, the admissible interval for the other follows in
 * closed form.  Writing c = cos(muMin), the two conditions
 *     r0^2 + r1^2 + 2 r0 r1 c >= dmax^2      (mu >= muMin at the far extreme)
 *     r0^2 + r1^2 - 2 r0 r1 c <= dmin^2      (mu <= 180-muMin at the near one)
 * are quadratics in r1, so the feasible set is an interval.  Sampling from it
 * directly matters: for dyad I that interval is only a few millimetres wide,
 * and rejection sampling would essentially never find it.
 */
export function partnerLengthInterval(r0, dmin, dmax, muMin = SEED_MU_MIN) {
    const c = Math.cos(degToRad(muMin));
    const k = r0 * r0 * (c * c - 1);
    // Condition (1): r1 >= -r0 c + sqrt(k + dmax^2), vacuous if the root is imaginary.
    const disc1 = k + dmax * dmax;
    const lo1 = disc1 <= 0 ? 0 : -r0 * c + Math.sqrt(disc1);
    // Condition (2): r1 in [r0 c - sqrt(k + dmin^2), r0 c + sqrt(k + dmin^2)].
    const disc2 = k + dmin * dmin;
    if (disc2 < 0)
        return null;
    const s2 = Math.sqrt(disc2);
    const lo2 = r0 * c - s2;
    const hi2 = r0 * c + s2;
    const lo = Math.max(CONFIG.Lmin, lo1, lo2);
    const hi = Math.min(CONFIG.Lmax, hi2);
    return hi > lo ? [lo, hi] : null;
}
function chooseDyadLengths(rng, range, muMin = SEED_MU_MIN) {
    for (let attempt = 0; attempt < 40; attempt++) {
        const r0 = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        const iv = partnerLengthInterval(r0, range.min, range.max, muMin);
        if (!iv)
            continue;
        const r1 = uniform(rng, iv[0], iv[1]);
        if (dyadTransmissionOk(r0, r1, range.min, range.max, muMin))
            return [r0, r1];
    }
    return null;
}
/**
 * Dyad I admissibility.  The crank forces |A O4| to sweep the full band
 * [O2O4 - crank, O2O4 + crank] = [70, 170] mm every revolution, so both the
 * Grashof condition and the transmission-angle bound can be checked in closed
 * form without simulating anything.
 */
export function isCrankRocker(lAB, lO4B, muMin = SEED_MU_MIN) {
    const s = CONFIG.crankLength; // 50 — must be the shortest for full rotation
    const others = [CONFIG.O2O4, lAB, lO4B];
    if (Math.min(...others) <= s)
        return false;
    const l = Math.max(...others);
    const sum = others.reduce((acc, v) => acc + v, 0) - l;
    if (s + l >= sum)
        return false; // Grashof
    const dmin = CONFIG.O2O4 - s;
    const dmax = CONFIG.O2O4 + s;
    return dyadTransmissionOk(lAB, lO4B, dmin, dmax, muMin);
}
export function trySampleFeasible(rng) {
    const O2 = v2(CONFIG.O2.x, CONFIG.O2.y);
    const O4 = v2(O2.x + CONFIG.O2O4, O2.y);
    // ---- Dyad I: Grashof crank-rocker -------------------------------------
    // |A O4| sweeps exactly [O2O4 - crank, O2O4 + crank] every revolution, which
    // caps the achievable transmission angle of this dyad at ~44.75 deg (see
    // partnerLengthInterval).  Sample the narrow admissible band directly.
    const d1min = CONFIG.O2O4 - CONFIG.crankLength;
    const d1max = CONFIG.O2O4 + CONFIG.crankLength;
    let lAB = 0;
    let lO4B = 0;
    let ok = false;
    for (let i = 0; i < 80 && !ok; i++) {
        lAB = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        const iv = partnerLengthInterval(lAB, d1min, d1max, DYAD1_MU_MIN);
        if (!iv)
            continue;
        lO4B = uniform(rng, iv[0], iv[1]);
        ok = isCrankRocker(lAB, lO4B, DYAD1_MU_MIN);
    }
    if (!ok)
        return null;
    // ---- Ternary geometry of links 3 and 4 --------------------------------
    let c3r = 0;
    let c3a = 0;
    ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
        c3r = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        c3a = uniform(rng, -180, 180);
        const bc = thirdSide(lAB, c3r, degToRad(c3a));
        ok = bc >= CONFIG.Lmin && bc <= CONFIG.Lmax;
    }
    if (!ok)
        return null;
    let d4r = 0;
    let d4a = 0;
    ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
        d4r = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        d4a = uniform(rng, -180, 180);
        const bd = thirdSide(lO4B, d4r, degToRad(d4a));
        ok = bd >= CONFIG.Lmin && bd <= CONFIG.Lmax;
    }
    if (!ok)
        return null;
    const phi6 = uniform(rng, BOUNDS.phi6[0], BOUNDS.phi6[1]);
    const p6 = degToRad(phi6);
    const O6 = v2(O4.x + CONFIG.O4O6 * Math.cos(p6), O4.y + CONFIG.O4O6 * Math.sin(p6));
    // ---- Sweep dyad I to obtain the C and D trajectories -------------------
    const Cs = [];
    const Ds = [];
    let prevB = null;
    for (let i = 0; i < PROBE; i++) {
        const th = (2 * Math.PI * i) / PROBE;
        const A = v2(O2.x + CONFIG.crankLength * Math.cos(th), O2.y + CONFIG.crankLength * Math.sin(th));
        const r = circleCircleIntersectionEx(A, lAB, O4, lO4B);
        if (r.points === null)
            return null;
        const B = prevB === null
            ? r.points[0]
            : dist(r.points[0], prevB) <= dist(r.points[1], prevB)
                ? r.points[0]
                : r.points[1];
        prevB = B;
        Cs.push(localPoint(A, B, c3r, degToRad(c3a)));
        Ds.push(localPoint(O4, B, d4r, degToRad(d4a)));
    }
    // ---- Dyad II lengths fitted to |C - O6| -------------------------------
    const rCO6 = { min: Infinity, max: -Infinity };
    for (const C of Cs) {
        const d = dist(C, O6);
        rCO6.min = Math.min(rCO6.min, d);
        rCO6.max = Math.max(rCO6.max, d);
    }
    const dyad2 = chooseDyadLengths(rng, rCO6);
    if (!dyad2)
        return null;
    const [lCE, lO6E] = dyad2;
    // ---- Link 6 ternary geometry ------------------------------------------
    let g6r = 0;
    let g6a = 0;
    ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
        g6r = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        g6a = uniform(rng, -180, 180);
        const eg = thirdSide(lO6E, g6r, degToRad(g6a));
        ok = eg >= CONFIG.Lmin && eg <= CONFIG.Lmax;
    }
    if (!ok)
        return null;
    // ---- Sweep dyad II to obtain the G trajectory --------------------------
    const Gs = [];
    let prevE = null;
    for (let i = 0; i < PROBE; i++) {
        const r = circleCircleIntersectionEx(Cs[i], lCE, O6, lO6E);
        if (r.points === null)
            return null;
        const E = prevE === null
            ? r.points[0]
            : dist(r.points[0], prevE) <= dist(r.points[1], prevE)
                ? r.points[0]
                : r.points[1];
        prevE = E;
        Gs.push(localPoint(O6, E, g6r, degToRad(g6a)));
    }
    // ---- Dyad III lengths fitted to |D - G| -------------------------------
    const rDG = { min: Infinity, max: -Infinity };
    for (let i = 0; i < PROBE; i++) {
        const d = dist(Ds[i], Gs[i]);
        rDG.min = Math.min(rDG.min, d);
        rDG.max = Math.max(rDG.max, d);
    }
    const dyad3 = chooseDyadLengths(rng, rDG);
    if (!dyad3)
        return null;
    const [lDF, lGF] = dyad3;
    // ---- LED extension on link 8 -------------------------------------------
    let p8r = 0;
    let p8a = 0;
    ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
        p8r = uniform(rng, CONFIG.Lmin, CONFIG.Lmax);
        p8a = uniform(rng, -180, 180);
        const fp = thirdSide(lGF, p8r, degToRad(p8a));
        ok = fp >= CONFIG.Lmin && fp <= CONFIG.Lmax;
    }
    if (!ok)
        return null;
    const values = {
        phi6,
        lAB,
        c3r,
        c3a,
        lO4B,
        d4r,
        d4a,
        lCE,
        lO6E,
        g6r,
        g6a,
        lDF,
        lGF,
        p8r,
        p8a,
    };
    return DESIGN_KEYS.map((k) => values[k]);
}
/**
 * Repair (project) a mutated design back onto the feasible dyad geometry.
 *
 * Differential Evolution mixes coordinates blindly, which reliably destroys the
 * relationship the sampler established between a dyad's member lengths and the
 * trajectory its driving point actually follows — so most offspring land in the
 * infeasible band and the search stalls.  This is a Lamarckian repair: the
 * driving trajectories are recomputed, and only the two lengths of each
 * downstream dyad are clamped into their admissible interval.  Every other
 * coordinate is left exactly as DE produced it, so exploration is preserved.
 *
 * Returns the (possibly modified) vector, or null when even the input dyad
 * cannot be salvaged.
 */
export function repairDesign(x, muMin = 40) {
    const idx = (k) => DESIGN_KEYS.indexOf(k);
    const out = x.slice();
    const lAB = out[idx('lAB')];
    const lO4B = out[idx('lO4B')];
    if (!isCrankRocker(lAB, lO4B, Math.min(muMin, DYAD1_MU_MIN)))
        return null;
    const O2 = v2(CONFIG.O2.x, CONFIG.O2.y);
    const O4 = v2(O2.x + CONFIG.O2O4, O2.y);
    const p6 = degToRad(out[idx('phi6')]);
    const O6 = v2(O4.x + CONFIG.O4O6 * Math.cos(p6), O4.y + CONFIG.O4O6 * Math.sin(p6));
    const c3r = out[idx('c3r')];
    const c3a = degToRad(out[idx('c3a')]);
    const d4r = out[idx('d4r')];
    const d4a = degToRad(out[idx('d4a')]);
    const N = 60;
    const Cs = [];
    const Ds = [];
    let prevB = null;
    for (let i = 0; i < N; i++) {
        const th = (2 * Math.PI * i) / N;
        const A = v2(O2.x + CONFIG.crankLength * Math.cos(th), O2.y + CONFIG.crankLength * Math.sin(th));
        const r = circleCircleIntersectionEx(A, lAB, O4, lO4B);
        if (r.points === null)
            return null;
        const B = prevB === null
            ? r.points[0]
            : dist(r.points[0], prevB) <= dist(r.points[1], prevB)
                ? r.points[0]
                : r.points[1];
        prevB = B;
        Cs.push(localPoint(A, B, c3r, c3a));
        Ds.push(localPoint(O4, B, d4r, d4a));
    }
    // --- Dyad II ------------------------------------------------------------
    let dmin = Infinity;
    let dmax = -Infinity;
    for (const C of Cs) {
        const d = dist(C, O6);
        if (d < dmin)
            dmin = d;
        if (d > dmax)
            dmax = d;
    }
    const iv2 = partnerLengthInterval(out[idx('lCE')], dmin, dmax, muMin);
    if (!iv2)
        return null;
    out[idx('lO6E')] = Math.min(iv2[1], Math.max(iv2[0], out[idx('lO6E')]));
    const lO6E = out[idx('lO6E')];
    const g6r = out[idx('g6r')];
    const g6a = degToRad(out[idx('g6a')]);
    const Gs = [];
    let prevE = null;
    for (let i = 0; i < N; i++) {
        const r = circleCircleIntersectionEx(Cs[i], out[idx('lCE')], O6, lO6E);
        if (r.points === null)
            return null;
        const E = prevE === null
            ? r.points[0]
            : dist(r.points[0], prevE) <= dist(r.points[1], prevE)
                ? r.points[0]
                : r.points[1];
        prevE = E;
        Gs.push(localPoint(O6, E, g6r, g6a));
    }
    // --- Dyad III -----------------------------------------------------------
    dmin = Infinity;
    dmax = -Infinity;
    for (let i = 0; i < N; i++) {
        const d = dist(Ds[i], Gs[i]);
        if (d < dmin)
            dmin = d;
        if (d > dmax)
            dmax = d;
    }
    const iv3 = partnerLengthInterval(out[idx('lDF')], dmin, dmax, muMin);
    if (!iv3)
        return null;
    out[idx('lGF')] = Math.min(iv3[1], Math.max(iv3[0], out[idx('lGF')]));
    return out;
}
/** Draw `count` constructively feasible designs (best effort). */
export function sampleFeasiblePopulation(count, rng, maxAttempts = 400) {
    const out = [];
    let attempts = 0;
    while (out.length < count && attempts < count * maxAttempts) {
        attempts++;
        const c = trySampleFeasible(rng);
        if (c)
            out.push(c);
    }
    return out;
}
