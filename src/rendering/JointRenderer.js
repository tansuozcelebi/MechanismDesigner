import * as THREE from 'three';
import { JOINTS } from '../mechanism/topology';
import { THEME } from './theme';
import { Z, makeDisc, makeRing, disposeTree } from './Scene';
/**
 * Ground pivots and moving revolute pairs (brief §30).
 *
 * Ground pivots get the conventional hatched triangle so the frame is
 * unmistakable; moving joints get a lighter ring with a visible centre.
 */
const GROUND_R = 9;
const MOVING_R = 7;
export class JointRenderer {
    group = new THREE.Group();
    markers = new Map();
    ledDot;
    ledGlow;
    constructor() {
        for (const j of JOINTS) {
            const holder = new THREE.Group();
            if (j.kind === 'fixed') {
                holder.add(this.makeGroundSymbol());
                const body = makeDisc(GROUND_R, THEME.groundPivot);
                body.position.z = Z.joint + 1;
                holder.add(body);
                const core = makeDisc(GROUND_R * 0.35, THEME.jointCore);
                core.position.z = Z.joint + 2;
                holder.add(core);
            }
            else {
                const ring = makeRing(MOVING_R * 0.55, MOVING_R, THEME.movingJoint);
                ring.position.z = Z.joint + 1;
                holder.add(ring);
                const core = makeDisc(MOVING_R * 0.3, THEME.movingJoint);
                core.position.z = Z.joint + 2;
                holder.add(core);
            }
            holder.position.z = Z.joint;
            this.group.add(holder);
            this.markers.set(j.id, holder);
        }
        // LED: bright red point with a soft glow (brief §30).
        this.ledGlow = makeDisc(16, THEME.ledGlow, 40);
        this.ledGlow.material.opacity = 0.22;
        this.ledGlow.position.z = Z.led;
        this.group.add(this.ledGlow);
        this.ledDot = makeDisc(6.5, THEME.led, 32);
        this.ledDot.position.z = Z.led + 1;
        this.group.add(this.ledDot);
    }
    /** Fixed-frame hatching: the standard ground symbol under a fixed pivot. */
    makeGroundSymbol() {
        const g = new THREE.Group();
        const w = 22;
        const h = 16;
        const tri = new THREE.Shape();
        tri.moveTo(0, 0);
        tri.lineTo(-w / 2, -h);
        tri.lineTo(w / 2, -h);
        tri.lineTo(0, 0);
        const mesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: THEME.groundHatch, transparent: true, opacity: 0.5 }));
        mesh.position.z = Z.ground;
        g.add(mesh);
        const pts = [];
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
    update(pose) {
        for (const [id, obj] of this.markers) {
            const p = pose.joints[id];
            obj.position.x = p.x;
            obj.position.y = p.y;
        }
        this.ledDot.position.x = pose.led.x;
        this.ledDot.position.y = pose.led.y;
        this.ledGlow.position.x = pose.led.x;
        this.ledGlow.position.y = pose.led.y;
    }
    /** Keep markers a constant size on screen regardless of zoom. */
    setScale(mmPerPixel) {
        const s = Math.max(0.35, Math.min(3, mmPerPixel / 0.6));
        for (const obj of this.markers.values())
            obj.scale.setScalar(s);
        this.ledDot.scale.setScalar(s);
        this.ledGlow.scale.setScalar(s);
    }
    dispose() {
        disposeTree(this.group);
    }
}
