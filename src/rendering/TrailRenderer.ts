import * as THREE from 'three';
import { THEME } from './theme';
import { Z } from './Scene';
import type { Vec2 } from '../utils/math';

/**
 * LED trail (brief §31).
 *
 * Backed by a pre-allocated Float32 buffer with a draw range, so appending a
 * point is a single write plus a counter bump — no geometry is rebuilt during
 * animation.
 */
const MAX_POINTS = 20000;

export class TrailRenderer {
  readonly object: THREE.Line;
  private positions: Float32Array;
  private geometry: THREE.BufferGeometry;
  private count = 0;
  private last: Vec2 | null = null;

  constructor(color: number = THEME.trail) {
    this.positions = new Float32Array(MAX_POINTS * 3);
    this.geometry = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(this.positions, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', attr);
    this.geometry.setDrawRange(0, 0);
    this.object = new THREE.Line(
      this.geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    this.object.position.z = Z.trail;
    this.object.frustumCulled = false;
  }

  /** Append a point, skipping ones too close to the previous to save budget. */
  push(p: Vec2, minStep = 0.4): void {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if (this.last && Math.hypot(p.x - this.last.x, p.y - this.last.y) < minStep) return;
    if (this.count >= MAX_POINTS) this.compact();
    const i = this.count * 3;
    this.positions[i] = p.x;
    this.positions[i + 1] = p.y;
    this.positions[i + 2] = 0;
    this.count++;
    this.last = p;
    this.flush();
  }

  /** Replace the whole trail at once (used when a full sweep is available). */
  setPath(points: Vec2[], closed = true): void {
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
  private compact(): void {
    const keep = Math.floor(MAX_POINTS / 2);
    this.positions.copyWithin(0, (this.count - keep) * 3, this.count * 3);
    this.count = keep;
  }

  private flush(): void {
    this.geometry.setDrawRange(0, this.count);
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  clear(): void {
    this.count = 0;
    this.last = null;
    this.flush();
  }

  set visible(v: boolean) {
    this.object.visible = v;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}
