import { CONFIG } from '../mechanism/config';
import type { DesignVector } from '../mechanism/types';
import { DESIGN_KEYS } from '../mechanism/types';
import { BOUNDS, designToArray } from '../mechanism/mechanism';
import type { DebugOptions } from '../rendering/DebugRenderer';
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
  const set = <K extends keyof DisplayOptions>(k: K, v: DisplayOptions[K]) =>
    onDisplay({ ...display, [k]: v });
  const setDbg = <K extends keyof DebugOptions>(k: K, v: boolean) =>
    onDebugOptions({ ...debugOptions, [k]: v });

  return (
    <Section title="Display">
      <div className="row wrap">
        <Check label="Grid" checked={display.grid} onChange={(v) => set('grid', v)} />
        <Check label="Show Target" checked={display.target} onChange={(v) => set('target', v)} />
        <Check label="Show Trail" checked={display.trail} onChange={(v) => set('trail', v)} />
        <Check label="Debug" checked={display.debug} onChange={(v) => set('debug', v)} />
      </div>

      {display.debug && (
        <div className="row wrap" style={{ paddingLeft: 6 }}>
          <Check label="Names" checked={debugOptions.names} onChange={(v) => setDbg('names', v)} />
          <Check
            label="Coords"
            checked={debugOptions.coordinates}
            onChange={(v) => setDbg('coordinates', v)}
          />
          <Check label="Loops" checked={debugOptions.loops} onChange={(v) => setDbg('loops', v)} />
          <Check label="COM" checked={debugOptions.com} onChange={(v) => setDbg('com', v)} />
          <Check
            label="Velocity"
            checked={debugOptions.velocity}
            onChange={(v) => setDbg('velocity', v)}
          />
          <Check
            label="Gravity"
            checked={debugOptions.gravity}
            onChange={(v) => setDbg('gravity', v)}
          />
          <Check
            label="μ angles"
            checked={debugOptions.transmission}
            onChange={(v) => setDbg('transmission', v)}
          />
        </div>
      )}

      <div className="row wrap">
        <button onClick={onClearTrail}>Clear Trail</button>
        <button onClick={onFullPath}>Draw Full Path</button>
        <button onClick={onFitView}>Fit View</button>
      </div>
      <div className="note">
        Drag the orange crank to turn the motor by hand. Drag empty space to pan, wheel to zoom.
      </div>
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
  const omega = (2 * Math.PI * rpm) / 60;
  return (
    <Section title="Motor & Physics">
      <Slider
        label="Motor speed"
        value={rpm}
        min={CONFIG.rpmMin}
        max={CONFIG.rpmMax}
        step={1}
        unit=" rpm"
        digits={0}
        onChange={onRpm}
      />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="note">ω = 2π·rpm/60</span>
        <span className="note" style={{ fontFamily: 'var(--mono)' }}>
          {omega.toFixed(3)} rad/s
        </span>
      </div>
      <div className="row">
        <Check label="Gravity ON" checked={gravityOn} onChange={onGravity} />
        <span className="note">g = [0, −9.807] m/s², +y up</span>
      </div>
      <div className="note">
        {playing ? 'Playing' : 'Paused'} — one motor revolution traces one complete LED path.
      </div>
    </Section>
  );
}

/** Live design vector, editable (brief §51 formatting: two decimals). */
export function DesignPanel({
  design,
  label,
  onChange,
  onExport,
}: {
  design: DesignVector;
  label: string;
  onChange: (d: DesignVector) => void;
  onExport: () => void;
}) {
  const arr = designToArray(design);

  const update = (i: number, v: number) => {
    const next = arr.slice();
    next[i] = v;
    const d: DesignVector = { ...design };
    DESIGN_KEYS.forEach((k, j) => {
      (d as unknown as Record<string, number>)[k] = next[j];
    });
    onChange(d);
  };

  return (
    <Section title={label} defaultOpen={false}>
      <div className="note">
        Fixed by the brief: O2 = (0, 0), |O2 O4| = {CONFIG.O2O4} mm, |O4 O6| = {CONFIG.O4O6} mm,
        crank |O2 A| = {CONFIG.crankLength} mm.
      </div>
      {DESIGN_KEYS.map((k, i) => {
        const [lo, hi] = BOUNDS[k];
        const isAngle = k === 'phi6' || k.endsWith('a');
        return (
          <Slider
            key={k}
            label={`${k} (${isAngle ? '°' : 'mm'})`}
            value={arr[i]}
            min={lo}
            max={hi}
            step={isAngle ? 0.5 : 0.5}
            digits={2}
            onChange={(v) => update(i, v)}
          />
        );
      })}
      <button onClick={onExport}>Export Design JSON</button>
    </Section>
  );
}

/** Final numeric report (brief §51). */
export function GeometryReport({
  design,
  pivots,
  members,
  title,
}: {
  design: DesignVector;
  pivots: { O2: { x: number; y: number }; O4: { x: number; y: number }; O6: { x: number; y: number } };
  members: { linkId: string; from: string; to: string; length: number }[];
  title: string;
}) {
  return (
    <Section title={title} defaultOpen={false}>
      <table>
        <tbody>
          <tr>
            <td>O2</td>
            <td>
              ({pivots.O2.x.toFixed(2)}, {pivots.O2.y.toFixed(2)})
            </td>
          </tr>
          <tr>
            <td>O4</td>
            <td>
              ({pivots.O4.x.toFixed(2)}, {pivots.O4.y.toFixed(2)})
            </td>
          </tr>
          <tr>
            <td>O6</td>
            <td>
              ({pivots.O6.x.toFixed(2)}, {pivots.O6.y.toFixed(2)})
            </td>
          </tr>
          <tr>
            <td>φ₆</td>
            <td>{design.phi6.toFixed(2)}°</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Length (mm)</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={`${m.linkId}-${m.from}-${m.to}`}>
              <td>
                {m.linkId}: {m.from}–{m.to}
              </td>
              <td>{num(m.length, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
