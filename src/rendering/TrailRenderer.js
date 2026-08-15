import * as THREE from 'three';
import { THEME } from './theme';
import { Z } from './Scene';
/**
 * LED trail (brief §31).
 *
 * Backed by a pre-allocated Float32 buffer with a draw range, so appending a
 * point is a single write plus a counter bump — no geometry is rebuilt during
 * animation.
 */
const MAX_POINTS = 20000;
export class TrailRenderer {
    object;
    positions;
    geometry;
    count = 0;
    last = null;
    constructor(color = THEME.trail) {
        this.positions = new Float32Array(MAX_POINTS * 3);
        this.geometry = new THREE.BufferGeometry();
        const attr = new THREE.BufferAttribute(this.positions, 3);
        attr.setUsage(THREE.DynamicDrawUsage);
        this.geometry.setAttribute('position', attr);
        this.geometry.setDrawRange(0, 0);
        this.object = new THREE.Line(this.geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
        this.object.position.z = Z.trail;
        this.object.frustumCulled = false;
    }
    /** Append a point, skipping ones too close to the previous to save budget. */
    push(p, minStep = 0.4) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
            return;
        if (this.last && Math.hypot(p.x - this.last.x, p.y - this.last.y) < minStep)
            return;
        if (this.count >= MAX_POINTS)
            this.compact();
        const i = this.count * 3;
        this.positions[i] = p.x;
        this.positions[i + 1] = p.y;
        this.positions[i + 2] = 0;
        this.count++;
        this.last = p;
        this.flush();
    }
    /** Replace the whole trail at once (used when a full sweep is available). */
    setPath(points, closed = true) {
        this.count = 0;
        const n = Math.min(points.length, MAX_POINTS - 1);
        for (let i = 0; i < n; i++) {
            this.positions[i * 3] = points[i].x;
            this.positions[i * 3 + 1] = points[i].y;
            this.positions[i * 3 + 2] = 0;
        }
        this.count = n;
        if (closed && n > 0) {
            this.positions[n * 3] = points[0].x;
            this.positions[n * 3 + 1] = points[0].y;
            this.positions[n * 3 + 2] = 0;
            this.count = n + 1;
        }
        this.last = n ? points[n - 1] : null;
        this.flush();
    }
    /** Drop the oldest half when the buffer fills. */
    compact() {
        const keep = Math.floor(MAX_POINTS / 2);
        this.positions.copyWithin(0, (this.count - keep) * 3, this.count * 3);
        this.count = keep;
    }
    flush() {
        this.geometry.setDrawRange(0, this.count);
        this.geometry.getAttribute('position').needsUpdate = true;
        this.geometry.computeBoundingSphere();
    }
    clear() {
        this.count = 0;
        this.last = null;
        this.flush();
    }
    set visible(v) {
        this.object.visible = v;
    }
    dispose() {
        this.geometry.dispose();
        this.object.material.dispose();
    }
}
