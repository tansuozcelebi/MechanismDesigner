import { solvePose } from '../kinematics/forwardSolver';
import { mmToM } from '../utils/units';
export function ledKinematics(geo, pose, omega, dTheta = 1e-3) {
    const seed = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
    const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
    const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });
    const zero = {
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        speed: 0,
        accelMagnitude: 0,
        speedSI: 0,
        accelSI: 0,
        ok: false,
    };
    if (!plus.ok || !minus.ok)
        return zero;
    const dP = {
        x: (plus.led.x - minus.led.x) / (2 * dTheta),
        y: (plus.led.y - minus.led.y) / (2 * dTheta),
    };
    const d2P = {
        x: (plus.led.x - 2 * pose.led.x + minus.led.x) / (dTheta * dTheta),
        y: (plus.led.y - 2 * pose.led.y + minus.led.y) / (dTheta * dTheta),
    };
    const velocity = { x: dP.x * omega, y: dP.y * omega };
    const acceleration = { x: d2P.x * omega * omega, y: d2P.y * omega * omega };
    const speed = Math.hypot(velocity.x, velocity.y);
    const accelMagnitude = Math.hypot(acceleration.x, acceleration.y);
    return {
        velocity,
        acceleration,
        speed,
        accelMagnitude,
        speedSI: mmToM(speed),
        accelSI: mmToM(accelMagnitude),
        ok: true,
    };
}
/** dP/dtheta for an arbitrary joint — used by the debug velocity overlay. */
export function jointVelocities(geo, pose, omega, dTheta = 1e-3) {
    const seed = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
    const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
    const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });
    const out = {};
    if (!plus.ok || !minus.ok)
        return out;
    for (const key of Object.keys(pose.joints)) {
        const k = key;
        out[key] = {
            x: ((plus.joints[k].x - minus.joints[k].x) / (2 * dTheta)) * omega,
            y: ((plus.joints[k].y - minus.joints[k].y) / (2 * dTheta)) * omega,
        };
    }
    out.P_LED = {
        x: ((plus.led.x - minus.led.x) / (2 * dTheta)) * omega,
        y: ((plus.led.y - minus.led.y) / (2 * dTheta)) * omega,
    };
    return out;
}
