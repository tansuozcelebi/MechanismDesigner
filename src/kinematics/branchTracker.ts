import { CONFIG } from '../mechanism/config';
import type { Pose } from '../mechanism/types';
import { dyadJointId } from '../mechanism/spec';
import { dist, type Vec2 } from '../utils/math';

/**
 * Continuity watchdog (brief §10).  A mathematically valid mechanism can have
 * several assembly modes; jumping between them mid-animation produces a
 * plausible-looking but physically impossible motion.  We keep the previous
 * frame and flag any discontinuous joint motion.
 */
export class BranchTracker {
  private prev: Vec2[] | null = null;
  public jumps = 0;
  public lastJumpMagnitude = 0;

  reset(): void {
    this.prev = null;
    this.jumps = 0;
    this.lastJumpMagnitude = 0;
  }

  get state(): Vec2[] | null {
    return this.prev;
  }

  /**
   * @param maxStep Expected upper bound on joint travel between the two frames.
   *   Pass a larger value when the angle step is large (e.g. mouse dragging).
   * @returns true when the new pose is continuous with the previous one.
   */
  accept(pose: Pose, maxStep: number = CONFIG.assemblyJumpTol): boolean {
    const next: Vec2[] = [];
    for (let k = 0; ; k++) {
      const p = pose.points[dyadJointId(k)];
      if (!p) break;
      next.push(p);
    }
    let ok = true;
    if (this.prev && this.prev.length === next.length) {
      let jump = 0;
      for (let k = 0; k < next.length; k++) jump = Math.max(jump, dist(this.prev[k], next[k]));
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
