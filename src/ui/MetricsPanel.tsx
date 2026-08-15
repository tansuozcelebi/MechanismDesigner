import { CONFIG } from '../mechanism/config';
import type { Metrics as MetricsType } from '../synthesis/objective';
import type { Pose } from '../mechanism/types';
import type { Kinematics2 } from '../dynamics/velocity';
import type { TorqueBreakdown } from '../dynamics/torque';
import { radToDeg } from '../utils/math';
import { useT } from '../i18n';
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
  const t = useT();
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
    <Section title={t('live.title')}>
      {solverFailed && (
        <div className="banner bad">
          {t('canvas.solverFailed')}
          <br />
          {failureReason ?? '—'}
          <br />
          <span className="dim">{t('live.failedHint')}</span>
        </div>
      )}
      {assemblyJump && !solverFailed && (
        <div className="banner warn">{t('live.assemblyJump')}</div>
      )}

      <Metrics>
        <Metric label={t('live.motorAngle')} value={`${degrees.toFixed(2)}°`} />
        <Metric label={t('live.motorSpeed')} value={`${rpm.toFixed(0)} rpm`} />
        <Metric label={t('live.ledX')} value={num(pose?.led.x, 2, ' mm')} />
        <Metric label={t('live.ledY')} value={num(pose?.led.y, 2, ' mm')} />
        <Metric
          label={t('live.ledVelocity')}
          value={ledKin?.ok ? `${(ledKin.speed / 1000).toFixed(3)} m/s` : '—'}
        />
        <Metric
          label={t('live.ledAccel')}
          value={ledKin?.ok ? `${(ledKin.accelMagnitude / 1000).toFixed(2)} m/s²` : '—'}
        />
        <Metric
          label={t('live.gravityTorque')}
          value={num(gravityTau, 4, ' N·m')}
          title={t('live.gravityTorqueTip')}
        />
        <Metric
          label={t('live.motorTorque')}
          value={torque?.ok ? num(torque.total, 4, ' N·m') : '—'}
          title={t('live.motorTorqueTip')}
        />
        <Metric
          label={t('live.inertialPart')}
          value={torque?.ok ? num(torque.inertial, 4, ' N·m') : '—'}
          tone="dim"
        />
        <Metric
          label={t('live.reducedInertia')}
          value={torque?.ok ? `${torque.reducedInertia.toExponential(2)} kg·m²` : '—'}
          tone="dim"
        />
        <Metric
          label={t('live.trajectoryRms')}
          value={num(metrics?.match.chamferRms, 2, ' mm')}
          tone={
            !metrics
              ? 'dim'
              : metrics.match.chamferRms < 10
                ? 'good'
                : metrics.match.chamferRms < 25
                  ? 'warn'
                  : 'bad'
          }
        />
        <Metric label={t('live.minMu')} value={num(muNow, 2, '°')} tone={muTone} />
        <Metric
          label={t('live.singularity')}
          value={num(pose?.sigmaMin, 4)}
          tone={sigmaTone}
          title={t('live.singularityTip')}
        />
        <Metric
          label={t('live.loopClosure')}
          value={pose ? `${sci(pose.loopClosureError)} mm` : '—'}
          tone={closureTone}
        />
        <Metric
          label={t('live.interference')}
          value={collisionCount === 0 ? t('live.clear') : t('live.pairs', { n: collisionCount })}
          tone={collisionCount === 0 ? 'good' : 'bad'}
          title={t('live.interferenceTip')}
        />
        <Metric
          label={t('live.minGap')}
          value={Number.isFinite(minMemberDistance) ? num(minMemberDistance, 1, ' mm') : '—'}
          tone="dim"
        />
      </Metrics>
    </Section>
  );
}

/** Whole-cycle verification (brief §37, §44, §45). */
export function CyclePanel({ metrics }: { metrics: MetricsType | null }) {
  const t = useT();

  if (!metrics) {
    return (
      <Section title={t('cycle.title')}>
        <div className="note">{t('cycle.noSweep')}</div>
      </Section>
    );
  }

  const rot = metrics.fullRotation && metrics.validFrames === metrics.frames;
  const pathOk = metrics.pathClosure < CONFIG.pathClosureTol;
  const loopOk = metrics.maxLoopClosureError < CONFIG.loopClosureTol;

  return (
    <Section title={t('cycle.title')}>
      <div className="row wrap">
        <span className={`badge ${rot ? 'pass' : 'fail'}`}>
          {t(rot ? 'cycle.badge.rotationPass' : 'cycle.badge.rotationFail')}
        </span>
        <span className={`badge ${metrics.assemblyJumps === 0 ? 'pass' : 'fail'}`}>
          {t('cycle.badge.jumps', { n: metrics.assemblyJumps })}
        </span>
        <span className={`badge ${loopOk ? 'pass' : 'fail'}`}>
          {t(loopOk ? 'cycle.badge.closureOk' : 'cycle.badge.closureFail')}
        </span>
        <span className={`badge ${pathOk ? 'pass' : 'fail'}`}>
          {t(pathOk ? 'cycle.badge.pathClosed' : 'cycle.badge.pathOpen')}
        </span>
      </div>

      <Metrics>
        <Metric
          label={t('cycle.framesSolved')}
          value={`${metrics.validFrames} / ${metrics.frames}`}
          tone={rot ? 'good' : 'bad'}
        />
        <Metric
          label={t('cycle.maxLoopClosure')}
          value={`${sci(metrics.maxLoopClosureError)} mm`}
          tone={loopOk ? 'good' : 'bad'}
          title={t('cycle.toleranceTip', { n: CONFIG.loopClosureTol })}
        />
        <Metric
          label={t('cycle.pathClosure')}
          value={`${sci(metrics.pathClosure)} mm`}
          tone={pathOk ? 'good' : 'bad'}
          title={t('cycle.pathClosureTip')}
        />
        <Metric
          label={t('cycle.minMu')}
          value={num(metrics.minTransmissionAngle, 2, '°')}
          tone={metrics.minTransmissionAngle >= CONFIG.muHardMin ? 'good' : 'bad'}
        />
        <Metric
          label={t('cycle.effectiveMu')}
          value={num(metrics.effectiveTransmissionAngle, 2, '°')}
          tone={metrics.effectiveTransmissionAngle >= CONFIG.muHardMin ? 'good' : 'warn'}
          title={t('cycle.effectiveMuTip')}
        />
        <Metric
          label={t('cycle.singularity')}
          value={num(metrics.minSigma, 4)}
          tone={metrics.minSigma > CONFIG.singularityTol ? 'good' : 'warn'}
        />
        <Metric label={t('cycle.peakTorque')} value={num(metrics.peakGravityTorque, 4, ' N·m')} />
      </Metrics>
    </Section>
  );
}

/** Target vs. achieved geometry (brief §37). */
export function TargetPanel({ metrics }: { metrics: MetricsType | null }) {
  const t = useT();
  const score = metrics?.heartMatchPercent ?? 0;

  return (
    <Section title={t('target.title')}>
      <Metrics>
        <Metric
          label={t('target.width')}
          value={`${CONFIG.targetWidth.toFixed(2)} mm`}
          tone="dim"
        />
        <Metric
          label={t('target.height')}
          value={`${CONFIG.targetHeight.toFixed(2)} mm`}
          tone="dim"
        />
        <Metric
          label={t('target.actualWidth')}
          value={num(metrics?.width, 2, ' mm')}
          tone={metrics && Math.abs(metrics.width - CONFIG.targetWidth) < 25 ? 'good' : 'warn'}
        />
        <Metric
          label={t('target.actualHeight')}
          value={num(metrics?.height, 2, ' mm')}
          tone={metrics && Math.abs(metrics.height - CONFIG.targetHeight) < 25 ? 'good' : 'warn'}
        />
        <Metric label={t('target.rmsChamfer')} value={num(metrics?.match.chamferRms, 2, ' mm')} />
        <Metric
          label={t('target.rmsParam')}
          value={num(metrics?.match.paramRms, 2, ' mm')}
          tone="dim"
        />
        <Metric label={t('target.maxError')} value={num(metrics?.match.maxError, 2, ' mm')} />
        <Metric
          label={t('target.ledToTarget')}
          value={num(metrics?.match.rmsLedToTarget, 2, ' mm')}
          tone="dim"
        />
        <Metric
          label={t('target.targetToLed')}
          value={num(metrics?.match.rmsTargetToLed, 2, ' mm')}
          tone="dim"
        />
      </Metrics>

      <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
        <span className="dim" style={{ fontSize: 11 }}>
          {t('target.heartMatch')}
        </span>
        <b style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--led)' }}>
          {score.toFixed(1)} %
        </b>
      </div>
      <div className="progress">
        <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <div className="note">{t('target.scoreNote', { n: CONFIG.scoreCharacteristicLength })}</div>
    </Section>
  );
}

/** Objective breakdown, so the score is never a black box. */
export function ObjectivePanel({ metrics }: { metrics: MetricsType | null }) {
  const t = useT();
  if (!metrics) return null;
  const terms = metrics.terms;

  return (
    <Section title={t('objective.title')} defaultOpen={false}>
      <Metrics>
        <Metric label={t('objective.total')} value={num(metrics.J, 4)} />
        <Metric label={t('objective.curve')} value={num(terms.curve, 4)} tone="dim" />
        <Metric label={t('objective.size')} value={num(terms.size, 4)} tone="dim" />
        <Metric label={t('objective.closure')} value={num(terms.closure, 4)} tone="dim" />
        <Metric label={t('objective.singularity')} value={num(terms.singularity, 4)} tone="dim" />
        <Metric label={t('objective.buildability')} value={num(terms.collision, 4)} tone="dim" />
        <Metric label={t('objective.ratio')} value={num(terms.ratio, 4)} tone="dim" />
        <Metric label={t('objective.gravity')} value={num(terms.gravity, 4)} tone="dim" />
      </Metrics>
      {metrics.rejectReason && <div className="banner bad">{metrics.rejectReason}</div>}
    </Section>
  );
}
