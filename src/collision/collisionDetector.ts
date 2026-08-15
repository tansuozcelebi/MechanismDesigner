import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { linksShareJoint, topologyOf } from '../mechanism/topology';
import type { LinkId, Pose } from '../mechanism/types';
import type { Vec2 } from '../utils/math';
import { segmentSegmentDistance } from './segmentDistance';

export type Segment = { linkId: LinkId; a: Vec2; b: Vec2; label: string };

/** Every physical member of the moving bodies, as a world-space segment. */
export function poseSegments(geo: Geometry, pose: Pose): Segment[] {
  return geo.members.map((m) => ({
    linkId: m.linkId,
    a: pose.points[m.from],
    b: pose.points[m.to],
    label: `${m.from}-${m.to}`,
  }));
}

export type CollisionReport = {
  /** Pairs of member indices that interfere at this instant. */
  pairs: { i: number; j: number; distance: number }[];
  collidingLinks: Set<LinkId>;
  /** Indices into `geo.members` of the individual bars that interfere. */
  collidingMembers: Set<number>;
  minDistance: number;
  count: number;
};

/**
 * Interference check (brief §19).  Links are 12 mm wide bars, not lines, so two
 * members whose centre lines pass closer than `link_width` overlap physically.
 * Members belonging to the same body, or to two bodies pinned by a shared
 * revolute pair, are exempt — those legitimately touch.
 */
export function detectCollisions(
  geo: Geometry,
  pose: Pose,
  clearance: number = CONFIG.linkWidth,
): CollisionReport {
  const topo = topologyOf(geo.spec);
  const segs = poseSegments(geo, pose);
  const pairs: { i: number; j: number; distance: number }[] = [];
  const collidingLinks = new Set<LinkId>();
  const collidingMembers = new Set<number>();
  let minDistance = Infinity;

  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i];
      const B = segs[j];
      if (A.linkId === B.linkId) continue;
      if (linksShareJoint(topo, A.linkId, B.linkId)) continue;
      const d = segmentSegmentDistance(A.a, A.b, B.a, B.b);
      if (d < minDistance) minDistance = d;
      if (d < clearance) {
        pairs.push({ i, j, distance: d });
        collidingLinks.add(A.linkId);
        collidingLinks.add(B.linkId);
        collidingMembers.add(i);
        collidingMembers.add(j);
      }
    }
  }

  return {
    pairs,
    collidingLinks,
    collidingMembers,
    minDistance: Number.isFinite(minDistance) ? minDistance : Infinity,
    count: pairs.length,
  };
}

/** Aggregate interference over a whole revolution, for the objective function. */
export function sweepCollisionPenalty(
  geo: Geometry,
  poses: Pose[],
  clearance: number = CONFIG.linkWidth,
): { framesWithCollision: number; penalty: number; worstOverlap: number } {
  let framesWithCollision = 0;
  let penalty = 0;
  let worstOverlap = 0;
  for (const pose of poses) {
    const rep = detectCollisions(geo, pose, clearance);
    if (rep.count > 0) {
      framesWithCollision++;
      for (const p of rep.pairs) {
        const overlap = (clearance - p.distance) / clearance;
        penalty += overlap * overlap;
        worstOverlap = Math.max(worstOverlap, overlap);
      }
    }
  }
  return {
    framesWithCollision,
    penalty: poses.length ? penalty / poses.length : 0,
    worstOverlap,
  };
}
