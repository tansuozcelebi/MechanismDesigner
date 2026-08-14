import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../mechanism/config';
import { TOPOLOGY } from '../mechanism/topology';
import { arrayToDesign, buildGeometry, designToArray } from '../mechanism/mechanism';
import type { DesignVector, LinkId, Pose } from '../mechanism/types';
import { sweep } from '../kinematics/forwardSolver';
import { scoreSweep, type Metrics } from '../synthesis/objective';
import { gravityTorque, gravityTorqueProfile } from '../dynamics/gravity';
import { ledKinematics, type Kinematics2 } from '../dynamics/velocity';
import { motorTorque, type TorqueBreakdown } from '../dynamics/torque';
import { MechanismViewer, type ViewerState } from '../rendering/MechanismViewer';
import { DEFAULT_DEBUG, type DebugOptions } from '../rendering/DebugRenderer';
import { CrankDragController } from '../interaction/crankDrag';
import { rpmToRadPerSec } from '../utils/units';
import { radToDeg, wrapTwoPi } from '../utils/math';
import { INITIAL_GUESS, OPTIMIZED, hasOptimizedResults } from './designPresets';
import { buildExportJson, downloadJson } from './exportDesign';
import type { SolutionSummary } from '../workers/optimization.worker';

import { DisplayPanel, MotorPanel, DesignPanel, GeometryReport } from '../ui/ControlPanel';
import { LinkTable, TopologyPanel } from '../ui/LinkTable';
import { LivePanel, CyclePanel, TargetPanel, ObjectivePanel } from '../ui/MetricsPanel';
import { OptimizerPanel } from '../ui/OptimizerPanel';
import { TorqueChart } from '../ui/TorqueChart';
import { Section } from '../ui/primitives';
import '../ui/styles.css';

/** Convert the JSON-stored solutions into the same shape the worker emits. */
function storedToSummaries(): SolutionSummary[] {
  if (!hasOptimizedResults()) return [];
  return OPTIMIZED.solutions.map((s, i) => {
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
      effectiveTransmissionAngle: Number(m.minTransmissionAngle_deg ?? NaN),
      singularityMargin: Number(m.singularityMargin ?? NaN),
      collisionFrames: Number(m.collisionFrames ?? 0),
      layerCount: Number(m.assemblyLayers ?? 0),
      peakGravityTorque: Number(m.peakGravityTorque_Nm ?? NaN),
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
      fixedPivots: {
        O2: [s.fixedPivots.O2.x, s.fixedPivots.O2.y],
        O4: [s.fixedPivots.O4.x, s.fixedPivots.O4.y],
        O6: [s.fixedPivots.O6.x, s.fixedPivots.O6.y],
      },
    };
  });
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<MechanismViewer | null>(null);
  const dragRef = useRef<CrankDragController | null>(null);

  const storedSummaries = useMemo(storedToSummaries, []);
  const startingDesign = useMemo<DesignVector>(
    () => (storedSummaries.length ? arrayToDesign(storedSummaries[0].x) : INITIAL_GUESS),
    [storedSummaries],
  );

  const [design, setDesign] = useState<DesignVector>(startingDesign);
  const [designLabel, setDesignLabel] = useState<string>(
    storedSummaries.length ? 'OPTIMIZED RESULT' : 'INITIAL GUESS',
  );
  const [solutions, setSolutions] = useState<SolutionSummary[]>(storedSummaries);
  const [solutionSource, setSolutionSource] = useState<'stored' | 'live'>('stored');
  const [selectedIndex, setSelectedIndex] = useState(storedSummaries.length ? 0 : -1);

  const [theta, setTheta] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rpm, setRpm] = useState<number>(CONFIG.defaultRpm);
  const [gravityOn, setGravityOn] = useState(true);
  const [display, setDisplay] = useState({ grid: true, target: true, trail: true, debug: false });
  const [debugOptions, setDebugOptions] = useState<DebugOptions>({ ...DEFAULT_DEBUG });

  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [scaleInfo, setScaleInfo] = useState({ mmPerPixel: 1, heightMm: 800 });

  const omega = rpmToRadPerSec(rpm);

  /* ------------------------- whole-cycle analysis ------------------------ */

  const analysis = useMemo(() => {
    const geo = buildGeometry(design);
    const sw = sweep(geo, CONFIG.samplesFine, { computeSigma: true });
    if (!sw.fullRotation || sw.poses.length === 0) {
      return { geo, sw, metrics: null as Metrics | null, torqueProfile: [] };
    }
    const metrics = scoreSweep(geo, sw, CONFIG.weights, { computeGravity: true });
    const stride = Math.max(1, Math.floor(sw.poses.length / 120));
    const torqueProfile = gravityTorqueProfile(
      geo,
      sw.poses.filter((_, i) => i % stride === 0),
    );
    return { geo, sw, metrics, torqueProfile };
  }, [design]);

  /* ------------------------------ viewer -------------------------------- */

  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new MechanismViewer(canvasRef.current, design);
    viewerRef.current = viewer;
    viewer.onState = setViewerState;

    dragRef.current = new CrankDragController(viewer.scene, {
      onAngle: (t) => {
        setPlaying(false);
        setTheta(t);
      },
      getCrankPin: () => viewer.currentPose?.joints.A ?? viewer.geometry.O2,
      getO2: () => viewer.geometry.O2,
      getTheta: () => viewer.currentTheta,
    });

    // Keep the on-canvas scale bar honest: it must follow every projection
    // change (fit, zoom, pan), not just window resizes.
    viewer.scene.onViewChange = (v) =>
      setScaleInfo({ mmPerPixel: v.mmPerPixel, heightMm: v.heightMm });

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
      dragRef.current?.dispose();
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
    v.setDesign(design);
    v.showFullPath(analysis.sw.fullRotation ? analysis.sw : undefined);
    v.fitView();
    v.setTheta(theta, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design]);

  // Push the aligned target heart and the layer plan, then re-frame the view so
  // the heart is guaranteed to be inside the canvas.
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    v.setTargetHeart(analysis.metrics?.alignedTarget ?? []);
    v.setLayers(analysis.metrics?.layerOf);
    v.fitView();
  }, [analysis.metrics]);

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
      if (playing) setTheta((t) => t + omega * dt);
      viewerRef.current?.render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, omega]);

  /* --------------------------- instant physics -------------------------- */

  const pose: Pose | null = viewerState?.pose ?? viewerRef.current?.currentPose ?? null;

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

  const selectSolution = useCallback((x: number[], index: number, source: 'stored' | 'live') => {
    setDesign(arrayToDesign(x));
    setSelectedIndex(index);
    setSolutionSource(source);
    setDesignLabel('OPTIMIZED RESULT');
  }, []);

  const handleSolutions = useCallback((s: SolutionSummary[]) => {
    setSolutions(s);
    setSolutionSource('live');
    setSelectedIndex(0);
  }, []);

  const loadInitial = () => {
    setDesign(INITIAL_GUESS);
    setDesignLabel('INITIAL GUESS');
    setSelectedIndex(-1);
  };

  const exportDesign = () => {
    downloadJson(
      buildExportJson(design, analysis.metrics, designLabel),
      `heart-linkage-${designLabel.toLowerCase().replace(/\s+/g, '-')}.json`,
    );
  };

  const collidingLinks: Set<LinkId> = viewerState?.collidingLinks ?? new Set();
  const degrees = wrapTwoPi(theta);
  const scaleBarMm = 50;
  const scaleBarPx = scaleBarMm / Math.max(1e-9, scaleInfo.mmPerPixel);

  return (
    <div className="app">
      <header className="header">
        <h1>Heart Linkage Synthesis</h1>
        <span className="sub">
          8-bar · 1-DOF · single motor at O2 · target {CONFIG.targetWidth}×{CONFIG.targetHeight} mm
        </span>
        <span className="spacer" />
        <span className={`badge ${designLabel === 'OPTIMIZED RESULT' ? 'pass' : 'info'}`}>
          {designLabel}
        </span>
        <button onClick={loadInitial}>Load Initial Guess</button>
        <button onClick={exportDesign}>Export JSON</button>
      </header>

      <aside className="sidebar left">
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
        <TargetPanel metrics={analysis.metrics} />
        <Section title="Gravity Torque τ(θ)">
          <TorqueChart samples={analysis.torqueProfile} cursorTheta={theta} />
          <div className="note">
            τ_g(θ) = dU/dθ by central difference on the analytic solver, U = Σ mᵢ g y_comᵢ.
            {!gravityOn && ' Gravity is OFF — the motor torque estimate drops this term.'}
          </div>
        </Section>
        <ObjectivePanel metrics={analysis.metrics} />
        <TopologyPanel
          mobility={TOPOLOGY.mobility}
          loopCount={TOPOLOGY.loopCount}
          loops={TOPOLOGY.loops}
        />
        <DesignPanel
          design={design}
          label={`Design Vector — ${designLabel}`}
          onChange={(d) => {
            setDesign(d);
            setDesignLabel('MANUAL EDIT');
            setSelectedIndex(-1);
          }}
          onExport={exportDesign}
        />
        <GeometryReport
          design={design}
          pivots={{ O2: analysis.geo.O2, O4: analysis.geo.O4, O6: analysis.geo.O6 }}
          members={analysis.geo.members.map((m) => ({
            linkId: m.linkId,
            from: String(m.from),
            to: String(m.to),
            length: m.length,
          }))}
          title={`Geometry Report — ${designLabel}`}
        />
      </aside>

      <div className="canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
        <div className="overlay tl">
          <div>θ = {radToDeg(degrees).toFixed(2)}°</div>
          <div>LED ({pose ? pose.led.x.toFixed(1) : '—'}, {pose ? pose.led.y.toFixed(1) : '—'}) mm</div>
          {viewerState?.solverFailed && <div className="bad">KINEMATIC SOLUTION FAILED</div>}
        </div>
        <div className="overlay bl">
          <div className="scalebar" style={{ width: `${scaleBarPx}px` }} />
          <span>
            {scaleBarMm} mm · view {scaleInfo.heightMm.toFixed(0)} mm tall
          </span>
        </div>
        <div className="overlay br">
          <div className="legend">
            <span>
              <i style={{ background: '#8892a4' }} />
              target heart
            </span>
            <span>
              <i style={{ background: '#ff4d6d' }} />
              LED path
            </span>
            <span>
              <i style={{ background: '#f2a33c' }} />
              crank
            </span>
            <span>
              <i style={{ background: '#46c1a4' }} />
              output
            </span>
          </div>
        </div>
      </div>

      <aside className="sidebar right">
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
        />
      </aside>

      <div className="timeline">
        <div className="row">
          <button className="icon" onClick={() => setPlaying((p) => !p)}>
            {playing ? '⏸' : '▶'}
          </button>
          <button className="icon" onClick={() => setTheta(0)} title="Go to 0°">
            ⏮
          </button>
          <button className="icon" onClick={() => setTheta(2 * Math.PI)} title="Go to 360°">
            ⏭
          </button>
          <button onClick={() => viewerRef.current?.clearTrail()}>Clear Trail</button>
          <div className="slider" style={{ flex: 1 }}>
            <div className="head">
              <span>Motor Angle</span>
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
              ? `${analysis.metrics.validFrames}/${analysis.metrics.frames} frames OK`
              : 'sweep failed'}
          </span>
        </div>
      </div>
    </div>
  );
}

export { designToArray };
