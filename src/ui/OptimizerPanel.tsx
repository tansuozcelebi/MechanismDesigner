import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../mechanism/config';
import type { SolutionSummary, WorkerResponse } from '../workers/optimization.worker';
import type { OptimizerProgress } from '../synthesis/optimizer';
import { useT } from '../i18n';
import { Section, num } from './primitives';

/**
 * Synthesis control (brief §27, §28).  The worker keeps the render thread free,
 * so the mechanism keeps animating at 60 FPS while the optimiser runs.
 */
export function OptimizerPanel({
  onSelect,
  onSolutions,
  storedSolutions,
  selectedIndex,
  source,
}: {
  onSelect: (x: number[], index: number, source: 'stored' | 'live') => void;
  onSolutions: (s: SolutionSummary[]) => void;
  storedSolutions: SolutionSummary[];
  selectedIndex: number;
  source: 'stored' | 'live';
}) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OptimizerProgress | null>(null);
  const [runInfo, setRunInfo] = useState({ run: 0, total: 0 });
  const [result, setResult] = useState<{ evaluations: number; elapsedMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [population, setPopulation] = useState<number>(CONFIG.optimizer.dePopulation);
  const [generations, setGenerations] = useState(120);
  const [runs, setRuns] = useState(2);
  const [seed, setSeed] = useState(20260814);

  const workerRef = useRef<Worker | null>(null);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const start = () => {
    setError(null);
    setResult(null);
    setRunning(true);
    setProgress(null);

    const worker = new Worker(new URL('../workers/optimization.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        setProgress(msg.progress);
        setRunInfo({ run: msg.run, total: msg.totalRuns });
      } else if (msg.type === 'done') {
        setRunning(false);
        setResult({ evaluations: msg.evaluations, elapsedMs: msg.elapsedMs });
        onSolutions(msg.solutions);
        if (msg.solutions.length) onSelect(msg.solutions[0].x, 0, 'live');
        worker.terminate();
        workerRef.current = null;
      } else {
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

  return (
    <>
      <Section title={t('opt.title')}>
        <div className="row">
          <label className="field">
            <span>{t('opt.population')}</span>
            <input
              type="number"
              value={population}
              min={16}
              max={200}
              onChange={(e) => setPopulation(Number(e.target.value))}
              disabled={running}
            />
          </label>
          <label className="field">
            <span>{t('opt.generations')}</span>
            <input
              type="number"
              value={generations}
              min={10}
              max={600}
              onChange={(e) => setGenerations(Number(e.target.value))}
              disabled={running}
            />
          </label>
        </div>
        <div className="row">
          <label className="field">
            <span>{t('opt.restarts')}</span>
            <input
              type="number"
              value={runs}
              min={1}
              max={12}
              onChange={(e) => setRuns(Number(e.target.value))}
              disabled={running}
            />
          </label>
          <label className="field">
            <span>{t('opt.seed')}</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              disabled={running}
            />
          </label>
        </div>

        <div className="row">
          {!running ? (
            <button className="primary" onClick={start} style={{ flex: 1 }}>
              {t('opt.run')}
            </button>
          ) : (
            <button onClick={cancel} style={{ flex: 1 }}>
              {t('opt.cancel')}
            </button>
          )}
        </div>

        {running && (
          <>
            <div className="progress">
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="note" style={{ fontFamily: 'var(--mono)' }}>
              {t('opt.running', {
                run: runInfo.run,
                total: runInfo.total,
                message: progress?.message ?? t('opt.starting'),
              })}
              <br />
              {t('opt.bestJ', {
                j:
                  progress && Number.isFinite(progress.bestJ) ? progress.bestJ.toFixed(4) : '—',
                n: progress?.evaluations ?? 0,
              })}
            </div>
          </>
        )}

        {result && (
          <div className="banner ok">
            {t('opt.finished', {
              n: result.evaluations,
              s: (result.elapsedMs / 1000).toFixed(1),
            })}
          </div>
        )}
        {error && <div className="banner bad">{error}</div>}

        <div className="note">
          {t('opt.note', {
            a: CONFIG.samplesCoarse,
            b: CONFIG.samplesMedium,
            c: CONFIG.samplesFine,
          })}
        </div>
      </Section>

      {storedSolutions.length > 0 && (
        <Section title={t('opt.bestTitle', { n: storedSolutions.length })}>
          <div className="note">
            {t(source === 'stored' ? 'opt.sourceStored' : 'opt.sourceLive')}
          </div>
          <div className="solutions">
            {storedSolutions.map((s, i) => (
              <div
                key={i}
                className={`sol ${i === selectedIndex ? 'selected' : ''}`}
                onClick={() => onSelect(s.x, i, source)}
              >
                <span className="rank">#{i + 1}</span>
                <span>
                  RMS {num(s.rms, 1)} mm · {num(s.width, 0)}×{num(s.height, 0)}
                </span>
                <span className={s.fullRotation ? 'good' : 'bad'}>{num(s.J, 3)}</span>
              </div>
            ))}
          </div>
          {storedSolutions[selectedIndex] && (
            <SolutionDetail s={storedSolutions[selectedIndex]} />
          )}
        </Section>
      )}
    </>
  );
}

function SolutionDetail({ s }: { s: SolutionSummary }) {
  const t = useT();
  return (
    <table>
      <tbody>
        <tr>
          <td>{t('opt.detail.score')}</td>
          <td>{num(s.J, 4)}</td>
        </tr>
        <tr>
          <td>{t('opt.detail.rms')}</td>
          <td>{num(s.rms, 2)} mm</td>
        </tr>
        <tr>
          <td>{t('opt.detail.maxError')}</td>
          <td>{num(s.maxError, 2)} mm</td>
        </tr>
        <tr>
          <td>{t('opt.detail.size')}</td>
          <td>
            {num(s.width, 1)} × {num(s.height, 1)} mm
          </td>
        </tr>
        <tr>
          <td>{t('opt.detail.minMu')}</td>
          <td>{num(s.minTransmissionAngle, 2)}°</td>
        </tr>
        <tr>
          <td>{t('opt.detail.singularity')}</td>
          <td>{num(s.singularityMargin, 4)}</td>
        </tr>
        <tr>
          <td>{t('opt.detail.interference')}</td>
          <td>{t('opt.detail.frames', { n: s.collisionFrames })}</td>
        </tr>
        <tr>
          <td>{t('opt.detail.layers')}</td>
          <td>{s.layerCount}</td>
        </tr>
        <tr>
          <td>{t('opt.detail.peakTorque')}</td>
          <td>{num(s.peakGravityTorque, 4)} N·m</td>
        </tr>
        <tr>
          <td>{t('opt.detail.fullRotation')}</td>
          <td className={s.fullRotation ? 'good' : 'bad'}>
            {s.validFrames}/{s.frames}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
