/**
 * Unit discipline for the whole project.
 *
 *   Geometry, UI and rendering  -> millimetres (mm), degrees for display.
 *   Dynamics (mass, energy, torque) -> strict SI (m, kg, s, N.m).
 *
 * Every crossing of that boundary must go through one of these helpers.
 */

export const mmToM = (mm: number): number => mm * 1e-3;
export const mToMm = (m: number): number => m * 1e3;

export const degToRad = (d: number): number => (d * Math.PI) / 180;
export const radToDeg = (r: number): number => (r * 180) / Math.PI;

/** Motor speed: revolutions per minute -> rad/s. */
export const rpmToRadPerSec = (rpm: number): number => (2 * Math.PI * rpm) / 60;
export const radPerSecToRpm = (w: number): number => (w * 60) / (2 * Math.PI);

/** Standard gravity, SI, with +y up. */
export const G_SI = 9.80665;
export const GRAVITY_VEC_SI = { x: 0, y: -G_SI };
