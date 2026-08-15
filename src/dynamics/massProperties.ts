import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { CRANK_ID } from '../mechanism/spec';
import type { LinkId, Pose } from '../mechanism/types';
import { mmToM } from '../utils/units';
import type { Vec2 } from '../utils/math';

/**
 * Mass properties of the printed bodies.
 *
 * Each rigid body is the union of its slender members: uniform line density
 * lambda [kg/mm], centre of mass at each member's midpoint, and
 * I_com = (1/12) m L^2 about that midpoint.  A ternary body is assembled from
 * its members with the parallel-axis theorem, so it is not treated as if it
 * were binary.
 *
 * All values returned are SI (kg, m, kg.m^2); geometry arrives in mm and is
 * converted at the boundary.
 */
export type LinkMassProps = {
  linkId: LinkId;
  mass: number;
  /** COM in world position, mm (for display). */
  comMm: Vec2;
  /** Moment of inertia about the body COM, kg.m^2. */
  inertia: number;
  totalLengthMm: number;
};

/** Ids of every moving body, in a stable order. */
export const movingLinks = (geo: Geometry): LinkId[] => [CRANK_ID, ...geo.bars.map((b) => b.id)];

/** Static (pose-independent) mass of every moving body. */
export function staticMassProperties(
  geo: Geometry,
  lineDensity: number = CONFIG.lineDensity,
): Map<LinkId, { mass: number; totalLengthMm: number }> {
  const out = new Map<LinkId, { mass: number; totalLengthMm: number }>();
  for (const id of movingLinks(geo)) {
    const total = geo.members.filter((m) => m.linkId === id).reduce((s, m) => s + m.length, 0);
    out.set(id, { mass: lineDensity * total, totalLengthMm: total });
  }
  return out;
}

/** Full mass properties at a given pose (COM depends on the pose). */
export function poseMassProperties(
  geo: Geometry,
  pose: Pose,
  lineDensity: number = CONFIG.lineDensity,
): LinkMassProps[] {
  const out: LinkMassProps[] = [];

  for (const id of movingLinks(geo)) {
    const parts = geo.members
      .filter((m) => m.linkId === id)
      .map((m) => {
        const a = pose.points[m.from];
        const b = pose.points[m.to];
        return {
          mi: lineDensity * m.length,
          com: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          lengthMm: m.length,
        };
      });

    let mass = 0;
    let cx = 0;
    let cy = 0;
    let totalLengthMm = 0;
    for (const p of parts) {
      mass += p.mi;
      cx += p.mi * p.com.x;
      cy += p.mi * p.com.y;
      totalLengthMm += p.lengthMm;
    }
    const comMm = mass > 0 ? { x: cx / mass, y: cy / mass } : { x: 0, y: 0 };

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

export const totalMass = (props: LinkMassProps[]): number =>
  props.reduce((s, p) => s + p.mass, 0);
