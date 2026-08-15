/**
 * Unit discipline for the whole project.
 *
 *   Geometry, UI and rendering  -> millimetres (mm), degrees for display.
 *   Dynamics (mass, energy, torque) -> strict SI (m, kg, s, N.m).
 *
 * Every crossing of that boundary must go through one of these helpers.
 */
export const mmToM = (mm) => mm * 1e-3;
export const mToMm = (m) => m * 1e3;
export const degToRad = (d) => (d * Math.PI) / 180;
export const radToDeg = (r) => (r * 180) / Math.PI;
/** Motor speed: revolutions per minute -> rad/s. */
export const rpmToRadPerSec = (rpm) => (2 * Math.PI * rpm) / 60;
export const radPerSecToRpm = (w) => (w * 60) / (2 * Math.PI);
/** Standard gravity, SI, with +y up. */
export const G_SI = 9.80665;
export const GRAVITY_VEC_SI = { x: 0, y: -G_SI };
