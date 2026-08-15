import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import type { Pose } from '../mechanism/types';
import { solvePose } from '../kinematics/forwardSolver';
import { poseMassProperties } from './massProperties';
import { potentialEnergy } from './gravity';
import { mmToM } from '../utils/units';
import { wrapPi } from '../utils/math';
import { branchSeed } from './branchSeed';
import { movingLinks } from './massProperties';

/**
 * Motor torque estimate via the Lagrange equation for a single-DOF system
 * (brief §25).
 *
 * With one degree of freedom the kinetic energy is always
 *     T = 1/2 * M(theta) * thetadot^2
 * where M(theta) is the generalised (reduced) inertia
 *     M(theta) = sum_i [ m_i |dp_com_i/dtheta|^2 + I_i (dphi_i/dtheta)^2 ].
 *
 * Substituting into
 *     d/dt(dT/d thetadot) - dT/d theta + dU/d theta = tau
 * gives
 *     tau = M(theta)*thetaddot + 1/2 * M'(theta)*thetadot^2 + U'(theta).
 *
 * At the constant motor speed used for playback thetaddot = 0, so the estimate
 * is the inertial term plus the quasi-static gravity term.  Gravity can be
 * switched off independently, in which case only the inertial term remains.
 */
export type TorqueBreakdown = {
  /** dU/dtheta, N.m — zero when gravity is disabled. */
  gravity: number;
  /** 1/2 M'(theta) thetadot^2, N.m. */
  inertial: number;
  /** M(theta) thetaddot, N.m — non-zero only when the motor accelerates. */
  angularAccel: number;
  total: number;
  /** Generalised inertia M(theta), kg.m^2. */
  reducedInertia: number;
  ok: boolean;
};

/** Generalised inertia M(theta) in kg.m^2. */
export function reducedInertia(
  geo: Geometry,
  pose: Pose,
  dTheta = 1e-3,
  lineDensity: number = CONFIG.lineDensity,
): number {
  const seed = branchSeed(pose);
  const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
  const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });
  if (!plus.ok || !minus.ok) return Number.NaN;
  const MOVING = movingLinks(geo);

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

export function motorTorque(
  geo: Geometry,
  pose: Pose,
  omega: number,
  options: { gravityOn?: boolean; alpha?: number; lineDensity?: number } = {},
): TorqueBreakdown {
  const gravityOn = options.gravityOn !== false;
  const alpha = options.alpha ?? 0;
  const lineDensity = options.lineDensity ?? CONFIG.lineDensity;
  const dTheta = 2e-3;

  const seed = branchSeed(pose);
  const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
  const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });

  const fail: TorqueBreakdown = {
    gravity: Number.NaN,
    inertial: Number.NaN,
    angularAccel: Number.NaN,
    total: Number.NaN,
    reducedInertia: Number.NaN,
    ok: false,
  };
  if (!plus.ok || !minus.ok) return fail;

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
