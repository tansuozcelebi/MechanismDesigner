import type { Scene2D } from '../rendering/Scene';
import { dist, unwrapAngle, type Vec2 } from '../utils/math';

/**
 * Mouse control of the motor (brief §32).
 *
 * Grabbing anywhere on the crank (or its pin A) drives the input angle from the
 * pointer:  theta = atan2(mouse.y - O2.y, mouse.x - O2.x), unwrapped against
 * the previous value so dragging across the +/-pi seam does not jump a full
 * turn, and so the accumulated angle keeps counting revolutions.
 *
 * Middle-drag (or drag on empty space) pans; the wheel zooms about the cursor.
 */
export type DragCallbacks = {
  /** Absolute (unwrapped) motor angle in radians. */
  onAngle: (theta: number) => void;
  /** Current crank pin position, for hit-testing. */
  getCrankPin: () => Vec2;
  getO2: () => Vec2;
  /** Current motor angle, so unwrapping has a reference. */
  getTheta: () => number;
  onGrabChange?: (grabbed: boolean) => void;
};

export class CrankDragController {
  private dragging: 'crank' | 'pan' | null = null;
  private lastPointer = { x: 0, y: 0 };
  private detachers: (() => void)[] = [];

  constructor(
    private readonly scene: Scene2D,
    private readonly cb: DragCallbacks,
  ) {
    const el = scene.canvas;

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      this.lastPointer = { x: e.clientX, y: e.clientY };
      const world = scene.toWorld(e.clientX, e.clientY);

      if (e.button === 0 && this.hitsCrank(world)) {
        this.dragging = 'crank';
        this.cb.onGrabChange?.(true);
        this.applyAngle(world);
      } else {
        this.dragging = 'pan';
      }
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      const world = scene.toWorld(e.clientX, e.clientY);
      if (this.dragging === 'crank') {
        this.applyAngle(world);
      } else if (this.dragging === 'pan') {
        scene.panByPixels(e.clientX - this.lastPointer.x, e.clientY - this.lastPointer.y);
      } else {
        el.style.cursor = this.hitsCrank(world) ? 'grab' : 'default';
      }
      this.lastPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.dragging === 'crank') this.cb.onGrabChange?.(false);
      this.dragging = null;
      el.style.cursor = 'default';
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const world = scene.toWorld(e.clientX, e.clientY);
      scene.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12, world);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onContextMenu);

    this.detachers.push(() => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', onContextMenu);
    });
  }

  get isDraggingCrank(): boolean {
    return this.dragging === 'crank';
  }

  /** Hit test: near the crank pin, or within a band around the crank body. */
  private hitsCrank(world: Vec2): boolean {
    const pin = this.cb.getCrankPin();
    const O2 = this.cb.getO2();
    const tol = Math.max(10, this.scene.mmPerPixel * 14);
    if (dist(world, pin) < tol + 8) return true;

    // Distance to the crank centre line.
    const vx = pin.x - O2.x;
    const vy = pin.y - O2.y;
    const l2 = vx * vx + vy * vy;
    if (l2 < 1e-9) return false;
    let t = ((world.x - O2.x) * vx + (world.y - O2.y) * vy) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = O2.x + vx * t;
    const py = O2.y + vy * t;
    return Math.hypot(world.x - px, world.y - py) < tol;
  }

  private applyAngle(world: Vec2): void {
    const O2 = this.cb.getO2();
    const raw = Math.atan2(world.y - O2.y, world.x - O2.x);
    // Angle unwrap keeps the motor angle continuous across the seam.
    this.cb.onAngle(unwrapAngle(this.cb.getTheta(), raw));
  }

  dispose(): void {
    for (const d of this.detachers) d();
    this.detachers = [];
  }
}
