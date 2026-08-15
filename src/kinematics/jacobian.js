import { degToRad, localPoint, smallestSingularValue } from '../utils/math';
/**
 * Constraint formulation used for the singularity analysis.
 *
 * Independent unknowns q = (Bx, By, Ex, Ey, Fx, Fy) — the output joint of each
 * RRR dyad.  Everything else (C, D, G, P_LED) is a rigid function of those.
 * Six scalar constraints, F(q, theta) = 0:
 *
 *   |B - A(theta)|^2 - lAB^2   = 0
 *   |B - O4|^2      - lO4B^2   = 0
 *   |E - C(B)|^2    - lCE^2    = 0
 *   |E - O6|^2      - lO6E^2   = 0
 *   |F - D(B)|^2    - lDF^2    = 0
 *   |F - G(E)|^2    - lGF^2    = 0
 *
 * Jq = dF/dq is 6x6 and block lower-triangular by dyad, so sigma_min(Jq)
 * collapses toward zero exactly when any one dyad approaches a dead point.
 */
export function constraintResiduals(geo, q, A) {
    const d = geo.design;
    const B = { x: q[0], y: q[1] };
    const E = { x: q[2], y: q[3] };
    const F = { x: q[4], y: q[5] };
    const C = localPoint(A, B, d.c3r, degToRad(d.c3a));
    const D = localPoint(geo.O4, B, d.d4r, degToRad(d.d4a));
    const G = localPoint(geo.O6, E, d.g6r, degToRad(d.g6a));
    const sq = (p, r) => (p.x - r.x) ** 2 + (p.y - r.y) ** 2;
    return [
        sq(B, A) - d.lAB ** 2,
        sq(B, geo.O4) - d.lO4B ** 2,
        sq(E, C) - d.lCE ** 2,
        sq(E, geo.O6) - d.lO6E ** 2,
        sq(F, D) - d.lDF ** 2,
        sq(F, G) - d.lGF ** 2,
    ];
}
/**
 * Smallest singular value of dF/dq, computed by central differences.
 *
 * The residuals are quadratic in q, so the derivative is exact to round-off
 * with a central difference — no truncation error to worry about.  The result
 * is divided by 2*L_char so the number reads as a dimensionless-ish margin in
 * millimetres rather than mm^2.
 */
export function constraintJacobianSigmaMin(geo, joints) {
    const q = [
        joints.B.x,
        joints.B.y,
        joints.E.x,
        joints.E.y,
        joints.F.x,
        joints.F.y,
    ];
    const A = joints.A;
    const h = 1e-4;
    const J = Array.from({ length: 6 }, () => new Array(6).fill(0));
    for (let c = 0; c < 6; c++) {
        const qp = q.slice();
        const qm = q.slice();
        qp[c] += h;
        qm[c] -= h;
        const rp = constraintResiduals(geo, qp, A);
        const rm = constraintResiduals(geo, qm, A);
        for (let r = 0; r < 6; r++)
            J[r][c] = (rp[r] - rm[r]) / (2 * h);
    }
    // Rows are d(length^2), i.e. 2 * length * d(length); normalise per row so the
    // margin is comparable across designs with very different link lengths.
    const d = geo.design;
    const rowScale = [d.lAB, d.lO4B, d.lCE, d.lO6E, d.lDF, d.lGF];
    for (let r = 0; r < 6; r++) {
        const s = 1 / (2 * Math.max(1e-6, rowScale[r]));
        for (let c = 0; c < 6; c++)
            J[r][c] *= s;
    }
    return smallestSingularValue(J);
}
