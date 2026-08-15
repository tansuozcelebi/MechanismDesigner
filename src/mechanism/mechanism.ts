import { CONFIG } from './config';
import {
  CRANK_ID,
  barId,
  defaultSpec,
  extraId,
  groundJointId,
  paramLayout,
  pointRefId,
  usedExtras,
  type MechanismSpec,
  type ParamSpec,
  type PointRef,
} from './spec';
import type { LinkId, LinkMember, Pose } from './types';
import { degToRad, thirdSide, v2, type Vec2 } from '../utils/math';

/**
 * Resolved geometry: fixed pivot positions plus every physical member length of
 * every rigid body, derived from a spec and its parameter vector.
 */
export type BarGeometry = {
  id: LinkId;
  dyad: number;
  side: 'A' | 'B';
  /** Point this bar is anchored to (a joint id). */
  anchorId: string;
  /** The dyad joint at the far end. */
  jointId: string;
  length: number;
  /** Rigid third point, when this bar carries one. */
  extra?: { id: string; r: number; angleDeg: number; toJoint: number };
};

export type Geometry = {
  spec: MechanismSpec;
  params: number[];
  layout: ParamSpec[];
  /** Ground pivot positions, index-aligned with the spec. */
  ground: Vec2[];
  bars: BarGeometry[];
  members: LinkMember[];
  ledId: string;
  crankLength: number;
};

/** Parameter bounds for the current spec and the live length limits. */
export function boundsFor(spec: MechanismSpec): [number, number][] {
  return paramLayout(spec).map((p) =>
    p.unit === 'mm' ? [CONFIG.Lmin, CONFIG.Lmax] : [p.min, p.max],
  );
}

export function clampParams(spec: MechanismSpec, x: number[]): number[] {
  const b = boundsFor(spec);
  return x.map((xi, i) => (b[i] ? Math.min(b[i][1], Math.max(b[i][0], xi)) : xi));
}

/** Index the parameter vector by layout key. */
function indexByKey(layout: ParamSpec[]): Map<string, number> {
  const m = new Map<string, number>();
  layout.forEach((p, i) => m.set(p.key, i));
  return m;
}

/**
 * Build resolved geometry.  Ground pivots march outward from the origin: G0 at
 * O2, G1 fixed on the +x axis at the mandated O2O4 spacing, and each further
 * pivot at the configured spacing and a design-variable heading from the one
 * before it.
 */
export function buildGeometry(spec: MechanismSpec, params: number[]): Geometry {
  const layout = paramLayout(spec);
  const idx = indexByKey(layout);
  const get = (key: string, fallback = 0): number => {
    const i = idx.get(key);
    return i === undefined ? fallback : params[i];
  };

  const ground: Vec2[] = [v2(CONFIG.O2.x, CONFIG.O2.y)];
  if (spec.groundPivots > 1) ground.push(v2(ground[0].x + CONFIG.O2O4, ground[0].y));
  for (let g = 2; g < spec.groundPivots; g++) {
    const phi = degToRad(get(`g${g}.phi`));
    const prev = ground[g - 1];
    ground.push(v2(prev.x + CONFIG.O4O6 * Math.cos(phi), prev.y + CONFIG.O4O6 * Math.sin(phi)));
  }

  const used = usedExtras(spec);
  const bars: BarGeometry[] = [];
  const members: LinkMember[] = [];

  members.push({
    linkId: CRANK_ID,
    from: groundJointId(0),
    to: 'A',
    length: CONFIG.crankLength,
  });

  spec.dyads.forEach((d, k) => {
    for (const side of ['A', 'B'] as const) {
      const ref: PointRef = side === 'A' ? d.a : d.b;
      const id = barId(k, side);
      const length = get(`d${k}.len${side}`, CONFIG.Lmin);
      const anchorId = pointRefId(ref);
      const jointId = `J${k}`;

      const bar: BarGeometry = { id, dyad: k, side, anchorId, jointId, length };
      members.push({ linkId: id, from: anchorId, to: jointId, length });

      if (used.has(extraId(k, side))) {
        const r = get(`d${k}.extra${side}.r`, CONFIG.Lmin);
        const a = get(`d${k}.extra${side}.a`, 0);
        const toJoint = thirdSide(length, r, degToRad(a));
        bar.extra = { id: extraId(k, side), r, angleDeg: a, toJoint };
        members.push({ linkId: id, from: anchorId, to: bar.extra.id, length: r });
        members.push({ linkId: id, from: jointId, to: bar.extra.id, length: toJoint });
      }
      bars.push(bar);
    }
  });

  return {
    spec,
    params,
    layout,
    ground,
    bars,
    members,
    ledId: extraId(spec.led.dyad, spec.led.side),
    crankLength: CONFIG.crankLength,
  };
}

/**
 * Does this pose actually describe this geometry?
 *
 * The viewer solves on its own schedule, so for one render after the mechanism
 * changes the UI still holds the previous pose while the geometry is already the
 * new one.  Everything downstream — mass properties, torque, the link table —
 * indexes `pose.points` by ids taken from the geometry, so the mismatch would
 * surface as an undefined coordinate deep inside a physics routine rather than
 * as an obviously wrong picture.  Checking lets the transitional frame render
 * honestly as "not solved yet".
 */
export function poseFitsGeometry(geo: Geometry, pose: Pose): boolean {
  if (pose.transmissionAngles.length !== geo.spec.dyads.length) return false;
  if (!pose.points[geo.ledId]) return false;
  for (const m of geo.members) {
    if (!pose.points[m.from] || !pose.points[m.to]) return false;
  }
  return true;
}

/**
 * Hard manufacturability check: EVERY physical member, including the dependent
 * sides of the ternary bodies and the LED extension, must fall in
 * [Lmin, Lmax].  Returns a smooth violation magnitude in mm so the optimiser
 * gets a gradient rather than a cliff.
 */
export function lengthViolation(geo: Geometry): number {
  let vio = 0;
  for (const mem of geo.members) {
    if (!Number.isFinite(mem.length)) {
      vio += 1e3;
      continue;
    }
    if (mem.length < CONFIG.Lmin) vio += CONFIG.Lmin - mem.length;
    else if (mem.length > CONFIG.Lmax) vio += mem.length - CONFIG.Lmax;
  }
  return vio;
}

/** Soft proportion penalty: adjacent bodies should stay within ratioMin..ratioMax. */
export function ratioPenalty(geo: Geometry): number {
  const principal = [geo.crankLength, ...geo.bars.map((b) => b.length)];
  let pen = 0;
  for (let i = 0; i < principal.length - 1; i++) {
    const r = principal[i] / Math.max(1e-9, principal[i + 1]);
    if (r < CONFIG.ratioMin) pen += (CONFIG.ratioMin - r) ** 2;
    else if (r > CONFIG.ratioMax) pen += ((r - CONFIG.ratioMax) / CONFIG.ratioMax) ** 2;
  }
  return pen;
}

/** Human-readable parameter table, for the UI and the export. */
export function paramEntries(
  geo: Geometry,
): { key: string; label: string; value: number; unit: string; min: number; max: number }[] {
  return geo.layout.map((p, i) => ({
    key: p.key,
    label: p.label,
    value: geo.params[i],
    unit: p.unit === 'mm' ? 'mm' : '°',
    min: p.unit === 'mm' ? CONFIG.Lmin : p.min,
    max: p.unit === 'mm' ? CONFIG.Lmax : p.max,
  }));
}

export { defaultSpec };
