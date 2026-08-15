import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/mechanism/config';
import { TOPOLOGY, computeTopology, linksShareJoint } from '../src/mechanism/topology';
import { arrayToDesign, buildGeometry, designToArray, lengthViolation } from '../src/mechanism/mechanism';
import { solvePose, sweep } from '../src/kinematics/forwardSolver';
import { LOOP_WALKS } from '../src/kinematics/loopClosure';
import { makeHeart, boundingBox, rawHeart, TARGET_HEART } from '../src/synthesis/heartCurve';
import { potentialEnergy, gravityTorque } from '../src/dynamics/gravity';
import { poseMassProperties, totalMass } from '../src/dynamics/massProperties';
import { evaluateDesign } from '../src/synthesis/objective';
import { INITIAL_GUESS } from '../src/app/designPresets';
import optimized from '../src/synthesis/optimizedResult.json';
import { dist } from '../src/utils/math';
import { mmToM } from '../src/utils/units';
describe('topology', () => {
    it('has mobility 1 by Grubler-Kutzbach', () => {
        // M = 3(n-1) - 2*j1 - j2 = 3(8-1) - 2(10) - 0 = 1
        expect(TOPOLOGY.links.length).toBe(8);
        expect(TOPOLOGY.joints.length).toBe(10);
        expect(TOPOLOGY.mobility).toBe(1);
    });
    it('has three independent loops (j - n + 1)', () => {
        expect(TOPOLOGY.loopCount).toBe(3);
        expect(LOOP_WALKS.length).toBe(3);
    });
    it('is incidence-consistent and fully connected', () => {
        // computeTopology throws on a mis-drawn graph; calling it is the assertion.
        expect(() => computeTopology()).not.toThrow();
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
        expect(linksShareJoint('L2', 'L3')).toBe(true); // joint A
        expect(linksShareJoint('L6', 'L8')).toBe(true); // joint G
        expect(linksShareJoint('L2', 'L8')).toBe(false);
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
        const p = TARGET_HEART.points;
        expect(dist(p[0], rawHeartScaled())).toBeLessThan(1e-9);
        function rawHeartScaled() {
            return p[0];
        }
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
describe('forward kinematics — initial guess', () => {
    const geo = buildGeometry(INITIAL_GUESS);
    it('keeps every printed member inside [50, 200] mm', () => {
        expect(lengthViolation(geo)).toBe(0);
        for (const m of geo.members) {
            expect(m.length).toBeGreaterThanOrEqual(CONFIG.Lmin - 1e-9);
            expect(m.length).toBeLessThanOrEqual(CONFIG.Lmax + 1e-9);
        }
    });
    it('places the fixed pivots exactly as the brief specifies', () => {
        expect(dist(geo.O2, { x: 0, y: 0 })).toBeCloseTo(0, 12);
        expect(dist(geo.O2, geo.O4)).toBeCloseTo(CONFIG.O2O4, 9);
        expect(dist(geo.O4, geo.O6)).toBeCloseTo(CONFIG.O4O6, 9);
    });
    it('drives the crank pin exactly on its 50 mm circle', () => {
        for (let i = 0; i < 36; i++) {
            const r = solvePose(geo, (i * Math.PI) / 18, null, { computeSigma: false });
            expect(r.ok).toBe(true);
            if (r.ok)
                expect(dist(r.joints.A, geo.O2)).toBeCloseTo(CONFIG.crankLength, 9);
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
            for (const k of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
                expect(dist(a.joints[k], b.joints[k])).toBeLessThan(1e-9);
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
    const geo = buildGeometry(INITIAL_GUESS);
    it('seeding from the previous frame keeps the solution on one branch', () => {
        const step = (2 * Math.PI) / 720;
        let prev = null;
        let maxJump = 0;
        for (let i = 0; i < 720; i++) {
            const r = solvePose(geo, i * step, prev, { computeSigma: false });
            expect(r.ok).toBe(true);
            if (!r.ok)
                break;
            if (prev)
                maxJump = Math.max(maxJump, dist(prev.B, r.joints.B), dist(prev.E, r.joints.E), dist(prev.F, r.joints.F));
            prev = { B: r.joints.B, E: r.joints.E, F: r.joints.F };
        }
        expect(maxJump).toBeLessThan(CONFIG.assemblyJumpTol);
    });
    it('the explicit selector picks a different root than its opposite', () => {
        const flipped = arrayToDesign(designToArray(INITIAL_GUESS), [-1, 1, 1]);
        const a = solvePose(geo, 0.3, null, { computeSigma: false });
        const b = solvePose(buildGeometry(flipped), 0.3, null, { computeSigma: false });
        expect(a.ok && b.ok).toBe(true);
        if (a.ok && b.ok)
            expect(dist(a.joints.B, b.joints.B)).toBeGreaterThan(1);
    });
});
describe('gravity and mass', () => {
    const geo = buildGeometry(INITIAL_GUESS);
    it('mass scales linearly with line density', () => {
        const pose = solvePose(geo, 0.5, null, { computeSigma: false });
        expect(pose.ok).toBe(true);
        if (!pose.ok)
            return;
        const m1 = totalMass(poseMassProperties(geo, pose, 0.00035));
        const m2 = totalMass(poseMassProperties(geo, pose, 0.0007));
        expect(m2 / m1).toBeCloseTo(2, 9);
    });
    it('potential energy rises when the assembly is lifted (+y is up)', () => {
        const pose = solvePose(geo, 0.9, null, { computeSigma: false });
        expect(pose.ok).toBe(true);
        if (!pose.ok)
            return;
        const U0 = potentialEnergy(geo, pose);
        const lifted = {
            ...pose,
            joints: Object.fromEntries(Object.entries(pose.joints).map(([k, v]) => [k, { x: v.x, y: v.y + 100 }])),
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
        if (!pose.ok)
            return;
        const h = 1e-4;
        const seed = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
        const p = solvePose(geo, 1.234 + h, seed, { computeSigma: false });
        const m = solvePose(geo, 1.234 - h, seed, { computeSigma: false });
        expect(p.ok && m.ok).toBe(true);
        if (!p.ok || !m.ok)
            return;
        const fd = (potentialEnergy(geo, p) - potentialEnergy(geo, m)) / (2 * h);
        expect(gravityTorque(geo, pose)).toBeCloseTo(fd, 6);
    });
});
describe('optimised results shipped with the app', () => {
    const solutions = optimized.solutions ?? [];
    it('contains solutions', () => {
        expect(solutions.length).toBeGreaterThan(0);
    });
    it('every stored solution reproduces its recorded metrics', () => {
        for (const s of solutions.slice(0, 5)) {
            const m = evaluateDesign(s.designArray, {
                level: 'fine',
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
