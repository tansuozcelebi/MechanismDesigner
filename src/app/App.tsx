import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../mechanism/config';
import { boundsFor, buildGeometry, poseFitsGeometry } from '../mechanism/mechanism';
import { DEFAULT_SPEC, paramLayout, type MechanismSpec } from '../mechanism/spec';
import { topologyOf } from '../mechanism/topology';
import type { LinkId, Pose } from '../mechanism/types';
import { sweep } from '../kinematics/forwardSolver';
import { scoreSweep, setTarget as installTarget, type Metrics } from '../synthesis/objective';
import {
  circleTarget,
  exportTarget,
  heartTarget,
  importTarget,
  nearestSegment,
  withControlInserted,
  withControlMoved,
  withControlRemoved,
  type TargetCurve,
} from '../synthesis/targetCurve';
import { mulberry32, sampleFeasiblePopulation } from '../synthesis/seeding';
import { gravityTorque, gravityTorqueProfile } from '../dynamics/gravity';
import { ledKinematics, type Kinematics2 } from '../dynamics/velocity';
import { motorTorque, type TorqueBreakdown } from '../dynamics/torque';
import { MechanismViewer, type Selection, type ViewerState } from '../rendering/MechanismViewer';
import { DEFAULT_DEBUG, type DebugOptions } from '../rendering/DebugRenderer';
import { CanvasController } from '../interaction/crankDrag';
import { rpmToRadPerSec } from '../utils/units';
import { radToDeg, wrapTwoPi } from '../utils/math';
import {
  DEFAULT_START_SPEC,
  INITIAL_GUESS,
  OPTIMIZED,
  OPTIMIZED_SPEC,
  hasOptimizedResults,
} from './designPresets';
import { buildExportJson, downloadJson, readFileText } from './exportDesign';
import type { SolutionSummary } from '../workers/optimization.worker';

import { DisplayPanel, MotorPanel, DesignPanel, GeometryReport } from '../ui/ControlPanel';
import { LinkTable, TopologyPanel } from '../ui/LinkTable';
import { LivePanel, CyclePanel, TargetPanel, ObjectivePanel } from '../ui/MetricsPanel';
import { OptimizerPanel } from '../ui/OptimizerPanel';
import {
  ConstraintsPanel,
  InspectorPanel,
  MechanismPanel,
  TargetEditorPanel,
} from '../ui/DesignPanels';
import { HoverHint } from '../ui/HoverHint';
import { TorqueChart } from '../ui/TorqueChart';
import { Section } from '../ui/primitives';
import { LanguageSwitch } from '../ui/LanguageSwitch';
import { useT } from '../i18n';
import { APP_NAME } from '../i18n/translations';
import '../ui/styles.css';

/** Seed used when a new mechanism size needs a feasible starting design. */
const SAMPLE_SEED = 20260815;

/** Convert the JSON-stored solutions into the same shape the worker emits. */
function storedToSummaries(): SolutionSummary[] {
  if (!hasOptimizedResults()) return [];
  const spec = OPTIMIZED_SPEC;
  const width = paramLayout(spec).length;
  return OPTIMIZED.solutions
    // A stored vector only means something against the spec it was optimised
    // for, so a file from a different mechanism size is dropped rather than
    // silently reinterpreted against the wrong layout.
    .filter((s) => s.designArray.length === width)
    .map((s, i) => {
      const m = s.metrics as Record<string, number | boolean>;
      return {
        rank: i + 1,
        x: s.designArray,
        J: Number(m.objective ?? s.score),
        rms: Number(m.rmsError_mm ?? NaN),
        paramRms: Number(m.paramRms_mm ?? NaN),
        maxError: Number(m.maxError_mm ?? NaN),
        width: Number(m.width_mm ?? NaN),
        height: Number(m.height_mm ?? NaN),
        heartMatchPercent: Number(m.heartMatchPercent ?? NaN),
        minTransmissionAngle: Number(m.minTransmissionAngle_deg ?? NaN),
        effectiveTransmissionAngle: Number(
          m.effectiveTransmissionAngle_deg ?? m.minTransmissionAngle_deg ?? NaN,
        ),
        singularityMargin: Number(m.singularityMargin ?? NaN),
        collisionFrames: Number(m.collisionFrames ?? 0),
        layerCount: Number(m.assemblyLayers ?? 0),
        peakGravityTorque: Number(m.peakGravityTorque_Nm ?? NaN),
        spec,
        validFrames: Number(m.validFrames ?? 0),
        frames: Number(m.frames ?? 0),
        fullRotation: Boolean(m.fullRotation),
        maxLoopClosureError: Number(m.maxLoopClosureError_mm ?? NaN),
        pathClosure: Number(m.pathClosure_mm ?? NaN),
        memberLengths: s.members.map((mm) => ({
          link: mm.link,
          from: mm.from,
          to: mm.to,
          length: mm.length_mm,
        })),
        fixedPivots: Object.values(s.fixedPivots).map((p) => [p.x, p.y] as [number, number]),
      };
    });
}

/**
 * Starting parameters for a mechanism size that has no stored design: draw from
 * the constructive sampler, which builds a chain that actually assembles.  The
 * midpoint fallback is a last resort and is labelled as such on screen rather
 * than presented as a working design.
 */
function startingParams(spec: MechanismSpec, seed: number): { params: number[]; sampled: boolean } {
  const drawn = sampleFeasiblePopulation(spec, 1, mulberry32(seed));
  if (drawn.length) return { params: drawn[0], sampled: true };
  return { params: boundsFor(spec).map(([lo, hi]) => (lo + hi) / 2), sampled: false };
}

type DesignKind = 'optimized' | 'initial' | 'manual' | 'sampled';

export default function App() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<MechanismViewer | null>(null);
  const controllerRef = useRef<CanvasController | null>(null);

  const storedSummaries = useMemo(storedToSummaries, []);

  /* --------------------------- design state --------------------------- */

  const [spec, setSpec] = useState<MechanismSpec>(
    storedSummaries.length ? OPTIMIZED_SPEC : DEFAULT_START_SPEC,
  );
  const [params, setParams] = useState<number[]>(
    storedSummaries.length ? storedSummaries[0].x : INITIAL_GUESS,
  );
  // Store WHICH label applies, not the translated text, so switching language
  // relabels the current design instead of freezing the words chosen earlier.
  const [designKind, setDesignKind] = useState<DesignKind>(
    storedSummaries.length ? 'optimized' : 'initial',
  );
  const designLabel = t(`app.label.${designKind}` as const);

  const [solutions, setSolutions] = useState<SolutionSummary[]>(storedSummaries);
  const [solutionSource, setSolutionSource] = useState<'stored' | 'live'>('stored');
  const [selectedIndex, setSelectedIndex] = useState(storedSummaries.length ? 0 : -1);

  /* --------------------------- target state --------------------------- */

  const [target, setTargetCurve] = useState<TargetCurve>(() => heartTarget());
  const [targetEditing, setTargetEditing] = useState(false);
  const [targetMessage, setTargetMessage] = useState<string | null>(null);

  /* ------------------------- interaction state ------------------------ */

  const [selection, setSelection] = useState<Selection>(null);
  /**
   * What the cursor is over.  Separate from `selection` so a passing mouse never
   * disturbs a deliberate pick; the controller only pushes this when the answer
   * actually changes, so it does not re-render on every pointer move.
   */
  const [hover, setHover] = useState<Selection>(null);
  /**
   * Bumped whenever the constraint panel edits CONFIG.  CONFIG is mutated in
   * place — deliberately, so every module sees the change without plumbing — so
   * React needs an explicit signal that the derived analysis is now stale.
   */
  const [configVersion, setConfigVersion] = useState(0);
  const bumpConfig = useCallback(() => setConfigVersion((v) => v + 1), []);

  const [theta, setTheta] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rpm, setRpm] = useState<number>(CONFIG.defaultRpm);
  const [gravityOn, setGravityOn] = useState(true);
  const [display, setDisplay] = useState({ grid: true, target: true, trail: true, debug: false });
  const [debugOptions, setDebugOptions] = useState<DebugOptions>({ ...DEFAULT_DEBUG });

  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  /** Last ViewerState pushed into React, for identity comparison in the loop. */
  const publishedRef = useRef<ViewerState | null>(null);
  const [scaleInfo, setScaleInfo] = useState({ mmPerPixel: 1, heightMm: 800 });

  const omega = rpmToRadPerSec(rpm);

  /* ------------------------- whole-cycle analysis ------------------------ */

  /**
   * Install the target module-side.  The objective holds one resolved target
   * (and its spatial index) because that index is reused across every
   * evaluation; resolving per call would dominate the runtime.
   */
  const resolvedTarget = useMemo(() => installTarget(target), [target, configVersion]);

  const analysis = useMemo(() => {
    const geo = buildGeometry(spec, params);
    const sw = sweep(geo, CONFIG.samplesFine, { computeSigma: true });
    if (!sw.fullRotation || sw.poses.length === 0) {
      return { geo, sw, metrics: null as Metrics | null, torqueProfile: [] };
    }
    const metrics = scoreSweep(geo, sw, CONFIG.weights, {
      computeGravity: true,
      target: resolvedTarget,
    });
    const stride = Math.max(1, Math.floor(sw.poses.length / 120));
    const torqueProfile = gravityTorqueProfile(
      geo,
      sw.poses.filter((_, i) => i % stride === 0),
    );
    return { geo, sw, metrics, torqueProfile };
  }, [spec, params, resolvedTarget, configVersion]);

  const topo = useMemo(() => topologyOf(spec), [spec]);

  /* ------------------------------ viewer -------------------------------- */

  // Live values the canvas controller needs; kept in refs so the controller is
  // built once at mount instead of being torn down on every state change.
  const editingRef = useRef(targetEditing);
  editingRef.current = targetEditing;

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new MechanismViewer(canvasRef.current, spec, params);
    viewerRef.current = viewer;

    controllerRef.current = new CanvasController(viewer, {
      onAngle: (th) => {
        setPlaying(false);
        setTheta(th);
      },
      getTheta: () => viewer.currentTheta,
      onSelect: (sel) => setSelection(sel),
      onHover: (sel) => setHover(sel),
      targetEditing: () => editingRef.current,
      onControlMove: (index, to) => setTargetCurve((c) => withControlMoved(c, index, to)),
      onControlAdd: (at) =>
        setTargetCurve((c) => withControlInserted(c, nearestSegment(c.controls, at), at)),
      onControlRemove: (index) => setTargetCurve((c) => withControlRemoved(c, index)),
    });

    // Keep the on-canvas scale bar honest: it must follow every projection
    // change (fit, zoom, pan), not just window resizes.
    //
    // The functional update must return the PREVIOUS object when nothing
    // actually moved.  Allocating a fresh object on every camera update makes
    // React re-render even for an identical view, and a re-render can resize
    // the canvas, which updates the camera again — a feedback loop that trips
    // "Maximum update depth exceeded". Returning `prev` lets React bail out.
    viewer.scene.onViewChange = (v) =>
      setScaleInfo((prev) =>
        prev.mmPerPixel === v.mmPerPixel && prev.heightMm === v.heightMm
          ? prev
          : { mmPerPixel: v.mmPerPixel, heightMm: v.heightMm },
      );

    const resize = () => {
      const el = wrapRef.current;
      if (!el) return;
      viewer.resize(el.clientWidth, el.clientHeight);
    };
    resize();
    viewer.fitView();
    resize();

    // Dev-only handle so the running scene can be inspected from the console.
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__viewer = viewer;
    }

    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      controllerRef.current?.dispose();
      controllerRef.current = null;
      viewer.dispose();
      viewerRef.current = null;
    };
    // Mount only; design changes are pushed through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push design changes into the viewer.
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    v.setDesign(spec, params);
    setHover(null);
    v.setHover(null);
    v.showFullPath(analysis.sw.fullRotation ? analysis.sw : undefined);
    v.fitView();
    v.setTheta(theta, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, params, configVersion]);

  /**
   * Push the target curve.
   *
   * Which frame it is drawn in depends on the mode, and the difference is real:
   * while editing, the curve is shown in ITS OWN coordinates so a handle sits
   * exactly where the point being dragged is.  Otherwise it is shown after the
   * best rigid alignment onto the LED path — the placement the error is actually
   * measured against.  Drawing the aligned copy while editing would put the
   * handles somewhere the drag does not correspond to.
   */
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    v.setTargetEditing(targetEditing);
    if (targetEditing) {
      v.setTarget(resolvedTarget.points, target.controls, true);
    } else {
      v.setTarget(analysis.metrics?.alignedTarget ?? resolvedTarget.points, [], true);
    }
    v.setLayers(analysis.metrics?.layerOf);
    v.fitView();
  }, [analysis.metrics, resolvedTarget, target.controls, targetEditing]);

  // Selection highlight.
  useEffect(() => {
    viewerRef.current?.setSelection(selection);
  }, [selection]);

  // Display toggles.
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    v.setShowGrid(display.grid);
    v.setShowTarget(display.target);
    v.setShowTrail(display.trail);
    v.setDebug(display.debug, debugOptions);
  }, [display, debugOptions]);

  useEffect(() => {
    viewerRef.current?.setOmega(omega);
    viewerRef.current?.setGravity(gravityOn);
  }, [omega, gravityOn]);

  // Solve + render on every theta change.
  useEffect(() => {
    viewerRef.current?.setTheta(theta);
  }, [theta]);

  /* ------------------------------ playback ------------------------------ */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing) setTheta((th) => th + omega * dt);

      const v = viewerRef.current;
      if (v) {
        v.render();
        // Publish the solved state from the frame callback rather than from
        // inside the effect that drives the motor. The viewer replaces the
        // object on every solve, so an identity check is enough to skip
        // renders on frames where nothing moved.
        const s = v.viewerState;
        if (s !== publishedRef.current) {
          publishedRef.current = s;
          setViewerState(s);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, omega]);

  /* --------------------------- instant physics -------------------------- */

  // The viewer solves one frame behind a design change, so a pose belonging to
  // the previous mechanism must not be handed to code that indexes it with the
  // current geometry's ids.
  const solved = viewerState?.pose ?? viewerRef.current?.currentPose ?? null;
  const pose: Pose | null = solved && poseFitsGeometry(analysis.geo, solved) ? solved : null;

  const instant = useMemo(() => {
    if (!pose) {
      return {
        ledKin: null as Kinematics2 | null,
        tau: NaN,
        torque: null as TorqueBreakdown | null,
      };
    }
    const geo = analysis.geo;
    return {
      ledKin: ledKinematics(geo, pose, omega),
      tau: gravityOn ? gravityTorque(geo, pose) : 0,
      torque: motorTorque(geo, pose, omega, { gravityOn }),
    };
  }, [pose, analysis.geo, omega, gravityOn]);

  /* ------------------------------ actions ------------------------------- */

  const selectSolution = useCallback(
    (s: SolutionSummary, index: number, source: 'stored' | 'live') => {
      // The spec travels with the solution: a parameter vector indexes a
      // specific topology, so loading one must switch the mechanism too.
      setSpec(s.spec);
      setParams(s.x);
      setSelectedIndex(index);
      setSolutionSource(source);
      setDesignKind('optimized');
      setSelection(null);
    },
    [],
  );

  const handleSolutions = useCallback((s: SolutionSummary[]) => {
    setSolutions(s);
    setSolutionSource('live');
    setSelectedIndex(0);
  }, []);

  const loadInitial = () => {
    setSpec(DEFAULT_SPEC);
    setParams(INITIAL_GUESS);
    setDesignKind('initial');
    setSelectedIndex(-1);
    setSelection(null);
  };

  /** Change the mechanism size, and draw a starting design for it. */
  const changeSpec = useCallback(
    (next: MechanismSpec) => {
      if (next.dyads.length === spec.dyads.length) return;
      // A stored optimised design exists only for the shipped size; going back
      // to it should restore that design rather than resampling.
      if (next.dyads.length === OPTIMIZED_SPEC.dyads.length && storedSummaries.length) {
        selectSolution(storedSummaries[0], 0, 'stored');
        setSolutions(storedSummaries);
        setSolutionSource('stored');
        return;
      }
      const { params: p, sampled } = startingParams(next, SAMPLE_SEED + next.dyads.length);
      setSpec(next);
      setParams(p);
      setDesignKind(sampled ? 'sampled' : 'manual');
      setSelectedIndex(-1);
      setSelection(null);
    },
    [spec, storedSummaries, selectSolution],
  );

  const setParam = useCallback((index: number, value: number) => {
    if (index < 0) {
      // A frame dimension changed rather than a design variable; the parameter
      // vector is unchanged but every derived quantity is stale.
      bumpConfig();
      return;
    }
    setParams((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
    setDesignKind('manual');
    setSelectedIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpConfig]);

  const exportDesign = () => {
    downloadJson(
      buildExportJson(spec, params, analysis.metrics, designLabel, target),
      `kreamet-${designKind}-design.json`,
    );
  };

  const exportTargetFile = () => {
    const name = target.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'target';
    downloadJson(exportTarget(target), `kreamet-target-${name}.json`);
  };

  const importTargetFile = async () => {
    const file = await readFileText();
    if (!file) return;
    const res = importTarget(file.text, file.name.replace(/\.json$/i, ''));
    if (!res.ok) {
      setTargetMessage(t('targetEdit.importFail', { msg: res.error }));
      return;
    }
    setTargetCurve(res.curve);
    setTargetMessage(
      t('targetEdit.importOk', { name: res.curve.name, n: res.curve.controls.length }) +
        (res.note ? ` ${res.note}` : ''),
    );
  };

  const collidingLinks: Set<LinkId> = viewerState?.collidingLinks ?? new Set();
  const degrees = wrapTwoPi(theta);
  const scaleBarMm = 50;
  const scaleBarPx = scaleBarMm / Math.max(1e-9, scaleInfo.mmPerPixel);

  return (
    <div className="app">
      <header className="header">
        <h1>
          <img className="logo" src="/kreamet-logo.svg" alt={APP_NAME} />
        </h1>
        <span className="sub">
          {t('app.subtitle', {
            n: topo.links.length,
            w: CONFIG.targetWidth,
            h: CONFIG.targetHeight,
          })}
        </span>
        <span className="spacer" />
        <span className={`badge ${designKind === 'optimized' ? 'pass' : 'info'}`}>
          {designLabel}
        </span>
        <button onClick={loadInitial}>{t('app.loadInitial')}</button>
        <button onClick={exportDesign}>{t('app.export')}</button>
        <LanguageSwitch />
      </header>

      <aside className="sidebar left">
        <MechanismPanel spec={spec} onSpec={changeSpec} paramCount={analysis.geo.layout.length} />
        <TargetEditorPanel
          target={target}
          editing={targetEditing}
          onEditing={(v) => {
            setTargetEditing(v);
            setTargetMessage(v ? t('targetEdit.frameNote') : null);
          }}
          onTarget={(c) => {
            setTargetCurve(c);
            setTargetMessage(null);
          }}
          onLoadHeart={() => {
            setTargetCurve(heartTarget());
            setTargetMessage(null);
          }}
          onLoadCircle={() => {
            setTargetCurve(circleTarget());
            setTargetMessage(null);
          }}
          onImport={importTargetFile}
          onExport={exportTargetFile}
          message={targetMessage}
          actualWidth={resolvedTarget.width}
          actualHeight={resolvedTarget.height}
        />
        <MotorPanel
          rpm={rpm}
          onRpm={setRpm}
          gravityOn={gravityOn}
          onGravity={setGravityOn}
          playing={playing}
        />
        <DisplayPanel
          display={display}
          onDisplay={setDisplay}
          debugOptions={debugOptions}
          onDebugOptions={setDebugOptions}
          onClearTrail={() => viewerRef.current?.clearTrail()}
          onFullPath={() => viewerRef.current?.showFullPath(analysis.sw)}
          onFitView={() => viewerRef.current?.fitView()}
        />
        <CyclePanel metrics={analysis.metrics} />
        <TargetPanel
          metrics={analysis.metrics}
          requestedWidth={resolvedTarget.width}
          requestedHeight={resolvedTarget.height}
        />
        <Section title={t('torque.title')}>
          <TorqueChart samples={analysis.torqueProfile} cursorTheta={theta} />
          <div className="note">
            {t('torque.note')}
            {!gravityOn && ` ${t('torque.gravityOff')}`}
          </div>
        </Section>
        <ObjectivePanel metrics={analysis.metrics} />
        <TopologyPanel topology={topo} />
        <ConstraintsPanel onChange={bumpConfig} />
        <DesignPanel
          geo={analysis.geo}
          label={designLabel}
          onParam={setParam}
          onExport={exportDesign}
        />
        <GeometryReport geo={analysis.geo} label={designLabel} />
      </aside>

      <div className="canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
        <div className="overlay tl">
          <div>θ = {radToDeg(degrees).toFixed(2)}°</div>
          <div>LED ({pose ? pose.led.x.toFixed(1) : '—'}, {pose ? pose.led.y.toFixed(1) : '—'}) mm</div>
          {viewerState?.solverFailed && (
            <div className="bad">{t('canvas.solverFailed')}</div>
          )}
          {targetEditing && <div className="warn">{t('targetEdit.hint')}</div>}
        </div>
        <HoverHint
          hover={hover}
          geo={analysis.geo}
          pose={pose}
          layerOf={analysis.metrics?.layerOf}
          collidingMembers={viewerState?.collidingMembers}
        />
        <div className="overlay bl">
          <div className="scalebar" style={{ width: `${scaleBarPx}px` }} />
          <span>
            {t('canvas.scale', { n: scaleBarMm, h: scaleInfo.heightMm.toFixed(0) })}
          </span>
        </div>
        <div className="overlay br">
          <div className="legend">
            <span>
              <i style={{ background: '#8892a4' }} />
              {t('canvas.legend.target')}
            </span>
            <span>
              <i style={{ background: '#ff4d6d' }} />
              {t('canvas.legend.led')}
            </span>
            <span>
              <i style={{ background: '#f2a33c' }} />
              {t('canvas.legend.crank')}
            </span>
            <span>
              <i style={{ background: '#46c1a4' }} />
              {t('canvas.legend.output')}
            </span>
          </div>
        </div>
      </div>

      <aside className="sidebar right">
        <InspectorPanel
          selection={selection}
          geo={analysis.geo}
          pose={pose}
          params={params}
          onParam={setParam}
          layerOf={analysis.metrics?.layerOf}
        />
        <LivePanel
          pose={pose}
          theta={theta}
          rpm={rpm}
          ledKin={instant.ledKin}
          gravityTau={instant.tau}
          torque={instant.torque}
          collisionCount={viewerState?.collisionCount ?? 0}
          minMemberDistance={viewerState?.minMemberDistance ?? Infinity}
          solverFailed={viewerState?.solverFailed ?? false}
          failureReason={viewerState?.failureReason ?? null}
          assemblyJump={viewerState?.assemblyJump ?? false}
          metrics={analysis.metrics}
        />
        <OptimizerPanel
          spec={spec}
          target={target}
          onSelect={selectSolution}
          onSolutions={handleSolutions}
          storedSolutions={solutions}
          selectedIndex={selectedIndex}
          source={solutionSource}
        />
        <LinkTable
          geo={analysis.geo}
          pose={pose}
          collidingLinks={collidingLinks}
          layerOf={analysis.metrics?.layerOf}
          selection={selection}
          onSelect={setSelection}
        />
      </aside>

      <div className="timeline">
        <div className="row">
          <button
            className={`icon ${playing ? 'playing' : 'paused'}`}
            onClick={() => setPlaying((p) => !p)}
            title={t(playing ? 'timeline.pause' : 'timeline.play')}
            aria-label={t(playing ? 'timeline.pause' : 'timeline.play')}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button className="icon" onClick={() => setTheta(0)} title={t('timeline.toStart')}>
            ⏮
          </button>
          <button
            className="icon"
            onClick={() => setTheta(2 * Math.PI)}
            title={t('timeline.toEnd')}
          >
            ⏭
          </button>
          <button onClick={() => viewerRef.current?.clearTrail()}>
            {t('timeline.clearTrail')}
          </button>
          <div className="slider" style={{ flex: 1 }}>
            <div className="head">
              <span>{t('timeline.motorAngle')}</span>
              <b>{radToDeg(degrees).toFixed(1)}°</b>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={0.5}
              value={radToDeg(degrees)}
              onChange={(e) => {
                setPlaying(false);
                setTheta((Number(e.target.value) * Math.PI) / 180);
              }}
            />
          </div>
          <span className="note" style={{ fontFamily: 'var(--mono)', minWidth: 118 }}>
            {analysis.metrics
              ? t('timeline.framesOk', {
                  valid: analysis.metrics.validFrames,
                  total: analysis.metrics.frames,
                })
              : t('timeline.sweepFailed')}
          </span>
        </div>
      </div>
    </div>
  );
}
