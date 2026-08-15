import { CONFIG } from '../mechanism/config';
/**
 * The classic cardioid-like heart:
 *   x(t) = 16 sin^3 t
 *   y(t) = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t
 *
 * Sampled, then affinely rescaled so its true bounding box is exactly
 * width x height millimetres and it is centred on the origin.  The raw curve
 * is NOT symmetric in y about its own centroid, so the bounding box must be
 * measured rather than assumed.
 */
export function rawHeart(t) {
    const s = Math.sin(t);
    return {
        x: 16 * s * s * s,
        y: 13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t),
    };
}
/**
 * Sample and normalise. The mathematical parameter t runs 0..2pi; note that the
 * resulting point spacing is NOT uniform in arc length, which is exactly why
 * the objective uses a geometric (Chamfer) distance in addition to the
 * parameterised RMS (brief §12).
 */
export function makeHeart(samples = CONFIG.targetSamples, width = CONFIG.targetWidth, height = CONFIG.targetHeight) {
    const raw = [];
    for (let i = 0; i < samples; i++) {
        raw.push(rawHeart((2 * Math.PI * i) / samples));
    }
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;
    for (const p of raw) {
        if (p.x < xmin)
            xmin = p.x;
        if (p.x > xmax)
            xmax = p.x;
        if (p.y < ymin)
            ymin = p.y;
        if (p.y > ymax)
            ymax = p.y;
    }
    const sx = width / (xmax - xmin);
    const sy = height / (ymax - ymin);
    // x_scaled = width * (x - xmin)/(xmax - xmin) - width/2, and likewise for y,
    // which both rescales to the requested box and centres it on the origin.
    const points = raw.map((p) => ({
        x: (p.x - xmin) * sx - width / 2,
        y: (p.y - ymin) * sy - height / 2,
    }));
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        perimeter += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return { points, width, height, perimeter };
}
export function boundingBox(points) {
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;
    for (const p of points) {
        if (p.x < xmin)
            xmin = p.x;
        if (p.x > xmax)
            xmax = p.x;
        if (p.y < ymin)
            ymin = p.y;
        if (p.y > ymax)
            ymax = p.y;
    }
    return {
        min: { x: xmin, y: ymin },
        max: { x: xmax, y: ymax },
        width: xmax - xmin,
        height: ymax - ymin,
        center: { x: (xmin + xmax) / 2, y: (ymin + ymax) / 2 },
    };
}
/** The shared, canonical 250 x 250 mm target. */
export const TARGET_HEART = makeHeart();
