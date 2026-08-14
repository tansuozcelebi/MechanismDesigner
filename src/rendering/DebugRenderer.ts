import * as THREE from 'three';
import type { Geometry } from '../mechanism/mechanism';
import { JOINTS, LINKS } from '../mechanism/topology';
import type { JointId, Pose } from '../mechanism/types';
import { poseMassProperties } from '../dynamics/massProperties';
import { jointVelocities } from '../dynamics/velocity';
import { loopVectors } from '../kinematics/loopClosure';
import { THEME } from './theme';
import { Z, makeDisc, disposeTree } from './Scene';
import { makeLabel, scaleLabel, type Label } from './labels';
import { midpoint, type Vec2 } from '../utils/math';

/**
 * Engineering verification overlay (brief §38): joint and link names,
 * coordinates, loop-closure walks, centres of mass, velocity and gravity
 * vectors, and live transmission angles.
 */
export type DebugOptions = {
  names: boolean;
  coordinates: boolean;
  loops: boolean;
  com: boolean;
  velocity: boolean;
  gravity: boolean;
  transmission: boolean;
};

export const DEFAULT_DEBUG: DebugOptions = {
  names: true,
  coordinates: true,
  loops: true,
  com: true,
  velocity: true,
  gravity: true,
  transmission: true,
};

export class DebugRenderer {
  readonly group = new THREE.Group();
  private dynamic = new THREE.Group();
  private labels: Label[] = [];
  private mmPerPixel = 1;

  constructor() {
    this.group.add(this.dynamic);
    this.group.visible = false;
  }

  set visible(v: boolean) {
    this.group.visible = v;
  }

  setScale(mmPerPixel: number): void {
    this.mmPerPixel = mmPerPixel;
    for (const l of this.labels) scaleLabel(l, mmPerPixel);
  }

  private addLabel(text: string, at: Vec2, color: string, dy = 0): void {
    const label = makeLabel(text, color);
    label.sprite.position.set(at.x, at.y + dy, Z.label);
    scaleLabel(label, this.mmPerPixel);
    this.dynamic.add(label.sprite);
    this.labels.push(label);
  }

  private addArrow(from: Vec2, to: Vec2, color: number): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    const dir = new THREE.Vector3(dx / len, dy / len, 0);
    const arrow = new THREE.ArrowHelper(
      dir,
      new THREE.Vector3(from.x, from.y, Z.debug),
      len,
      color,
      Math.min(len * 0.3, 12),
      Math.min(len * 0.2, 7),
    );
    this.dynamic.add(arrow);
  }

  private addSegments(pts: number[], color: number, opacity = 1): void {
    if (!pts.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.dynamic.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
      ),
    );
  }

  /** Rebuilt every frame — only active while the debug panel is open. */
  update(geo: Geometry, pose: Pose, omega: number, opts: DebugOptions, gravityOn: boolean): void {
    if (!this.group.visible) return;

    this.dynamic.clear();
    // Sprite materials are shared through the texture cache; only the sprite
    // wrappers are discarded here.
    this.labels = [];

    const { joints, led } = pose;

    if (opts.names) {
      for (const j of JOINTS) {
        this.addLabel(j.id, joints[j.id], j.kind === 'fixed' ? '#e8eef7' : '#9fb3cc', 14);
      }
      this.addLabel('P_LED', led, '#ff8fa3', 16);

      for (const link of LINKS) {
        if (link.id === 'ground') continue;
        const pts = link.jointIds.map((id) => joints[id as JointId]);
        const c = pts.reduce(
          (acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }),
          { x: 0, y: 0 },
        );
        this.addLabel(link.id, c, '#7f93ad', -12);
      }
    }

    if (opts.coordinates) {
      for (const j of JOINTS) {
        const p = joints[j.id];
        this.addLabel(`(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`, p, '#61708a', -14);
      }
      this.addLabel(`(${led.x.toFixed(1)}, ${led.y.toFixed(1)})`, led, '#c98a99', -16);
    }

    if (opts.loops) {
      const vecs = loopVectors(joints);
      const byLoop: number[][] = [[], [], []];
      for (const v of vecs) byLoop[v.loop].push(v.from.x, v.from.y, Z.debug, v.to.x, v.to.y, Z.debug);
      byLoop.forEach((pts, i) => this.addSegments(pts, THEME.loopVec[i], 0.8));
    }

    if (opts.com || opts.gravity) {
      const props = poseMassProperties(geo, pose);
      for (const p of props) {
        if (opts.com) {
          const dot = makeDisc(3.2, THEME.com, 16);
          dot.position.set(p.comMm.x, p.comMm.y, Z.debug + 1);
          this.dynamic.add(dot);
        }
        if (opts.gravity && gravityOn) {
          // Weight vector, scaled so the heaviest body draws ~40 mm long.
          const scale = 40 / Math.max(1e-9, Math.max(...props.map((q) => q.mass)));
          this.addArrow(
            p.comMm,
            { x: p.comMm.x, y: p.comMm.y - p.mass * scale },
            THEME.gravityVec,
          );
        }
      }
    }

    if (opts.velocity) {
      const vels = jointVelocities(geo, pose, omega);
      // Normalise so the fastest joint draws ~55 mm long.
      const speeds = Object.values(vels).map((v) => Math.hypot(v.x, v.y));
      const vmax = Math.max(1e-6, ...speeds);
      const k = 55 / vmax;
      for (const [id, v] of Object.entries(vels)) {
        const base = id === 'P_LED' ? led : joints[id as JointId];
        this.addArrow(base, { x: base.x + v.x * k, y: base.y + v.y * k }, THEME.velocity);
      }
    }

    if (opts.transmission) {
      const dyads: [JointId, string][] = [
        ['B', 'μ₁'],
        ['E', 'μ₂'],
        ['F', 'μ₃'],
      ];
      dyads.forEach(([jid, name], i) => {
        const mu = pose.transmissionAngles[i];
        const good = mu >= 40 && mu <= 140;
        this.addLabel(
          `${name} ${mu.toFixed(1)}°`,
          midpoint(joints[jid], joints[jid]),
          good ? '#46c1a4' : '#e05252',
          26,
        );
      });
    }
  }

  dispose(): void {
    disposeTree(this.group);
  }
}
