import * as THREE from 'three';
import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { topologyOf } from '../mechanism/topology';
import type { LinkId, Pose } from '../mechanism/types';
import { THEME } from './theme';
import { Z, makeCapsuleGeometry, makePolyline, disposeTree } from './Scene';

/**
 * Draws each rigid body as its real 12 mm wide bars.
 *
 * Geometry is created once per design and only transforms are updated per frame.
 * Member lengths are baked in rather than applied as an x scale: scaling a unit
 * capsule would stretch its semicircular end caps by the same factor and draw a
 * wedge hundreds of millimetres long instead of a bar.
 */
type MemberView = {
  linkId: LinkId;
  from: string;
  to: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  centreLine: THREE.Line;
  baseColor: number;
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

  /** Rebuild geometry — call only when the design (not the pose) changes. */
  build(geo: Geometry): void {
    this.clear();
    const topo = topologyOf(geo.spec);
    const roleOf = new Map(topo.links.map((l) => [l.id, l.role]));

    for (const mem of geo.members) {
      const baseColor = ROLE_COLOR[roleOf.get(mem.linkId) ?? 'binary'] ?? THEME.linkDefault;

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
        baseColor,
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
    selectedLink?: string | null,
    hoveredMember?: number | null,
  ): void {
    for (let idx = 0; idx < this.members.length; idx++) {
      const m = this.members[idx];
      const a = pose.points[m.from];
      const b = pose.points[m.to];
      if (!a || !b) continue;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);

      m.mesh.position.set(a.x, a.y, Z.link + (layerOf?.[m.linkId] ?? 0) * 0.01);
      m.mesh.rotation.z = ang;
      m.centreLine.position.set(a.x, a.y, Z.link + 0.5);
      m.centreLine.rotation.z = ang;

      const colliding = collidingMembers.has(idx);
      const selected = selectedLink === m.linkId;
      // Hover is per MEMBER, not per body: the hint describes one bar, and on a
      // ternary link lighting all three would point at the wrong one.
      const hovered = hoveredMember === idx;
      m.material.color.setHex(
        selected || hovered ? THEME.selection : colliding ? THEME.linkCollide : m.baseColor,
      );
      // Deeper assembly layers are drawn slightly fainter so the stacking order
      // is readable without hiding anything.
      const layerFade = 1 - 0.12 * Math.min(3, layerOf?.[m.linkId] ?? 0);
      m.material.opacity =
        (selected ? 0.95 : hovered ? 0.8 : colliding ? 0.8 : 0.55) * layerFade;
      // The centre line keeps the body role colour so the input crank and the
      // LED-carrying output stay identifiable even when everything is flagged.
      (m.centreLine.material as THREE.LineBasicMaterial).color.setHex(m.baseColor);
    }
  }

  /** Member index nearest to a world point, for canvas picking. */
  hitTest(
    geo: Geometry,
    pose: Pose,
    world: { x: number; y: number },
    tolerance: number,
  ): { memberIndex: number; linkId: LinkId; distance: number } | null {
    let best: { memberIndex: number; linkId: LinkId; distance: number } | null = null;
    geo.members.forEach((mem, i) => {
      const a = pose.points[mem.from];
      const b = pose.points[mem.to];
      if (!a || !b) return;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((world.x - a.x) * abx + (world.y - a.y) * aby) / l2));
      const d = Math.hypot(world.x - (a.x + abx * t), world.y - (a.y + aby * t));
      if (d < tolerance && (!best || d < best.distance)) {
        best = { memberIndex: i, linkId: mem.linkId, distance: d };
      }
    });
    return best;
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
  }
}
