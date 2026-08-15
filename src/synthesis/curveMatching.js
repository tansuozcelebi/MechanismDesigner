import { boundingBox } from './heartCurve';
import { NearestQuery } from './nearest';
/**
 * Resolution cap for the correspondence searches.  The cyclic-shift alignment
 * and the parameterised RMS are both O(n^2); 180 samples already resolve the
 * shift to 2 degrees of curve parameter, so raising it buys nothing but cost.
 */
const CORRESPONDENCE_SAMPLES = 180;
export const IDENTITY_TRANSFORM = { angle: 0, tx: 0, ty: 0 };
export function applyTransform(p, T) {
    const c = Math.cos(T.angle);
    const s = Math.sin(T.angle);
    return { x: c * p.x - s * p.y + T.tx, y: s * p.x + c * p.y + T.ty };
}
export const transformAll = (pts, T) => pts.map((p) => applyTransform(p, T));
export function invertTransform(T) {
    const c = Math.cos(-T.angle);
    const s = Math.sin(-T.angle);
    return {
        angle: -T.angle,
        tx: -(c * T.tx - s * T.ty),
        ty: -(s * T.tx + c * T.ty),
    };
}
/** Resample a closed polyline to `n` points equally spaced in arc length. */
export function resampleClosed(points, n) {
    const m = points.length;
    if (m === 0)
        return [];
    const seg = new Array(m);
    let total = 0;
    for (let i = 0; i < m; i++) {
        const a = points[i];
        const b = points[(i + 1) % m];
        seg[i] = Math.hypot(b.x - a.x, b.y - a.y);
        total += seg[i];
    }
    if (total < 1e-12)
        return new Array(n).fill(points[0]);
    const out = new Array(n);
    let idx = 0;
    let acc = 0;
    for (let k = 0; k < n; k++) {
        const targetLen = (total * k) / n;
        while (idx < m - 1 && acc + seg[idx] < targetLen) {
            acc += seg[idx];
            idx++;
        }
        const t = seg[idx] > 1e-12 ? (targetLen - acc) / seg[idx] : 0;
        const a = points[idx];
        const b = points[(idx + 1) % m];
        out[k] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return out;
}
function pack(points) {
    const n = points.length;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        x[i] = points[i].x;
        y[i] = points[i].y;
    }
    return { x, y, n };
}
/**
 * Best RIGID alignment (rotation + translation, NO scale — brief §13) mapping
 * `source` onto `dest`.
 *
 * Both curves are closed loops sampled uniformly in arc length, so the
 * correspondence is a cyclic shift plus an optional traversal reversal.  For a
 * fixed shift the optimal rotation follows in closed form from the Kabsch/
 * Procrustes construction, and the shift sweep is just a circular
 * cross-correlation — so the global optimum over (shift, direction, rotation,
 * translation) is found exactly, without iteration.
 */
export function bestRigidAlignment(source, dest) {
    const n = Math.min(source.length, dest.length, CORRESPONDENCE_SAMPLES);
    if (n < 3)
        return IDENTITY_TRANSFORM;
    const S = pack(resampleClosed(source, n));
    const D = pack(resampleClosed(dest, n));
    let sxm = 0;
    let sym = 0;
    let dxm = 0;
    let dym = 0;
    for (let i = 0; i < n; i++) {
        sxm += S.x[i];
        sym += S.y[i];
        dxm += D.x[i];
        dym += D.y[i];
    }
    sxm /= n;
    sym /= n;
    dxm /= n;
    dym /= n;
    const sx = new Float64Array(n);
    const sy = new Float64Array(n);
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    let normS = 0;
    let normD = 0;
    for (let i = 0; i < n; i++) {
        sx[i] = S.x[i] - sxm;
        sy[i] = S.y[i] - sym;
        dx[i] = D.x[i] - dxm;
        dy[i] = D.y[i] - dym;
        normS += sx[i] * sx[i] + sy[i] * sy[i];
        normD += dx[i] * dx[i] + dy[i] * dy[i];
    }
    let bestSse = Infinity;
    let bestAngle = 0;
    for (let dir = 0; dir < 2; dir++) {
        for (let shift = 0; shift < n; shift++) {
            let a = 0; // sum of cross products  -> sin term
            let b = 0; // sum of dot products    -> cos term
            for (let i = 0; i < n; i++) {
                const j = dir === 0 ? (i + shift) % n : (n - 1 - i + shift + n) % n;
                a += sx[i] * dy[j] - sy[i] * dx[j];
                b += sx[i] * dx[j] + sy[i] * dy[j];
            }
            const mag = Math.hypot(a, b);
            const sse = normS + normD - 2 * mag;
            if (sse < bestSse) {
                bestSse = sse;
                bestAngle = Math.atan2(a, b);
            }
        }
    }
    const c = Math.cos(bestAngle);
    const s = Math.sin(bestAngle);
    return {
        angle: bestAngle,
        tx: dxm - (c * sxm - s * sym),
        ty: dym - (s * sxm + c * sym),
    };
}
/**
 * Symmetric Chamfer error.  Both directions are required: a mechanism that
 * traces only the lower lobe perfectly would score well on LED->target alone,
 * but is punished by target->LED (brief §12).
 */
export function chamferError(ledPts, targetPts, targetQuery) {
    if (ledPts.length === 0 || targetPts.length === 0) {
        return {
            chamferRms: 1e6,
            rmsLedToTarget: 1e6,
            rmsTargetToLed: 1e6,
            maxError: 1e6,
            paramRms: 1e6,
        };
    }
    // LED -> target, measured to the target's segments (not just its samples).
    const qT = targetQuery ?? new NearestQuery(targetPts);
    let sumLT = 0;
    let maxLT = 0;
    for (const p of ledPts) {
        const d = qT.distance(p);
        sumLT += d * d;
        if (d > maxLT)
            maxLT = d;
    }
    // target -> LED. Both directions are required so that a mechanism tracing
    // only part of the heart cannot score well (brief §12).
    const qL = new NearestQuery(ledPts);
    let sumTL = 0;
    for (const p of targetPts) {
        const d = qL.distance(p);
        sumTL += d * d;
    }
    const meanLT = sumLT / ledPts.length;
    const meanTL = sumTL / targetPts.length;
    // Metric A: parameterised RMS under the best cyclic correspondence.
    const n = Math.min(ledPts.length, targetPts.length, CORRESPONDENCE_SAMPLES);
    const ls = resampleClosed(ledPts, n);
    const ts = resampleClosed(targetPts, n);
    let paramBest = Infinity;
    for (let dir = 0; dir < 2; dir++) {
        for (let shift = 0; shift < n; shift++) {
            let s = 0;
            for (let i = 0; i < n; i++) {
                const j = dir === 0 ? (i + shift) % n : (n - 1 - i + shift + n) % n;
                const ddx = ls[i].x - ts[j].x;
                const ddy = ls[i].y - ts[j].y;
                s += ddx * ddx + ddy * ddy;
            }
            if (s < paramBest)
                paramBest = s;
        }
    }
    return {
        chamferRms: Math.sqrt(0.5 * (meanLT + meanTL)),
        rmsLedToTarget: Math.sqrt(meanLT),
        rmsTargetToLed: Math.sqrt(meanTL),
        maxError: maxLT,
        paramRms: Math.sqrt(paramBest / n),
    };
}
/** Bounding-box size penalty (brief §14). */
export function sizeError(ledPts, targetW, targetH) {
    const bb = boundingBox(ledPts);
    return ((bb.width - targetW) / targetW) ** 2 + ((bb.height - targetH) / targetH) ** 2;
}
/**
 * Display score (brief §46) — a monotonic map of the true RMS onto 0-100 %.
 * For presentation only; all engineering readouts use the millimetre values.
 */
export const heartMatchScore = (rms, characteristicLength) => 100 * Math.exp(-Math.max(0, rms) / characteristicLength);
