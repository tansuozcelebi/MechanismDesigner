import * as THREE from 'three';
import type { Geometry } from '../mechanism/mechanism';
import { topologyOf } from '../mechanism/topology';
import type { Pose } from '../mechanism/types';
import { THEME } from './theme';
import { Z, makeDisc, makeRing, disposeTree } from './Scene';

/**
 * Ground pivots, moving revolute pairs and the LED.
 *
 * One marker per POINT, not per joint: several revolute pairs can sit on the
 * same rigid point, and drawing a stack of identical rings there would just look
 * like a rendering artefact.
 */
const GROUND_R = 9;
const MOVING_R = 7;

type Marker = { pointId: string; holder: THREE.Object3D; ring?: THREE.Mesh };

export class JointRenderer {
  readonly group = new THREE.Group();
  private markers: Marker[] = [];
  private ledDot: THREE.Mesh;
  private ledGlow: THREE.Mesh;

  constructor() {
    this.ledGlow = makeDisc(16, THEME.ledGlow, 40);
    (this.ledGlow.material as THREE.MeshBasicMaterial).opacity = 0.22;
    this.ledGlow.position.z = Z.led;
    this.group.add(this.ledGlow);

    this.ledDot = makeDisc(6.5, THEME.led, 32);
    this.ledDot.position.z = Z.led + 1;
    this.group.add(this.ledDot);
  }

  /** Rebuild markers for a mechanism. Call when the spec changes. */
  build(geo: Geometry): void {
    for (const m of this.markers) {
      this.group.remove(m.holder);
      disposeTree(m.holder);
    }
    this.markers = [];

    const topo = topologyOf(geo.spec);
    const seen = new Map<string, 'fixed' | 'revolute'>();
    for (const j of topo.joints) {
      const prev = seen.get(j.pointId);
      // A point is drawn as ground if any pair there is grounded.
      seen.set(j.pointId, prev === 'fixed' ? 'fixed' : j.kind);
    }

    for (const [pointId, kind] of seen) {
      const holder = new THREE.Group();
      if (kind === 'fixed') {
        holder.add(this.makeGroundSymbol());
        const body = makeDisc(GROUND_R, THEME.groundPivot);
        body.position.z = Z.joint + 1;
        holder.add(body);
        const core = makeDisc(GROUND_R * 0.35, THEME.jointCore);
        core.position.z = Z.joint + 2;
        holder.add(core);
        holder.position.z = Z.joint;
        this.group.add(holder);
        this.markers.push({ pointId, holder });
      } else {
        const ring = makeRing(MOVING_R * 0.55, MOVING_R, THEME.movingJoint);
        ring.position.z = Z.joint + 1;
        holder.add(ring);
        const core = makeDisc(MOVING_R * 0.3, THEME.movingJoint);
        core.position.z = Z.joint + 2;
        holder.add(core);
        holder.position.z = Z.joint;
        this.group.add(holder);
        this.markers.push({ pointId, holder, ring });
      }
    }
  }

  /** Standard hatched ground symbol under a fixed pivot. */
  private makeGroundSymbol(): THREE.Object3D {
    const g = new THREE.Group();
    const w = 22;
    const h = 16;

    const tri = new THREE.Shape();
    tri.moveTo(0, 0);
    tri.lineTo(-w / 2, -h);
    tri.lineTo(w / 2, -h);
    tri.lineTo(0, 0);
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(tri),
      new THREE.MeshBasicMaterial({ color: THEME.groundHatch, transparent: true, opacity: 0.5 }),
    );
    mesh.position.z = Z.ground;
    g.add(mesh);

    const pts: number[] = [];
    const baseY = -h;
    pts.push(-w / 2 - 4, baseY, Z.ground, w / 2 + 4, baseY, Z.ground);
    for (let i = -3; i <= 3; i++) {
      const x = (i * w) / 7;
      pts.push(x, baseY, Z.ground, x - 5, baseY - 6, Z.ground);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: THEME.groundHatch })));
    return g;
  }

  update(pose: Pose, selectedPoint?: string | null): void {
    for (const m of this.markers) {
      const p = pose.points[m.pointId];
      if (!p) continue;
      m.holder.position.x = p.x;
      m.holder.position.y = p.y;
      if (m.ring) {
        (m.ring.material as THREE.MeshBasicMaterial).color.setHex(
          selectedPoint === m.pointId ? THEME.selection : THEME.movingJoint,
        );
      }
    }
    this.ledDot.position.x = pose.led.x;
    this.ledDot.position.y = pose.led.y;
    this.ledGlow.position.x = pose.led.x;
    this.ledGlow.position.y = pose.led.y;
  }

  /** Nearest drawn point to a world position, for canvas picking. */
  hitTest(
    pose: Pose,
    world: { x: number; y: number },
    tolerance: number,
  ): { pointId: string; distance: number } | null {
    let best: { pointId: string; distance: number } | null = null;
    for (const m of this.markers) {
      const p = pose.points[m.pointId];
      if (!p) continue;
      const d = Math.hypot(world.x - p.x, world.y - p.y);
      if (d < tolerance && (!best || d < best.distance)) best = { pointId: m.pointId, distance: d };
    }
    return best;
  }

  /** Keep markers a constant size on screen regardless of zoom. */
  setScale(mmPerPixel: number): void {
    const s = Math.max(0.35, Math.min(3, mmPerPixel / 0.6));
    for (const m of this.markers) m.holder.scale.setScalar(s);
    this.ledDot.scale.setScalar(s);
    this.ledGlow.scale.setScalar(s);
  }

  dispose(): void {
    disposeTree(this.group);
  }
}
