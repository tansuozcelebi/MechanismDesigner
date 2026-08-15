import { CONFIG, DEFAULT_CONFIG, applyConfig, resetConfig } from '../mechanism/config';
import { SPEC_CHOICES, defaultSpec, type MechanismSpec } from '../mechanism/spec';
import { topologyOf } from '../mechanism/topology';
import type { Geometry } from '../mechanism/mechanism';
import type { Pose } from '../mechanism/types';
import type { Selection } from '../rendering/MechanismViewer';
import type { TargetCurve } from '../synthesis/targetCurve';
import { useT } from '../i18n';
import { Check, Section, Slider, num } from './primitives';

/* ------------------------------------------------------------------ */
/* Mechanism size                                                       */
/* ------------------------------------------------------------------ */

/**
 * Link-count control.
 *
 * Every option is 1-DOF by construction — each RRR dyad is a zero-mobility
 * Assur group — so the mobility readout is a computed confirmation, not a
 * promise. Changing size necessarily discards the current parameter vector,
 * because it indexes a different topology.
 */
export function MechanismPanel({
  spec,
  onSpec,
  paramCount,
}: {
  spec: MechanismSpec;
  onSpec: (s: MechanismSpec) => void;
  paramCount: number;
}) {
  const t = useT();
  const topo = topologyOf(spec);
  const dyads = spec.dyads.length;

  return (
    <Section title={t('mech.title')}>
      <div className="row wrap">
        {SPEC_CHOICES.map((c) => (
          <button
            key={c.dyads}
            className={c.dyads === dyads ? 'active' : ''}
            onClick={() => onSpec(defaultSpec(c.dyads))}
            title={t('mech.choiceTip', { links: c.links, joints: c.joints, dyads: c.dyads })}
          >
            {c.links}
          </button>
        ))}
      </div>
      <div className="note">{t('mech.linksLabel')}</div>

      <div className="row wrap">
        <span className={`badge ${topo.mobility === 1 ? 'pass' : 'fail'}`}>
          {t('topology.mobility', { n: topo.mobility })}
        </span>
        <span className="badge info">{t('mech.dyads', { n: dyads })}</span>
        <span className="badge info">{t('mech.params', { n: paramCount })}</span>
      </div>

      <div className="note">{t('mech.note')}</div>
      <div className="banner warn">{t('mech.resetWarning')}</div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Constraints                                                          */
/* ------------------------------------------------------------------ */

/**
 * Editable design limits.
 *
 * These feed the solver, the sampler and the objective on the next evaluation.
 * Changing them does not retro-fit the current design — it changes what counts
 * as valid from here on, which is why the panel reports whether the design in
 * hand still satisfies them.
 */
export function ConstraintsPanel({ onChange }: { onChange: () => void }) {
  const t = useT();
  const set = (patch: Parameters<typeof applyConfig>[0]) => {
    applyConfig(patch);
    onChange();
  };

  return (
    <Section title={t('limits.title')} defaultOpen={false}>
      <Slider
        label={t('limits.lmin')}
        value={CONFIG.Lmin}
        min={5}
        max={Math.max(10, CONFIG.Lmax - 5)}
        step={1}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ Lmin: Math.min(v, CONFIG.Lmax - 5) })}
      />
      <Slider
        label={t('limits.lmax')}
        value={CONFIG.Lmax}
        min={CONFIG.Lmin + 5}
        max={600}
        step={5}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ Lmax: Math.max(v, CONFIG.Lmin + 5) })}
      />
      <Slider
        label={t('limits.crank')}
        value={CONFIG.crankLength}
        min={10}
        max={200}
        step={1}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ crankLength: v })}
      />
      <Slider
        label={t('limits.o2o4')}
        value={CONFIG.O2O4}
        min={40}
        max={400}
        step={5}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ O2O4: v })}
      />
      <Slider
        label={t('limits.o4o6')}
        value={CONFIG.O4O6}
        min={40}
        max={400}
        step={5}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ O4O6: v })}
      />
      <Slider
        label={t('limits.linkWidth')}
        value={CONFIG.linkWidth}
        min={2}
        max={40}
        step={1}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ linkWidth: v })}
      />
      <Slider
        label={t('limits.muReject')}
        value={CONFIG.scales.muHardReject}
        min={0}
        max={45}
        step={1}
        unit="°"
        digits={0}
        onChange={(v) => set({ scales: { muHardReject: v } })}
      />
      <Slider
        label={t('limits.targetW')}
        value={CONFIG.targetWidth}
        min={50}
        max={600}
        step={5}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ targetWidth: v })}
      />
      <Slider
        label={t('limits.targetH')}
        value={CONFIG.targetHeight}
        min={50}
        max={600}
        step={5}
        unit=" mm"
        digits={0}
        onChange={(v) => set({ targetHeight: v })}
      />

      <div className="note">{t('limits.weightsTitle')}</div>
      {(
        [
          ['w1_curve', 'limits.w1'],
          ['w2_size', 'limits.w2'],
          ['w3_closure', 'limits.w3'],
          ['w4_singularity', 'limits.w4'],
          ['w5_collision', 'limits.w5'],
          ['w6_ratio', 'limits.w6'],
          ['w7_gravity', 'limits.w7'],
        ] as const
      ).map(([key, label]) => (
        <Slider
          key={key}
          label={t(label)}
          value={CONFIG.weights[key]}
          min={0}
          max={20}
          step={0.05}
          digits={2}
          onChange={(v) => set({ weights: { [key]: v } })}
        />
      ))}

      <button
        onClick={() => {
          resetConfig();
          onChange();
        }}
      >
        {t('limits.reset')}
      </button>
      <div className="note">
        {t('limits.note', { lmin: DEFAULT_CONFIG.Lmin, lmax: DEFAULT_CONFIG.Lmax })}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Target editor                                                        */
/* ------------------------------------------------------------------ */

export function TargetEditorPanel({
  target,
  editing,
  onEditing,
  onTarget,
  onLoadHeart,
  onLoadCircle,
  onImport,
  onExport,
  message,
  actualWidth,
  actualHeight,
}: {
  target: TargetCurve;
  editing: boolean;
  onEditing: (v: boolean) => void;
  onTarget: (c: TargetCurve) => void;
  onLoadHeart: () => void;
  onLoadCircle: () => void;
  onImport: () => void;
  onExport: () => void;
  message: string | null;
  actualWidth: number;
  actualHeight: number;
}) {
  const t = useT();

  return (
    <Section title={t('targetEdit.title')}>
      <div className="row wrap">
        <button onClick={onLoadHeart} className={target.kind === 'heart' ? 'active' : ''}>
          {t('targetEdit.heart')}
        </button>
        <button onClick={onLoadCircle}>{t('targetEdit.circle')}</button>
        <button onClick={onImport}>{t('targetEdit.import')}</button>
        <button onClick={onExport}>{t('targetEdit.export')}</button>
      </div>

      <Check label={t('targetEdit.editMode')} checked={editing} onChange={onEditing} />
      {editing && <div className="banner ok">{t('targetEdit.hint')}</div>}

      <div className="row wrap">
        <Check
          label={t('targetEdit.smooth')}
          checked={target.smooth}
          onChange={(v) => onTarget({ ...target, smooth: v, kind: 'custom' })}
        />
        <Check
          label={t('targetEdit.normalize')}
          checked={target.normalize}
          onChange={(v) => onTarget({ ...target, normalize: v })}
        />
      </div>

      <dl className="metrics">
        <dt>{t('targetEdit.name')}</dt>
        <dd>{target.name}</dd>
        <dt>{t('targetEdit.points')}</dt>
        <dd>{target.controls.length}</dd>
        <dt>{t('targetEdit.size')}</dt>
        <dd>
          {num(actualWidth, 1)} × {num(actualHeight, 1)} mm
        </dd>
      </dl>

      {target.normalize && (
        <div className="note">{t('targetEdit.normalizeNote', { w: target.width, h: target.height })}</div>
      )}
      {message && <div className="banner warn">{message}</div>}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Inspector                                                            */
/* ------------------------------------------------------------------ */

/**
 * What the user clicked, and what about it can be changed.
 *
 * The honest distinction this panel has to make: a bar's length is a design
 * variable and is directly editable, whereas a moving joint's position is
 * DERIVED — it is wherever the mechanism puts it at this motor angle. Offering
 * a coordinate box for a solved joint would imply a freedom that does not
 * exist, so those are shown read-only with the parameters that do control them.
 */
export function InspectorPanel({
  selection,
  geo,
  pose,
  params,
  onParam,
  layerOf,
}: {
  selection: Selection;
  geo: Geometry;
  pose: Pose | null;
  params: number[];
  onParam: (index: number, value: number) => void;
  layerOf?: Record<string, number>;
}) {
  const t = useT();
  const nameOf = (id: string) => geo.spec.labels?.[id] ?? id;

  if (!selection) {
    return (
      <Section title={t('inspect.title')}>
        <div className="note">{t('inspect.empty')}</div>
      </Section>
    );
  }

  if (selection.kind === 'point') {
    const p = pose?.points[selection.pointId];
    const topo = topologyOf(geo.spec);
    const pairs = topo.joints.filter((j) => j.pointId === selection.pointId);
    const isGround = pairs.some((j) => j.kind === 'fixed');
    // Parameters that place this point: a ground heading, or the (r, angle) of
    // the rigid attachment it sits on.
    const owning = geo.layout
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => {
        if (l.extra) return `E${l.extra.dyad}${l.extra.side}` === selection.pointId;
        if (l.groundIndex !== undefined) return `G${l.groundIndex}` === selection.pointId;
        return false;
      });

    return (
      <Section title={t('inspect.title')}>
        <div className="row wrap">
          <span className="badge info">{t(isGround ? 'inspect.groundPivot' : 'inspect.joint')}</span>
          <span className="badge info">{nameOf(selection.pointId)}</span>
        </div>
        <dl className="metrics">
          <dt>{t('inspect.position')}</dt>
          <dd>
            {p ? `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}) mm` : '—'}
          </dd>
          <dt>{t('inspect.pairs')}</dt>
          <dd>{pairs.length}</dd>
          <dt>{t('inspect.connects')}</dt>
          <dd>{[...new Set(pairs.flatMap((j) => j.links))].map(nameOf).join(', ')}</dd>
        </dl>

        {owning.length > 0 ? (
          <>
            <div className="note">{t('inspect.controlledBy')}</div>
            {owning.map(({ l, i }) => (
              <Slider
                key={l.key}
                label={`${l.label} (${l.unit === 'mm' ? 'mm' : '°'})`}
                value={params[i]}
                min={l.unit === 'mm' ? CONFIG.Lmin : l.min}
                max={l.unit === 'mm' ? CONFIG.Lmax : l.max}
                step={0.5}
                digits={2}
                onChange={(v) => onParam(i, v)}
              />
            ))}
          </>
        ) : (
          <div className="note">{t('inspect.derived')}</div>
        )}
      </Section>
    );
  }

  // A bar was picked. The member index belongs to the geometry it was picked
  // from, so a selection that outlived a change of mechanism is dropped rather
  // than pointed at whatever now sits at that index.
  const member = geo.members[selection.memberIndex];
  if (!member || member.linkId !== selection.linkId) {
    return (
      <Section title={t('inspect.title')}>
        <div className="note">{t('inspect.empty')}</div>
      </Section>
    );
  }
  const bar = geo.bars.find((b) => b.id === selection.linkId);
  const owning = geo.layout
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.bar === selection.linkId);
  const isCrank = selection.linkId === 'crank';

  return (
    <Section title={t('inspect.title')}>
      <div className="row wrap">
        <span className="badge info">{t('inspect.link')}</span>
        <span className="badge info">{nameOf(selection.linkId)}</span>
        {layerOf?.[selection.linkId] !== undefined && (
          <span className="badge info">{t('inspect.layer', { n: layerOf[selection.linkId] })}</span>
        )}
      </div>

      <dl className="metrics">
        <dt>{t('inspect.member')}</dt>
        <dd>
          {nameOf(String(member.from))}–{nameOf(String(member.to))}
        </dd>
        <dt>{t('inspect.memberLength')}</dt>
        <dd>{num(member.length, 2)} mm</dd>
        {bar && (
          <>
            <dt>{t('inspect.dyad')}</dt>
            <dd>
              {bar.dyad + 1}
              {bar.side}
            </dd>
          </>
        )}
      </dl>

      {isCrank ? (
        <>
          <div className="note">{t('inspect.crankNote')}</div>
          <Slider
            label={t('limits.crank')}
            value={CONFIG.crankLength}
            min={10}
            max={200}
            step={1}
            unit=" mm"
            digits={0}
            onChange={(v) => {
              applyConfig({ crankLength: v });
              // Nudge a parameter so the design recomputes with the new frame.
              onParam(-1, 0);
            }}
          />
        </>
      ) : owning.length > 0 ? (
        <>
          <div className="note">{t('inspect.editable')}</div>
          {owning.map(({ l, i }) => (
            <Slider
              key={l.key}
              label={`${l.label} (${l.unit === 'mm' ? 'mm' : '°'})`}
              value={params[i]}
              min={l.unit === 'mm' ? CONFIG.Lmin : l.min}
              max={l.unit === 'mm' ? CONFIG.Lmax : l.max}
              step={0.5}
              digits={2}
              onChange={(v) => onParam(i, v)}
            />
          ))}
          {member.length !== undefined && owning.every((o) => o.l.kind !== 'length') && (
            <div className="note">{t('inspect.derivedMember')}</div>
          )}
        </>
      ) : (
        <div className="note">{t('inspect.derived')}</div>
      )}
    </Section>
  );
}
