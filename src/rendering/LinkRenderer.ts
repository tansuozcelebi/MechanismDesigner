import * as THREE from 'three';
import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { LINKS } from '../mechanism/topology';
import type { JointId, LinkId, Pose } from '../mechanism/types';
import { THEME } from './theme';
import { Z, makeCapsuleGeometry, makePolyline, disposeTree } from './Scene';
import type { Vec2 } from '../utils/math';

/**
 * Draws each rigid body as its real 12 mm wide bars (brief §30).
 *
 * Geometry is created once per design and only the transforms are updated per
 * frame (brief §54) — each member is a unit-length capsule scaled and rotated
 * into place, so an animation frame costs a handful of matrix writes.
 */
type MemberView = {
  linkId: LinkId;
  from: JointId | 'P_LED';
  to: JointId | 'P_LED';
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  centreLine: THREE.Line;
};

const ROLE_COLOR: Record<string, number> = {
  input: THEME.linkInput,
  output: THEME.linkOutput,
  coupler: THEME.linkDefault,
  rocker: THEME.linkDefault,
  binary: THEME.linkDefault,
  ground: THEME.ground,
};

export class LinkRenderer {
  readonly group = new THREE.Group();
  private members: MemberView[] = [];
  private labelGroup = new THREE.Group();

  constructor() {
    this.group.add(this.labelGroup);
  }

  /** Rebuild geometry — call only when the design (not the pose) changes. */
  build(geo: Geometry): void {
    this.clear();

    for (const mem of geo.members) {
      const link = LINKS.find((l) => l.id === mem.linkId)!;
      const baseColor = ROLE_COLOR[link.role] ?? THEME.linkDefault;

      // Built at the member's true length.  A unit capsule scaled in x would
      // stretch the semicircular end caps by the same factor and draw a wedge
      // hundreds of millimetres long instead of a 12 mm wide bar.  Member
      // lengths are rigid-body constants, so nothing is lost by baking them in:
      // each frame still only writes a position and a rotation.
      const geom = makeCapsuleGeometry(mem.length, CONFIG.linkWidth);
      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.z = Z.link;
      this.group.add(mesh);

      const centreLine = makePolyline(
        [
          { x: 0, y: 0 },
          { x: mem.length, y: 0 },
        ],
        baseColor,
        Z.link + 0.5,
      );
      this.group.add(centreLine);

      this.members.push({
        linkId: mem.linkId,
        from: mem.from,
        to: mem.to,
        mesh,
        material,
        centreLine,
      });
    }
  }

  /**
   * Per-frame update: transform only.
   *
   * `collidingMembers` holds indices of the individual bars that interfere, not
   * whole bodies — flagging a whole ternary link red because one of its three
   * bars grazes another body hides which bar is actually the problem.
   */
  update(
    pose: Pose,
    collidingMembers: Set<number>,
    layerOf?: Record<string, number>,
  ): void {
    const at = (id: JointId | 'P_LED'): Vec2 => (id === 'P_LED' ? pose.led : pose.joints[id]);

    for (let idx = 0; idx < this.members.length; idx++) {
      const m = this.members[idx];
      const a = at(m.from);
      const b = at(m.to);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);

      m.mesh.position.set(a.x, a.y, Z.link + (layerOf?.[m.linkId] ?? 0) * 0.01);
      m.mesh.rotation.z = ang;

      m.centreLine.position.set(a.x, a.y, Z.link + 0.5);
      m.centreLine.rotation.z = ang;

      const link = LINKS.find((l) => l.id === m.linkId)!;
      const colliding = collidingMembers.has(idx);
      const baseColor = ROLE_COLOR[link.role] ?? THEME.linkDefault;
      const color = colliding ? THEME.linkCollide : baseColor;
      m.material.color.setHex(color);
      // Deeper assembly layers are drawn slightly fainter so the stacking order
      // is readable without hiding anything.
      const layerFade = 1 - 0.12 * Math.min(3, layerOf?.[m.linkId] ?? 0);
      m.material.opacity = (colliding ? 0.8 : 0.55) * layerFade;
      // The centre line always keeps the body's role colour.  Coplanar
      // interference is common in this topology, so tinting the whole bar red
      // would otherwise hide which body is the input crank and which is the
      // LED-carrying output.
      (m.centreLine.material as THREE.LineBasicMaterial).color.setHex(baseColor);
    }
  }

  clear(): void {
    for (const m of this.members) {
      this.group.remove(m.mesh);
      this.group.remove(m.centreLine);
      disposeTree(m.mesh);
      disposeTree(m.centreLine);
    }
    this.members = [];
  }

  dispose(): void {
    this.clear();
    disposeTree(this.labelGroup);
  }
}
