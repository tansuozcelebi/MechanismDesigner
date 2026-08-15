import * as THREE from 'three';
import { CONFIG } from '../mechanism/config';
import { THEME } from './theme';
import { Z, makeDashedPolyline, makePolyline, disposeTree } from './Scene';
import type { Vec2 } from '../utils/math';

/**
 * Target heart plus the 250 x 250 mm reference box (brief §31 / §48).
 * Drawn dashed grey so it never competes visually with the LED trail.
 */
export class HeartRenderer {
  readonly group = new THREE.Group();
  private curve: THREE.Line | null = null;
  private box: THREE.Line | null = null;

  setCurve(points: Vec2[]): void {
    if (this.curve) {
      this.group.remove(this.curve);
      disposeTree(this.curve);
      this.curve = null;
    }
    if (this.box) {
      this.group.remove(this.box);
      disposeTree(this.box);
      this.box = null;
    }
    if (!points.length) return;

    this.curve = makeDashedPolyline(points, THEME.target, Z.target, 9, 7, true);
    this.group.add(this.curve);

    // Reference bounding box of the target, in its placed orientation.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const hw = CONFIG.targetWidth / 2;
    const hh = CONFIG.targetHeight / 2;
    this.box = makePolyline(
      [
        { x: cx - hw, y: cy - hh },
        { x: cx + hw, y: cy - hh },
        { x: cx + hw, y: cy + hh },
        { x: cx - hw, y: cy + hh },
      ],
      THEME.targetBox,
      Z.targetBox,
      true,
    );
    this.group.add(this.box);
  }

  set visible(v: boolean) {
    this.group.visible = v;
  }

  dispose(): void {
    disposeTree(this.group);
  }
}
