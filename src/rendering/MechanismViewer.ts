import * as THREE from 'three';
import { CONFIG } from '../mechanism/config';
import { buildGeometry, type Geometry } from '../mechanism/mechanism';
import { dyadJointId, groundJointId, type MechanismSpec } from '../mechanism/spec';
import type { LinkId, Pose } from '../mechanism/types';
import { solvePose, sweep, type BranchState, type Sweep } from '../kinematics/forwardSolver';
import { BranchTracker } from '../kinematics/branchTracker';
import { detectCollisions } from '../collision/collisionDetector';
import { Scene2D, Z } from './Scene';
import { LinkRenderer } from './LinkRenderer';
import { JointRenderer } from './JointRenderer';
import { TrailRenderer } from './TrailRenderer';
import { TargetRenderer } from './TargetRenderer';
import { DebugRenderer, DEFAULT_DEBUG, type DebugOptions } from './DebugRenderer';
import { THEME } from './theme';
import type { Vec2 } from '../utils/math';

/**
 * Owns the Three.js scene and the kinematic state.  Deliberately framework
 * independent: React drives it through plain method calls and reads state back,
 * so the solver never lives inside a component's render cycle.
 */
export type Selection =
  | { kind: 'link'; linkId: LinkId; memberIndex: number }
  | { kind: 'point'; pointId: string }
  | null;

export type ViewerState = {
  theta: number;
  pose: Pose | null;
  solverFailed: boolean;
  failureReason: string | null;
  assemblyJump: boolean;
  collidingLinks: Set<LinkId>;
  collidingMembers: Set<number>;
  collisionCount: number;
  minMemberDistance: number;
};

export class MechanismViewer {
  readonly scene: Scene2D;
  readonly links = new LinkRenderer();
  readonly joints = new JointRenderer();
  readonly target = new TargetRenderer();
  private trail = new TrailRenderer();
  private debug = new DebugRenderer();
  private tracker = new BranchTracker();

  private geo: Geometry;
  private theta = 0;
  private lastGood: Pose | null = null;
  private branchState: BranchState = null;
  private omega = 0;
  private gravityOn = true;
  private debugOptions: DebugOptions = { ...DEFAULT_DEBUG };
  private targetPoints: Vec2[] = [];
  private layerOf: Record<string, number> | undefined;
  private selection: Selection = null;
  private hover: Selection = null;

  private state: ViewerState = {
    theta: 0,
    pose: null,
    solverFailed: false,
    failureReason: null,
    assemblyJump: false,
    collidingLinks: new Set(),
    collidingMembers: new Set(),
    collisionCount: 0,
    minMemberDistance: Infinity,
  };

  /**
   * Latest solved state, replaced on every solve.  A PULL interface: pushing it
   * into React from inside the solver made setState run within the effect that
   * drives the motor angle, so React counted every animation frame as a nested
   * update.  The render loop reads this once per frame instead.
   */
  get viewerState(): ViewerState {
    return this.state;
  }

  constructor(canvas: HTMLCanvasElement, spec: MechanismSpec, params: number[]) {
    this.scene = new Scene2D(canvas);
    this.geo = buildGeometry(spec, params);

    this.scene.world.add(this.target.group);
    this.scene.world.add(this.trail.object);
    this.scene.world.add(this.links.group);
    this.scene.world.add(this.joints.group);
    this.scene.world.add(this.debug.group);

    this.links.build(this.geo);
    this.joints.build(this.geo);
    this.setTheta(0, true);
  }

  /* -------------------------- design / state ------------------------- */

  setDesign(spec: MechanismSpec, params: number[]): void {
    const specChanged = spec !== this.geo.spec;
    this.geo = buildGeometry(spec, params);
    this.links.build(this.geo);
    // Joint markers depend only on the topology, so they are rebuilt only when
    // the mechanism family changes — not on every parameter tweak.
    if (specChanged) this.joints.build(this.geo);
    this.tracker.reset();
    this.branchState = null;
    this.lastGood = null;
    this.trail.clear();
    this.setTheta(this.theta, true);
  }

  get geometry(): Geometry {
    return this.geo;
  }

  get currentTheta(): number {
    return this.theta;
  }

  get currentPose(): Pose | null {
    return this.lastGood;
  }

  setOmega(w: number): void {
    this.omega = w;
  }

  setGravity(on: boolean): void {
    this.gravityOn = on;
  }

  setSelection(sel: Selection): void {
    this.selection = sel;
    if (this.lastGood) this.paint(this.lastGood);
  }

  get currentSelection(): Selection {
    return this.selection;
  }

  /**
   * What the cursor is over.  Kept separate from the selection so hovering never
   * disturbs what the user deliberately picked, and repainted immediately so the
   * highlight tracks the pointer even while playback is paused.
   */
  setHover(sel: Selection): void {
    this.hover = sel;
    if (this.lastGood) this.paint(this.lastGood);
  }

  get currentHover(): Selection {
    return this.hover;
  }

  /**
   * Solve and display one motor angle.  On failure the last valid mechanism
   * stays on screen rather than blanking the canvas or propagating NaN.
   */
  setTheta(theta: number, reseed = false): void {
    this.theta = theta;
    if (reseed) {
      this.branchState = null;
      this.tracker.reset();
    }

    const result = solvePose(this.geo, theta, this.branchState);

    if (!result.ok) {
      this.state = { ...this.state, theta, solverFailed: true, failureReason: result.reason };
      this.branchState = null;
      return;
    }

    // Mouse dragging can step the angle a long way in one frame, so the
    // continuity tolerance is widened rather than firing a false jump warning.
    const continuous = this.tracker.accept(result, CONFIG.assemblyJumpTol * 4);
    this.branchState = this.geo.spec.dyads.map((_, k) => result.points[dyadJointId(k)]);
    this.lastGood = result;

    const coll = this.paint(result);
    this.trail.push(result.led);

    this.state = {
      theta,
      pose: result,
      solverFailed: false,
      failureReason: null,
      assemblyJump: !continuous,
      collidingLinks: coll.collidingLinks,
      collidingMembers: coll.collidingMembers,
      collisionCount: coll.count,
      minMemberDistance: coll.minDistance,
    };
  }

  private paint(pose: Pose) {
    const coll = detectCollisions(this.geo, pose);
    this.links.update(
      pose,
      coll.collidingMembers,
      this.layerOf,
      this.selection?.kind === 'link' ? this.selection.linkId : null,
      this.hover?.kind === 'link' ? this.hover.memberIndex : null,
    );
    this.joints.update(
      pose,
      this.selection?.kind === 'point' ? this.selection.pointId : null,
      this.hover?.kind === 'point' ? this.hover.pointId : null,
    );
    this.debug.update(this.geo, pose, this.omega, this.debugOptions, this.gravityOn);
    return coll;
  }

  /* ----------------------------- picking ----------------------------- */

  /** Pick what is under a world point: a control handle, a joint, or a bar. */
  pick(world: Vec2): { target: number | null; selection: Selection } {
    const tol = Math.max(6, this.scene.mmPerPixel * 12);
    const handle = this.target.hitTest(world, Math.max(8, this.scene.mmPerPixel * 14));
    if (handle !== null) return { target: handle, selection: null };

    const pose = this.lastGood;
    if (!pose) return { target: null, selection: null };

    const j = this.joints.hitTest(pose, world, tol + 4);
    if (j) return { target: null, selection: { kind: 'point', pointId: j.pointId } };

    const m = this.links.hitTest(this.geo, pose, world, tol);
    if (m) {
      return {
        target: null,
        selection: { kind: 'link', linkId: m.linkId, memberIndex: m.memberIndex },
      };
    }
    return { target: null, selection: null };
  }

  /* ----------------------------- display ----------------------------- */

  setTarget(points: Vec2[], controls: Vec2[], showBox = true): void {
    this.targetPoints = points;
    this.target.setCurve(points, controls, showBox);
  }

  setTargetEditing(on: boolean): void {
    this.target.setEditing(on);
  }

  setActiveControl(index: number | null): void {
    this.target.setActiveControl(index);
  }

  setLayers(layerOf: Record<string, number> | undefined): void {
    this.layerOf = layerOf;
  }

  setShowTarget(v: boolean): void {
    this.target.visible = v;
  }

  setShowTrail(v: boolean): void {
    this.trail.visible = v;
  }

  setShowGrid(v: boolean): void {
    this.scene.setGridVisible(v);
  }

  setDebug(on: boolean, options?: Partial<DebugOptions>): void {
    this.debug.visible = on;
    if (options) this.debugOptions = { ...this.debugOptions, ...options };
    if (on && this.lastGood) {
      this.debug.update(this.geo, this.lastGood, this.omega, this.debugOptions, this.gravityOn);
    }
  }

  clearTrail(): void {
    this.trail.clear();
  }

  /** Preload the trail with a full analytic revolution. */
  showFullPath(sw?: Sweep): void {
    const s = sw ?? sweep(this.geo, CONFIG.samplesFine, { computeSigma: false });
    if (s.poses.length) this.trail.setPath(s.poses.map((p) => p.led));
  }

  /**
   * Frame everything the user needs to see at once.
   *
   * Bounds come from two sources, unioned: the actual scene graph (which
   * includes markers sized in screen space, such as the hatched ground symbols
   * and the LED glow), and the swept envelope of every joint over a full
   * revolution so the view need not change while the mechanism animates.
   */
  fitView(): void {
    const pts: Vec2[] = [...this.geo.ground, ...this.targetPoints];

    const s = sweep(this.geo, 120, { computeSigma: false });
    for (const p of s.poses) {
      pts.push(p.led);
      for (const key of Object.keys(p.points)) pts.push(p.points[key]);
    }

    const box = new THREE.Box3();
    for (const group of [this.links.group, this.joints.group, this.trail.object, this.target.group]) {
      if (!group.visible) continue;
      box.expandByObject(group);
    }
    if (!box.isEmpty() && Number.isFinite(box.min.x) && Number.isFinite(box.max.x)) {
      pts.push({ x: box.min.x, y: box.min.y }, { x: box.max.x, y: box.max.y });
    }

    this.scene.fitTo(pts);
  }

  /** Ground pivot positions, for the crank-drag anchor. */
  get motorPivot(): Vec2 {
    return this.geo.ground[0] ?? { x: 0, y: 0 };
  }

  get crankTip(): Vec2 {
    return this.lastGood?.points.A ?? this.motorPivot;
  }

  get groundIds(): string[] {
    return this.geo.ground.map((_, i) => groundJointId(i));
  }

  resize(w: number, h: number): void {
    this.scene.resize(w, h);
    this.applyScreenScales();
  }

  private applyScreenScales(): void {
    const mmPerPixel = this.scene.mmPerPixel;
    this.joints.setScale(mmPerPixel);
    this.debug.setScale(mmPerPixel);
    this.target.setScale(mmPerPixel);
  }

  render(): void {
    this.applyScreenScales();
    this.scene.render();
  }

  dispose(): void {
    this.links.dispose();
    this.joints.dispose();
    this.trail.dispose();
    this.target.dispose();
    this.debug.dispose();
    this.scene.dispose();
  }
}

export { Z, THREE, THEME };
