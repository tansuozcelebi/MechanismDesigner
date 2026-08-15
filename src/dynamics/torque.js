import { CONFIG } from '../mechanism/config';
import { solvePose } from '../kinematics/forwardSolver';
import { poseMassProperties } from './massProperties';
import { potentialEnergy } from './gravity';
import { mmToM } from '../utils/units';
import { wrapPi } from '../utils/math';
const MOVING = ['L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
/** Generalised inertia M(theta) in kg.m^2. */
export function reducedInertia(geo, pose, dTheta = 1e-3, lineDensity = CONFIG.lineDensity) {
    const seed = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
    const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
    const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });
    if (!plus.ok || !minus.ok)
        return Number.NaN;
    const pp = poseMassProperties(geo, plus, lineDensity);
    const pm = poseMassProperties(geo, minus, lineDensity);
    const p0 = poseMassProperties(geo, pose, lineDensity);
    let M = 0;
    for (let i = 0; i < p0.length; i++) {
        // d(COM)/dtheta in m/rad.
        const dcx = mmToM(pp[i].comMm.x - pm[i].comMm.x) / (2 * dTheta);
        const dcy = mmToM(pp[i].comMm.y - pm[i].comMm.y) / (2 * dTheta);
        M += p0[i].mass * (dcx * dcx + dcy * dcy);
        // d(body angle)/dtheta in rad/rad — wrapped to avoid a 2pi artefact.
        const id = MOVING[i];
        const dPhi = wrapPi(plus.linkAngles[id] - minus.linkAngles[id]) / (2 * dTheta);
        M += p0[i].inertia * dPhi * dPhi;
    }
    return M;
}
export function motorTorque(geo, pose, omega, options = {}) {
    const gravityOn = options.gravityOn !== false;
    const alpha = options.alpha ?? 0;
    const lineDensity = options.lineDensity ?? CONFIG.lineDensity;
    const dTheta = 2e-3;
    const seed = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
    const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
    const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });
    const fail = {
        gravity: Number.NaN,
        inertial: Number.NaN,
        angularAccel: Number.NaN,
        total: Number.NaN,
        reducedInertia: Number.NaN,
        ok: false,
    };
    if (!plus.ok || !minus.ok)
        return fail;
    const gravity = gravityOn
        ? (potentialEnergy(geo, plus, lineDensity) - potentialEnergy(geo, minus, lineDensity)) /
            (2 * dTheta)
        : 0;
    const M0 = reducedInertia(geo, pose, 1e-3, lineDensity);
    const Mp = reducedInertia(geo, plus, 1e-3, lineDensity);
    const Mm = reducedInertia(geo, minus, 1e-3, lineDensity);
    const dM = (Mp - Mm) / (2 * dTheta);
    const inertial = 0.5 * dM * omega * omega;
    const angularAccel = M0 * alpha;
    const total = gravity + inertial + angularAccel;
    return {
        gravity,
        inertial,
        angularAccel,
        total,
        reducedInertia: M0,
        ok: Number.isFinite(total),
    };
}
