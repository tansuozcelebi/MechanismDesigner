import { CONFIG } from '../mechanism/config';
import type { Metrics as MetricsType } from '../synthesis/objective';
import type { Pose } from '../mechanism/types';
import type { Kinematics2 } from '../dynamics/velocity';
import type { TorqueBreakdown } from '../dynamics/torque';
import { radToDeg } from '../utils/math';
import { Metric, Metrics, Section, num, sci, type MetricTone } from './primitives';

/** Live instrument readout for the current instant (brief §35). */
export function LivePanel({
  pose,
  theta,
  rpm,
  ledKin,
  gravityTau,
  torque,
  collisionCount,
  minMemberDistance,
  solverFailed,
  failureReason,
  assemblyJump,
  metrics,
}: {
  pose: Pose | null;
  theta: number;
  rpm: number;
  ledKin: Kinematics2 | null;
  gravityTau: number;
  torque: TorqueBreakdown | null;
  collisionCount: number;
  minMemberDistance: number;
  solverFailed: boolean;
  failureReason: string | null;
  assemblyJump: boolean;
  metrics: MetricsType | null;
}) {
  const muNow = pose ? Math.min(...pose.transmissionAngles) : NaN;
  const muTone: MetricTone = !pose
    ? 'dim'
    : muNow < CONFIG.muHardMin || muNow > CONFIG.muHardMax
      ? 'bad'
      : muNow < CONFIG.muGoodMin || muNow > CONFIG.muGoodMax
        ? 'warn'
        : 'good';

  const sigmaTone: MetricTone = !pose
    ? 'dim'
    : pose.sigmaMin < CONFIG.singularityTol * 0.3
      ? 'bad'
      : pose.sigmaMin < CONFIG.singularityTol
        ? 'warn'
        : 'good';

  const closureTone: MetricTone = !pose
    ? 'dim'
    : pose.loopClosureError < CONFIG.loopClosureTol
      ? 'good'
      : 'bad';

  const degrees = ((radToDeg(theta) % 360) + 360) % 360;

  return (
    <Section title="Live Instrumentation">
      {solverFailed && (
        <div className="banner bad">
          KINEMATIC SOLUTION FAILED
          <br />
          {failureReason ?? 'unknown'}
          <br />
          <span className="dim">showing last valid configuration</span>
        </div>
      )}
      {assemblyJump && !solverFailed && (
        <div className="banner warn">ASSEMBLY MODE JUMP detected on this step</div>
      )}

      <Metrics>
        <Metric label="Motor angle" value={`${degrees.toFixed(2)}°`} />
        <Metric label="Motor speed" value={`${rpm.toFixed(0)} rpm`} />
        <Metric label="LED X" value={num(pose?.led.x, 2, ' mm')} />
        <Metric label="LED Y" value={num(pose?.led.y, 2, ' mm')} />
        <Metric
          label="LED velocity"
          value={ledKin?.ok ? `${(ledKin.speed / 1000).toFixed(3)} m/s` : '—'}
        />
        <Metric
          label="LED acceleration"
          value={ledKin?.ok ? `${(ledKin.accelMagnitude / 1000).toFixed(2)} m/s²` : '—'}
        />
        <Metric
          label="Gravity torque"
          value={num(gravityTau, 4, ' N·m')}
          title="dU/dtheta — quasi-static torque the motor must supply against gravity"
        />
        <Metric
          label="Est. motor torque"
          value={torque?.ok ? num(torque.total, 4, ' N·m') : '—'}
          title="Lagrange estimate: gravity + inertial terms at constant motor speed"
        />
        <Metric
          label="  ↳ inertial part"
          value={torque?.ok ? num(torque.inertial, 4, ' N·m') : '—'}
          tone="dim"
        />
        <Metric
          label="  ↳ reduced inertia"
          value={torque?.ok ? `${torque.reducedInertia.toExponential(2)} kg·m²` : '—'}
          tone="dim"
        />
        <Metric
          label="Trajectory RMS"
          value={num(metrics?.match.chamferRms, 2, ' mm')}
          tone={
            !metrics ? 'dim' : metrics.match.chamferRms < 10 ? 'good' : metrics.match.chamferRms < 25 ? 'warn' : 'bad'
          }
        />
        <Metric label="Min transmission μ" value={num(muNow, 2, '°')} tone={muTone} />
        <Metric
          label="Singularity margin"
          value={num(pose?.sigmaMin, 4)}
          tone={sigmaTone}
          title="Smallest singular value of dF/dq (constraint Jacobian)"
        />
        <Metric
          label="Loop closure error"
          value={pose ? `${sci(pose.loopClosureError)} mm` : '—'}
          tone={closureTone}
        />
        <Metric
          label="Interference"
          value={collisionCount === 0 ? 'CLEAR' : `${collisionCount} pair(s)`}
          tone={collisionCount === 0 ? 'good' : 'bad'}
          title="Coplanar interference at 12 mm bar width between bodies not sharing a joint"
        />
        <Metric
          label="Min member gap"
          value={Number.isFinite(minMemberDistance) ? num(minMemberDistance, 1, ' mm') : '—'}
          tone="dim"
        />
      </Metrics>
    </Section>
  );
}

/** Whole-cycle verification (brief §37, §44, §45). */
export function CyclePanel({ metrics }: { metrics: MetricsType | null }) {
  if (!metrics) {
    return (
      <Section title="Cycle Verification">
        <div className="note">No valid sweep — adjust the design.</div>
      </Section>
    );
  }

  const rot = metrics.fullRotation && metrics.validFrames === metrics.frames;
  const pathOk = metrics.pathClosure < CONFIG.pathClosureTol;
  const loopOk = metrics.maxLoopClosureError < CONFIG.loopClosureTol;

  return (
    <Section title="Cycle Verification">
      <div className="row wrap">
        <span className={`badge ${rot ? 'pass' : 'fail'}`}>
          FULL ROTATION {rot ? 'PASS' : 'FAIL'}
        </span>
        <span className={`badge ${metrics.assemblyJumps === 0 ? 'pass' : 'fail'}`}>
          JUMPS {metrics.assemblyJumps}
        </span>
        <span className={`badge ${loopOk ? 'pass' : 'fail'}`}>CLOSURE {loopOk ? 'OK' : 'FAIL'}</span>
        <span className={`badge ${pathOk ? 'pass' : 'fail'}`}>PATH {pathOk ? 'CLOSED' : 'OPEN'}</span>
      </div>

      <Metrics>
        <Metric
          label="Frames solved"
          value={`${metrics.validFrames} / ${metrics.frames}`}
          tone={rot ? 'good' : 'bad'}
        />
        <Metric
          label="Max loop closure"
          value={`${sci(metrics.maxLoopClosureError)} mm`}
          tone={loopOk ? 'good' : 'bad'}
          title={`tolerance ${CONFIG.loopClosureTol} mm`}
        />
        <Metric
          label="Path closure"
          value={`${sci(metrics.pathClosure)} mm`}
          tone={pathOk ? 'good' : 'bad'}
          title="|P_LED(0) − P_LED(2π)|"
        />
        <Metric
          label="Min transmission μ"
          value={num(metrics.minTransmissionAngle, 2, '°')}
          tone={metrics.minTransmissionAngle >= CONFIG.muHardMin ? 'good' : 'bad'}
        />
        <Metric
          label="Effective μ margin"
          value={num(metrics.effectiveTransmissionAngle, 2, '°')}
          tone={metrics.effectiveTransmissionAngle >= CONFIG.muHardMin ? 'good' : 'warn'}
          title="min(μ, 180−μ) over the cycle; the frame's physical ceiling is 44.75°"
        />
        <Metric
          label="Singularity margin"
          value={num(metrics.minSigma, 4)}
          tone={metrics.minSigma > CONFIG.singularityTol ? 'good' : 'warn'}
        />
        <Metric
          label="Peak gravity torque"
          value={num(metrics.peakGravityTorque, 4, ' N·m')}
        />
      </Metrics>
    </Section>
  );
}

/** Target vs. achieved geometry (brief §37). */
export function TargetPanel({ metrics }: { metrics: MetricsType | null }) {
  const score = metrics?.heartMatchPercent ?? 0;
  return (
    <Section title="Target Heart">
      <Metrics>
        <Metric label="Target width" value={`${CONFIG.targetWidth.toFixed(2)} mm`} tone="dim" />
        <Metric label="Target height" value={`${CONFIG.targetHeight.toFixed(2)} mm`} tone="dim" />
        <Metric
          label="Actual width"
          value={num(metrics?.width, 2, ' mm')}
          tone={metrics && Math.abs(metrics.width - CONFIG.targetWidth) < 25 ? 'good' : 'warn'}
        />
        <Metric
          label="Actual height"
          value={num(metrics?.height, 2, ' mm')}
          tone={metrics && Math.abs(metrics.height - CONFIG.targetHeight) < 25 ? 'good' : 'warn'}
        />
        <Metric label="RMS error (Chamfer)" value={num(metrics?.match.chamferRms, 2, ' mm')} />
        <Metric
          label="RMS error (parameterised)"
          value={num(metrics?.match.paramRms, 2, ' mm')}
          tone="dim"
        />
        <Metric label="Max error" value={num(metrics?.match.maxError, 2, ' mm')} />
        <Metric label="LED → target" value={num(metrics?.match.rmsLedToTarget, 2, ' mm')} tone="dim" />
        <Metric label="target → LED" value={num(metrics?.match.rmsTargetToLed, 2, ' mm')} tone="dim" />
      </Metrics>

      <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
        <span className="dim" style={{ fontSize: 11 }}>
          Heart Match
        </span>
        <b style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--led)' }}>
          {score.toFixed(1)} %
        </b>
      </div>
      <div className="progress">
        <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <div className="note">
        Display score only — <code>100·exp(−RMS/{CONFIG.scoreCharacteristicLength})</code>.
        Engineering decisions use the millimetre values above.
      </div>
    </Section>
  );
}

/** Objective breakdown, so the score is never a black box. */
export function ObjectivePanel({ metrics }: { metrics: MetricsType | null }) {
  if (!metrics) return null;
  const t = metrics.terms;
  return (
    <Section title="Objective Breakdown" defaultOpen={false}>
      <Metrics>
        <Metric label="J (total)" value={num(metrics.J, 4)} />
        <Metric label="w₁ · curve" value={num(t.curve, 4)} tone="dim" />
        <Metric label="w₂ · size" value={num(t.size, 4)} tone="dim" />
        <Metric label="w₃ · closure" value={num(t.closure, 4)} tone="dim" />
        <Metric label="w₄ · singularity" value={num(t.singularity, 4)} tone="dim" />
        <Metric label="w₅ · buildability" value={num(t.collision, 4)} tone="dim" />
        <Metric label="w₆ · ratio" value={num(t.ratio, 4)} tone="dim" />
        <Metric label="w₇ · gravity" value={num(t.gravity, 4)} tone="dim" />
      </Metrics>
      {metrics.rejectReason && <div className="banner bad">{metrics.rejectReason}</div>}
    </Section>
  );
}
