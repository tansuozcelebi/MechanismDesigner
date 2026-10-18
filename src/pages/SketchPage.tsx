import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_SKETCH,
  fourBarOf,
  jointById,
  mobility,
  motorOf,
  moveJoint,
  nextId,
  parseSketch,
  poseOf,
  removeJoint,
  removeLink,
  setLinkLength,
  sweepSketch,
  type Pose,
  type Sketch,
  type Vec,
} from '../sketch/model';
import { PRESETS } from '../sketch/presets';
import { METHODOLOGY } from '../content/methodology';
import { downloadJson, readFileText } from '../app/exportDesign';
import { useI18n, useT } from '../i18n';
import type { TranslationKey } from '../i18n/translations';

/**
 * Free Sketch: build any planar pin-jointed linkage by hand, drive it from one
 * motor crank, and watch the paths its points trace.
 *
 * Everything is edited in the drawn pose (crank at its drawn angle). Dragging
 * a point re-derives the lengths of the links it carries — positions are how
 * people think about a sketch — while a selected link can be lengthened or
 * shortened with the mouse wheel, which re-assembles the rest around it. The
 * motion is a precomputed sweep, so playback, the traced paths and the
 * analysis panel always describe the same solution.
 */

type Tool = 'select' | 'ground' | 'joint' | 'link' | 'motor' | 'trace';
type Selection = { kind: 'joint' | 'link'; id: string } | null;

const TOOLS: { id: Tool; key: string; icon: string }[] = [
  { id: 'select', key: 'v', icon: '↖' },
  { id: 'ground', key: 'g', icon: '⏚' },
  { id: 'joint', key: 'j', icon: '○' },
  { id: 'link', key: 'l', icon: '╱' },
  { id: 'motor', key: 'm', icon: '⟳' },
  { id: 'trace', key: 't', icon: '〰' },
];

const STORAGE_KEY = 'kreamet.sketch';
const HISTORY = 100;
const GRID = 10;

const loadStored = (): Sketch => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? parseSketch(JSON.parse(raw)) : null;
    if (parsed && parsed.joints.length) return parsed;
  } catch {
    /* fall through to the example */
  }
  // A first visit opens on something that runs, not on an empty grid.
  return PRESETS[1].sketch;
};

type View = { cx: number; cy: number; k: number };

export default function SketchPage() {
  const t = useT();
  const { lang } = useI18n();

  /* ------------------------------ model ------------------------------ */

  const [sketch, setSketchState] = useState<Sketch>(loadStored);
  const past = useRef<Sketch[]>([]);
  const future = useRef<Sketch[]>([]);
  const [, bump] = useState(0);

  /** Apply an edit, recording the previous sketch for undo. */
  const commit = useCallback((next: Sketch | ((s: Sketch) => Sketch)) => {
    setSketchState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (value === prev) return prev;
      past.current = [...past.current.slice(-HISTORY + 1), prev];
      future.current = [];
      return value;
    });
    bump((n) => n + 1);
  }, []);

  /** Replace without a history entry: the intermediate frames of a drag. */
  const replace = useCallback((next: Sketch) => setSketchState(next), []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    setSketchState((cur) => {
      future.current.push(cur);
      return prev;
    });
    bump((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    setSketchState((cur) => {
      past.current.push(cur);
      return next;
    });
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sketch));
    } catch {
      /* the sketch still works for this session */
    }
  }, [sketch]);

  const sweep = useMemo(() => sweepSketch(sketch, 180), [sketch]);
  const mob = useMemo(() => mobility(sketch), [sketch]);
  const motor = useMemo(() => motorOf(sketch), [sketch]);
  const fourBar = useMemo(() => fourBarOf(sketch), [sketch]);

  /* ------------------------------ UI state --------------------------- */

  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>(null);
  const [linkStart, setLinkStart] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Vec | null>(null);
  const [snap, setSnap] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30); // rpm
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(id);
  }, [message]);

  /** Any edit returns to the drawn pose: edits are defined there. */
  const toDrawn = useCallback(() => {
    setPlaying(false);
    setFrame(0);
  }, []);

  /* ------------------------------ view ------------------------------- */

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ cx: 80, cy: 60, k: 2 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    const pts: Vec[] = [...sketch.joints];
    for (const f of sweep.frames) for (const id of sketch.tracers) if (f[id]) pts.push(f[id]);
    if (!pts.length) {
      setView({ cx: 0, cy: 0, k: 2 });
      return;
    }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs) || 100;
    const h = Math.max(...ys) - Math.min(...ys) || 100;
    const k = Math.min((size.w * 0.8) / w, (size.h * 0.8) / h, 8);
    setView({ cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, k });
  }, [sketch, sweep, size]);

  // Fit once the canvas has a real size, and whenever an example is loaded.
  const fitRequest = useRef(true);
  useEffect(() => {
    if (fitRequest.current && size.w > 100) {
      fitRequest.current = false;
      fit();
    }
  }, [size, fit, sketch]);

  const toScreen = (p: Vec) => ({ x: (p.x - view.cx) * view.k + size.w / 2, y: size.h / 2 - (p.y - view.cy) * view.k });
  const toWorld = (sx: number, sy: number): Vec => ({
    x: (sx - size.w / 2) / view.k + view.cx,
    y: (size.h / 2 - sy) / view.k + view.cy,
  });
  const eventWorld = (e: { clientX: number; clientY: number }): Vec => {
    const r = svgRef.current!.getBoundingClientRect();
    return toWorld(e.clientX - r.left, e.clientY - r.top);
  };
  const snapped = (p: Vec): Vec =>
    snap ? { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID } : { x: +p.x.toFixed(1), y: +p.y.toFixed(1) };

  /* ------------------------------ playback --------------------------- */

  useEffect(() => {
    if (!playing || sweep.frames.length < 2) return;
    let raf = 0;
    let last = performance.now();
    let pos = frame;
    let dir = 1;
    const n = sweep.frames.length;
    const perSecond = (speed / 60) * (sweep.fullRotation ? n : 180);
    const tick = (now: number) => {
      pos += dir * ((now - last) / 1000) * perSecond;
      last = now;
      if (sweep.fullRotation) pos = ((pos % n) + n) % n;
      else if (pos >= n - 1) {
        // A crank that cannot turn fully swings between its limits, the way
        // a rocker input would be driven.
        pos = n - 1;
        dir = -1;
      } else if (pos <= 0) {
        pos = 0;
        dir = 1;
      }
      setFrame(Math.floor(pos));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, sweep, speed]);

  const pose: Pose = frame > 0 && sweep.frames[frame] ? sweep.frames[frame] : poseOf(sketch);

  /* ------------------------------ editing ---------------------------- */

  const addJoint = (s: Sketch, at: Vec, ground: boolean): [Sketch, string] => {
    const id = nextId(s, 'P');
    return [{ ...s, joints: [...s.joints, { id, x: at.x, y: at.y, ground }] }, id];
  };

  const addLink = (s: Sketch, a: string, b: string): Sketch | null => {
    if (a === b) return null;
    if (s.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) {
      setMessage(t('sk.msg.duplicate'));
      return null;
    }
    const p = jointById(s, a)!;
    const q = jointById(s, b)!;
    return { ...s, links: [...s.links, { id: nextId(s, 'L'), a, b, length: Math.hypot(p.x - q.x, p.y - q.y) }] };
  };

  const changeLength = useCallback(
    (id: string, length: number) => {
      const s = sketch;
      const l = s.links.find((x) => x.id === id);
      if (!l) return;
      const next = setLinkLength(s, id, +length.toFixed(2));
      if (!next) {
        setMessage(t('sk.msg.noAssembly', { v: l.length.toFixed(1) }));
        return;
      }
      toDrawn();
      commit(next);
    },
    [sketch, commit, toDrawn, t],
  );

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    toDrawn();
    commit((s) => (selection.kind === 'joint' ? removeJoint(s, selection.id) : removeLink(s, selection.id)));
    setSelection(null);
  }, [selection, commit, toDrawn]);

  /* ------------------------------ pointer ---------------------------- */

  const drag = useRef<
    | { kind: 'joint'; id: string; start: Sketch; moved: boolean }
    | { kind: 'pan'; sx: number; sy: number; view: View }
    | null
  >(null);

  const hit = (e: React.PointerEvent): Selection => {
    const el = (e.target as Element).closest('[data-joint],[data-link]');
    if (el) {
      const j = el.getAttribute('data-joint');
      if (j) return { kind: 'joint', id: j };
      return { kind: 'link', id: el.getAttribute('data-link')! };
    }
    // A near miss still counts as the point: with grid snapping on, a point
    // can sit a few pixels from where it was clicked, and a link drawn to
    // "almost" a pivot would silently create a second, unconnected joint.
    const r = svgRef.current!.getBoundingClientRect();
    let best: { id: string; d: number } | null = null;
    for (const j of sketch.joints) {
      const sp = toScreen(pose[j.id] ?? j);
      const d = Math.hypot(sp.x - (e.clientX - r.left), sp.y - (e.clientY - r.top));
      if (d < 14 && (!best || d < best.d)) best = { id: j.id, d };
    }
    return best ? { kind: 'joint', id: best.id } : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) {
      setLinkStart(null);
      return;
    }
    const target = hit(e);
    const at = snapped(eventWorld(e));
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    if (e.button === 1 || (tool === 'select' && !target)) {
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, view };
      if (tool === 'select') setSelection(null);
      return;
    }

    switch (tool) {
      case 'select':
        setSelection(target);
        if (target?.kind === 'joint') {
          toDrawn();
          drag.current = { kind: 'joint', id: target.id, start: sketch, moved: false };
        }
        break;
      case 'ground':
        toDrawn();
        if (target?.kind === 'joint') {
          commit((s) => ({ ...s, joints: s.joints.map((j) => (j.id === target.id ? { ...j, ground: !j.ground } : j)) }));
        } else if (!target) {
          const [s, id] = addJoint(sketch, at, true);
          commit(s);
          setSelection({ kind: 'joint', id });
        }
        break;
      case 'joint':
        if (!target) {
          toDrawn();
          const [s, id] = addJoint(sketch, at, false);
          commit(s);
          setSelection({ kind: 'joint', id });
        } else setSelection(target);
        break;
      case 'link': {
        if (target?.kind === 'link') break;
        toDrawn();
        let s = sketch;
        let id = target?.id;
        if (!id) [s, id] = addJoint(s, at, false);
        if (!linkStart) {
          if (s !== sketch) commit(s);
          setLinkStart(id);
          break;
        }
        const withLink = addLink(s, linkStart, id);
        if (withLink) {
          commit(withLink);
          setSelection({ kind: 'link', id: withLink.links[withLink.links.length - 1].id });
        } else if (s !== sketch) commit(s);
        // Keep chaining from the point just reached.
        setLinkStart(id);
        break;
      }
      case 'motor':
        if (target?.kind !== 'link') break;
        {
          const next = { ...sketch, motor: sketch.motor === target.id ? null : target.id };
          if (next.motor && !motorOf(next)) {
            setMessage(t('sk.msg.motorGround'));
            break;
          }
          toDrawn();
          commit(next);
          setSelection(target);
        }
        break;
      case 'trace':
        if (target?.kind !== 'joint') break;
        commit((s) => ({
          ...s,
          tracers: s.tracers.includes(target.id) ? s.tracers.filter((x) => x !== target.id) : [...s.tracers, target.id],
        }));
        break;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    setCursor(eventWorld(e));
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      setView({ ...d.view, cx: d.view.cx - (e.clientX - d.sx) / d.view.k, cy: d.view.cy + (e.clientY - d.sy) / d.view.k });
    } else {
      d.moved = true;
      replace(moveJoint(d.start, d.id, snapped(eventWorld(e))));
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'joint' && d.moved) {
      // One undo step for the whole drag.
      past.current = [...past.current.slice(-HISTORY + 1), d.start];
      future.current = [];
      bump((n) => n + 1);
    }
  };

  /**
   * The wheel lengthens or shortens the selected link — the requested way to
   * tune a length while watching the paths move — and zooms otherwise.
   * Attached natively because React's wheel listener is passive and could
   * not stop the page from scrolling.
   */
  const wheelState = useRef({ selection, sketch, changeLength, view, size });
  wheelState.current = { selection, sketch, changeLength, view, size };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = wheelState.current;
      const up = e.deltaY < 0;
      if (st.selection?.kind === 'link') {
        const l = st.sketch.links.find((x) => x.id === st.selection!.id);
        if (!l) return;
        const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        st.changeLength(l.id, l.length + (up ? step : -step));
        return;
      }
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const v = st.view;
      const k = Math.min(40, Math.max(0.1, v.k * (up ? 1.15 : 1 / 1.15)));
      // Keep the point under the cursor fixed while zooming.
      const wx = (sx - st.size.w / 2) / v.k + v.cx;
      const wy = (st.size.h / 2 - sy) / v.k + v.cy;
      setView({ k, cx: wx - (sx - st.size.w / 2) / k, cy: wy - (st.size.h / 2 - sy) / k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ------------------------------ keyboard --------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea')) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tl = TOOLS.find((x) => x.key === k);
      if (tl) {
        setTool(tl.id);
        setLinkStart(null);
      } else if (k === 'delete' || k === 'backspace') deleteSelection();
      else if (k === 'escape') {
        setLinkStart(null);
        setSelection(null);
      } else if (k === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (k === 'f') fit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, deleteSelection, fit]);

  /* ------------------------------ file ------------------------------- */

  const exportFile = () => downloadJson(sketch, 'kreamet-sketch.json');
  const importFile = async () => {
    const file = await readFileText();
    if (!file) return;
    try {
      const s = parseSketch(JSON.parse(file.text));
      if (!s) throw new Error();
      toDrawn();
      commit(s);
      setSelection(null);
      fitRequest.current = true;
    } catch {
      setMessage(t('sk.importFail'));
    }
  };

  /* ------------------------------ render ----------------------------- */

  const selJoint = selection?.kind === 'joint' ? jointById(sketch, selection.id) : undefined;
  const selLink = selection?.kind === 'link' ? sketch.links.find((l) => l.id === selection.id) : undefined;
  const stroke = 1;

  // Grid lines every 10 mm, thickened every 100, drawn only where visible.
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    const step = view.k < 0.6 ? 100 : view.k < 2 ? 50 : 10;
    const min = toWorld(0, size.h);
    const max = toWorld(size.w, 0);
    for (let x = Math.ceil(min.x / step) * step; x <= max.x; x += step) {
      const s = toScreen({ x, y: 0 });
      lines.push({ x1: s.x, y1: 0, x2: s.x, y2: size.h, major: x % 100 === 0 });
    }
    for (let y = Math.ceil(min.y / step) * step; y <= max.y; y += step) {
      const s = toScreen({ x: 0, y });
      lines.push({ x1: 0, y1: s.y, x2: size.w, y2: s.y, major: y % 100 === 0 });
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size]);

  const paths = sketch.tracers.map((id) => ({
    id,
    d: sweep.frames
      .filter((f) => f[id])
      .map((f, i) => {
        const s = toScreen(f[id]);
        return `${i ? 'L' : 'M'}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(' ') + (sweep.fullRotation ? ' Z' : ''),
  }));

  const angleDeg = sweep.angles[frame] !== undefined && motor ? ((sweep.angles[frame] - motor.theta0) * 180) / Math.PI : 0;

  return (
    <div className="sketch">
      <h1 className="sr-only">{t('sk.heading')}</h1>

      <div className="sketch-toolbar" role="toolbar" aria-label={t('nav.sketch')}>
        <div className="tools">
          {TOOLS.map((x) => (
            <button
              key={x.id}
              className={tool === x.id ? 'active' : ''}
              aria-pressed={tool === x.id}
              onClick={() => {
                setTool(x.id);
                setLinkStart(null);
              }}
              title={`${t(`sk.tool.${x.id}` as TranslationKey)} (${x.key.toUpperCase()})`}
            >
              <span aria-hidden="true">{x.icon}</span> {t(`sk.tool.${x.id}` as TranslationKey)}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={deleteSelection} disabled={!selection} title={`${t('sk.delete')} (Del)`}>
            {t('sk.delete')}
          </button>
          <button onClick={undo} disabled={!past.current.length} title={`${t('sk.undo')} (Ctrl+Z)`}>
            ↶
          </button>
          <button onClick={redo} disabled={!future.current.length} title={`${t('sk.redo')} (Ctrl+Y)`}>
            ↷
          </button>
          <button onClick={fit} title={`${t('sk.fit')} (F)`}>
            ⤢
          </button>
          <label className="check">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            {t('sk.snap')}
          </label>
          <select
            value=""
            aria-label={t('sk.preset')}
            onChange={(e) => {
              const p = PRESETS.find((x) => x.id === e.target.value);
              if (!p) return;
              toDrawn();
              commit(p.sketch);
              setSelection(null);
              fitRequest.current = true;
            }}
          >
            <option value="">{t('sk.preset')}</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`sk.preset.${p.id}` as TranslationKey)}
              </option>
            ))}
          </select>
          <button onClick={exportFile}>{t('sk.export')}</button>
          <button onClick={importFile}>{t('sk.import')}</button>
          <button
            onClick={() => {
              if (!window.confirm(t('sk.clearConfirm'))) return;
              toDrawn();
              commit(EMPTY_SKETCH);
              setSelection(null);
            }}
          >
            {t('sk.clear')}
          </button>
        </div>
      </div>

      <div className="sketch-main">
        <div className="sketch-canvas" ref={wrapRef}>
          <svg
            ref={svgRef}
            width={size.w}
            height={size.h}
            className={`tool-${tool}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setCursor(null)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <g className="grid">
              {gridLines.map(({ major, ...g }, i) => (
                <line key={i} {...g} className={major ? 'major' : ''} />
              ))}
            </g>

            {paths.map((p) => (
              <path key={p.id} d={p.d} className="trace" />
            ))}

            {sketch.links.map((l) => {
              const a = toScreen(pose[l.a] ?? jointById(sketch, l.a)!);
              const b = toScreen(pose[l.b] ?? jointById(sketch, l.b)!);
              const selected = selection?.kind === 'link' && selection.id === l.id;
              return (
                <g key={l.id} data-link={l.id} className={`link${l.id === sketch.motor ? ' motor' : ''}${selected ? ' selected' : ''}`}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="hitline" />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="bar" strokeWidth={stroke * 6} />
                  {(selected || view.k > 1.5) && (
                    <text x={(a.x + b.x) / 2 + 6} y={(a.y + b.y) / 2 - 6} className="len">
                      {l.length.toFixed(1)}
                    </text>
                  )}
                </g>
              );
            })}

            {tool === 'link' && linkStart && cursor && pose[linkStart] && (
              <line
                className="rubber"
                {...(() => {
                  const a = toScreen(pose[linkStart]);
                  const b = toScreen(snapped(cursor));
                  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
                })()}
              />
            )}

            {sketch.joints.map((j) => {
              const p = toScreen(pose[j.id] ?? j);
              const selected = selection?.kind === 'joint' && selection.id === j.id;
              return (
                <g
                  key={j.id}
                  data-joint={j.id}
                  className={`joint${j.ground ? ' ground' : ''}${selected ? ' selected' : ''}${sketch.tracers.includes(j.id) ? ' tracer' : ''}${linkStart === j.id ? ' start' : ''}`}
                  transform={`translate(${p.x},${p.y})`}
                >
                  {j.ground && <path d="M-11,14 L0,0 L11,14 Z M-14,14 L14,14" className="base" />}
                  <circle r={9} className="hit" />
                  <circle r={5.5} className="pin" />
                  <text x={9} y={-9} className="label">
                    {j.id}
                  </text>
                </g>
              );
            })}
          </svg>

          {sketch.joints.length === 0 && <div className="sketch-empty">{t('sk.empty')}</div>}
          <div className="sketch-hint">{t(`sk.hint.${tool}` as TranslationKey)}</div>
          {message && (
            <div className="sketch-msg" role="status">
              {message}
            </div>
          )}

          <div className="sketch-play">
            <button
              className={`icon ${playing ? 'playing' : 'paused'}`}
              onClick={() => setPlaying((p) => !p)}
              disabled={sweep.frames.length < 2}
              aria-label={t(playing ? 'sk.pause' : 'sk.play')}
              title={`${t(playing ? 'sk.pause' : 'sk.play')} (Space)`}
            >
              {playing ? '⏸' : '▶'} {t(playing ? 'sk.pause' : 'sk.play')}
            </button>
            <label>
              {t('sk.angle')}
              <input
                type="range"
                min={0}
                max={Math.max(0, sweep.frames.length - 1)}
                value={Math.min(frame, Math.max(0, sweep.frames.length - 1))}
                onChange={(e) => {
                  setPlaying(false);
                  setFrame(Number(e.target.value));
                }}
                disabled={sweep.frames.length < 2}
              />
              <b className="mono">{angleDeg.toFixed(0)}°</b>
            </label>
            <label>
              {t('sk.speed')}
              <input type="range" min={5} max={120} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              <b className="mono">{speed} rpm</b>
            </label>
          </div>
        </div>

        <aside className="sketch-side">
          <section>
            {!selection && <p className="note">{t('sk.sel.none')}</p>}
            {selJoint && (
              <>
                <h2>{t('sk.sel.joint', { id: selJoint.id })}</h2>
                <div className="row">
                  {(['x', 'y'] as const).map((axis) => (
                    <label key={axis} className="field">
                      <span>{axis.toUpperCase()} (mm)</span>
                      <input
                        type="number"
                        step={1}
                        value={+selJoint[axis].toFixed(2)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          toDrawn();
                          commit((s) => moveJoint(s, selJoint.id, { ...selJoint, [axis]: v }));
                        }}
                      />
                    </label>
                  ))}
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={selJoint.ground}
                    onChange={(e) => {
                      toDrawn();
                      commit((s) => ({ ...s, joints: s.joints.map((j) => (j.id === selJoint.id ? { ...j, ground: e.target.checked } : j)) }));
                    }}
                  />
                  {t('sk.sel.ground')}
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={sketch.tracers.includes(selJoint.id)}
                    onChange={(e) =>
                      commit((s) => ({
                        ...s,
                        tracers: e.target.checked ? [...s.tracers, selJoint.id] : s.tracers.filter((x) => x !== selJoint.id),
                      }))
                    }
                  />
                  {t('sk.sel.tracer')}
                </label>
              </>
            )}
            {selLink && (
              <>
                <h2>{t('sk.sel.link', { id: selLink.id })}</h2>
                <p className="note">{t('sk.sel.ends', { a: selLink.a, b: selLink.b })}</p>
                <div className="row lenrow">
                  <button onClick={() => changeLength(selLink.id, selLink.length - 1)}>−</button>
                  <label className="field">
                    <span>{t('sk.sel.length')} (mm)</span>
                    <input
                      type="number"
                      step={0.5}
                      value={+selLink.length.toFixed(2)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) changeLength(selLink.id, v);
                      }}
                    />
                  </label>
                  <button onClick={() => changeLength(selLink.id, selLink.length + 1)}>+</button>
                </div>
                <p className="note">{t('sk.sel.wheel')}</p>
                <button
                  className={sketch.motor === selLink.id ? 'active' : ''}
                  onClick={() => {
                    const next = { ...sketch, motor: sketch.motor === selLink.id ? null : selLink.id };
                    if (next.motor && !motorOf(next)) {
                      setMessage(t('sk.msg.motorGround'));
                      return;
                    }
                    toDrawn();
                    commit(next);
                  }}
                >
                  {t(sketch.motor === selLink.id ? 'sk.sel.isMotor' : 'sk.sel.makeMotor')}
                </button>
              </>
            )}
          </section>

          <section>
            <h2>{t('sk.an.title')}</h2>
            <p className="mono small">
              {t('sk.an.counts', {
                g: sketch.joints.length - mob.free,
                f: mob.free,
                l: sketch.links.length,
              })}
            </p>
            <p className={`mono ${mob.dof === 1 ? 'good' : 'warn'}`}>
              {t('sk.an.dof', { f: mob.free, c: mob.constraints, m: mob.dof })}
            </p>
            <p className="note">{t(mob.dof === 1 ? 'sk.an.dof1' : mob.dof > 1 ? 'sk.an.dofMore' : 'sk.an.dofLess')}</p>
            {!motor && <p className="warn">{t('sk.an.noMotor')}</p>}
            {motor && mob.dof > 1 && <p className="warn">{t('sk.an.loose')}</p>}
            {motor && mob.dof === 1 && (
              <p className={sweep.fullRotation ? 'good' : 'warn'}>
                {sweep.fullRotation ? t('sk.an.full') : t('sk.an.locked', { deg: (sweep.lockedAt ?? 0).toFixed(0) })}
              </p>
            )}
            {sweep.minTransmission !== null && (
              <p className={sweep.minTransmission >= 40 ? 'good' : 'warn'}>
                {t('sk.an.mu', { mu: sweep.minTransmission.toFixed(1) })} —{' '}
                {t(sweep.minTransmission >= 40 ? 'sk.an.muOk' : 'sk.an.muLow')}
              </p>
            )}
            {fourBar && (
              <>
                <p className="mono small">
                  {t('sk.an.grashof', {
                    g: fourBar.ground.toFixed(1),
                    a: fourBar.crank.toFixed(1),
                    b: fourBar.coupler.toFixed(1),
                    c: fourBar.rocker.toFixed(1),
                  })}
                </p>
                <p>{t(`sk.an.kind.${fourBar.kind}` as TranslationKey)}</p>
                <p className={fourBar.crankTurns ? 'good' : 'warn'}>
                  {t(fourBar.crankTurns ? 'sk.an.crankTurns' : 'sk.an.crankStops')}
                </p>
              </>
            )}
          </section>

          <details className="guide">
            <summary>{t('sk.method.title')}</summary>
            {METHODOLOGY.map((m) => (
              <div key={m.title.en}>
                <h3>{m.title[lang]}</h3>
                {m.body.map((b) => (
                  <p key={b.en.slice(0, 32)}>{b[lang]}</p>
                ))}
              </div>
            ))}
          </details>

          <details className="guide">
            <summary>{t('sk.keys.title')}</summary>
            <p>{t('sk.keys.body')}</p>
          </details>
        </aside>
      </div>
    </div>
  );
}
