import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDockSlot } from './dock';
import { useT } from '../i18n';

/**
 * Lets a container open or close every `Section` inside it at once.
 *
 * `stamp` is what drives it, not `open`: the point is to act on the *command*
 * rather than on the state, so that a section the reader has since reopened by
 * hand is closed again by the next "collapse all" instead of being ignored.
 *
 * A sidebar holding a dozen panels is navigable on a desktop and is not on a
 * phone, where collapsing them one at a time costs a dozen taps and a lot of
 * scrolling.
 */
export type SectionGroupCommand = { stamp: number; open: boolean };

const SectionGroupContext = createContext<SectionGroupCommand | null>(null);

export const SectionGroup = ({
  command,
  children,
}: {
  command: SectionGroupCommand | null;
  children: ReactNode;
}) => <SectionGroupContext.Provider value={command}>{children}</SectionGroupContext.Provider>;

export function Section({
  title,
  children,
  defaultOpen = true,
  right,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const slot = useDockSlot();
  const group = useContext(SectionGroupContext);
  const seen = useRef(group?.stamp ?? 0);

  useEffect(() => {
    if (!group || group.stamp === seen.current) return;
    seen.current = group.stamp;
    setOpen(group.open);
  }, [group]);

  return (
    <div className="section">
      <header
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        // Dragging the header is the quick way to move a panel; the buttons
        // below do the same thing for anyone not using a pointer.
        draggable={slot !== null}
        onDragStart={(e) => {
          if (!slot) return;
          e.dataTransfer.setData('text/kreamet-panel', slot.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className={`chev ${open ? 'open' : ''}`}>▶</span>
        <h2>{title}</h2>
        {right}
        {slot && <DockControls slot={slot} />}
      </header>
      {open && <div className="body">{children}</div>}
    </div>
  );
}

/**
 * Move-this-panel controls, shown in a section header when the panel is inside
 * a `DockSlot`. Clicks are stopped so that reaching for a control does not also
 * collapse the panel underneath it.
 */
function DockControls({ slot }: { slot: NonNullable<ReturnType<typeof useDockSlot>> }) {
  const t = useT();
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  return (
    // Arrows rather than ◀ ▶ triangles: those already mean "play" on the
    // timeline in this app, and one glyph should not mean two things. The
    // smoke suite found the collision — its play-button selector matched a
    // dock control and moved a panel instead of starting playback.
    <span className="dock-controls" onClick={(e) => e.stopPropagation()}>
      {slot.dock !== 'left' && (
        <button title={t('dock.toLeft')} aria-label={t('dock.toLeft')} onClick={stop(() => slot.move('left'))}>
          ←
        </button>
      )}
      {slot.dock !== 'right' && (
        <button title={t('dock.toRight')} aria-label={t('dock.toRight')} onClick={stop(() => slot.move('right'))}>
          →
        </button>
      )}
      <button title={t('dock.hide')} aria-label={t('dock.hide')} onClick={stop(() => slot.move('hidden'))}>
        ✕
      </button>
    </span>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  digits = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  digits?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider">
      <div className="head">
        <span>{label}</span>
        <b>
          {value.toFixed(digits)}
          {unit}
        </b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export type MetricTone = 'good' | 'warn' | 'bad' | 'dim' | undefined;

export function Metric({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: ReactNode;
  tone?: MetricTone;
  title?: string;
}) {
  return (
    <>
      <dt title={title ?? label}>{label}</dt>
      <dd className={tone}>{value}</dd>
    </>
  );
}

export const Metrics = ({ children }: { children: ReactNode }) => (
  <dl className="metrics">{children}</dl>
);

/** Format a number, degrading gracefully for NaN / Infinity. */
export function num(v: number | undefined | null, digits = 2, suffix = ''): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits)}${suffix}`;
}

/** Scientific notation for the very small residuals. */
export function sci(v: number | undefined | null, digits = 2): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  if (Math.abs(v) < 1e-4) return v.toExponential(digits);
  return v.toFixed(4);
}
