import { describe, expect, it } from 'vitest';
import {
  circleCircleIntersection,
  circleCircleIntersectionEx,
  dist,
  interiorAngle,
  localPoint,
  smallestSingularValue,
  thirdSide,
  unwrapAngle,
  wrapPi,
  wrapTwoPi,
} from '../src/utils/math';
import { segmentSegmentDistance, pointSegmentDistance } from '../src/collision/segmentDistance';
import { mmToM, mToMm, rpmToRadPerSec, degToRad, radToDeg } from '../src/utils/units';

describe('unit conversions', () => {
  it('mm <-> m round trip', () => {
    expect(mmToM(1000)).toBeCloseTo(1, 12);
    expect(mToMm(1)).toBeCloseTo(1000, 12);
    for (const v of [0, 1, 12.5, 250, -37.25]) {
      expect(mToMm(mmToM(v))).toBeCloseTo(v, 10);
    }
  });

  it('deg <-> rad round trip', () => {
    for (const d of [0, 30, 90, 180, -145.3]) expect(radToDeg(degToRad(d))).toBeCloseTo(d, 10);
  });

  it('rpm -> rad/s', () => {
    expect(rpmToRadPerSec(60)).toBeCloseTo(2 * Math.PI, 12);
    expect(rpmToRadPerSec(0)).toBe(0);
    expect(rpmToRadPerSec(300)).toBeCloseTo(10 * Math.PI, 12);
  });
});

describe('circle-circle intersection', () => {
  it('finds the two symmetric roots of a standard case', () => {
    const r = circleCircleIntersection({ x: 0, y: 0 }, 5, { x: 6, y: 0 }, 5);
    expect(r).not.toBeNull();
    const [p0, p1] = r!;
    expect(p0.x).toBeCloseTo(3, 10);
    expect(p1.x).toBeCloseTo(3, 10);
    expect(Math.abs(p0.y)).toBeCloseTo(4, 10);
    expect(p0.y).toBeCloseTo(-p1.y, 10);
  });

  it('roots satisfy both radius constraints exactly', () => {
    const c0 = { x: -13.5, y: 7.25 };
    const c1 = { x: 91.2, y: -40.8 };
    const r0 = 88;
    const r1 = 71;
    const res = circleCircleIntersection(c0, r0, c1, r1)!;
    for (const p of res) {
      expect(dist(p, c0)).toBeCloseTo(r0, 9);
      expect(dist(p, c1)).toBeCloseTo(r1, 9);
    }
  });

  it('returns null with a positive gap when the circles are too far apart', () => {
    const res = circleCircleIntersectionEx({ x: 0, y: 0 }, 10, { x: 100, y: 0 }, 10);
    expect(res.points).toBeNull();
    expect((res as { gap: number }).gap).toBeCloseTo(80, 9);
  });

  it('returns null with a positive gap when one circle is inside the other', () => {
    const res = circleCircleIntersectionEx({ x: 0, y: 0 }, 100, { x: 5, y: 0 }, 10);
    expect(res.points).toBeNull();
    expect((res as { gap: number }).gap).toBeCloseTo(85, 9);
  });

  it('reports near-zero slack at tangency (the dyad dead point)', () => {
    const res = circleCircleIntersectionEx({ x: 0, y: 0 }, 50, { x: 100, y: 0 }, 50);
    expect(res.points).not.toBeNull();
    expect((res as { slack: number }).slack).toBeLessThan(1e-9);
  });

  it('rejects concentric circles', () => {
    const res = circleCircleIntersectionEx({ x: 3, y: 3 }, 10, { x: 3, y: 3 }, 10);
    expect(res.points).toBeNull();
  });
});

describe('rigid attachment', () => {
  it('localPoint is invariant under rigid motion of the body', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 100, y: 0 };
    const r = 60;
    const a = degToRad(37);
    const P = localPoint(p0, p1, r, a);
    expect(dist(P, p0)).toBeCloseTo(r, 10);

    // Rotate + translate the body; the local distances must not change.
    const rot = degToRad(-118);
    const move = (p: { x: number; y: number }) => ({
      x: p.x * Math.cos(rot) - p.y * Math.sin(rot) + 17,
      y: p.x * Math.sin(rot) + p.y * Math.cos(rot) - 43,
    });
    const P2 = localPoint(move(p0), move(p1), r, a);
    expect(dist(P2, move(p0))).toBeCloseTo(r, 10);
    expect(dist(P2, move(p1))).toBeCloseTo(dist(P, p1), 9);
    expect(dist(P2, move(P))).toBeCloseTo(0, 9);
  });

  it('thirdSide matches the law of cosines', () => {
    const r0 = 90;
    const r1 = 70;
    const a = degToRad(48);
    const P = localPoint({ x: 0, y: 0 }, { x: r0, y: 0 }, r1, a);
    expect(dist(P, { x: r0, y: 0 })).toBeCloseTo(thirdSide(r0, r1, a), 9);
  });
});

describe('angle handling', () => {
  it('wrapPi maps to (-pi, pi]', () => {
    expect(wrapPi(0)).toBeCloseTo(0, 12);
    expect(wrapPi(3 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(wrapPi(-3 * Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it('wrapTwoPi maps to [0, 2pi)', () => {
    expect(wrapTwoPi(-0.5)).toBeCloseTo(2 * Math.PI - 0.5, 12);
    expect(wrapTwoPi(7 * Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it('unwrapAngle never jumps a full turn across the seam', () => {
    // Dragging the crank from just below +pi to just above -pi.
    const prev = Math.PI - 0.05;
    const raw = -Math.PI + 0.05;
    const out = unwrapAngle(prev, raw);
    expect(Math.abs(out - prev)).toBeLessThan(0.2);
    expect(out).toBeGreaterThan(Math.PI);
  });

  it('unwrapAngle accumulates revolutions', () => {
    let t = 0;
    for (let i = 1; i <= 40; i++) t = unwrapAngle(t, wrapPi((i * Math.PI) / 4));
    expect(t).toBeCloseTo(10 * Math.PI, 6);
  });
});

describe('interior angle', () => {
  it('is 90 degrees for a right angle', () => {
    expect(radToDeg(interiorAngle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }))).toBeCloseTo(90, 9);
  });
  it('is 180 degrees when folded straight', () => {
    expect(radToDeg(interiorAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }))).toBeCloseTo(180, 9);
  });
});

describe('segment distance', () => {
  it('crossing segments have zero distance', () => {
    expect(
      segmentSegmentDistance({ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }),
    ).toBeCloseTo(0, 12);
  });

  it('parallel segments are separated by their offset', () => {
    expect(
      segmentSegmentDistance({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 7 }, { x: 10, y: 7 }),
    ).toBeCloseTo(7, 12);
  });

  it('endpoint-to-endpoint case', () => {
    expect(
      segmentSegmentDistance({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 4, y: 0 }, { x: 9, y: 0 }),
    ).toBeCloseTo(3, 12);
  });

  it('degenerate (point) segments fall back to point distance', () => {
    expect(
      segmentSegmentDistance({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 4 }),
    ).toBeCloseTo(5, 12);
  });

  it('point-to-segment clamps to the endpoints', () => {
    expect(pointSegmentDistance({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5, 12);
    expect(pointSegmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3, 12);
  });
});

describe('linear algebra', () => {
  it('smallest singular value of a diagonal matrix', () => {
    expect(smallestSingularValue([[3, 0], [0, 0.5]])).toBeCloseTo(0.5, 8);
  });

  it('is zero for a singular matrix', () => {
    expect(smallestSingularValue([[1, 2], [2, 4]])).toBeCloseTo(0, 6);
  });

  it('is rotation invariant', () => {
    const c = Math.cos(0.7);
    const s = Math.sin(0.7);
    const R = [
      [c, -s],
      [s, c],
    ];
    const A = [
      [3, 0],
      [0, 0.5],
    ];
    const RA = [
      [R[0][0] * A[0][0] + R[0][1] * A[1][0], R[0][0] * A[0][1] + R[0][1] * A[1][1]],
      [R[1][0] * A[0][0] + R[1][1] * A[1][0], R[1][0] * A[0][1] + R[1][1] * A[1][1]],
    ];
    expect(smallestSingularValue(RA)).toBeCloseTo(0.5, 8);
  });
});
