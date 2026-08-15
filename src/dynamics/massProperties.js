import { CONFIG } from '../mechanism/config';
import { mmToM } from '../utils/units';
const MOVING = ['L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
/** Static (pose-independent) mass and inertia of every moving body. */
export function staticMassProperties(geo, lineDensity = CONFIG.lineDensity) {
    const out = new Map();
    for (const id of MOVING) {
        const members = geo.members.filter((m) => m.linkId === id);
        const totalLengthMm = members.reduce((s, m) => s + m.length, 0);
        out.set(id, { mass: lineDensity * totalLengthMm, totalLengthMm });
    }
    return out;
}
/** Full mass properties at a given pose (COM depends on the pose). */
export function poseMassProperties(geo, pose, lineDensity = CONFIG.lineDensity) {
    const at = (id) => (id === 'P_LED' ? pose.led : pose.joints[id]);
    const out = [];
    for (const id of MOVING) {
        const members = geo.members.filter((m) => m.linkId === id);
        let mass = 0;
        let cx = 0;
        let cy = 0;
        let totalLengthMm = 0;
        const parts = members.map((m) => {
            const a = at(m.from);
            const b = at(m.to);
            const mi = lineDensity * m.length; // kg
            const com = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            return { mi, com, lengthMm: m.length };
        });
        for (const p of parts) {
            mass += p.mi;
            cx += p.mi * p.com.x;
            cy += p.mi * p.com.y;
            totalLengthMm += p.lengthMm;
        }
        const comMm = mass > 0 ? { x: cx / mass, y: cy / mass } : { x: 0, y: 0 };
        // Parallel-axis assembly of the body inertia about its own COM.
        let inertia = 0;
        for (const p of parts) {
            const Lm = mmToM(p.lengthMm);
            const own = (1 / 12) * p.mi * Lm * Lm;
            const dx = mmToM(p.com.x - comMm.x);
            const dy = mmToM(p.com.y - comMm.y);
            inertia += own + p.mi * (dx * dx + dy * dy);
        }
        out.push({ linkId: id, mass, comMm, inertia, totalLengthMm });
    }
    return out;
}
/** Total moving mass, kg. */
export const totalMass = (props) => props.reduce((s, p) => s + p.mass, 0);
