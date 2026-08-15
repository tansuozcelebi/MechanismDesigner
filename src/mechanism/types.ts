import type { Vec2 } from '../utils/math';

export type JointId =
  | 'O2'
  | 'O4'
  | 'O6'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G';

export type LinkId = 'ground' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8';

export type JointKind = 'fixed' | 'revolute';

export type Joint = {
  id: JointId;
  kind: JointKind;
  /** The two links this revolute pair connects. */
  links: [LinkId, LinkId];
  label: string;
};

export type FixedJoint = { id: JointId; position: Vec2 };
export type RevoluteJoint = { id: JointId; position: Vec2 };

export type LinkRole = 'ground' | 'input' | 'coupler' | 'rocker' | 'binary' | 'output';

/**
 * A rigid body. Deliberately NOT restricted to two joints — links 3, 4, 6 are
 * ternary and link 8 carries the LED as an extra rigid point.
 */
export type Link = {
  id: LinkId;
  jointIds: JointId[];
  role: LinkRole;
  label: string;
  /** Extra rigid points that are not kinematic pairs (currently just the LED). */
  markerIds?: string[];
};

/** Physical member of a rigid body — the bit that is actually printed. */
export type LinkMember = {
  linkId: LinkId;
  from: JointId | 'P_LED';
  to: JointId | 'P_LED';
  length: number;
};

export type Topology = {
  links: Link[];
  joints: Joint[];
  /** Grubler-Kutzbach mobility. */
  mobility: number;
  /** Independent loop count j - n + 1. */
  loopCount: number;
  loops: string[];
};

/**
 * Design vector, in millimetres and degrees.
 *
 * Fixed by the brief (not optimised):
 *   O2 = (0,0), O4 = (120,0), |O2 O4| = 120, |O4 O6| = 120, crank |O2 A| = 50.
 *
 * Ternary links are parameterised by (radius, angle) of the third joint in the
 * body's local frame, which keeps the body rigid by construction.
 */
export type DesignVector = {
  /** Angular position of O6 on the 120 mm circle about O4 (deg). */
  phi6: number;

  /** Link 3 (coupler A-B-C). */
  lAB: number;
  c3r: number; // |A C|
  c3a: number; // angle of A->C from A->B, deg

  /** Link 4 (rocker O4-B-D). */
  lO4B: number;
  d4r: number; // |O4 D|
  d4a: number; // angle of O4->D from O4->B, deg

  /** Link 5 (binary C-E). */
  lCE: number;

  /** Link 6 (rocker O6-E-G). */
  lO6E: number;
  g6r: number; // |O6 G|
  g6a: number; // angle of O6->G from O6->E, deg

  /** Link 7 (binary D-F). */
  lDF: number;

  /** Link 8 (output G-F, carries the LED). */
  lGF: number;
  p8r: number; // |G P_LED|
  p8a: number; // angle of G->P from G->F, deg

  /** Branch selector for the three RRR dyads at theta = 0 (+1 / -1). */
  branch1: number;
  branch2: number;
  branch3: number;
};

export const DESIGN_KEYS = [
  'phi6',
  'lAB',
  'c3r',
  'c3a',
  'lO4B',
  'd4r',
  'd4a',
  'lCE',
  'lO6E',
  'g6r',
  'g6a',
  'lDF',
  'lGF',
  'p8r',
  'p8a',
] as const;

export type ContinuousKey = (typeof DESIGN_KEYS)[number];

/** A fully solved instant of the mechanism. */
export type Pose = {
  theta: number; // motor angle, rad
  joints: Record<JointId, Vec2>; // mm
  led: Vec2; // mm
  /** Body orientation of each moving link (rad) — used for inertia terms. */
  linkAngles: Record<Exclude<LinkId, 'ground'>, number>;
  /** Max residual of all loop closure equations, mm. */
  loopClosureError: number;
  /** Smallest singular value of dF/dq, mm-scaled. */
  sigmaMin: number;
  /** Transmission angles of the three RRR dyads, degrees, in [0,180]. */
  transmissionAngles: [number, number, number];
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
