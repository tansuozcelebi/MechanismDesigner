/**
 * The chosen 8-bar chain: three fixed pivots (O2, O4, O6), one input crank at
 * O2, and three RRR Assur dyads in series.  Naming follows the classical
 * even-numbered ground-pivot convention (O2, O4, O6).
 *
 *                 ground (1)
 *        O2 ---------- O4 ---------- O6
 *         |             |             |
 *      [L2 crank]   [L4 rocker]   [L6 rocker]
 *         |            / \          /   \
 *         A           B   D        E     G
 *          \         /     \      /       \
 *           `--[L3]-'       [L7] [L5]      \
 *                |            \   /         \
 *                C-------------\ /           \
 *                               F-----[L8]----'
 *                                        `-- P_LED
 *
 * Read as a graph: L3 is the ternary coupler A-B-C, L4 the ternary rocker
 * O4-B-D, L6 the ternary rocker O6-E-G, L8 the output body G-F carrying the
 * LED as a rigid extension.
 */
export const LINKS = [
    { id: 'ground', jointIds: ['O2', 'O4', 'O6'], role: 'ground', label: '1 — Ground' },
    { id: 'L2', jointIds: ['O2', 'A'], role: 'input', label: '2 — Input crank' },
    { id: 'L3', jointIds: ['A', 'B', 'C'], role: 'coupler', label: '3 — Coupler (ternary)' },
    { id: 'L4', jointIds: ['O4', 'B', 'D'], role: 'rocker', label: '4 — Rocker (ternary)' },
    { id: 'L5', jointIds: ['C', 'E'], role: 'binary', label: '5 — Connector' },
    { id: 'L6', jointIds: ['O6', 'E', 'G'], role: 'rocker', label: '6 — Rocker 2 (ternary)' },
    { id: 'L7', jointIds: ['D', 'F'], role: 'binary', label: '7 — Connector' },
    {
        id: 'L8',
        jointIds: ['G', 'F'],
        role: 'output',
        label: '8 — Output (LED)',
        markerIds: ['P_LED'],
    },
];
export const JOINTS = [
    { id: 'O2', kind: 'fixed', links: ['ground', 'L2'], label: 'O2 (motor)' },
    { id: 'A', kind: 'revolute', links: ['L2', 'L3'], label: 'A' },
    { id: 'B', kind: 'revolute', links: ['L3', 'L4'], label: 'B' },
    { id: 'O4', kind: 'fixed', links: ['L4', 'ground'], label: 'O4' },
    { id: 'C', kind: 'revolute', links: ['L3', 'L5'], label: 'C' },
    { id: 'E', kind: 'revolute', links: ['L5', 'L6'], label: 'E' },
    { id: 'O6', kind: 'fixed', links: ['L6', 'ground'], label: 'O6' },
    { id: 'D', kind: 'revolute', links: ['L4', 'L7'], label: 'D' },
    { id: 'F', kind: 'revolute', links: ['L7', 'L8'], label: 'F' },
    { id: 'G', kind: 'revolute', links: ['L8', 'L6'], label: 'G' },
];
export const LOOPS = [
    'I   : O2 -[L2]- A -[L3]- B -[L4]- O4 -[ground]- O2',
    'II  : O2 -[L2]- A -[L3]- C -[L5]- E -[L6]- O6 -[ground]- O2',
    'III : O4 -[L4]- D -[L7]- F -[L8]- G -[L6]- O6 -[ground]- O4',
];
/**
 * Grubler-Kutzbach for a planar chain of lower revolute pairs:
 *     M = 3(n - 1) - 2*j1 - j2,  with j2 = 0 here.
 * Also verifies that the incidence count is consistent (every revolute pair
 * joins exactly two bodies), which catches a mis-drawn graph.
 */
export function computeTopology() {
    const n = LINKS.length;
    const j1 = JOINTS.length;
    const j2 = 0;
    const mobility = 3 * (n - 1) - 2 * j1 - j2;
    const loopCount = j1 - n + 1;
    // Consistency: sum over links of (joints on that link) must equal 2 * j1.
    const incidence = LINKS.reduce((s, l) => s + l.jointIds.length, 0);
    if (incidence !== 2 * j1) {
        throw new Error(`Topology inconsistent: incidence ${incidence} != 2*j (${2 * j1}). ` +
            `Every revolute pair must join exactly two bodies.`);
    }
    // Every joint's declared links must actually list that joint.
    for (const jt of JOINTS) {
        for (const lid of jt.links) {
            const link = LINKS.find((l) => l.id === lid);
            if (!link)
                throw new Error(`Joint ${jt.id} references unknown link ${lid}`);
            if (!link.jointIds.includes(jt.id))
                throw new Error(`Link ${lid} does not list joint ${jt.id}`);
        }
    }
    // Connectivity: no free-floating body.
    const seen = new Set(['ground']);
    let changed = true;
    while (changed) {
        changed = false;
        for (const jt of JOINTS) {
            const [a, b] = jt.links;
            if (seen.has(a) !== seen.has(b)) {
                seen.add(a);
                seen.add(b);
                changed = true;
            }
        }
    }
    if (seen.size !== n)
        throw new Error(`Topology has a disconnected body: only ${seen.size}/${n} reachable`);
    return { links: LINKS, joints: JOINTS, mobility, loopCount, loops: LOOPS };
}
export const TOPOLOGY = computeTopology();
/** Two links are collision-exempt if they share a joint (they are pinned together). */
export function linksShareJoint(a, b) {
    return JOINTS.some((j) => (j.links[0] === a && j.links[1] === b) || (j.links[0] === b && j.links[1] === a));
}
