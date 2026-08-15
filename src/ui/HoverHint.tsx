import { CONFIG } from '../mechanism/config';
import type { Geometry } from '../mechanism/mechanism';
import { dyadJointId } from '../mechanism/spec';
import { topologyOf } from '../mechanism/topology';
import type { Pose } from '../mechanism/types';
import type { Selection } from '../rendering/MechanismViewer';
import { angleOf, radToDeg, sub } from '../utils/math';
import { useT } from '../i18n';
import { num } from './primitives';

/**
 * Translucent strip along the bottom of the canvas describing whatever the
 * cursor is over.
 *
 * It is a read-out, not a control: hovering must never change the design, and
 * it must not disturb the selection the user deliberately made. Everything here
 * is live at the current motor angle, which is the point — a bar's length is
 * constant and already in the table, but its orientation, its transmission
 * angle and whether it is currently interfering are only meaningful now.
 */
export function HoverHint({
  hover,
  geo,
  pose,
  layerOf,
  collidingMembers,
}: {
  hover: Selection;
  geo: Geometry;
  pose: Pose | null;
  layerOf?: Record<string, number>;
  collidingMembers?: Set<number>;
}) {
  const t = useT();
  if (!hover) return null;

  const nameOf = (id: string) => geo.spec.labels?.[id] ?? id;

  if (hover.kind === 'link') {
    const member = geo.members[hover.memberIndex];
    // The hovered index belongs to the geometry it was resolved against; after
    // a design change it may no longer exist, and a stale hint is worse than none.
    if (!member || member.linkId !== hover.linkId) return null;

    const a = pose?.points[member.from];
    const b = pose?.points[member.to];
    const ang = a && b ? radToDeg(angleOf(sub(b, a))) : NaN;
    const layer = layerOf?.[member.linkId];
    const colliding = collidingMembers?.has(hover.memberIndex) ?? false;

    return (
      <Strip>
        <b>{nameOf(member.linkId)}</b>
        <span className="sep">·</span>
        <span>
          {nameOf(String(member.from))}–{nameOf(String(member.to))}
        </span>
        <Field label={t('hint.length')} value={`${num(member.length, 2)} mm`} />
        <Field label={t('hint.angle')} value={num(ang, 1, '°')} />
        {layer !== undefined && <Field label={t('hint.layer')} value={String(layer)} />}
        {colliding && <span className="bad">{t('hint.interfering')}</span>}
        <span className="spacer" />
        <span className="dim">{t('hint.clickToEdit')}</span>
      </Strip>
    );
  }

  const p = pose?.points[hover.pointId];
  const topo = topologyOf(geo.spec);
  const pairs = topo.joints.filter((j) => j.pointId === hover.pointId);
  const isGround = pairs.some((j) => j.kind === 'fixed');
  const bodies = [...new Set(pairs.flatMap((j) => j.links))].map(nameOf);

  // A dyad's own joint is the vertex whose transmission angle governs how well
  // the motor can drive through this configuration, so it is worth surfacing
  // exactly where the cursor is.
  const dyadIndex = geo.spec.dyads.findIndex((_, k) => dyadJointId(k) === hover.pointId);
  const mu = dyadIndex >= 0 ? pose?.transmissionAngles[dyadIndex] : undefined;
  const muOk = mu !== undefined && mu >= CONFIG.muHardMin && mu <= CONFIG.muHardMax;

  return (
    <Strip>
      <b>{nameOf(hover.pointId)}</b>
      <span className="sep">·</span>
      <span className="kind">{t(isGround ? 'inspect.groundPivot' : 'inspect.joint')}</span>
      <Field
        label={t('inspect.position')}
        value={p ? `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) mm` : '—'}
      />
      {mu !== undefined && (
        <Field
          label={t('hint.mu')}
          value={num(mu, 1, '°')}
          tone={muOk ? 'good' : 'bad'}
        />
      )}
      <Field label={t('hint.connects')} value={bodies.join(' + ')} />
      {pairs.length > 1 && <Field label={t('hint.pairs')} value={String(pairs.length)} />}
      <span className="spacer" />
      <span className="dim">{t('hint.derived')}</span>
    </Strip>
  );
}

function Strip({ children }: { children: React.ReactNode }) {
  return <div className="hoverhint">{children}</div>;
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <span className="f">
      <i>{label}</i>
      <span className={tone ?? ''}>{value}</span>
    </span>
  );
}
