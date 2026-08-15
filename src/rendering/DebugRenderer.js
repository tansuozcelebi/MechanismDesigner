import * as THREE from 'three';
import { JOINTS, LINKS } from '../mechanism/topology';
import { poseMassProperties } from '../dynamics/massProperties';
import { jointVelocities } from '../dynamics/velocity';
import { loopVectors } from '../kinematics/loopClosure';
import { THEME } from './theme';
import { Z, makeDisc, disposeTree } from './Scene';
import { makeLabel, scaleLabel } from './labels';
import { midpoint } from '../utils/math';
export const DEFAULT_DEBUG = {
    names: true,
    coordinates: true,
    loops: true,
    com: true,
    velocity: true,
    gravity: true,
    transmission: true,
};
export class DebugRenderer {
    group = new THREE.Group();
    dynamic = new THREE.Group();
    labels = [];
    mmPerPixel = 1;
    constructor() {
        this.group.add(this.dynamic);
        this.group.visible = false;
    }
    set visible(v) {
        this.group.visible = v;
    }
    setScale(mmPerPixel) {
        this.mmPerPixel = mmPerPixel;
        for (const l of this.labels)
            scaleLabel(l, mmPerPixel);
    }
    addLabel(text, at, color, dy = 0) {
        const label = makeLabel(text, color);
        label.sprite.position.set(at.x, at.y + dy, Z.label);
        scaleLabel(label, this.mmPerPixel);
        this.dynamic.add(label.sprite);
        this.labels.push(label);
    }
    addArrow(from, to, color) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6)
            return;
        const dir = new THREE.Vector3(dx / len, dy / len, 0);
        const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(from.x, from.y, Z.debug), len, color, Math.min(len * 0.3, 12), Math.min(len * 0.2, 7));
        this.dynamic.add(arrow);
    }
    addSegments(pts, color, opacity = 1) {
        if (!pts.length)
            return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        this.dynamic.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
    }
    /** Rebuilt every frame — only active while the debug panel is open. */
    update(geo, pose, omega, opts, gravityOn) {
        if (!this.group.visible)
            return;
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
                if (link.id === 'ground')
                    continue;
                const pts = link.jointIds.map((id) => joints[id]);
                const c = pts.reduce((acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }), { x: 0, y: 0 });
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
            const byLoop = [[], [], []];
            for (const v of vecs)
                byLoop[v.loop].push(v.from.x, v.from.y, Z.debug, v.to.x, v.to.y, Z.debug);
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
                    this.addArrow(p.comMm, { x: p.comMm.x, y: p.comMm.y - p.mass * scale }, THEME.gravityVec);
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
                const base = id === 'P_LED' ? led : joints[id];
                this.addArrow(base, { x: base.x + v.x * k, y: base.y + v.y * k }, THEME.velocity);
            }
        }
        if (opts.transmission) {
            const dyads = [
                ['B', 'μ₁'],
                ['E', 'μ₂'],
                ['F', 'μ₃'],
            ];
            dyads.forEach(([jid, name], i) => {
                const mu = pose.transmissionAngles[i];
                const good = mu >= 40 && mu <= 140;
                this.addLabel(`${name} ${mu.toFixed(1)}°`, midpoint(joints[jid], joints[jid]), good ? '#46c1a4' : '#e05252', 26);
            });
        }
    }
    dispose() {
        disposeTree(this.group);
    }
}
