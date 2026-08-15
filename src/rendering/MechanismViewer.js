import * as THREE from 'three';
import { CONFIG } from '../mechanism/config';
import { buildGeometry } from '../mechanism/mechanism';
import { solvePose, sweep } from '../kinematics/forwardSolver';
import { BranchTracker } from '../kinematics/branchTracker';
import { detectCollisions } from '../collision/collisionDetector';
import { Scene2D, Z } from './Scene';
import { LinkRenderer } from './LinkRenderer';
import { JointRenderer } from './JointRenderer';
import { TrailRenderer } from './TrailRenderer';
import { HeartRenderer } from './HeartRenderer';
import { DebugRenderer, DEFAULT_DEBUG } from './DebugRenderer';
import { THEME } from './theme';
export class MechanismViewer {
    scene;
    links = new LinkRenderer();
    joints = new JointRenderer();
    trail = new TrailRenderer();
    targetTrail = new TrailRenderer(THEME.target);
    heart = new HeartRenderer();
    debug = new DebugRenderer();
    tracker = new BranchTracker();
    geo;
    theta = 0;
    lastGood = null;
    branchState = null;
    omega = 0;
    gravityOn = true;
    debugOptions = { ...DEFAULT_DEBUG };
    state = {
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
     * Latest solved state, replaced (new object identity) on every solve.
     *
     * Deliberately a PULL interface rather than a callback.  Pushing this into
     * React from inside solvePose meant setState ran synchronously inside the
     * effect that drove the motor angle, so React counted every animation frame
     * as a nested update and eventually warned "Maximum update depth exceeded".
     * The render loop reads this once per frame instead, which is an ordinary
     * update outside the commit phase — and it also halves the renders per frame.
     */
    get viewerState() {
        return this.state;
    }
    constructor(canvas, design) {
        this.scene = new Scene2D(canvas);
        this.geo = buildGeometry(design);
        this.scene.world.add(this.heart.group);
        this.scene.world.add(this.trail.object);
        this.scene.world.add(this.targetTrail.object);
        this.scene.world.add(this.links.group);
        this.scene.world.add(this.joints.group);
        this.scene.world.add(this.debug.group);
        this.links.build(this.geo);
        this.setTheta(0, true);
    }
    /* -------------------------- design / state ------------------------- */
    setDesign(design, keepView = true) {
        this.geo = buildGeometry(design);
        this.links.build(this.geo);
        this.tracker.reset();
        this.branchState = null;
        this.lastGood = null;
        this.trail.clear();
        this.setTheta(this.theta, true);
        if (!keepView)
            this.fitView();
    }
    get geometry() {
        return this.geo;
    }
    get currentTheta() {
        return this.theta;
    }
    get currentPose() {
        return this.lastGood;
    }
    setOmega(w) {
        this.omega = w;
    }
    setGravity(on) {
        this.gravityOn = on;
    }
    /**
     * Solve and display one motor angle.
     *
     * On failure the last valid mechanism stays on screen (brief §42) rather than
     * blanking the canvas or propagating NaN.
     */
    setTheta(theta, reseed = false) {
        this.theta = theta;
        if (reseed) {
            this.branchState = null;
            this.tracker.reset();
        }
        const result = solvePose(this.geo, theta, this.branchState);
        if (!result.ok) {
            this.state = {
                ...this.state,
                theta,
                solverFailed: true,
                failureReason: result.reason,
            };
            this.branchState = null; // re-seed from the explicit assembly next time
            return;
        }
        // Mouse dragging can step the angle a long way in one frame, so the
        // continuity tolerance is widened accordingly rather than firing a false
        // ASSEMBLY MODE JUMP.
        const continuous = this.tracker.accept(result, CONFIG.assemblyJumpTol * 4);
        this.branchState = { B: result.joints.B, E: result.joints.E, F: result.joints.F };
        this.lastGood = result;
        const coll = detectCollisions(this.geo, result);
        this.links.update(result, coll.collidingMembers, this.layerOf);
        this.joints.update(result);
        this.trail.push(result.led);
        this.debug.update(this.geo, result, this.omega, this.debugOptions, this.gravityOn);
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
    /* ----------------------------- display ----------------------------- */
    targetPoints = [];
    layerOf;
    setTargetHeart(points) {
        this.targetPoints = points;
        this.heart.setCurve(points);
    }
    /** Assembly layer per body, used for the depth shading. */
    setLayers(layerOf) {
        this.layerOf = layerOf;
    }
    setShowTarget(v) {
        this.heart.visible = v;
    }
    setShowTrail(v) {
        this.trail.visible = v;
    }
    setShowIdealPath(points) {
        if (points)
            this.targetTrail.setPath(points);
        else
            this.targetTrail.clear();
    }
    setShowGrid(v) {
        this.scene.setGridVisible(v);
    }
    setDebug(on, options) {
        this.debug.visible = on;
        if (options)
            this.debugOptions = { ...this.debugOptions, ...options };
        if (on && this.lastGood) {
            this.debug.update(this.geo, this.lastGood, this.omega, this.debugOptions, this.gravityOn);
        }
    }
    clearTrail() {
        this.trail.clear();
    }
    /** Preload the trail with a full analytic revolution. */
    showFullPath(sw) {
        const s = sw ?? sweep(this.geo, CONFIG.samplesFine, { computeSigma: false });
        if (s.poses.length)
            this.trail.setPath(s.poses.map((p) => p.led));
    }
    /**
     * Frame everything the user needs to see at once.
     *
     * The bounds come from two sources, unioned:
     *
     *   1. The actual scene graph (THREE.Box3 over the drawn groups).  This is
     *      what is really on screen — including things easy to forget in manual
     *      bookkeeping, such as the hatched ground symbols that hang below each
     *      fixed pivot and the 250 mm target reference box.  Deriving the fit
     *      from my own list of points is exactly how content ended up clipped at
     *      the canvas edge.
     *   2. The swept envelope of every joint over a full revolution, so the view
     *      does not need to change while the mechanism animates.
     */
    fitView() {
        const pts = [this.geo.O2, this.geo.O4, this.geo.O6, ...this.targetPoints];
        const s = sweep(this.geo, 120, { computeSigma: false });
        for (const p of s.poses) {
            pts.push(p.led);
            for (const key of Object.keys(p.joints))
                pts.push(p.joints[key]);
        }
        // Whatever is actually drawn, measured from the scene graph.
        const box = new THREE.Box3();
        for (const group of [this.links.group, this.joints.group, this.trail.object, this.heart.group]) {
            if (!group.visible)
                continue;
            box.expandByObject(group);
        }
        if (!box.isEmpty() && Number.isFinite(box.min.x) && Number.isFinite(box.max.x)) {
            pts.push({ x: box.min.x, y: box.min.y }, { x: box.max.x, y: box.max.y });
        }
        this.scene.fitTo(pts);
    }
    resize(w, h) {
        this.scene.resize(w, h);
        this.applyScreenScales();
    }
    applyScreenScales() {
        const mmPerPixel = this.scene.mmPerPixel;
        this.joints.setScale(mmPerPixel);
        this.debug.setScale(mmPerPixel);
    }
    render() {
        this.applyScreenScales();
        this.scene.render();
    }
    dispose() {
        this.links.dispose();
        this.joints.dispose();
        this.trail.dispose();
        this.targetTrail.dispose();
        this.heart.dispose();
        this.debug.dispose();
        this.scene.dispose();
    }
}
export { Z, THREE };
