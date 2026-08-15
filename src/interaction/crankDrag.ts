import type { MechanismViewer, Selection } from '../rendering/MechanismViewer';
import { dist, unwrapAngle, type Vec2 } from '../utils/math';

/**
 * All pointer interaction on the canvas.
 *
 * Four gestures share one controller because they must agree on what is under
 * the cursor: dragging a target control point, dragging the crank, selecting a
 * link or joint, and panning. Resolving that once — in priority order — is what
 * stops a click near two things doing both.
 */
export type CanvasCallbacks = {
  /** Absolute (unwrapped) motor angle in radians. */
  onAngle: (theta: number) => void;
  getTheta: () => number;

  /** Selection changed (null when clicking empty space). */
  onSelect: (sel: Selection) => void;

  /** Target editing. `onControlMove` fires continuously while dragging. */
  targetEditing: () => boolean;
  onControlMove: (index: number, to: Vec2) => void;
  onControlAdd: (at: Vec2) => void;
  onControlRemove: (index: number) => void;

  onGrabChange?: (grabbed: boolean) => void;
};

type Mode = 'crank' | 'pan' | 'control' | null;

export class CanvasController {
  private mode: Mode = null;
  private controlIndex = -1;
  private lastPointer = { x: 0, y: 0 };
  private downAt = { x: 0, y: 0 };
  private detachers: (() => void)[] = [];

  constructor(
    private readonly viewer: MechanismViewer,
    private readonly cb: CanvasCallbacks,
  ) {
    const scene = viewer.scene;
    const el = scene.canvas;

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.downAt = { x: e.clientX, y: e.clientY };
      const world = scene.toWorld(e.clientX, e.clientY);

      if (e.button !== 0) {
        this.mode = 'pan';
        e.preventDefault();
        return;
      }

      const hit = viewer.pick(world);

      // A target handle wins over everything: while editing, that is what the
      // user is aiming at, and the curve often overlaps the mechanism.
      if (hit.target !== null) {
        this.mode = 'control';
        this.controlIndex = hit.target;
        viewer.setActiveControl(hit.target);
        // Alt-click removes rather than drags.
        if (e.altKey) {
          this.cb.onControlRemove(hit.target);
          this.mode = null;
          this.controlIndex = -1;
        }
        e.preventDefault();
        return;
      }

      if (this.hitsCrank(world)) {
        this.mode = 'crank';
        this.cb.onGrabChange?.(true);
        this.applyAngle(world);
        e.preventDefault();
        return;
      }

      // Adding a point is an explicit modifier so plain clicks stay safe for
      // panning and selecting.
      if (this.cb.targetEditing() && e.shiftKey) {
        this.cb.onControlAdd(world);
        this.mode = null;
        e.preventDefault();
        return;
      }

      this.mode = 'pan';
      this.pendingSelection = hit.selection;
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      const world = scene.toWorld(e.clientX, e.clientY);

      if (this.mode === 'crank') {
        this.applyAngle(world);
      } else if (this.mode === 'control') {
        this.cb.onControlMove(this.controlIndex, world);
      } else if (this.mode === 'pan') {
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;
        if (Math.abs(e.clientX - this.downAt.x) + Math.abs(e.clientY - this.downAt.y) > 3) {
          // Once it is a drag it is no longer a click, so drop the pending pick.
          this.pendingSelection = undefined;
        }
        scene.panByPixels(dx, dy);
      } else {
        const hit = viewer.pick(world);
        viewer.setActiveControl(hit.target);
        el.style.cursor =
          hit.target !== null
            ? 'grab'
            : this.hitsCrank(world)
              ? 'grab'
              : hit.selection
                ? 'pointer'
                : 'default';
      }
      this.lastPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.mode === 'crank') this.cb.onGrabChange?.(false);
      if (this.mode === 'control') viewer.setActiveControl(null);
      // A press-and-release without meaningful movement is a click: commit the
      // selection resolved at press time.
      if (this.mode === 'pan' && this.pendingSelection !== undefined) {
        this.cb.onSelect(this.pendingSelection);
      }
      this.pendingSelection = undefined;
      this.mode = null;
      this.controlIndex = -1;
      el.style.cursor = 'default';
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scene.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12, scene.toWorld(e.clientX, e.clientY));
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

  /** Selection resolved on press, committed on release if it was a click. */
  private pendingSelection: Selection | undefined = undefined;

  get isDraggingCrank(): boolean {
    return this.mode === 'crank';
  }

  /** Hit test: near the crank pin, or within a band around the crank body. */
  private hitsCrank(world: Vec2): boolean {
    const pin = this.viewer.crankTip;
    const O2 = this.viewer.motorPivot;
    const tol = Math.max(10, this.viewer.scene.mmPerPixel * 14);
    if (dist(world, pin) < tol + 8) return true;

    const vx = pin.x - O2.x;
    const vy = pin.y - O2.y;
    const l2 = vx * vx + vy * vy;
    if (l2 < 1e-9) return false;
    const t = Math.max(0, Math.min(1, ((world.x - O2.x) * vx + (world.y - O2.y) * vy) / l2));
    return Math.hypot(world.x - (O2.x + vx * t), world.y - (O2.y + vy * t)) < tol;
  }

  private applyAngle(world: Vec2): void {
    const O2 = this.viewer.motorPivot;
    const raw = Math.atan2(world.y - O2.y, world.x - O2.x);
    // Angle unwrap keeps the motor angle continuous across the +/-pi seam.
    this.cb.onAngle(unwrapAngle(this.cb.getTheta(), raw));
  }

  dispose(): void {
    for (const d of this.detachers) d();
    this.detachers = [];
  }
}
