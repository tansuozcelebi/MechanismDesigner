import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../mechanism/config';
import { useT } from '../i18n';
import { Section, num } from './primitives';
/**
 * Synthesis control (brief §27, §28).  The worker keeps the render thread free,
 * so the mechanism keeps animating at 60 FPS while the optimiser runs.
 */
export function OptimizerPanel({ onSelect, onSolutions, storedSolutions, selectedIndex, source, }) {
    const t = useT();
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(null);
    const [runInfo, setRunInfo] = useState({ run: 0, total: 0 });
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [population, setPopulation] = useState(CONFIG.optimizer.dePopulation);
    const [generations, setGenerations] = useState(120);
    const [runs, setRuns] = useState(2);
    const [seed, setSeed] = useState(20260814);
    const workerRef = useRef(null);
    useEffect(() => () => {
        workerRef.current?.terminate();
        workerRef.current = null;
    }, []);
    const start = () => {
        setError(null);
        setResult(null);
        setRunning(true);
        setProgress(null);
        const worker = new Worker(new URL('../workers/optimization.worker.ts', import.meta.url), {
            type: 'module',
        });
        workerRef.current = worker;
        worker.onmessage = (ev) => {
            const msg = ev.data;
            if (msg.type === 'progress') {
                setProgress(msg.progress);
                setRunInfo({ run: msg.run, total: msg.totalRuns });
            }
            else if (msg.type === 'done') {
                setRunning(false);
                setResult({ evaluations: msg.evaluations, elapsedMs: msg.elapsedMs });
                onSolutions(msg.solutions);
                if (msg.solutions.length)
                    onSelect(msg.solutions[0].x, 0, 'live');
                worker.terminate();
                workerRef.current = null;
            }
            else {
                setRunning(false);
                setError(msg.message);
                worker.terminate();
                workerRef.current = null;
            }
        };
        worker.postMessage({
            type: 'run',
            seed,
            population,
            generations,
            localIterations: 300,
            runs,
        });
    };
    const cancel = () => {
        workerRef.current?.postMessage({ type: 'cancel' });
        setRunning(false);
    };
    const pct = progress
        ? progress.phase === 'done'
            ? 100
            : (progress.generation / Math.max(1, progress.totalGenerations)) * 100
        : 0;
    return (_jsxs(_Fragment, { children: [_jsxs(Section, { title: t('opt.title'), children: [_jsxs("div", { className: "row", children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: t('opt.population') }), _jsx("input", { type: "number", value: population, min: 16, max: 200, onChange: (e) => setPopulation(Number(e.target.value)), disabled: running })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('opt.generations') }), _jsx("input", { type: "number", value: generations, min: 10, max: 600, onChange: (e) => setGenerations(Number(e.target.value)), disabled: running })] })] }), _jsxs("div", { className: "row", children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: t('opt.restarts') }), _jsx("input", { type: "number", value: runs, min: 1, max: 12, onChange: (e) => setRuns(Number(e.target.value)), disabled: running })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('opt.seed') }), _jsx("input", { type: "number", value: seed, onChange: (e) => setSeed(Number(e.target.value)), disabled: running })] })] }), _jsx("div", { className: "row", children: !running ? (_jsx("button", { className: "primary", onClick: start, style: { flex: 1 }, children: t('opt.run') })) : (_jsx("button", { onClick: cancel, style: { flex: 1 }, children: t('opt.cancel') })) }), running && (_jsxs(_Fragment, { children: [_jsx("div", { className: "progress", children: _jsx("i", { style: { width: `${pct}%` } }) }), _jsxs("div", { className: "note", style: { fontFamily: 'var(--mono)' }, children: [t('opt.running', {
                                        run: runInfo.run,
                                        total: runInfo.total,
                                        message: progress?.message ?? t('opt.starting'),
                                    }), _jsx("br", {}), t('opt.bestJ', {
                                        j: progress && Number.isFinite(progress.bestJ) ? progress.bestJ.toFixed(4) : '—',
                                        n: progress?.evaluations ?? 0,
                                    })] })] })), result && (_jsx("div", { className: "banner ok", children: t('opt.finished', {
                            n: result.evaluations,
                            s: (result.elapsedMs / 1000).toFixed(1),
                        }) })), error && _jsx("div", { className: "banner bad", children: error }), _jsx("div", { className: "note", children: t('opt.note', {
                            a: CONFIG.samplesCoarse,
                            b: CONFIG.samplesMedium,
                            c: CONFIG.samplesFine,
                        }) })] }), storedSolutions.length > 0 && (_jsxs(Section, { title: t('opt.bestTitle', { n: storedSolutions.length }), children: [_jsx("div", { className: "note", children: t(source === 'stored' ? 'opt.sourceStored' : 'opt.sourceLive') }), _jsx("div", { className: "solutions", children: storedSolutions.map((s, i) => (_jsxs("div", { className: `sol ${i === selectedIndex ? 'selected' : ''}`, onClick: () => onSelect(s.x, i, source), children: [_jsxs("span", { className: "rank", children: ["#", i + 1] }), _jsxs("span", { children: ["RMS ", num(s.rms, 1), " mm \u00B7 ", num(s.width, 0), "\u00D7", num(s.height, 0)] }), _jsx("span", { className: s.fullRotation ? 'good' : 'bad', children: num(s.J, 3) })] }, i))) }), storedSolutions[selectedIndex] && (_jsx(SolutionDetail, { s: storedSolutions[selectedIndex] }))] }))] }));
}
function SolutionDetail({ s }) {
    const t = useT();
    return (_jsx("table", { children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.score') }), _jsx("td", { children: num(s.J, 4) })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.rms') }), _jsxs("td", { children: [num(s.rms, 2), " mm"] })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.maxError') }), _jsxs("td", { children: [num(s.maxError, 2), " mm"] })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.size') }), _jsxs("td", { children: [num(s.width, 1), " \u00D7 ", num(s.height, 1), " mm"] })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.minMu') }), _jsxs("td", { children: [num(s.minTransmissionAngle, 2), "\u00B0"] })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.singularity') }), _jsx("td", { children: num(s.singularityMargin, 4) })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.interference') }), _jsx("td", { children: t('opt.detail.frames', { n: s.collisionFrames }) })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.layers') }), _jsx("td", { children: s.layerCount })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.peakTorque') }), _jsxs("td", { children: [num(s.peakGravityTorque, 4), " N\u00B7m"] })] }), _jsxs("tr", { children: [_jsx("td", { children: t('opt.detail.fullRotation') }), _jsxs("td", { className: s.fullRotation ? 'good' : 'bad', children: [s.validFrames, "/", s.frames] })] })] }) }));
}
