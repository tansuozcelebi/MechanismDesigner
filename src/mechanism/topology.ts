import {
  CRANK_ID,
  GROUND_ID,
  barId,
  dyadJointId,
  groundJointId,
  loopCount,
  mobility,
  pointRefId,
  validateSpec,
  type MechanismSpec,
} from './spec';
import type { Joint, Link, LinkId, Topology } from './types';

/** Which body owns a given anchor point. */
export function ownerOf(_spec: MechanismSpec, ref: { kind: string } & Record<string, unknown>): LinkId {
  if (ref.kind === 'ground') return GROUND_ID;
  if (ref.kind === 'crankTip') return CRANK_ID;
  return barId(ref.dyad as number, ref.side as 'A' | 'B');
}

const label = (spec: MechanismSpec, id: string, fallback: string) =>
  spec.labels?.[id] ?? fallback;

/**
 * Build the link/joint graph for a spec and verify it.
 *
 * The incidence and mobility checks are computed from the constructed graph
 * rather than asserted from the formula, so a wiring mistake in a custom spec
 * is caught here instead of producing a silently wrong simulation.
 */
export function buildTopology(spec: MechanismSpec): Topology {
  const problems = validateSpec(spec);
  if (problems.length) throw new Error(`Invalid mechanism spec: ${problems.join(' ')}`);

  const links: Link[] = [];
  const joints: Joint[] = [];

  links.push({
    id: GROUND_ID,
    jointIds: [],
    role: 'ground',
    label: label(spec, GROUND_ID, '1 — Ground'),
  });
  links.push({
    id: CRANK_ID,
    jointIds: [],
    role: 'input',
    label: label(spec, CRANK_ID, '2 — Input crank'),
  });

  const ledBar = barId(spec.led.dyad, spec.led.side);

  spec.dyads.forEach((_, k) => {
    for (const side of ['A', 'B'] as const) {
      const id = barId(k, side);
      const isLed = id === ledBar;
      links.push({
        id,
        jointIds: [],
        role: isLed ? 'output' : side === 'A' ? 'coupler' : 'rocker',
        label: label(spec, id, `${3 + 2 * k + (side === 'B' ? 1 : 0)} — dyad ${k + 1}${side}`),
        markerIds: isLed ? ['LED'] : undefined,
        dyad: k,
        side,
      });
    }
  });

  const byId = new Map(links.map((l) => [l.id, l]));
  const addJoint = (
    id: string,
    pointId: string,
    a: LinkId,
    b: LinkId,
    kind: Joint['kind'],
  ) => {
    joints.push({ id, pointId, kind, links: [a, b], label: label(spec, pointId, pointId) });
    for (const lid of [a, b]) {
      const link = byId.get(lid);
      if (link && !link.jointIds.includes(id)) link.jointIds.push(id);
    }
  };

  // Motor pivot.
  const g0 = groundJointId(0);
  addJoint(g0, g0, GROUND_ID, CRANK_ID, 'fixed');

  spec.dyads.forEach((d, k) => {
    const aBar = barId(k, 'A');
    const bBar = barId(k, 'B');

    // The dyad's own unknown joint.
    addJoint(dyadJointId(k), dyadJointId(k), aBar, bBar, 'revolute');

    // Anchor joints. Each anchor is its own revolute pair even when several
    // bars hang off the same rigid point.
    for (const [ref, bar] of [
      [d.a, aBar],
      [d.b, bBar],
    ] as const) {
      const pid = pointRefId(ref);
      const owner = ownerOf(spec, ref as unknown as { kind: string } & Record<string, unknown>);
      const kind: Joint['kind'] = ref.kind === 'ground' ? 'fixed' : 'revolute';
      addJoint(`${pid}~${bar}`, pid, owner, bar, kind);
    }
  });

  // A ground pivot that carries no dyad is a frame feature, not a joint, so it
  // is deliberately absent from the incidence count.

  const n = links.length;
  const j = joints.length;
  const M = 3 * (n - 1) - 2 * j;

  const incidence = links.reduce((s, l) => s + l.jointIds.length, 0);
  if (incidence !== 2 * j) {
    throw new Error(
      `Topology inconsistent: incidence ${incidence} != 2*j (${2 * j}). ` +
        `Every revolute pair must join exactly two bodies.`,
    );
  }
  if (M !== mobility(spec)) {
    throw new Error(`Constructed mobility ${M} disagrees with the spec formula ${mobility(spec)}.`);
  }

  // Connectivity: no free-floating body.
  const seen = new Set<string>([GROUND_ID]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const jt of joints) {
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

  return {
    spec,
    links,
    joints,
    mobility: M,
    loopCount: loopCount(spec),
    loops: describeLoops(spec),
  };
}

/**
 * Topology depends only on the spec, and the collision check asks for it on
 * every frame, so results are memoised per spec object. Building it involves
 * validation and graph construction — cheap once, wasteful 720 times a sweep.
 */
const topologyCache = new WeakMap<MechanismSpec, Topology>();

export function topologyOf(spec: MechanismSpec): Topology {
  let t = topologyCache.get(spec);
  if (!t) {
    t = buildTopology(spec);
    topologyCache.set(spec, t);
  }
  return t;
}

/** Human-readable independent loops, one per dyad. */
export function describeLoops(spec: MechanismSpec): string[] {
  const name = (id: string) => spec.labels?.[id] ?? id;
  return spec.dyads.map((d, k) => {
    const a = name(pointRefId(d.a));
    const b = name(pointRefId(d.b));
    const j = name(dyadJointId(k));
    return `${k + 1} : ${a} —[${name(barId(k, 'A'))}]— ${j} —[${name(barId(k, 'B'))}]— ${b} … frame`;
  });
}

/** Two bodies are collision-exempt if a revolute pair pins them together. */
export function linksShareJoint(topo: Topology, a: string, b: string): boolean {
  return topo.joints.some(
    (j) => (j.links[0] === a && j.links[1] === b) || (j.links[0] === b && j.links[1] === a),
  );
}
