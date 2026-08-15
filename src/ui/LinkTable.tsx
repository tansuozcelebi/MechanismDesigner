import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { topologyOf } from '../mechanism/topology';
import type { JointId, LinkId, Pose, Topology } from '../mechanism/types';
import { poseMassProperties } from '../dynamics/massProperties';
import type { Selection } from '../rendering/MechanismViewer';
import { angleOf, radToDeg, sub, type Vec2 } from '../utils/math';
import { useT } from '../i18n';
import { Section, num } from './primitives';

/**
 * Live link table (brief §36).  Lengths are constant by construction — they are
 * the rigid-body dimensions — while the body angles update every frame.
 *
 * Rows are clickable and share the canvas selection, so picking a bar on screen
 * highlights its row and vice versa.
 */
export function LinkTable({
  geo,
  pose,
  collidingLinks,
  layerOf,
  selection,
  onSelect,
}: {
  geo: Geometry;
  pose: Pose | null;
  collidingLinks: Set<LinkId>;
  layerOf?: Record<string, number>;
  selection?: Selection;
  onSelect?: (sel: Selection) => void;
}) {
  const t = useT();
  const topo = topologyOf(geo.spec);
  const props = pose ? poseMassProperties(geo, pose) : [];
  const massOf = new Map(props.map((p) => [p.linkId, p.mass]));
  const nameOf = (id: string) => geo.spec.labels?.[id] ?? id;

  // Every point in the mechanism lives in `pose.points`, including the rigid
  // extras that carry the LED, so member endpoints resolve uniformly.
  const at = (id: JointId): Vec2 | null => (pose ? (pose.points[id] ?? null) : null);

  const rows = geo.members.map((m, index) => {
    const link = topo.links.find((l) => l.id === m.linkId);
    const a = at(m.from);
    const b = at(m.to);
    const ang = a && b ? radToDeg(angleOf(sub(b, a))) : NaN;
    return { m, link, ang, index };
  });

  return (
    <Section title={t('links.title')}>
      <table className="picklist">
        <thead>
          <tr>
            <th>{t('links.member')}</th>
            <th>{t('links.length')}</th>
            <th>{t('links.angle')}</th>
            <th>{t('links.mass')}</th>
            <th>{t('links.layer')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, link, ang, index }, i) => {
            const selected =
              selection?.kind === 'link' && selection.memberIndex === index ? 'selected' : '';
            const cls = [
              link?.role === 'input' ? 'input' : '',
              link?.role === 'output' ? 'output' : '',
              collidingLinks.has(m.linkId) ? 'collide' : '',
              selected,
            ]
              .filter(Boolean)
              .join(' ');
            // Mass is a property of the whole rigid body, shown on its first row.
            const first = rows.findIndex((r) => r.m.linkId === m.linkId) === i;
            return (
              <tr
                key={`${m.linkId}-${m.from}-${m.to}`}
                className={cls}
                onClick={() =>
                  onSelect?.({ kind: 'link', linkId: m.linkId, memberIndex: index })
                }
              >
                <td>
                  {nameOf(m.linkId)}: {nameOf(String(m.from))}–{nameOf(String(m.to))}
                </td>
                <td>{num(m.length, 2)}</td>
                <td>{num(ang, 1, '°')}</td>
                <td className="dim">
                  {first ? num((massOf.get(m.linkId) ?? 0) * 1000, 1, ' g') : ''}
                </td>
                <td className="dim">{first ? (layerOf?.[m.linkId] ?? '—') : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="note">{t('links.note', { min: CONFIG.Lmin, max: CONFIG.Lmax })}</div>
    </Section>
  );
}

/**
 * Topology + mobility readout (brief §5).
 *
 * Every number here is read off the CONSTRUCTED graph, not off the formula, so
 * the panel confirms the mechanism that is actually being simulated is 1-DOF
 * rather than restating an identity.
 */
export function TopologyPanel({ topology }: { topology: Topology }) {
  const t = useT();
  const n = topology.links.length;
  const j = topology.joints.length;

  return (
    <Section title={t('topology.title')} defaultOpen={false}>
      <div className="row wrap">
        <span className={`badge ${topology.mobility === 1 ? 'pass' : 'fail'}`}>
          {t('topology.mobility', { n: topology.mobility })}
        </span>
        <span className="badge info">{t('topology.loops', { n: topology.loopCount })}</span>
        <span className="badge info">{t('topology.counts', { n, j })}</span>
      </div>
      <div className="note" style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>
        M = 3(n−1) − 2j₁ − j₂ = 3({n}−1) − 2({j}) − 0 = <b>{topology.mobility}</b>
      </div>
      <div className="note" style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>
        {topology.loops.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="note">{t('topology.note')}</div>
    </Section>
  );
}
