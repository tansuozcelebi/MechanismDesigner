import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import type { Pose } from '../mechanism/types';
import { solvePose } from '../kinematics/forwardSolver';
import { poseMassProperties } from './massProperties';
import { G_SI, mmToM } from '../utils/units';

/**
 * Gravitational potential energy of the whole moving assembly, in joules.
 *
 * Coordinate system is +x right, +y up, so g = [0, -9.81] m/s^2 and
 * U = sum_i m_i * g * y_com_i  with g the positive magnitude (brief §20-22).
 */
export function potentialEnergy(
  geo: Geometry,
  pose: Pose,
  lineDensity: number = CONFIG.lineDensity,
): number {
  const props = poseMassProperties(geo, pose, lineDensity);
  let U = 0;
  for (const p of props) U += p.mass * G_SI * mmToM(p.comMm.y);
  return U;
}

/**
 * Quasi-static gravity torque at the motor shaft, N.m.
 *
 *   tau_g(theta) = dU/dtheta,  evaluated by central difference (brief §22).
 *
 * This is the torque the motor must supply to hold the mechanism against
 * gravity; it changes sign as the assembly moves over centre.
 */
export function gravityTorque(
  geo: Geometry,
  pose: Pose,
  dTheta = 1e-3,
  lineDensity: number = CONFIG.lineDensity,
): number {
  const seed = { B: pose.joints.B, E: pose.joints.E, F: pose.joints.F };
  const plus = solvePose(geo, pose.theta + dTheta, seed, { computeSigma: false });
  const minus = solvePose(geo, pose.theta - dTheta, seed, { computeSigma: false });
  if (!plus.ok || !minus.ok) return Number.NaN;
  const Up = potentialEnergy(geo, plus, lineDensity);
  const Um = potentialEnergy(geo, minus, lineDensity);
  return (Up - Um) / (2 * dTheta);
}

/** Gravity torque over a whole sweep, for the plot and the objective. */
export function gravityTorqueProfile(
  geo: Geometry,
  poses: Pose[],
  lineDensity: number = CONFIG.lineDensity,
): { theta: number; tau: number }[] {
  return poses.map((p) => ({
    theta: p.theta,
    tau: gravityTorque(geo, p, 1e-3, lineDensity),
  }));
}

export function peakAbsTorque(profile: { tau: number }[]): number {
  let peak = 0;
  for (const s of profile) if (Number.isFinite(s.tau)) peak = Math.max(peak, Math.abs(s.tau));
  return peak;
}
