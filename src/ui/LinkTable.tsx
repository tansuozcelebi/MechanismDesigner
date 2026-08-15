import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { LINKS } from '../mechanism/topology';
import type { JointId, LinkId, Pose } from '../mechanism/types';
import { poseMassProperties } from '../dynamics/massProperties';
import { angleOf, radToDeg, sub, type Vec2 } from '../utils/math';
import { Section, num } from './primitives';

/**
 * Live link table (brief §36).  Lengths are constant by construction — they are
 * the rigid-body dimensions — while the body angles update every frame.
 */
export function LinkTable({
  geo,
  pose,
  collidingLinks,
  layerOf,
}: {
  geo: Geometry;
  pose: Pose | null;
  collidingLinks: Set<LinkId>;
  layerOf?: Record<string, number>;
}) {
  const props = pose ? poseMassProperties(geo, pose) : [];
  const massOf = new Map(props.map((p) => [p.linkId, p.mass]));

  const at = (id: JointId | 'P_LED'): Vec2 | null => {
    if (!pose) return null;
    return id === 'P_LED' ? pose.led : pose.joints[id];
  };

  const rows = geo.members.map((m) => {
    const link = LINKS.find((l) => l.id === m.linkId)!;
    const a = at(m.from);
    const b = at(m.to);
    const ang = a && b ? radToDeg(angleOf(sub(b, a))) : NaN;
    return { m, link, ang };
  });

  return (
    <Section title="Link Table">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Length</th>
            <th>Angle</th>
            <th>Mass</th>
            <th>Ly</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, link, ang }, i) => {
            const cls = [
              link.role === 'input' ? 'input' : '',
              link.role === 'output' ? 'output' : '',
              collidingLinks.has(m.linkId) ? 'collide' : '',
            ]
              .filter(Boolean)
              .join(' ');
            // Mass is a property of the whole rigid body, shown on its first row.
            const first = rows.findIndex((r) => r.m.linkId === m.linkId) === i;
            return (
              <tr key={`${m.linkId}-${m.from}-${m.to}`} className={cls}>
                <td>
                  {m.linkId}: {m.from}–{m.to}
                </td>
                <td>{num(m.length, 2)}</td>
                <td>{num(ang, 1, '°')}</td>
                <td className="dim">{first ? num((massOf.get(m.linkId) ?? 0) * 1000, 1, ' g') : ''}</td>
                <td className="dim">{first ? (layerOf?.[m.linkId] ?? '—') : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="note">
        Lengths are fixed rigid-body dimensions; angles update every frame. “Ly” is the assembly
        layer (parallel plane) the body sits in. All members are constrained to{' '}
        {CONFIG.Lmin}–{CONFIG.Lmax} mm.
      </div>
    </Section>
  );
}

/** Topology + mobility readout (brief §5). */
export function TopologyPanel({
  mobility,
  loopCount,
  loops,
}: {
  mobility: number;
  loopCount: number;
  loops: string[];
}) {
  return (
    <Section title="Topology" defaultOpen={false}>
      <div className="row wrap">
        <span className={`badge ${mobility === 1 ? 'pass' : 'fail'}`}>Mobility = {mobility}</span>
        <span className="badge info">{loopCount} independent loops</span>
        <span className="badge info">8 links / 10 joints</span>
      </div>
      <div className="note" style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>
        M = 3(n−1) − 2j₁ − j₂ = 3(8−1) − 2(10) − 0 = <b>1</b>
      </div>
      <div className="note" style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>
        {loops.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="note">
        Solved as three RRR Assur dyads in series — every joint comes from a closed-form
        circle–circle intersection, so no Newton iteration is used anywhere.
      </div>
    </Section>
  );
}
