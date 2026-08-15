import { CONFIG } from '../mechanism/config';
import { JOINTS, linksShareJoint } from '../mechanism/topology';
import { segmentSegmentDistance } from './segmentDistance';
import { poseSegments } from './collisionDetector';
/**
 * Assembly layering.
 *
 * A strictly coplanar 8-bar with 12 mm wide bars is not buildable: with three
 * closed loops the members inevitably sweep across one another.  Measured over
 * randomly generated valid mechanisms of this topology, ZERO percent were free
 * of coplanar interference — so treating any crossing as fatal would reject
 * every mechanism, including physically sound ones.
 *
 * Real multi-loop linkages (and 3D-printed ones in particular) are therefore
 * built in stacked parallel planes: each rigid body sits in one layer, and
 * bodies that would sweep through each other are put in different layers, with
 * the revolute pins spanning the gap.  What actually constrains the design is
 * then not "do members cross" but:
 *
 *   1. how many layers the stack needs  (thickness, cost, print time), and
 *   2. how far a pin has to span between the two bodies it joins
 *      (cantilever, bending, backlash).
 *
 * Minimum layer count is the chromatic number of the interference graph.  That
 * is NP-hard in general, but with seven moving bodies the Welsh-Powell greedy
 * ordering is fast and, at this size, essentially always optimal.
 */
const MOVING = ['L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
/** Which bodies would sweep through each other if they shared a plane. */
export function interferenceGraph(geo, poses, clearance = CONFIG.linkWidth) {
    const adjacency = new Map();
    for (const id of MOVING)
        adjacency.set(id, new Set());
    const closest = new Map();
    let coplanarFrames = 0;
    let worstOverlap = 0;
    for (const pose of poses) {
        const segs = poseSegments(geo, pose);
        let hit = false;
        for (let i = 0; i < segs.length; i++) {
            for (let j = i + 1; j < segs.length; j++) {
                const A = segs[i];
                const B = segs[j];
                if (A.linkId === B.linkId)
                    continue;
                if (linksShareJoint(A.linkId, B.linkId))
                    continue;
                const d = segmentSegmentDistance(A.a, A.b, B.a, B.b);
                const key = A.linkId < B.linkId ? `${A.linkId}|${B.linkId}` : `${B.linkId}|${A.linkId}`;
                const prev = closest.get(key);
                if (prev === undefined || d < prev)
                    closest.set(key, d);
                if (d < clearance) {
                    hit = true;
                    adjacency.get(A.linkId).add(B.linkId);
                    adjacency.get(B.linkId).add(A.linkId);
                    worstOverlap = Math.max(worstOverlap, clearance - d);
                }
            }
        }
        if (hit)
            coplanarFrames++;
    }
    return { adjacency, closest, coplanarFrames, worstOverlap };
}
/** Greedy graph colouring in Welsh-Powell order (highest degree first). */
export function assignLayers(graph, plateThickness = CONFIG.linkWidth * 0.5) {
    const order = [...MOVING].sort((a, b) => (graph.adjacency.get(b)?.size ?? 0) - (graph.adjacency.get(a)?.size ?? 0));
    const layer = {};
    for (const id of order) {
        const used = new Set();
        for (const nb of graph.adjacency.get(id) ?? []) {
            if (layer[nb] !== undefined)
                used.add(layer[nb]);
        }
        let k = 0;
        while (used.has(k))
            k++;
        layer[id] = k;
    }
    layer.ground = 0;
    const layerCount = Math.max(...MOVING.map((id) => layer[id])) + 1;
    // Pin span: a revolute pair between two bodies must bridge their layers.
    let maxPinSpan = 0;
    for (const j of JOINTS) {
        const [a, b] = j.links;
        const la = a === 'ground' ? 0 : layer[a];
        const lb = b === 'ground' ? 0 : layer[b];
        maxPinSpan = Math.max(maxPinSpan, Math.abs(la - lb));
    }
    return {
        layer,
        layerCount,
        maxPinSpan,
        stackThickness: layerCount * plateThickness,
    };
}
/**
 * Manufacturability penalty.  A two-layer stack is treated as free (any planar
 * linkage needs at least two planes for its pins anyway); every additional
 * layer and every extra layer a pin must span costs progressively more.
 */
export function buildability(geo, poses, clearance = CONFIG.linkWidth) {
    const graph = interferenceGraph(geo, poses, clearance);
    const plan = assignLayers(graph);
    const extraLayers = Math.max(0, plan.layerCount - 2);
    const extraSpan = Math.max(0, plan.maxPinSpan - 1);
    const penalty = (extraLayers / 2) ** 2 + 0.5 * (extraSpan / 2) ** 2;
    return {
        layerCount: plan.layerCount,
        maxPinSpan: plan.maxPinSpan,
        stackThickness: plan.stackThickness,
        coplanarFrames: graph.coplanarFrames,
        worstOverlap: graph.worstOverlap,
        layer: plan.layer,
        penalty,
    };
}
