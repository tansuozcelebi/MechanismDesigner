import { useState, type ReactNode } from 'react';

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
  return (
    <div className="section">
      <header onClick={() => setOpen((o) => !o)}>
        <span className={`chev ${open ? 'open' : ''}`}>▶</span>
        <h2>{title}</h2>
        {right}
      </header>
      {open && <div className="body">{children}</div>}
    </div>
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
