import { CONFIG } from '../mechanism/config';
import { linksShareJoint } from '../mechanism/topology';
import { segmentSegmentDistance } from './segmentDistance';
/** Every physical member of the moving bodies, as a world-space segment. */
export function poseSegments(geo, pose) {
    const at = (id) => id === 'P_LED' ? pose.led : pose.joints[id];
    return geo.members.map((m) => ({
        linkId: m.linkId,
        a: at(m.from),
        b: at(m.to),
        label: `${m.from}-${m.to}`,
    }));
}
/**
 * Interference check (brief §19).  Links are 12 mm wide bars, not lines, so two
 * members whose centre lines pass closer than `link_width` overlap physically.
 * Members belonging to the same body, or to two bodies pinned by a shared
 * revolute pair, are exempt — those legitimately touch.
 */
export function detectCollisions(geo, pose, clearance = CONFIG.linkWidth) {
    const segs = poseSegments(geo, pose);
    const pairs = [];
    const collidingLinks = new Set();
    const collidingMembers = new Set();
    let minDistance = Infinity;
    for (let i = 0; i < segs.length; i++) {
        for (let j = i + 1; j < segs.length; j++) {
            const A = segs[i];
            const B = segs[j];
            if (A.linkId === B.linkId)
                continue;
            if (linksShareJoint(A.linkId, B.linkId))
                continue;
            const d = segmentSegmentDistance(A.a, A.b, B.a, B.b);
            if (d < minDistance)
                minDistance = d;
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
export function sweepCollisionPenalty(geo, poses, clearance = CONFIG.linkWidth) {
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
