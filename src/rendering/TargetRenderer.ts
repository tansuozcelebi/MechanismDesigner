import * as THREE from 'three';
import { CONFIG } from '../mechanism/config';
import { THEME } from './theme';
import { Z, makeDashedPolyline, makeDisc, makePolyline, disposeTree } from './Scene';
import type { Vec2 } from '../utils/math';

/**
 * The target trajectory: its dense curve, its reference bounding box, and — in
 * edit mode — a draggable handle on every control point.
 *
 * Handles are only built while editing.  Showing them permanently would clutter
 * the canvas and, worse, invite a drag that silently converts the analytic heart
 * into a spline approximation of itself.
 */
export class TargetRenderer {
  readonly group = new THREE.Group();
  private curve: THREE.Line | null = null;
  private box: THREE.Line | null = null;
  private handleGroup = new THREE.Group();
  private handles: { index: number; mesh: THREE.Mesh }[] = [];
  private controlPoints: Vec2[] = [];
  private editing = false;

  constructor() {
    this.group.add(this.handleGroup);
  }

  /** `points` is the placed dense curve; `controls` the editable points. */
  setCurve(points: Vec2[], controls: Vec2[], showBox = true): void {
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
    this.controlPoints = controls;

    if (points.length) {
      this.curve = makeDashedPolyline(points, THEME.target, Z.target, 9, 7, true);
      this.group.add(this.curve);

      if (showBox) {
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
    }

    this.rebuildHandles();
  }

  /** Control points currently drawn, in millimetres (read-only view). */
  get controls(): readonly Vec2[] {
    return this.controlPoints;
  }

  setEditing(on: boolean): void {
    if (this.editing === on) return;
    this.editing = on;
    this.rebuildHandles();
  }

  private rebuildHandles(): void {
    for (const h of this.handles) {
      this.handleGroup.remove(h.mesh);
      disposeTree(h.mesh);
    }
    this.handles = [];
    if (!this.editing) return;

    this.controlPoints.forEach((p, index) => {
      const mesh = makeDisc(5, THEME.targetHandle, 16);
      mesh.position.set(p.x, p.y, Z.label - 1);
      this.handleGroup.add(mesh);
      this.handles.push({ index, mesh });
    });
  }

  /** Highlight the control under the cursor or being dragged. */
  setActiveControl(index: number | null): void {
    for (const h of this.handles) {
      (h.mesh.material as THREE.MeshBasicMaterial).color.setHex(
        h.index === index ? THEME.targetHandleActive : THEME.targetHandle,
      );
    }
  }

  /** Nearest control handle to a world point, when editing. */
  hitTest(world: Vec2, tolerance: number): number | null {
    if (!this.editing) return null;
    let best: number | null = null;
    let bestD = tolerance;
    this.controlPoints.forEach((p, i) => {
      const d = Math.hypot(world.x - p.x, world.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  setScale(mmPerPixel: number): void {
    const s = Math.max(0.4, Math.min(3, mmPerPixel / 0.6));
    for (const h of this.handles) h.mesh.scale.setScalar(s);
  }

  set visible(v: boolean) {
    this.group.visible = v;
  }

  dispose(): void {
    disposeTree(this.group);
  }
}
