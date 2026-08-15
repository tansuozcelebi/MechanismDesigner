import { CONFIG } from './config';
import { DESIGN_KEYS } from './types';
import { degToRad, thirdSide, v2 } from '../utils/math';
export const BOUNDS = {
    // O6 swept over the lower-right quadrant band; the mechanism grows upward.
    phi6: [-150, 150],
    lAB: [CONFIG.Lmin, CONFIG.Lmax],
    c3r: [CONFIG.Lmin, CONFIG.Lmax],
    c3a: [-180, 180],
    lO4B: [CONFIG.Lmin, CONFIG.Lmax],
    d4r: [CONFIG.Lmin, CONFIG.Lmax],
    d4a: [-180, 180],
    lCE: [CONFIG.Lmin, CONFIG.Lmax],
    lO6E: [CONFIG.Lmin, CONFIG.Lmax],
    g6r: [CONFIG.Lmin, CONFIG.Lmax],
    g6a: [-180, 180],
    lDF: [CONFIG.Lmin, CONFIG.Lmax],
    lGF: [CONFIG.Lmin, CONFIG.Lmax],
    p8r: [CONFIG.Lmin, CONFIG.Lmax],
    p8a: [-180, 180],
};
export function designToArray(d) {
    return DESIGN_KEYS.map((k) => d[k]);
}
export function arrayToDesign(x, branches = [1, 1, 1]) {
    const d = {};
    DESIGN_KEYS.forEach((k, i) => {
        d[k] = x[i];
    });
    d.branch1 = branches[0];
    d.branch2 = branches[1];
    d.branch3 = branches[2];
    return d;
}
export const boundsArray = () => DESIGN_KEYS.map((k) => BOUNDS[k]);
export function clampDesign(x) {
    const b = boundsArray();
    return x.map((xi, i) => Math.min(b[i][1], Math.max(b[i][0], xi)));
}
/** Build the resolved geometry for a design vector. */
export function buildGeometry(design) {
    const O2 = v2(CONFIG.O2.x, CONFIG.O2.y);
    const O4 = v2(O2.x + CONFIG.O2O4, O2.y);
    const p6 = degToRad(design.phi6);
    const O6 = v2(O4.x + CONFIG.O4O6 * Math.cos(p6), O4.y + CONFIG.O4O6 * Math.sin(p6));
    // Dependent members of the ternary bodies, from the law of cosines.
    const BC = thirdSide(design.lAB, design.c3r, degToRad(design.c3a));
    const BD = thirdSide(design.lO4B, design.d4r, degToRad(design.d4a));
    const EG = thirdSide(design.lO6E, design.g6r, degToRad(design.g6a));
    const FP = thirdSide(design.lGF, design.p8r, degToRad(design.p8a));
    const m = (linkId, from, to, length) => ({ linkId, from, to, length });
    const members = [
        m('L2', 'O2', 'A', CONFIG.crankLength),
        m('L3', 'A', 'B', design.lAB),
        m('L3', 'A', 'C', design.c3r),
        m('L3', 'B', 'C', BC),
        m('L4', 'O4', 'B', design.lO4B),
        m('L4', 'O4', 'D', design.d4r),
        m('L4', 'B', 'D', BD),
        m('L5', 'C', 'E', design.lCE),
        m('L6', 'O6', 'E', design.lO6E),
        m('L6', 'O6', 'G', design.g6r),
        m('L6', 'E', 'G', EG),
        m('L7', 'D', 'F', design.lDF),
        m('L8', 'G', 'F', design.lGF),
        m('L8', 'G', 'P_LED', design.p8r),
        m('L8', 'F', 'P_LED', FP),
    ];
    return { design, O2, O4, O6, members, derived: { BC, BD, EG, FP } };
}
/**
 * Hard manufacturability check (brief §4 / §43): EVERY physical member,
 * including the dependent sides of the ternary bodies and the LED extension,
 * must fall in [Lmin, Lmax].  Returns a smooth violation magnitude in mm so
 * the optimiser gets a gradient rather than a cliff.
 */
export function lengthViolation(geo) {
    let vio = 0;
    for (const mem of geo.members) {
        if (mem.length < CONFIG.Lmin)
            vio += CONFIG.Lmin - mem.length;
        else if (mem.length > CONFIG.Lmax)
            vio += mem.length - CONFIG.Lmax;
        if (!Number.isFinite(mem.length))
            vio += 1e3;
    }
    return vio;
}
/**
 * Soft proportion penalty (brief §4): adjacent members should stay within
 * 0.4 < Li/Lj < 2.5.  "Adjacent" = sharing a rigid body or a joint.
 */
export function ratioPenalty(geo) {
    let pen = 0;
    const byLink = new Map();
    for (const mem of geo.members) {
        const arr = byLink.get(mem.linkId) ?? [];
        arr.push(mem.length);
        byLink.set(mem.linkId, arr);
    }
    // Compare the principal member of each body against its neighbours.
    const principal = ['L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'].map((id) => {
        const arr = byLink.get(id) ?? [1];
        return Math.max(...arr);
    });
    for (let i = 0; i < principal.length - 1; i++) {
        const r = principal[i] / principal[i + 1];
        if (r < CONFIG.ratioMin)
            pen += (CONFIG.ratioMin - r) ** 2;
        else if (r > CONFIG.ratioMax)
            pen += ((r - CONFIG.ratioMax) / CONFIG.ratioMax) ** 2;
    }
    return pen;
}
