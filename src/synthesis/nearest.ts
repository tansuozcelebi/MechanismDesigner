import { pointSegmentDistance } from '../collision/segmentDistance';
import type { Vec2 } from '../utils/math';

/**
 * Uniform-grid nearest-distance query against a closed polyline.
 *
 * Two things matter here.  First, speed: the Chamfer term is evaluated tens of
 * thousands of times inside the optimiser, and a brute-force O(N*M) sweep
 * dominates the run.  Second, accuracy: measuring distance to the sample
 * POINTS instead of the SEGMENTS between them adds a discretisation bias of up
 * to half the sample spacing, which is the same order as the 2.5 mm RMS we are
 * trying to resolve.  So the grid locates the nearest sample in O(1) and the
 * answer is then refined against the adjacent segments.
 */
export class NearestQuery {
  private readonly pts: Vec2[];
  private readonly cell: number;
  private readonly minX: number;
  private readonly minY: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly buckets: number[][];

  constructor(points: Vec2[], targetCell = 12) {
    this.pts = points;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX)) {
      minX = minY = 0;
      maxX = maxY = 1;
    }
    this.cell = Math.max(1e-6, targetCell);
    this.minX = minX;
    this.minY = minY;
    this.nx = Math.max(1, Math.ceil((maxX - minX) / this.cell) + 1);
    this.ny = Math.max(1, Math.ceil((maxY - minY) / this.cell) + 1);
    this.buckets = Array.from({ length: this.nx * this.ny }, () => [] as number[]);
    for (let i = 0; i < points.length; i++) {
      const cx = this.clampX(Math.floor((points[i].x - minX) / this.cell));
      const cy = this.clampY(Math.floor((points[i].y - minY) / this.cell));
      this.buckets[cy * this.nx + cx].push(i);
    }
  }

  private clampX = (i: number) => (i < 0 ? 0 : i >= this.nx ? this.nx - 1 : i);
  private clampY = (i: number) => (i < 0 ? 0 : i >= this.ny ? this.ny - 1 : i);

  /** Nearest distance from `q` to the closed polyline, in the same units. */
  distance(q: Vec2): number {
    const n = this.pts.length;
    if (n === 0) return Infinity;
    if (n < 3) return Math.hypot(q.x - this.pts[0].x, q.y - this.pts[0].y);

    const gx = Math.floor((q.x - this.minX) / this.cell);
    const gy = Math.floor((q.y - this.minY) / this.cell);

    let bestD2 = Infinity;
    let bestIdx = -1;

    const maxRing = Math.max(this.nx, this.ny);
    for (let ring = 0; ring <= maxRing; ring++) {
      const x0 = this.clampX(gx - ring);
      const x1 = this.clampX(gx + ring);
      const y0 = this.clampY(gy - ring);
      const y1 = this.clampY(gy + ring);

      for (let cy = y0; cy <= y1; cy++) {
        const onYEdge = cy === gy - ring || cy === gy + ring;
        for (let cx = x0; cx <= x1; cx++) {
          // Only visit the shell of this ring; the interior was done already.
          if (ring > 0 && !onYEdge && cx !== gx - ring && cx !== gx + ring) continue;
          for (const i of this.buckets[cy * this.nx + cx]) {
            const dx = q.x - this.pts[i].x;
            const dy = q.y - this.pts[i].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
              bestD2 = d2;
              bestIdx = i;
            }
          }
        }
      }

      // A hit inside the ring is only guaranteed optimal once the ring's
      // inscribed radius exceeds the best distance found so far.
      if (bestIdx >= 0 && ring * this.cell > Math.sqrt(bestD2)) break;
    }

    if (bestIdx < 0) return Infinity;

    // Refine against the polyline segments adjacent to the nearest sample.
    let best = Math.sqrt(bestD2);
    for (let k = -2; k <= 1; k++) {
      const a = this.pts[(bestIdx + k + n) % n];
      const b = this.pts[(bestIdx + k + 1 + n) % n];
      const d = pointSegmentDistance(q, a, b);
      if (d < best) best = d;
    }
    return best;
  }
}
