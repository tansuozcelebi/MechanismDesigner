import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGeometry } from '../mechanism/mechanism';
import type { MechanismSpec } from '../mechanism/spec';
import { sweep } from '../kinematics/forwardSolver';
import { useT } from '../i18n';

/**
 * A self-contained, lightweight runner: the mechanism solved through one
 * revolution and played back as SVG.
 *
 * The favourites page can hold dozens of designs, and a WebGL context per card
 * would exhaust the browser's limit long before that (most allow 16). One
 * sweep per card, drawn as a handful of lines, costs nothing by comparison and
 * uses exactly the solver the workbench uses — what plays here is the same
 * motion, not an approximation of it.
 */

/** Frames per revolution. Enough for smooth playback, cheap enough per card. */
const FRAMES = 180;

export function useSweep(spec: MechanismSpec, params: number[]) {
  return useMemo(() => {
    const geo = buildGeometry(spec, params);
    const sw = sweep(geo, FRAMES, { computeSigma: false });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of sw.poses) {
      for (const v of Object.values(p.points)) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
    }
    return { geo, sw, box: { minX, minY, maxX, maxY } };
  }, [spec, params]);
}

export function MechanismRunner({
  spec,
  params,
  autoPlay = false,
  rpm = 30,
  label,
}: {
  spec: MechanismSpec;
  params: number[];
  autoPlay?: boolean;
  /** Playback speed; the card runs slower than the workbench so it can be followed. */
  rpm?: number;
  /** Accessible name for the drawing. */
  label: string;
}) {
  const t = useT();
  const { geo, sw, box } = useSweep(spec, params);
  const [frame, setFrame] = useState(0);
  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  // Respect a reduced-motion preference: nothing starts moving on its own.
  const [playing, setPlaying] = useState(autoPlay && !reduceMotion);
  const pos = useRef(0);

  useEffect(() => {
    if (!playing || sw.poses.length === 0) return;
    let raf = 0;
    let last = performance.now();
    const framesPerSecond = (rpm / 60) * sw.poses.length;
    const tick = (now: number) => {
      pos.current = (pos.current + ((now - last) / 1000) * framesPerSecond) % sw.poses.length;
      last = now;
      setFrame(Math.floor(pos.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rpm, sw.poses.length]);

  if (sw.poses.length === 0) {
    return <div className="runner-empty">{t('fav.noAssembly')}</div>;
  }

  const pose = sw.poses[Math.min(frame, sw.poses.length - 1)];
  const pad = 20;
  const w = box.maxX - box.minX + 2 * pad;
  const h = box.maxY - box.minY + 2 * pad;
  // World y points up, SVG y points down: flip once on the group.
  const viewBox = `${box.minX - pad} ${-(box.maxY + pad)} ${w} ${h}`;
  const stroke = Math.max(w, h) / 120;
  const path = sw.poses.map((p) => `${p.led.x.toFixed(1)},${(-p.led.y).toFixed(1)}`).join(' ');

  return (
    <div className="runner">
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
      >
        <polyline
          points={path}
          fill="none"
          stroke="#ff4d6d"
          strokeOpacity={0.55}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        <g transform="scale(1,-1)">
          {geo.members.map((m, i) => {
            const a = pose.points[m.from];
            const b = pose.points[m.to];
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={m.linkId === 'crank' ? '#f2a33c' : '#8fb4dd'}
                strokeWidth={stroke * 1.6}
                strokeLinecap="round"
              />
            );
          })}
          {geo.ground.map((g, i) => (
            <rect
              key={i}
              x={g.x - stroke * 2.5}
              y={g.y - stroke * 2.5}
              width={stroke * 5}
              height={stroke * 5}
              fill="#61708a"
            />
          ))}
          <circle cx={pose.led.x} cy={pose.led.y} r={stroke * 3} fill="#ff4d6d" />
        </g>
      </svg>
      <div className="runner-controls">
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={t(playing ? 'timeline.pause' : 'timeline.play')}
          title={t(playing ? 'timeline.pause' : 'timeline.play')}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={sw.poses.length - 1}
          value={frame}
          aria-label={t('timeline.motorAngle')}
          onChange={(e) => {
            setPlaying(false);
            pos.current = Number(e.target.value);
            setFrame(pos.current);
          }}
        />
        <span className="mono">{((frame / sw.poses.length) * 360).toFixed(0)}°</span>
      </div>
    </div>
  );
}
