import { dyadJointId } from '../mechanism/spec';
import type { Pose } from '../mechanism/types';
import type { BranchState } from '../kinematics/forwardSolver';

/**
 * Branch seed for a neighbouring-angle solve.  Finite-difference derivatives
 * must stay on the same assembly branch as the pose they differentiate, or the
 * difference straddles two configurations and the result is meaningless.
 */
export function branchSeed(pose: Pose): BranchState {
  const out = [];
  for (let k = 0; ; k++) {
    const p = pose.points[dyadJointId(k)];
    if (!p) break;
    out.push(p);
  }
  return out;
}
