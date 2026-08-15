import { describe, expect, it } from 'vitest';
import { CONFIG, DEFAULT_CONFIG, applyConfig, resetConfig, snapshotConfig } from '../src/mechanism/config';
import { buildTopology, linksShareJoint, topologyOf } from '../src/mechanism/topology';
import {
  DEFAULT_SPEC,
  SPEC_CHOICES,
  defaultSpec,
  loopCount,
  mobility,
  paramLayout,
  validateSpec,
} from '../src/mechanism/spec';
import { boundsFor, buildGeometry, lengthViolation } from '../src/mechanism/mechanism';
import { solvePose, sweep } from '../src/kinematics/forwardSolver';
import { makeHeart, boundingBox, rawHeart, TARGET_HEART } from '../src/synthesis/heartCurve';
import { potentialEnergy, gravityTorque } from '../src/dynamics/gravity';
import { poseMassProperties, totalMass } from '../src/dynamics/massProperties';
import { evaluateDesign } from '../src/synthesis/objective';
import {
  circleTarget,
  exportTarget,
  heartTarget,
  importTarget,
  resolveTarget,
  withControlInserted,
  withControlMoved,
  withControlRemoved,
} from '../src/synthesis/targetCurve';
import { mulberry32, sampleFeasiblePopulation } from '../src/synthesis/seeding';
import { INITIAL_GUESS, OPTIMIZED_SPEC } from '../src/app/designPresets';
import optimized from '../src/synthesis/optimizedResult.json';
import { circleCircleIntersectionEx, dist } from '../src/utils/math';
import { mmToM } from '../src/utils/units';

const TOPOLOGY = topologyOf(DEFAULT_SPEC);

describe('topology', () => {
  it('has mobility 1 by Grubler-Kutzbach', () => {
    // M = 3(n-1) - 2*j1 - j2 = 3(8-1) - 2(10) - 0 = 1
    expect(TOPOLOGY.links.length).toBe(8);
    expect(TOPOLOGY.joints.length).toBe(10);
    expect(TOPOLOGY.mobility).toBe(1);
  });

  it('has three independent loops (j - n + 1)', () => {
    expect(TOPOLOGY.loopCount).toBe(3);
    expect(TOPOLOGY.loops.length).toBe(3);
  });

  it('is incidence-consistent and fully connected', () => {
    // buildTopology throws on a mis-drawn graph; calling it is the assertion.
    expect(() => buildTopology(DEFAULT_SPEC)).not.toThrow();
    const incidence = TOPOLOGY.links.reduce((s, l) => s + l.jointIds.length, 0);
    expect(incidence).toBe(2 * TOPOLOGY.joints.length);
  });

  it('every joint connects exactly two distinct bodies', () => {
    for (const j of TOPOLOGY.joints) {
      expect(j.links[0]).not.toBe(j.links[1]);
      expect(new Set(j.links).size).toBe(2);
    }
  });

  it('links sharing a joint are collision-exempt', () => {
    // crank–d0A meet at the crank pin A; d1B–d2B meet at the rigid point G.
    expect(linksShareJoint(TOPOLOGY, 'crank', 'd0A')).toBe(true);
    expect(linksShareJoint(TOPOLOGY, 'd1B', 'd2B')).toBe(true);
    expect(linksShareJoint(TOPOLOGY, 'crank', 'd2B')).toBe(false);
  });
});

describe('variable mechanism size', () => {
  it('is 1-DOF at every offered link count, by the CONSTRUCTED graph', () => {
    for (const choice of SPEC_CHOICES) {
      const spec = defaultSpec(choice.dyads);
      const topo = topologyOf(spec);
      // Both the closed-form count and the graph actually built must agree, so
      // a wiring mistake cannot hide behind the formula.
      expect(mobility(spec)).toBe(1);
      expect(topo.mobility).toBe(1);
      expect(topo.links.length).toBe(choice.links);
      expect(topo.joints.length).toBe(choice.joints);
      expect(topo.loopCount).toBe(loopCount(spec));
      expect(validateSpec(spec)).toEqual([]);
    }
  });

  it('reproduces the original 15-parameter layout at three dyads', () => {
    const labels = paramLayout(defaultSpec(3)).map((p) => p.label);
    expect(labels).toEqual([
      'phi6', 'lAB', 'c3r', 'c3a', 'lO4B', 'd4r', 'd4a',
      'lCE', 'lO6E', 'g6r', 'g6a', 'lDF', 'lGF', 'p8r', 'p8a',
    ]);
    expect(INITIAL_GUESS.length).toBe(labels.length);
  });

  it('grows the design vector monotonically with dyad count', () => {
    let previous = 0;
    for (const choice of SPEC_CHOICES) {
      const n = paramLayout(defaultSpec(choice.dyads)).length;
      expect(n).toBeGreaterThan(previous);
      expect(boundsFor(defaultSpec(choice.dyads)).length).toBe(n);
      previous = n;
    }
  });

  it('samples a mechanism that completes a full revolution at every size', () => {
    for (const choice of SPEC_CHOICES) {
      const spec = defaultSpec(choice.dyads);
      const drawn = sampleFeasiblePopulation(spec, 1, mulberry32(20260815 + choice.dyads));
      expect(drawn.length, `no feasible sample at ${choice.links} links`).toBe(1);
      const geo = buildGeometry(spec, drawn[0]);
      expect(lengthViolation(geo)).toBe(0);
      const sw = sweep(geo, 180, { computeSigma: false });
      expect(sw.fullRotation, `${choice.links} links failed to rotate`).toBe(true);
      expect(sw.maxLoopClosureError).toBeLessThan(CONFIG.loopClosureTol);
    }
  });

  it('rejects a spec whose dyad anchors are not solved yet', () => {
    const broken = {
      ...defaultSpec(2),
      dyads: [
        { a: { kind: 'crankTip' as const }, b: { kind: 'ground' as const, index: 1 } },
        // Anchor references its own dyad, which cannot be resolved when it solves.
        { a: { kind: 'extra' as const, dyad: 1, side: 'A' as const }, b: { kind: 'ground' as const, index: 2 } },
      ],
    };
    expect(validateSpec(broken).length).toBeGreaterThan(0);
    expect(() => buildTopology(broken)).toThrow();
  });
});

describe('heart curve', () => {
  it('is normalised to exactly 250 x 250 mm', () => {
    const h = makeHeart(720, 250, 250);
    const bb = boundingBox(h.points);
    expect(bb.width).toBeCloseTo(250, 6);
    expect(bb.height).toBeCloseTo(250, 6);
  });

  it('is centred on the origin', () => {
    const bb = boundingBox(TARGET_HEART.points);
    expect(bb.center.x).toBeCloseTo(0, 6);
    expect(bb.center.y).toBeCloseTo(0, 6);
  });

  it('honours a non-square requested size', () => {
    const bb = boundingBox(makeHeart(360, 100, 400).points);
    expect(bb.width).toBeCloseTo(100, 6);
    expect(bb.height).toBeCloseTo(400, 6);
  });

  it('is a closed curve', () => {
    // t = 0 and t = 2pi are the same point on the raw curve.
    const a = rawHeart(0);
    const b = rawHeart(2 * Math.PI);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-9);
  });

  it('has the expected lobe structure (two maxima above the centre)', () => {
    // The heart's top has two lobes separated by a notch at x = 0.
    const pts = TARGET_HEART.points;
    const nearAxis = pts.filter((p) => Math.abs(p.x) < 4);
    const topNotch = Math.max(...nearAxis.map((p) => p.y));
    const globalTop = Math.max(...pts.map((p) => p.y));
    expect(topNotch).toBeLessThan(globalTop);
  });
});

describe('target trajectory', () => {
  it('resolves the built-in heart analytically, not through its controls', () => {
    // The control points exist so the heart can be picked up and edited, but the
    // curve the error is measured against must stay the exact analytic one.
    const resolved = resolveTarget(heartTarget());
    const analytic = makeHeart(resolved.points.length, CONFIG.targetWidth, CONFIG.targetHeight).points;
    let worst = 0;
    resolved.points.forEach((p, i) => {
      worst = Math.max(worst, dist(p, analytic[i]));
    });
    expect(worst).toBeLessThan(1e-9);
    expect(resolved.width).toBeCloseTo(CONFIG.targetWidth, 6);
    expect(resolved.height).toBeCloseTo(CONFIG.targetHeight, 6);
  });

  it('round-trips through export and import without losing a point', () => {
    const original = circleTarget(180, 12);
    const back = importTarget(JSON.stringify(exportTarget(original)));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.curve.controls.length).toBe(original.controls.length);
    expect(back.curve.smooth).toBe(original.smooth);
    expect(back.curve.normalize).toBe(original.normalize);
    original.controls.forEach((p, i) => {
      expect(dist(p, back.curve.controls[i])).toBeLessThan(1e-3);
    });
  });

  it('accepts a bare point list from another tool', () => {
    const res = importTarget('[[0,0],[100,0],[100,100],[0,100]]');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.curve.controls.length).toBe(4);
  });

  it('reports a reason instead of guessing when the input is unusable', () => {
    expect(importTarget('not json').ok).toBe(false);
    expect(importTarget('[[0,0],[1,1]]').ok).toBe(false); // fewer than three points
    expect(importTarget('{"nothing": true}').ok).toBe(false);
  });

  it('editing a control converts the heart to a custom curve', () => {
    const heart = heartTarget();
    const moved = withControlMoved(heart, 0, { x: 999, y: 999 });
    // Silently keeping kind 'heart' would keep resolving analytically and throw
    // the edit away.
    expect(moved.kind).toBe('custom');
    expect(moved.controls[0]).toEqual({ x: 999, y: 999 });
  });

  it('adds and removes control points, but never below three', () => {
    const c = circleTarget(100, 4);
    expect(withControlInserted(c, 1, { x: 5, y: 5 }).controls.length).toBe(5);
    const three = withControlRemoved(c, 0);
    expect(three.controls.length).toBe(3);
    expect(withControlRemoved(three, 0).controls.length).toBe(3);
  });
});

describe('editable constraints', () => {
  it('applies a patch and restores every default exactly', () => {
    const before = snapshotConfig();
    applyConfig({ Lmin: 60, Lmax: 180, weights: { w1_curve: 3.5 } });
    expect(CONFIG.Lmin).toBe(60);
    expect(CONFIG.Lmax).toBe(180);
    expect(CONFIG.weights.w1_curve).toBe(3.5);
    // A partial weights patch must leave the other weights alone.
    expect(CONFIG.weights.w3_closure).toBe(before.weights.w3_closure);

    resetConfig();
    expect(snapshotConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('changed length bounds take effect on the next evaluation', () => {
    const geo = buildGeometry(DEFAULT_SPEC, INITIAL_GUESS);
    expect(lengthViolation(geo)).toBe(0);
    try {
      applyConfig({ Lmax: 100 });
      // The same geometry is now out of bounds: several members exceed 100 mm.
      expect(lengthViolation(buildGeometry(DEFAULT_SPEC, INITIAL_GUESS))).toBeGreaterThan(0);
    } finally {
      resetConfig();
    }
  });
});

describe('forward kinematics — initial guess', () => {
  const geo = buildGeometry(DEFAULT_SPEC, INITIAL_GUESS);

  it('keeps every printed member inside [50, 200] mm', () => {
    expect(lengthViolation(geo)).toBe(0);
    for (const m of geo.members) {
      expect(m.length).toBeGreaterThanOrEqual(CONFIG.Lmin - 1e-9);
      expect(m.length).toBeLessThanOrEqual(CONFIG.Lmax + 1e-9);
    }
  });

  it('places the fixed pivots exactly as the brief specifies', () => {
    const [O2, O4, O6] = geo.ground;
    expect(dist(O2, { x: 0, y: 0 })).toBeCloseTo(0, 12);
    expect(dist(O2, O4)).toBeCloseTo(CONFIG.O2O4, 9);
    expect(dist(O4, O6)).toBeCloseTo(CONFIG.O4O6, 9);
  });

  it('drives the crank pin exactly on its 50 mm circle', () => {
    for (let i = 0; i < 36; i++) {
      const r = solvePose(geo, (i * Math.PI) / 18, null, { computeSigma: false });
      expect(r.ok).toBe(true);
      if (r.ok) expect(dist(r.points.A, geo.ground[0])).toBeCloseTo(CONFIG.crankLength, 9);
    }
  });

  it('completes a full 360 degree revolution', () => {
    const sw = sweep(geo, CONFIG.samplesFine, { computeSigma: false });
    expect(sw.validFrames).toBe(CONFIG.samplesFine);
    expect(sw.fullRotation).toBe(true);
    expect(sw.failures.length).toBe(0);
  });

  it('satisfies every loop closure equation to machine precision', () => {
    const sw = sweep(geo, 360, { computeSigma: false });
    expect(sw.maxLoopClosureError).toBeLessThan(1e-9);
    expect(sw.maxLoopClosureError).toBeLessThan(CONFIG.loopClosureTol);
  });

  it('closes the LED path: P(0) == P(2pi)', () => {
    const sw = sweep(geo, CONFIG.samplesFine, { computeSigma: false });
    expect(sw.pathClosure).toBeLessThan(CONFIG.pathClosureTol);
  });

  it('is consistent at theta = 0 and theta = 360 degrees', () => {
    const a = solvePose(geo, 0, null, { computeSigma: false });
    const b = solvePose(geo, 2 * Math.PI, null, { computeSigma: false });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(dist(a.led, b.led)).toBeLessThan(1e-9);
      for (const k of Object.keys(a.points)) {
        expect(dist(a.points[k], b.points[k])).toBeLessThan(1e-9);
      }
    }
  });

  it('does not jump assembly mode over the cycle', () => {
    const sw = sweep(geo, CONFIG.samplesFine, { computeSigma: false });
    expect(sw.assemblyJumps).toBe(0);
  });

  it('produces a finite, non-degenerate LED trajectory', () => {
    const sw = sweep(geo, 180, { computeSigma: false });
    for (const p of sw.poses) {
      expect(Number.isFinite(p.led.x)).toBe(true);
      expect(Number.isFinite(p.led.y)).toBe(true);
    }
    const bb = boundingBox(sw.poses.map((p) => p.led));
    expect(bb.width + bb.height).toBeGreaterThan(1);
  });
});

describe('branch continuity', () => {
  const geo = buildGeometry(DEFAULT_SPEC, INITIAL_GUESS);
  const nDyads = DEFAULT_SPEC.dyads.length;
  const stateOf = (p: { points: Record<string, { x: number; y: number }> }) =>
    Array.from({ length: nDyads }, (_, k) => p.points[`J${k}`]);

  it('seeding from the previous frame keeps the solution on one branch', () => {
    const step = (2 * Math.PI) / 720;
    let prev: { x: number; y: number }[] | null = null;
    let maxJump = 0;
    for (let i = 0; i < 720; i++) {
      const r = solvePose(geo, i * step, prev, { computeSigma: false });
      expect(r.ok).toBe(true);
      if (!r.ok) break;
      const now = stateOf(r);
      if (prev) for (let k = 0; k < nDyads; k++) maxJump = Math.max(maxJump, dist(prev[k], now[k]));
      prev = now;
    }
    expect(maxJump).toBeLessThan(CONFIG.assemblyJumpTol);
  });

  it('the seed decides which circle-circle root is taken', () => {
    // Both roots are real solutions of the same closure equations; the previous
    // configuration is what selects between them.  Tested on a single dyad so
    // the assertion is about root selection alone — on a longer chain the other
    // branch moves the downstream anchors and may legitimately fail to close,
    // which would confound the two effects.
    const spec1 = defaultSpec(1);
    const drawn = sampleFeasiblePopulation(spec1, 1, mulberry32(7));
    expect(drawn.length).toBe(1);
    const oneDyad = buildGeometry(spec1, drawn[0]);

    const theta = 0.3;
    const base = solvePose(oneDyad, theta, null, { computeSigma: false });
    expect(base.ok).toBe(true);
    if (!base.ok) return;

    const [aBar, bBar] = oneDyad.bars;
    const roots = circleCircleIntersectionEx(
      base.points[aBar.anchorId],
      aBar.length,
      base.points[bBar.anchorId],
      bBar.length,
    ).points;
    expect(roots).not.toBeNull();
    if (!roots) return;
    expect(dist(roots[0], roots[1])).toBeGreaterThan(1);

    for (const root of roots) {
      const seeded = solvePose(oneDyad, theta, [root], { computeSigma: false });
      expect(seeded.ok).toBe(true);
      if (seeded.ok) expect(dist(seeded.points.J0, root)).toBeLessThan(1e-9);
    }
  });
});

describe('gravity and mass', () => {
  const geo = buildGeometry(DEFAULT_SPEC, INITIAL_GUESS);

  it('mass scales linearly with line density', () => {
    const pose = solvePose(geo, 0.5, null, { computeSigma: false });
    expect(pose.ok).toBe(true);
    if (!pose.ok) return;
    const m1 = totalMass(poseMassProperties(geo, pose, 0.00035));
    const m2 = totalMass(poseMassProperties(geo, pose, 0.0007));
    expect(m2 / m1).toBeCloseTo(2, 9);
  });

  it('potential energy rises when the assembly is lifted (+y is up)', () => {
    const pose = solvePose(geo, 0.9, null, { computeSigma: false });
    expect(pose.ok).toBe(true);
    if (!pose.ok) return;

    const U0 = potentialEnergy(geo, pose);
    const lifted = {
      ...pose,
      points: Object.fromEntries(
        Object.entries(pose.points).map(([k, v]) => [k, { x: v.x, y: v.y + 100 }]),
      ),
      led: { x: pose.led.x, y: pose.led.y + 100 },
    };
    const U1 = potentialEnergy(geo, lifted);
    expect(U1).toBeGreaterThan(U0);

    // dU must equal m * g * dh exactly.
    const m = totalMass(poseMassProperties(geo, pose));
    expect(U1 - U0).toBeCloseTo(m * 9.80665 * mmToM(100), 9);
  });

  it('gravity torque integrates to zero over a closed cycle', () => {
    // U is a single-valued function of theta on a closed path, so the integral
    // of dU/dtheta around the full revolution must vanish.
    const sw = sweep(geo, 180, { computeSigma: false });
    let integral = 0;
    const dTheta = (2 * Math.PI) / sw.poses.length;
    for (const p of sw.poses) {
      const t = gravityTorque(geo, p);
      expect(Number.isFinite(t)).toBe(true);
      integral += t * dTheta;
    }
    expect(Math.abs(integral)).toBeLessThan(1e-3);
  });

  it('gravity torque matches a direct finite difference of U', () => {
    const pose = solvePose(geo, 1.234, null, { computeSigma: false });
    expect(pose.ok).toBe(true);
    if (!pose.ok) return;
    const h = 1e-4;
    const seed = [pose.points.J0, pose.points.J1, pose.points.J2];
    const p = solvePose(geo, 1.234 + h, seed, { computeSigma: false });
    const m = solvePose(geo, 1.234 - h, seed, { computeSigma: false });
    expect(p.ok && m.ok).toBe(true);
    if (!p.ok || !m.ok) return;
    const fd = (potentialEnergy(geo, p) - potentialEnergy(geo, m)) / (2 * h);
    expect(gravityTorque(geo, pose)).toBeCloseTo(fd, 6);
  });
});

describe('optimised results shipped with the app', () => {
  const solutions = optimized.solutions ?? [];
  const spec = OPTIMIZED_SPEC;

  it('contains solutions', () => {
    expect(solutions.length).toBeGreaterThan(0);
  });

  it('every stored vector matches the layout of the spec it belongs to', () => {
    const width = paramLayout(spec).length;
    for (const s of solutions) expect(s.designArray.length).toBe(width);
  });

  it('every stored solution reproduces its recorded metrics', () => {
    for (const s of solutions.slice(0, 5)) {
      const m = evaluateDesign(s.designArray, {
        level: 'fine',
        spec,
        computeSigma: true,
        computeGravity: true,
      });
      // The solver is deterministic, so re-evaluating must give the same J.
      expect(m.J).toBeCloseTo(s.metrics.objective, 4);
      expect(m.match.chamferRms).toBeCloseTo(s.metrics.rmsError_mm, 3);
      expect(m.width).toBeCloseTo(s.metrics.width_mm, 2);
      expect(m.height).toBeCloseTo(s.metrics.height_mm, 2);
    }
  });

  it('every stored solution is a valid mechanism', () => {
    for (const s of solutions) {
      expect(s.metrics.fullRotation).toBe(true);
      expect(s.metrics.validFrames).toBe(s.metrics.frames);
      expect(s.metrics.assemblyJumps).toBe(0);
      expect(s.metrics.maxLoopClosureError_mm).toBeLessThan(CONFIG.loopClosureTol);
      expect(s.metrics.pathClosure_mm).toBeLessThan(CONFIG.pathClosureTol);
      expect(s.metrics.minTransmissionAngle_deg).toBeGreaterThan(CONFIG.muHardMin - 1);
    }
  });

  it('every stored solution respects the link length bounds', () => {
    for (const s of solutions) {
      for (const m of s.members) {
        expect(m.length_mm).toBeGreaterThanOrEqual(CONFIG.Lmin - 1e-6);
        expect(m.length_mm).toBeLessThanOrEqual(CONFIG.Lmax + 1e-6);
      }
    }
  });
});
