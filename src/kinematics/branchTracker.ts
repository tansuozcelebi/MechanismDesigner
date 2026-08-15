import { CONFIG } from '../mechanism/config';
import type { Pose } from '../mechanism/types';
import { dist, type Vec2 } from '../utils/math';

/**
 * Continuity watchdog (brief §10).  A mathematically valid mechanism can have
 * several assembly modes; jumping between them mid-animation produces a
 * plausible-looking but physically impossible motion.  We keep the previous
 * frame and flag any discontinuous joint motion.
 */
export class BranchTracker {
  private prev: { B: Vec2; E: Vec2; F: Vec2 } | null = null;
  public jumps = 0;
  public lastJumpMagnitude = 0;

  reset(): void {
    this.prev = null;
    this.jumps = 0;
    this.lastJumpMagnitude = 0;
  }

  get state(): { B: Vec2; E: Vec2; F: Vec2 } | null {
    return this.prev;
  }

  /**
   * @param maxStep Expected upper bound on joint travel between the two frames.
   *   Pass a larger value when the angle step is large (e.g. mouse dragging).
   * @returns true when the new pose is continuous with the previous one.
   */
  accept(pose: Pose, maxStep: number = CONFIG.assemblyJumpTol): boolean {
    const next = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
    let ok = true;
    if (this.prev) {
      const jump = Math.max(
        dist(this.prev.B, next.B),
        dist(this.prev.E, next.E),
        dist(this.prev.F, next.F),
      );
      this.lastJumpMagnitude = jump;
      if (jump > maxStep) {
        this.jumps++;
        ok = false;
      }
    }
    this.prev = next;
    return ok;
  }
}

export const ASSEMBLY_MODE_JUMP = 'ASSEMBLY MODE JUMP';
export const KINEMATIC_SOLUTION_FAILED = 'KINEMATIC SOLUTION FAILED';
