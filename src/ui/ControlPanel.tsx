import { CONFIG } from '../mechanism/config';
import { paramEntries, type Geometry } from '../mechanism/mechanism';
import { groundJointId } from '../mechanism/spec';
import type { DebugOptions } from '../rendering/DebugRenderer';
import { useT } from '../i18n';
import { Check, Section, Slider, num } from './primitives';

export type DisplayOptions = {
  grid: boolean;
  target: boolean;
  trail: boolean;
  debug: boolean;
};

export function DisplayPanel({
  display,
  onDisplay,
  debugOptions,
  onDebugOptions,
  onClearTrail,
  onFullPath,
  onFitView,
}: {
  display: DisplayOptions;
  onDisplay: (d: DisplayOptions) => void;
  debugOptions: DebugOptions;
  onDebugOptions: (d: DebugOptions) => void;
  onClearTrail: () => void;
  onFullPath: () => void;
  onFitView: () => void;
}) {
  const t = useT();
  const set = <K extends keyof DisplayOptions>(k: K, v: DisplayOptions[K]) =>
    onDisplay({ ...display, [k]: v });
  const setDbg = <K extends keyof DebugOptions>(k: K, v: boolean) =>
    onDebugOptions({ ...debugOptions, [k]: v });

  return (
    <Section title={t('display.title')}>
      <div className="row wrap">
        <Check label={t('display.grid')} checked={display.grid} onChange={(v) => set('grid', v)} />
        <Check
          label={t('display.showTarget')}
          checked={display.target}
          onChange={(v) => set('target', v)}
        />
        <Check
          label={t('display.showTrail')}
          checked={display.trail}
          onChange={(v) => set('trail', v)}
        />
        <Check
          label={t('display.debug')}
          checked={display.debug}
          onChange={(v) => set('debug', v)}
        />
      </div>

      {display.debug && (
        <div className="row wrap" style={{ paddingLeft: 6 }}>
          <Check
            label={t('display.dbg.names')}
            checked={debugOptions.names}
            onChange={(v) => setDbg('names', v)}
          />
          <Check
            label={t('display.dbg.coords')}
            checked={debugOptions.coordinates}
            onChange={(v) => setDbg('coordinates', v)}
          />
          <Check
            label={t('display.dbg.loops')}
            checked={debugOptions.loops}
            onChange={(v) => setDbg('loops', v)}
          />
          <Check
            label={t('display.dbg.com')}
            checked={debugOptions.com}
            onChange={(v) => setDbg('com', v)}
          />
          <Check
            label={t('display.dbg.velocity')}
            checked={debugOptions.velocity}
            onChange={(v) => setDbg('velocity', v)}
          />
          <Check
            label={t('display.dbg.gravity')}
            checked={debugOptions.gravity}
            onChange={(v) => setDbg('gravity', v)}
          />
          <Check
            label={t('display.dbg.mu')}
            checked={debugOptions.transmission}
            onChange={(v) => setDbg('transmission', v)}
          />
        </div>
      )}

      <div className="row wrap">
        <button onClick={onClearTrail}>{t('display.clearTrail')}</button>
        <button onClick={onFullPath}>{t('display.fullPath')}</button>
        <button onClick={onFitView}>{t('display.fitView')}</button>
      </div>
      <div className="note">{t('display.hint')}</div>
    </Section>
  );
}

export function MotorPanel({
  rpm,
  onRpm,
  gravityOn,
  onGravity,
  playing,
}: {
  rpm: number;
  onRpm: (v: number) => void;
  gravityOn: boolean;
  onGravity: (v: boolean) => void;
  playing: boolean;
}) {
  const t = useT();
  const omega = (2 * Math.PI * rpm) / 60;

  return (
    <Section title={t('motor.title')}>
      <Slider
        label={t('motor.speed')}
        value={rpm}
        min={CONFIG.rpmMin}
        max={CONFIG.rpmMax}
        step={1}
        unit=" rpm"
        digits={0}
        onChange={onRpm}
      />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="note">{t('motor.omegaFormula')}</span>
        <span className="note" style={{ fontFamily: 'var(--mono)' }}>
          {omega.toFixed(3)} rad/s
        </span>
      </div>
      <div className="row">
        <Check label={t('motor.gravityOn')} checked={gravityOn} onChange={onGravity} />
        <span className="note">{t('motor.gravityVector')}</span>
      </div>
      <div className="note">
        {t(playing ? 'motor.playing' : 'motor.paused')} {t('motor.oneRev')}
      </div>
    </Section>
  );
}

/**
 * Live design vector, editable (brief §51 formatting: two decimals).
 *
 * The rows come from the spec's parameter layout rather than a fixed key list,
 * so the panel follows the mechanism whatever size it is; the canonical 8-bar
 * still shows its historical names (phi6, lAB, c3r, …).
 */
export function DesignPanel({
  geo,
  label,
  onParam,
  onExport,
}: {
  geo: Geometry;
  label: string;
  onParam: (index: number, value: number) => void;
  onExport: () => void;
}) {
  const t = useT();
  const entries = paramEntries(geo);

  return (
    <Section title={t('design.title', { label })} defaultOpen={false}>
      <div className="note">
        {t('design.fixedNote', {
          a: CONFIG.O2O4,
          b: CONFIG.O4O6,
          c: CONFIG.crankLength,
        })}
      </div>
      {entries.map((p, i) => (
        <Slider
          key={p.key}
          label={`${p.label} (${p.unit})`}
          value={p.value}
          min={p.min}
          max={p.max}
          step={0.5}
          digits={2}
          onChange={(v) => onParam(i, v)}
        />
      ))}
      <button onClick={onExport}>{t('design.export')}</button>
    </Section>
  );
}

/** Final numeric report (brief §51). */
export function GeometryReport({ geo, label }: { geo: Geometry; label: string }) {
  const t = useT();
  const nameOf = (id: string) => geo.spec.labels?.[id] ?? id;
  const angles = paramEntries(geo).filter((p) => p.unit === '°');

  return (
    <Section title={t('design.geometryTitle', { label })} defaultOpen={false}>
      <table>
        <tbody>
          {geo.ground.map((p, i) => (
            <tr key={i}>
              <td>{nameOf(groundJointId(i))}</td>
              <td>
                ({p.x.toFixed(2)}, {p.y.toFixed(2)})
              </td>
            </tr>
          ))}
          {angles.map((p) => (
            <tr key={p.key}>
              <td>{p.label}</td>
              <td>{p.value.toFixed(2)}°</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>{t('links.member')}</th>
            <th>{t('design.lengthMm')}</th>
          </tr>
        </thead>
        <tbody>
          {geo.members.map((m) => (
            <tr key={`${m.linkId}-${m.from}-${m.to}`}>
              <td>
                {nameOf(m.linkId)}: {nameOf(String(m.from))}–{nameOf(String(m.to))}
              </td>
              <td>{num(m.length, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
