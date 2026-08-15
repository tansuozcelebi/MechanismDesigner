import type { Vec2 } from '../utils/math';
import type { MechanismSpec } from './spec';

/**
 * Ids are plain strings because the mechanism size is chosen at runtime; a
 * closed union of joint names can only describe one fixed topology.
 */
export type JointId = string;
export type LinkId = string;

export type JointKind = 'fixed' | 'revolute';

export type Joint = {
  /**
   * Identifies the PAIR, not the location.  Two bodies can be pinned at the
   * same rigid point — a bar that carries an attachment point used by two later
   * dyads has two coincident revolute pairs there — so pair id and point id are
   * deliberately different things.  Conflating them undercounts the joints and
   * corrupts the mobility calculation.
   */
  id: JointId;
  /** Where the pair physically sits; several pairs may share one point. */
  pointId: JointId;
  kind: JointKind;
  /** The two bodies this revolute pair connects. */
  links: [LinkId, LinkId];
  label: string;
};

export type LinkRole = 'ground' | 'input' | 'coupler' | 'rocker' | 'binary' | 'output';

/**
 * A rigid body. Not restricted to two joints — a bar that carries an extra
 * attachment point is ternary.
 */
export type Link = {
  id: LinkId;
  jointIds: JointId[];
  role: LinkRole;
  label: string;
  /** Rigid points that are not kinematic pairs (the LED). */
  markerIds?: string[];
  dyad?: number;
  side?: 'A' | 'B';
};

/** Physical member of a rigid body — the bit that is actually printed. */
export type LinkMember = {
  linkId: LinkId;
  from: JointId;
  to: JointId;
  length: number;
};

export type Topology = {
  spec: MechanismSpec;
  links: Link[];
  joints: Joint[];
  /** Grübler–Kutzbach mobility. */
  mobility: number;
  /** Independent loop count j − n + 1. */
  loopCount: number;
  loops: string[];
};

/** A fully solved instant of the mechanism. */
export type Pose = {
  theta: number;
  /** Every point in the mechanism, by id: ground pivots, joints, extras, LED. */
  points: Record<JointId, Vec2>;
  led: Vec2;
  /** Orientation of each moving body (rad) — used for inertia terms. */
  linkAngles: Record<LinkId, number>;
  /** Max residual of all loop closure equations, mm. */
  loopClosureError: number;
  /** Smallest singular value of ∂F/∂q. */
  sigmaMin: number;
  /** Transmission angle of each dyad, degrees, in [0, 180]. */
  transmissionAngles: number[];
  ok: true;
};

export type PoseFailure = {
  theta: number;
  ok: false;
  reason: string;
  /** Smooth measure of how far this configuration is from assemblable, mm. */
  gap: number;
};

export type PoseResult = Pose | PoseFailure;
