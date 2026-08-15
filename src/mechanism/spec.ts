import { CONFIG } from './config';

/**
 * Generalised mechanism topology.
 *
 * The whole family is "one crank driven at O2, plus N RRR Assur dyads solved in
 * series".  That structure is what makes a variable link count safe rather than
 * a guess: an RRR dyad is a zero-mobility Assur group, so attaching one to an
 * already-assembled chain cannot change the degree of freedom.  Concretely, with
 * N dyads the chain has
 *
 *     n = 2 + 2N links      (ground + crank + two bars per dyad)
 *     j = 1 + 3N joints     (O2 + three revolute pairs per dyad)
 *     M = 3(n − 1) − 2j = 3(1 + 2N) − 2(1 + 3N) = 1        for every N
 *
 * so **every mechanism in this family is 1-DOF by construction**, and the app
 * can offer 4, 6, 8, 10 … bars without ever producing an invalid chain.  N = 3
 * reproduces the original 8-bar exactly, including its design-vector layout.
 *
 * Each dyad is anchored at two points that must already be known when it is
 * solved: the crank tip, a ground pivot, or a rigid "extra" point carried by an
 * earlier dyad's bar.  Its unknown joint then follows from one circle-circle
 * intersection, so the solver stays closed-form at any size.
 */

/** A point that a dyad can be anchored to. Must resolve before the dyad solves. */
export type PointRef =
  | { kind: 'crankTip' }
  | { kind: 'ground'; index: number }
  /** The rigid extra point carried by bar `side` of dyad `dyad` (0-based). */
  | { kind: 'extra'; dyad: number; side: 'A' | 'B' };

export type DyadSpec = {
  /** First anchor — always a moving point (crank tip or an earlier extra point). */
  a: PointRef;
  /** Second anchor — a ground pivot, or another earlier point. */
  b: PointRef;
};

export type MechanismSpec = {
  /** Number of RRR dyads. Link count is 2 + 2N. */
  dyads: DyadSpec[];
  /** Ground pivots, including O2. G0 = O2 at the origin, G1 at (O2O4, 0). */
  groundPivots: number;
  /** Which extra point carries the LED. */
  led: { dyad: number; side: 'A' | 'B' };
  /**
   * Display names. Supplied for the canonical 8-bar so the UI keeps the
   * O2/O4/O6 · A…G lettering used throughout the brief and the README.
   */
  labels?: Record<string, string>;
  /**
   * Extra points to keep even though nothing in THIS spec references them.
   * Used when a chain is truncated for analysis: the shortened spec must still
   * carry the attachment points the full mechanism needs, or its parameter
   * layout would not line up with the full one.
   */
  forceExtras?: string[];
};

export const linkCount = (spec: MechanismSpec): number => 2 + 2 * spec.dyads.length;
export const jointCount = (spec: MechanismSpec): number => 1 + 3 * spec.dyads.length;

/** Grübler–Kutzbach. Provably 1 for this family; computed rather than asserted. */
export const mobility = (spec: MechanismSpec): number =>
  3 * (linkCount(spec) - 1) - 2 * jointCount(spec);

export const loopCount = (spec: MechanismSpec): number =>
  jointCount(spec) - linkCount(spec) + 1;

/* ------------------------------------------------------------------ */
/* Identity of parts                                                    */
/* ------------------------------------------------------------------ */

/** Stable id for the bar `side` of dyad `k`: 'd0A', 'd0B', 'd1A', … */
export const barId = (dyad: number, side: 'A' | 'B'): string => `d${dyad}${side}`;
export const CRANK_ID = 'crank';
export const GROUND_ID = 'ground';

/** Stable id for the unknown joint of dyad `k`. */
export const dyadJointId = (dyad: number): string => `J${dyad}`;
export const groundJointId = (index: number): string => `G${index}`;
export const CRANK_TIP_ID = 'A';
export const extraId = (dyad: number, side: 'A' | 'B'): string => `E${dyad}${side}`;
export const LED_ID = 'P_LED';

export function pointRefId(ref: PointRef): string {
  switch (ref.kind) {
    case 'crankTip':
      return CRANK_TIP_ID;
    case 'ground':
      return groundJointId(ref.index);
    case 'extra':
      return extraId(ref.dyad, ref.side);
  }
}

/* ------------------------------------------------------------------ */
/* Which extra points actually matter                                   */
/* ------------------------------------------------------------------ */

/**
 * An extra point costs two design variables, so only include the ones something
 * actually references (a later dyad's anchor, or the LED).  This is what keeps
 * the canonical 8-bar at exactly 15 parameters instead of 19 — the two binary
 * connecting bars genuinely carry no third point.
 */
export function usedExtras(spec: MechanismSpec): Set<string> {
  const used = new Set<string>();
  for (const d of spec.dyads) {
    for (const ref of [d.a, d.b]) {
      if (ref.kind === 'extra') used.add(extraId(ref.dyad, ref.side));
    }
  }
  used.add(extraId(spec.led.dyad, spec.led.side));
  for (const id of spec.forceExtras ?? []) used.add(id);
  return used;
}

/* ------------------------------------------------------------------ */
/* Design-vector layout                                                 */
/* ------------------------------------------------------------------ */

export type ParamKind = 'groundAngle' | 'length' | 'extraRadius' | 'extraAngle';

export type ParamSpec = {
  /** Machine-readable key, e.g. 'd0.lenA'. */
  key: string;
  /** Short label for the UI; the canonical 8-bar keeps its historical names. */
  label: string;
  kind: ParamKind;
  unit: 'mm' | 'deg';
  min: number;
  max: number;
  /** Set for length/extra params: which bar they belong to. */
  bar?: string;
  /** Set for ground angle params: which pivot. */
  groundIndex?: number;
  extra?: { dyad: number; side: 'A' | 'B' };
  dyad?: number;
};

/**
 * Parameter order — chosen so the canonical N = 3 spec yields exactly the
 * original vector: phi6, lAB, c3r, c3a, lO4B, d4r, d4a, lCE, lO6E, g6r, g6a,
 * lDF, lGF, p8r, p8a.  That matters: the optimised designs shipped with the app
 * are plain number arrays, and they must keep loading unchanged.
 */
export function paramLayout(spec: MechanismSpec): ParamSpec[] {
  const used = usedExtras(spec);
  const out: ParamSpec[] = [];
  const names = spec.labels ?? {};
  const nm = (id: string, fallback: string) => names[id] ?? fallback;

  // Ground pivots beyond G0 (origin) and G1 (fixed at O2O4 on the x axis).
  for (let g = 2; g < spec.groundPivots; g++) {
    out.push({
      key: `g${g}.phi`,
      label: nm(`g${g}.phi`, `phi${2 * (g + 1)}`),
      kind: 'groundAngle',
      unit: 'deg',
      min: -180,
      max: 180,
      groundIndex: g,
    });
  }

  spec.dyads.forEach((_, k) => {
    for (const side of ['A', 'B'] as const) {
      out.push({
        key: `d${k}.len${side}`,
        label: nm(`d${k}.len${side}`, `L${k + 1}${side}`),
        kind: 'length',
        unit: 'mm',
        min: CONFIG.Lmin,
        max: CONFIG.Lmax,
        bar: barId(k, side),
        dyad: k,
      });
      if (used.has(extraId(k, side))) {
        out.push({
          key: `d${k}.extra${side}.r`,
          label: nm(`d${k}.extra${side}.r`, `r${k + 1}${side}`),
          kind: 'extraRadius',
          unit: 'mm',
          min: CONFIG.Lmin,
          max: CONFIG.Lmax,
          bar: barId(k, side),
          extra: { dyad: k, side },
          dyad: k,
        });
        out.push({
          key: `d${k}.extra${side}.a`,
          label: nm(`d${k}.extra${side}.a`, `a${k + 1}${side}`),
          kind: 'extraAngle',
          unit: 'deg',
          min: -180,
          max: 180,
          bar: barId(k, side),
          extra: { dyad: k, side },
          dyad: k,
        });
      }
    }
  });

  return out;
}

export const paramCount = (spec: MechanismSpec): number => paramLayout(spec).length;

/* ------------------------------------------------------------------ */
/* Canonical specs                                                      */
/* ------------------------------------------------------------------ */

/** Historical lettering of the original 8-bar, kept for N = 3. */
const EIGHT_BAR_LABELS: Record<string, string> = {
  'g2.phi': 'phi6',
  'd0.lenA': 'lAB',
  'd0.extraA.r': 'c3r',
  'd0.extraA.a': 'c3a',
  'd0.lenB': 'lO4B',
  'd0.extraB.r': 'd4r',
  'd0.extraB.a': 'd4a',
  'd1.lenA': 'lCE',
  'd1.lenB': 'lO6E',
  'd1.extraB.r': 'g6r',
  'd1.extraB.a': 'g6a',
  'd2.lenA': 'lDF',
  'd2.lenB': 'lGF',
  'd2.extraB.r': 'p8r',
  'd2.extraB.a': 'p8a',
  // Joint lettering used by the brief, the README and the debug overlay.
  G0: 'O2',
  G1: 'O4',
  G2: 'O6',
  J0: 'B',
  J1: 'E',
  J2: 'F',
  E0A: 'C',
  E0B: 'D',
  E1B: 'G',
  E2B: 'P_LED',
  crank: 'L2',
  d0A: 'L3',
  d0B: 'L4',
  d1A: 'L5',
  d1B: 'L6',
  d2A: 'L7',
  d2B: 'L8',
};

/**
 * Default wiring for a given dyad count.
 *
 * Dyad 0 is always driven by the crank tip against ground pivot 1.  Dyad 1, when
 * present, hangs off dyad 0's A-bar and a third ground pivot.  From dyad 2 on,
 * each new dyad bridges the two output bars of the two dyads before it, which is
 * what turns the chain from a simple series into a genuinely multi-loop
 * mechanism — and at N = 3 it is exactly the original 8-bar.
 */
export function defaultSpec(dyadCount: number): MechanismSpec {
  const n = Math.max(1, Math.min(6, Math.round(dyadCount)));
  const dyads: DyadSpec[] = [];
  let groundPivots = 2;

  for (let k = 0; k < n; k++) {
    if (k === 0) {
      dyads.push({ a: { kind: 'crankTip' }, b: { kind: 'ground', index: 1 } });
    } else if (k === 1) {
      groundPivots = 3;
      dyads.push({
        a: { kind: 'extra', dyad: 0, side: 'A' },
        b: { kind: 'ground', index: 2 },
      });
    } else {
      dyads.push({
        a: { kind: 'extra', dyad: k - 2, side: 'B' },
        b: { kind: 'extra', dyad: k - 1, side: 'B' },
      });
    }
  }

  const spec: MechanismSpec = {
    dyads,
    groundPivots,
    led: { dyad: n - 1, side: 'B' },
  };
  if (n === 3) spec.labels = EIGHT_BAR_LABELS;
  return spec;
}

/** The original mechanism: three dyads, three ground pivots, eight links. */
export const DEFAULT_SPEC = defaultSpec(3);

/** Link counts offered in the UI, with their dyad counts. */
export const SPEC_CHOICES = [1, 2, 3, 4, 5, 6].map((n) => ({
  dyads: n,
  links: 2 + 2 * n,
  joints: 1 + 3 * n,
}));

/**
 * Validate a spec: every anchor must be resolvable at the time its dyad is
 * solved, and a dyad may not take both anchors from the same body (that would
 * be a rigid triangle, not a dyad).
 */
export function validateSpec(spec: MechanismSpec): string[] {
  const errors: string[] = [];
  if (spec.dyads.length < 1) errors.push('At least one dyad is required.');
  if (spec.groundPivots < 2) errors.push('At least two ground pivots are required.');

  spec.dyads.forEach((d, k) => {
    for (const [name, ref] of [
      ['a', d.a],
      ['b', d.b],
    ] as const) {
      if (ref.kind === 'extra' && ref.dyad >= k) {
        errors.push(`Dyad ${k} anchor ${name} references dyad ${ref.dyad}, which is not solved yet.`);
      }
      if (ref.kind === 'ground' && ref.index >= spec.groundPivots) {
        errors.push(`Dyad ${k} anchor ${name} references ground pivot ${ref.index}, which does not exist.`);
      }
    }
    if (
      d.a.kind === 'extra' &&
      d.b.kind === 'extra' &&
      d.a.dyad === d.b.dyad &&
      d.a.side === d.b.side
    ) {
      errors.push(`Dyad ${k} takes both anchors from the same bar.`);
    }
  });

  if (spec.led.dyad >= spec.dyads.length) errors.push('LED is attached to a dyad that does not exist.');
  if (mobility(spec) !== 1) errors.push(`Mobility is ${mobility(spec)}, expected 1.`);
  return errors;
}
