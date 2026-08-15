import { CONFIG } from '../mechanism/config';
import { boundingBox, makeHeart } from './heartCurve';
import { NearestQuery } from './nearest';
import { resampleClosed } from './curveMatching';
import type { Vec2 } from '../utils/math';

/**
 * The target trajectory the LED should trace.
 *
 * A custom target is defined by a small set of CONTROL points rather than by its
 * dense samples: that is what makes it editable and what survives a round trip
 * through export/import.  The dense polyline the objective measures against is
 * derived from those controls (the built-in heart is the one exception — see
 * `resolveTarget`).
 */
export type TargetKind = 'heart' | 'custom';

export type TargetCurve = {
  kind: TargetKind;
  name: string;
  /** Editable control points, in millimetres. */
  controls: Vec2[];
  /** Interpolate a smooth closed spline through the controls. */
  smooth: boolean;
  /** Rescale the sampled curve to exactly fit `width` × `height`. */
  normalize: boolean;
  width: number;
  height: number;
  /** Samples of the dense curve used for error measurement. */
  samples: number;
};

export type ResolvedTarget = {
  curve: TargetCurve;
  /** Dense, closed polyline in millimetres. */
  points: Vec2[];
  /** Spatial index over `points`, built once per resolve. */
  query: NearestQuery;
  width: number;
  height: number;
  /** True when the target has too few points to be usable. */
  degenerate: boolean;
};

/* ------------------------------------------------------------------ */
/* Interpolation                                                        */
/* ------------------------------------------------------------------ */

/**
 * Closed centripetal Catmull-Rom through the control points.
 *
 * Centripetal (alpha = 0.5) rather than uniform: uniform Catmull-Rom overshoots
 * and can form cusps or self-intersections when control points are unevenly
 * spaced, which is exactly what happens when someone clicks points by hand.
 */
export function catmullRomClosed(controls: Vec2[], perSegment = 16): Vec2[] {
  const n = controls.length;
  if (n < 3) return controls.slice();

  const out: Vec2[] = [];
  const alpha = 0.5;
  const tj = (ti: number, a: Vec2, b: Vec2) =>
    ti + Math.pow(Math.hypot(b.x - a.x, b.y - a.y), alpha);

  for (let i = 0; i < n; i++) {
    const p0 = controls[(i - 1 + n) % n];
    const p1 = controls[i];
    const p2 = controls[(i + 1) % n];
    const p3 = controls[(i + 2) % n];

    const t0 = 0;
    const t1 = tj(t0, p0, p1);
    const t2 = tj(t1, p1, p2);
    const t3 = tj(t2, p2, p3);
    if (!(t1 > t0 && t2 > t1 && t3 > t2)) {
      out.push(p1);
      continue;
    }

    for (let s = 0; s < perSegment; s++) {
      const t = t1 + ((t2 - t1) * s) / perSegment;
      const a1 = lerp(p0, p1, (t - t0) / (t1 - t0));
      const a2 = lerp(p1, p2, (t - t1) / (t2 - t1));
      const a3 = lerp(p2, p3, (t - t2) / (t3 - t2));
      const b1 = lerp(a1, a2, (t - t0) / (t2 - t0));
      const b2 = lerp(a2, a3, (t - t1) / (t3 - t1));
      out.push(lerp(b1, b2, (t - t1) / (t2 - t1)));
    }
  }
  return out;
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/* ------------------------------------------------------------------ */
/* Resolution                                                           */
/* ------------------------------------------------------------------ */

/**
 * Turn a target definition into the dense curve the objective measures against.
 *
 * The built-in heart resolves to its ANALYTIC samples, not to a spline through
 * its control points.  That distinction is not cosmetic: a Catmull-Rom through
 * 64 controls sits ~0.13 mm RMS off the true curve and rounds the bottom cusp,
 * which measurably flatters the reported trajectory error — substituting it
 * silently would change every number in the results table.  The controls exist
 * so the heart can be picked up and edited; the moment one moves, the curve
 * becomes 'custom' and the spline takes over, which is an explicit user action
 * rather than a hidden approximation.
 */
export function resolveTarget(curve: TargetCurve): ResolvedTarget {
  if (curve.kind === 'heart') {
    const pts = makeHeart(curve.samples, curve.width, curve.height).points;
    const bb = boundingBox(pts);
    return {
      curve,
      points: pts,
      query: new NearestQuery(pts),
      width: bb.width,
      height: bb.height,
      degenerate: false,
    };
  }

  const controls = curve.controls.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (controls.length < 3) {
    return {
      curve,
      points: controls,
      query: new NearestQuery(controls.length ? controls : [{ x: 0, y: 0 }]),
      width: 0,
      height: 0,
      degenerate: true,
    };
  }

  let pts = curve.smooth ? catmullRomClosed(controls) : controls.slice();
  pts = resampleClosed(pts, Math.max(64, Math.min(2000, curve.samples)));

  if (curve.normalize) {
    const bb = boundingBox(pts);
    const sx = bb.width > 1e-9 ? curve.width / bb.width : 1;
    const sy = bb.height > 1e-9 ? curve.height / bb.height : 1;
    pts = pts.map((p) => ({
      x: (p.x - bb.center.x) * sx,
      y: (p.y - bb.center.y) * sy,
    }));
  }

  const bb = boundingBox(pts);
  return {
    curve,
    points: pts,
    query: new NearestQuery(pts),
    width: bb.width,
    height: bb.height,
    degenerate: false,
  };
}

/* ------------------------------------------------------------------ */
/* Built-in target                                                      */
/* ------------------------------------------------------------------ */

/**
 * The heart from the original brief.  It resolves analytically (see
 * `resolveTarget`); the control points exist so it can be picked up and edited
 * like any other target.
 */
export function heartTarget(
  width = CONFIG.targetWidth,
  height = CONFIG.targetHeight,
): TargetCurve {
  const dense = makeHeart(1024, width, height).points;
  // 64 controls hand the shape over to the spline at ~0.13 mm RMS, an order of
  // magnitude below the "very good" trajectory threshold, so converting the
  // heart to a custom curve does not visibly move it.
  const controlCount = 64;
  const controls = resampleClosed(dense, controlCount);
  return {
    kind: 'heart',
    name: 'Heart',
    controls,
    smooth: true,
    normalize: true,
    width,
    height,
    samples: CONFIG.targetSamples,
  };
}

/** A plain circle, handy as a starting point for hand-drawn targets. */
export function circleTarget(diameter = CONFIG.targetWidth, points = 16): TargetCurve {
  const r = diameter / 2;
  const controls = Array.from({ length: points }, (_, i) => {
    const a = (2 * Math.PI * i) / points;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  return {
    kind: 'custom',
    name: 'Circle',
    controls,
    smooth: true,
    normalize: false,
    width: diameter,
    height: diameter,
    samples: CONFIG.targetSamples,
  };
}

/* ------------------------------------------------------------------ */
/* Import / export                                                      */
/* ------------------------------------------------------------------ */

export const TARGET_SCHEMA = 'kreamet-target/1';

export function exportTarget(curve: TargetCurve): Record<string, unknown> {
  return {
    schema: TARGET_SCHEMA,
    name: curve.name,
    kind: curve.kind,
    units: 'mm',
    smooth: curve.smooth,
    normalize: curve.normalize,
    width_mm: curve.width,
    height_mm: curve.height,
    samples: curve.samples,
    controls: curve.controls.map((p) => [+p.x.toFixed(4), +p.y.toFixed(4)]),
  };
}

export type ImportResult =
  | { ok: true; curve: TargetCurve; note?: string }
  | { ok: false; error: string };

/**
 * Accept our own export format, and also a bare list of points so a curve can
 * come from a spreadsheet or another tool: `[[x,y], …]`, `[{x,y}, …]`, or a
 * `{points: […]}` wrapper.  Being permissive here is the difference between the
 * feature being usable and being ceremonial.
 */
export function importTarget(raw: unknown, fallbackName = 'Imported'): ImportResult {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return { ok: false, error: `Not valid JSON: ${(e as Error).message}` };
    }
  }
  if (data === null || typeof data !== 'object') return { ok: false, error: 'Expected a JSON object or array.' };

  const obj = data as Record<string, unknown>;
  const rawPoints = Array.isArray(data)
    ? data
    : Array.isArray(obj.controls)
      ? obj.controls
      : Array.isArray(obj.points)
        ? obj.points
        : null;

  if (!rawPoints) return { ok: false, error: 'No "controls" or "points" array found.' };

  const controls: Vec2[] = [];
  for (const entry of rawPoints) {
    if (Array.isArray(entry) && entry.length >= 2) {
      const x = Number(entry[0]);
      const y = Number(entry[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) controls.push({ x, y });
    } else if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      const x = Number(e.x);
      const y = Number(e.y);
      if (Number.isFinite(x) && Number.isFinite(y)) controls.push({ x, y });
    }
  }

  if (controls.length < 3)
    return { ok: false, error: `Need at least 3 usable points, found ${controls.length}.` };

  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const curve: TargetCurve = {
    kind: obj.kind === 'heart' ? 'heart' : 'custom',
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : fallbackName,
    controls,
    smooth: obj.smooth === undefined ? true : Boolean(obj.smooth),
    normalize: Boolean(obj.normalize),
    width: num(obj.width_mm ?? obj.width, CONFIG.targetWidth),
    height: num(obj.height_mm ?? obj.height, CONFIG.targetHeight),
    samples: Math.round(num(obj.samples, CONFIG.targetSamples)),
  };

  const dropped = rawPoints.length - controls.length;
  return {
    ok: true,
    curve,
    note: dropped > 0 ? `${dropped} entr${dropped === 1 ? 'y was' : 'ies were'} skipped as unreadable.` : undefined,
  };
}

/** Utility: move a control point, returning a new curve. */
export function withControlMoved(curve: TargetCurve, index: number, to: Vec2): TargetCurve {
  const controls = curve.controls.slice();
  if (index < 0 || index >= controls.length) return curve;
  controls[index] = to;
  return { ...curve, controls, kind: 'custom' };
}

/** Insert a control after `index` (or append when index < 0). */
export function withControlInserted(curve: TargetCurve, index: number, at: Vec2): TargetCurve {
  const controls = curve.controls.slice();
  if (index < 0 || index >= controls.length) controls.push(at);
  else controls.splice(index + 1, 0, at);
  return { ...curve, controls, kind: 'custom' };
}

export function withControlRemoved(curve: TargetCurve, index: number): TargetCurve {
  if (curve.controls.length <= 3) return curve;
  const controls = curve.controls.slice();
  controls.splice(index, 1);
  return { ...curve, controls, kind: 'custom' };
}

/**
 * Index of the segment whose midpoint region contains `p`, used to decide where
 * a newly clicked point should be inserted so the curve keeps its shape rather
 * than doubling back.
 */
export function nearestSegment(controls: Vec2[], p: Vec2): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < controls.length; i++) {
    const a = controls[i];
    const b = controls[(i + 1) % controls.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2));
    const d = Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
