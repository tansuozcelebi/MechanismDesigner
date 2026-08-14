import { useMemo } from 'react';
import { THEME } from '../rendering/theme';

/**
 * Gravity-torque profile over one revolution (brief §22).
 * Plain inline SVG — no charting dependency (brief §53).
 */
export function TorqueChart({
  samples,
  cursorTheta,
  height = 78,
}: {
  samples: { theta: number; tau: number }[];
  cursorTheta: number;
  height?: number;
}) {
  const view = useMemo(() => {
    const finite = samples.filter((s) => Number.isFinite(s.tau));
    if (finite.length < 2) return null;
    const peak = Math.max(...finite.map((s) => Math.abs(s.tau)), 1e-6);
    const W = 300;
    const H = height;
    const pad = 4;
    const toX = (t: number) => (t / (2 * Math.PI)) * W;
    const toY = (v: number) => H / 2 - (v / peak) * (H / 2 - pad);
    const d = finite
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.theta).toFixed(2)},${toY(s.tau).toFixed(2)}`)
      .join(' ');
    return { d, peak, W, H, toX, toY };
  }, [samples, height]);

  if (!view) return <div className="note">Torque profile unavailable.</div>;

  const cursorX = view.toX(((cursorTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${view.W} ${view.H}`} preserveAspectRatio="none">
        <line
          x1={0}
          y1={view.H / 2}
          x2={view.W}
          y2={view.H / 2}
          stroke={hex(THEME.axis)}
          strokeWidth={1}
        />
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={view.W * f}
            y1={0}
            x2={view.W * f}
            y2={view.H}
            stroke={hex(THEME.grid)}
            strokeWidth={1}
          />
        ))}
        <path d={view.d} fill="none" stroke={hex(THEME.com)} strokeWidth={1.5} />
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={view.H}
          stroke={hex(THEME.led)}
          strokeWidth={1.2}
        />
      </svg>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="note">0°</span>
        <span className="note">peak ±{view.peak.toFixed(4)} N·m</span>
        <span className="note">360°</span>
      </div>
    </div>
  );
}
