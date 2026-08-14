import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import type { JointId, LinkId, Pose } from '../mechanism/types';
import { mmToM } from '../utils/units';
import type { Vec2 } from '../utils/math';

/**
 * Mass properties of the printed bodies.
 *
 * Each rigid body is modelled as the union of its slender members (brief §21):
 * uniform line density lambda [kg/mm], centre of mass at each member's
 * midpoint, and I_com = (1/12) m L^2 about that midpoint.  A ternary body's
 * properties are assembled from its members with the parallel-axis theorem, so
 * ternary links are not treated as if they were binary.
 *
 * ALL values returned here are SI (kg, m, kg.m^2).  Geometry arrives in mm and
 * is converted at the boundary.
 */
export type LinkMassProps = {
  linkId: LinkId;
  mass: number; // kg
  /** COM in the body's own instantaneous world position, mm (for display). */
  comMm: Vec2;
  /** Moment of inertia about the body COM, kg.m^2. */
  inertia: number;
  totalLengthMm: number;
};

const MOVING: Exclude<LinkId, 'ground'>[] = ['L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];

/** Static (pose-independent) mass and inertia of every moving body. */
export function staticMassProperties(
  geo: Geometry,
  lineDensity: number = CONFIG.lineDensity,
): Map<LinkId, { mass: number; totalLengthMm: number }> {
  const out = new Map<LinkId, { mass: number; totalLengthMm: number }>();
  for (const id of MOVING) {
    const members = geo.members.filter((m) => m.linkId === id);
    const totalLengthMm = members.reduce((s, m) => s + m.length, 0);
    out.set(id, { mass: lineDensity * totalLengthMm, totalLengthMm });
  }
  return out;
}

/** Full mass properties at a given pose (COM depends on the pose). */
export function poseMassProperties(
  geo: Geometry,
  pose: Pose,
  lineDensity: number = CONFIG.lineDensity,
): LinkMassProps[] {
  const at = (id: JointId | 'P_LED'): Vec2 => (id === 'P_LED' ? pose.led : pose.joints[id]);
  const out: LinkMassProps[] = [];

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
export const totalMass = (props: LinkMassProps[]): number =>
  props.reduce((s, p) => s + p.mass, 0);
