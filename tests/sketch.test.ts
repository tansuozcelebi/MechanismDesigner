import { describe, expect, it } from 'vitest';
import {
  fourBarOf,
  mobility,
  motorOf,
  moveJoint,
  parseSketch,
  poseOf,
  setLinkLength,
  solve,
  sweepSketch,
  removeJoint,
  type Sketch,
} from '../src/sketch/model';
import { PRESETS } from '../src/sketch/presets';

const preset = (id: string) => PRESETS.find((p) => p.id === id)!.sketch;
const d = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y);

describe('sketch solver', () => {
  it('counts one degree of freedom for every preset', () => {
    for (const p of PRESETS) expect(mobility(p.sketch).dof, p.id).toBe(1);
  });

  it('turns the four-bar preset all the way round, holding every length', () => {
    const s = preset('fourbar');
    const sw = sweepSketch(s, 180);
    expect(sw.fullRotation).toBe(true);
    expect(sw.frames).toHaveLength(180);
    for (const f of sw.frames) {
      for (const l of s.links) expect(Math.abs(d(f[l.a], f[l.b]) - l.length)).toBeLessThan(1e-3);
      expect(f.P1).toEqual({ x: 0, y: 0 });
    }
  });

  it('runs the coupler and Watt six-bar presets through a full revolution', () => {
    expect(sweepSketch(preset('coupler')).fullRotation).toBe(true);
    expect(sweepSketch(preset('watt')).fullRotation).toBe(true);
  });

  it('classifies the preset by Grashof and finds its transmission angle', () => {
    const fb = fourBarOf(preset('fourbar'))!;
    expect(fb.kind).toBe('crank-rocker');
    expect(fb.grashof).toBe(true);
    expect(fb.crankTurns).toBe(true);
    const mu = sweepSketch(preset('fourbar')).minTransmission!;
    expect(mu).toBeGreaterThan(10);
    expect(mu).toBeLessThan(90);
  });

  it('reports where a crank that cannot turn locks', () => {
    // A crank longer than the rest of the loop allows: non-Grashof.
    // Crank 90 against ground 120, coupler ≈115, rocker ≈90: s + l > p + q.
    const s = setLinkLength(preset('fourbar'), 'L1', 90)!;
    expect(s).not.toBeNull();
    expect(fourBarOf(s)!.grashof).toBe(false);
    expect(fourBarOf(s)!.crankTurns).toBe(false);
    const sw = sweepSketch(s);
    expect(sw.fullRotation).toBe(false);
    expect(sw.lockedAt).toBeGreaterThan(0);
  });

  it('changes one length and re-assembles around it', () => {
    const s = preset('fourbar');
    const t = setLinkLength(s, 'L2', 120)!;
    const pose = poseOf(t);
    expect(d(pose.P3, pose.P4)).toBeCloseTo(120, 4);
    expect(d(pose.P4, pose.P2)).toBeCloseTo(s.links[2].length, 4);
    expect(d(pose.P3, poseOf(s).P3)).toBeLessThan(1e-9); // the crank did not move
  });

  it('refuses a length no assembly can reach', () => {
    expect(setLinkLength(preset('fourbar'), 'L2', 2000)).toBeNull();
  });

  it('re-derives lengths when a joint is dragged', () => {
    const t = moveJoint(preset('fourbar'), 'P4', { x: 100, y: 100 });
    expect(t.links[1].length).toBeCloseTo(Math.hypot(100, 60), 6);
  });

  it('needs the motor on a ground pivot', () => {
    const s = preset('fourbar');
    expect(motorOf({ ...s, motor: 'L2' })).toBeNull();
    expect(motorOf(s)!.tip).toBe('P3');
  });

  it('solves with the crank placed by the motor angle', () => {
    const s = preset('fourbar');
    const r = solve(s, poseOf(s), Math.PI / 3);
    expect(r.ok).toBe(true);
    expect(r.pose.P3.x).toBeCloseTo(20, 6);
  });

  it('removes a joint with its links, motor and tracer', () => {
    const t = removeJoint(preset('fourbar'), 'P3');
    expect(t.links.map((l) => l.id)).toEqual(['L3']);
    expect(t.motor).toBeNull();
  });

  it('validates sketches from storage', () => {
    expect(parseSketch(preset('watt'))).toEqual(preset('watt'));
    const bad: unknown = { joints: [{ id: 'a', x: 'x', y: 0, ground: true }], links: [{ id: 'L', a: 'a', b: 'z', length: 1 }] };
    expect(parseSketch(bad)).toEqual({ joints: [], links: [], motor: null, tracers: [] } satisfies Sketch);
    expect(parseSketch(null)).toBeNull();
  });
});
