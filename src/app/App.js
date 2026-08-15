import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../mechanism/config';
import { TOPOLOGY } from '../mechanism/topology';
import { arrayToDesign, buildGeometry, designToArray } from '../mechanism/mechanism';
import { sweep } from '../kinematics/forwardSolver';
import { scoreSweep } from '../synthesis/objective';
import { gravityTorque, gravityTorqueProfile } from '../dynamics/gravity';
import { ledKinematics } from '../dynamics/velocity';
import { motorTorque } from '../dynamics/torque';
import { MechanismViewer } from '../rendering/MechanismViewer';
import { DEFAULT_DEBUG } from '../rendering/DebugRenderer';
import { CrankDragController } from '../interaction/crankDrag';
import { rpmToRadPerSec } from '../utils/units';
import { radToDeg, wrapTwoPi } from '../utils/math';
import { INITIAL_GUESS, OPTIMIZED, hasOptimizedResults } from './designPresets';
import { buildExportJson, downloadJson } from './exportDesign';
import { DisplayPanel, MotorPanel, DesignPanel, GeometryReport } from '../ui/ControlPanel';
import { LinkTable, TopologyPanel } from '../ui/LinkTable';
import { LivePanel, CyclePanel, TargetPanel, ObjectivePanel } from '../ui/MetricsPanel';
import { OptimizerPanel } from '../ui/OptimizerPanel';
import { TorqueChart } from '../ui/TorqueChart';
import { Section } from '../ui/primitives';
import { LanguageSwitch } from '../ui/LanguageSwitch';
import { useT } from '../i18n';
import { APP_NAME } from '../i18n/translations';
import '../ui/styles.css';
/** Convert the JSON-stored solutions into the same shape the worker emits. */
function storedToSummaries() {
    if (!hasOptimizedResults())
        return [];
    return OPTIMIZED.solutions.map((s, i) => {
        const m = s.metrics;
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
    const t = useT();
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const viewerRef = useRef(null);
    const dragRef = useRef(null);
    const storedSummaries = useMemo(storedToSummaries, []);
    const startingDesign = useMemo(() => (storedSummaries.length ? arrayToDesign(storedSummaries[0].x) : INITIAL_GUESS), [storedSummaries]);
    const [design, setDesign] = useState(startingDesign);
    // Store WHICH label applies, not the translated text, so switching language
    // relabels the current design instead of freezing the words chosen earlier.
    const [designKind, setDesignKind] = useState(storedSummaries.length ? 'optimized' : 'initial');
    const designLabel = t(`app.label.${designKind}`);
    const [solutions, setSolutions] = useState(storedSummaries);
    const [solutionSource, setSolutionSource] = useState('stored');
    const [selectedIndex, setSelectedIndex] = useState(storedSummaries.length ? 0 : -1);
    const [theta, setTheta] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [rpm, setRpm] = useState(CONFIG.defaultRpm);
    const [gravityOn, setGravityOn] = useState(true);
    const [display, setDisplay] = useState({ grid: true, target: true, trail: true, debug: false });
    const [debugOptions, setDebugOptions] = useState({ ...DEFAULT_DEBUG });
    const [viewerState, setViewerState] = useState(null);
    /** Last ViewerState pushed into React, for identity comparison in the loop. */
    const publishedRef = useRef(null);
    const [scaleInfo, setScaleInfo] = useState({ mmPerPixel: 1, heightMm: 800 });
    const omega = rpmToRadPerSec(rpm);
    /* ------------------------- whole-cycle analysis ------------------------ */
    const analysis = useMemo(() => {
        const geo = buildGeometry(design);
        const sw = sweep(geo, CONFIG.samplesFine, { computeSigma: true });
        if (!sw.fullRotation || sw.poses.length === 0) {
            return { geo, sw, metrics: null, torqueProfile: [] };
        }
        const metrics = scoreSweep(geo, sw, CONFIG.weights, { computeGravity: true });
        const stride = Math.max(1, Math.floor(sw.poses.length / 120));
        const torqueProfile = gravityTorqueProfile(geo, sw.poses.filter((_, i) => i % stride === 0));
        return { geo, sw, metrics, torqueProfile };
    }, [design]);
    /* ------------------------------ viewer -------------------------------- */
    useEffect(() => {
        if (!canvasRef.current)
            return;
        const viewer = new MechanismViewer(canvasRef.current, design);
        viewerRef.current = viewer;
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
        //
        // The functional update must return the PREVIOUS object when nothing
        // actually moved.  Allocating a fresh object on every camera update makes
        // React re-render even for an identical view, and a re-render can resize
        // the canvas, which updates the camera again — a feedback loop that trips
        // "Maximum update depth exceeded". Returning `prev` lets React bail out.
        viewer.scene.onViewChange = (v) => setScaleInfo((prev) => prev.mmPerPixel === v.mmPerPixel && prev.heightMm === v.heightMm
            ? prev
            : { mmPerPixel: v.mmPerPixel, heightMm: v.heightMm });
        const resize = () => {
            const el = wrapRef.current;
            if (!el)
                return;
            viewer.resize(el.clientWidth, el.clientHeight);
        };
        resize();
        viewer.fitView();
        resize();
        // Dev-only handle so the running scene can be inspected from the console.
        if (import.meta.env.DEV) {
            window.__viewer = viewer;
        }
        const ro = new ResizeObserver(resize);
        if (wrapRef.current)
            ro.observe(wrapRef.current);
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
        if (!v)
            return;
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
        if (!v)
            return;
        v.setTargetHeart(analysis.metrics?.alignedTarget ?? []);
        v.setLayers(analysis.metrics?.layerOf);
        v.fitView();
    }, [analysis.metrics]);
    // Display toggles.
    useEffect(() => {
        const v = viewerRef.current;
        if (!v)
            return;
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
        const loop = (now) => {
            const dt = Math.min(0.1, (now - last) / 1000);
            last = now;
            if (playing)
                setTheta((t) => t + omega * dt);
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
    const pose = viewerState?.pose ?? viewerRef.current?.currentPose ?? null;
    const instant = useMemo(() => {
        if (!pose) {
            return {
                ledKin: null,
                tau: NaN,
                torque: null,
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
    const selectSolution = useCallback((x, index, source) => {
        setDesign(arrayToDesign(x));
        setSelectedIndex(index);
        setSolutionSource(source);
        setDesignKind('optimized');
    }, []);
    const handleSolutions = useCallback((s) => {
        setSolutions(s);
        setSolutionSource('live');
        setSelectedIndex(0);
    }, []);
    const loadInitial = () => {
        setDesign(INITIAL_GUESS);
        setDesignKind('initial');
        setSelectedIndex(-1);
    };
    const exportDesign = () => {
        downloadJson(buildExportJson(design, analysis.metrics, designLabel), `kreamet-${designKind}-design.json`);
    };
    const collidingLinks = viewerState?.collidingLinks ?? new Set();
    const degrees = wrapTwoPi(theta);
    const scaleBarMm = 50;
    const scaleBarPx = scaleBarMm / Math.max(1e-9, scaleInfo.mmPerPixel);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "header", children: [_jsx("h1", { children: APP_NAME }), _jsx("span", { className: "sub", children: t('app.subtitle', { w: CONFIG.targetWidth, h: CONFIG.targetHeight }) }), _jsx("span", { className: "spacer" }), _jsx("span", { className: `badge ${designKind === 'optimized' ? 'pass' : 'info'}`, children: designLabel }), _jsx("button", { onClick: loadInitial, children: t('app.loadInitial') }), _jsx("button", { onClick: exportDesign, children: t('app.export') }), _jsx(LanguageSwitch, {})] }), _jsxs("aside", { className: "sidebar left", children: [_jsx(MotorPanel, { rpm: rpm, onRpm: setRpm, gravityOn: gravityOn, onGravity: setGravityOn, playing: playing }), _jsx(DisplayPanel, { display: display, onDisplay: setDisplay, debugOptions: debugOptions, onDebugOptions: setDebugOptions, onClearTrail: () => viewerRef.current?.clearTrail(), onFullPath: () => viewerRef.current?.showFullPath(analysis.sw), onFitView: () => viewerRef.current?.fitView() }), _jsx(CyclePanel, { metrics: analysis.metrics }), _jsx(TargetPanel, { metrics: analysis.metrics }), _jsxs(Section, { title: t('torque.title'), children: [_jsx(TorqueChart, { samples: analysis.torqueProfile, cursorTheta: theta }), _jsxs("div", { className: "note", children: [t('torque.note'), !gravityOn && ` ${t('torque.gravityOff')}`] })] }), _jsx(ObjectivePanel, { metrics: analysis.metrics }), _jsx(TopologyPanel, { mobility: TOPOLOGY.mobility, loopCount: TOPOLOGY.loopCount, loops: TOPOLOGY.loops }), _jsx(DesignPanel, { design: design, label: designLabel, onChange: (d) => {
                            setDesign(d);
                            setDesignKind('manual');
                            setSelectedIndex(-1);
                        }, onExport: exportDesign }), _jsx(GeometryReport, { design: design, pivots: { O2: analysis.geo.O2, O4: analysis.geo.O4, O6: analysis.geo.O6 }, members: analysis.geo.members.map((m) => ({
                            linkId: m.linkId,
                            from: String(m.from),
                            to: String(m.to),
                            length: m.length,
                        })), label: designLabel })] }), _jsxs("div", { className: "canvas-wrap", ref: wrapRef, children: [_jsx("canvas", { ref: canvasRef }), _jsxs("div", { className: "overlay tl", children: [_jsxs("div", { children: ["\u03B8 = ", radToDeg(degrees).toFixed(2), "\u00B0"] }), _jsxs("div", { children: ["LED (", pose ? pose.led.x.toFixed(1) : '—', ", ", pose ? pose.led.y.toFixed(1) : '—', ") mm"] }), viewerState?.solverFailed && (_jsx("div", { className: "bad", children: t('canvas.solverFailed') }))] }), _jsxs("div", { className: "overlay bl", children: [_jsx("div", { className: "scalebar", style: { width: `${scaleBarPx}px` } }), _jsx("span", { children: t('canvas.scale', { n: scaleBarMm, h: scaleInfo.heightMm.toFixed(0) }) })] }), _jsx("div", { className: "overlay br", children: _jsxs("div", { className: "legend", children: [_jsxs("span", { children: [_jsx("i", { style: { background: '#8892a4' } }), t('canvas.legend.target')] }), _jsxs("span", { children: [_jsx("i", { style: { background: '#ff4d6d' } }), t('canvas.legend.led')] }), _jsxs("span", { children: [_jsx("i", { style: { background: '#f2a33c' } }), t('canvas.legend.crank')] }), _jsxs("span", { children: [_jsx("i", { style: { background: '#46c1a4' } }), t('canvas.legend.output')] })] }) })] }), _jsxs("aside", { className: "sidebar right", children: [_jsx(LivePanel, { pose: pose, theta: theta, rpm: rpm, ledKin: instant.ledKin, gravityTau: instant.tau, torque: instant.torque, collisionCount: viewerState?.collisionCount ?? 0, minMemberDistance: viewerState?.minMemberDistance ?? Infinity, solverFailed: viewerState?.solverFailed ?? false, failureReason: viewerState?.failureReason ?? null, assemblyJump: viewerState?.assemblyJump ?? false, metrics: analysis.metrics }), _jsx(OptimizerPanel, { onSelect: selectSolution, onSolutions: handleSolutions, storedSolutions: solutions, selectedIndex: selectedIndex, source: solutionSource }), _jsx(LinkTable, { geo: analysis.geo, pose: pose, collidingLinks: collidingLinks, layerOf: analysis.metrics?.layerOf })] }), _jsx("div", { className: "timeline", children: _jsxs("div", { className: "row", children: [_jsx("button", { className: "icon", onClick: () => setPlaying((p) => !p), title: t(playing ? 'timeline.pause' : 'timeline.play'), "aria-label": t(playing ? 'timeline.pause' : 'timeline.play'), children: playing ? '⏸' : '▶' }), _jsx("button", { className: "icon", onClick: () => setTheta(0), title: t('timeline.toStart'), children: "\u23EE" }), _jsx("button", { className: "icon", onClick: () => setTheta(2 * Math.PI), title: t('timeline.toEnd'), children: "\u23ED" }), _jsx("button", { onClick: () => viewerRef.current?.clearTrail(), children: t('timeline.clearTrail') }), _jsxs("div", { className: "slider", style: { flex: 1 }, children: [_jsxs("div", { className: "head", children: [_jsx("span", { children: t('timeline.motorAngle') }), _jsxs("b", { children: [radToDeg(degrees).toFixed(1), "\u00B0"] })] }), _jsx("input", { type: "range", min: 0, max: 360, step: 0.5, value: radToDeg(degrees), onChange: (e) => {
                                        setPlaying(false);
                                        setTheta((Number(e.target.value) * Math.PI) / 180);
                                    } })] }), _jsx("span", { className: "note", style: { fontFamily: 'var(--mono)', minWidth: 118 }, children: analysis.metrics
                                ? t('timeline.framesOk', {
                                    valid: analysis.metrics.validFrames,
                                    total: analysis.metrics.frames,
                                })
                                : t('timeline.sweepFailed') })] }) })] }));
}
export { designToArray };
