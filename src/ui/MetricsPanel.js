import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CONFIG } from '../mechanism/config';
import { radToDeg } from '../utils/math';
import { useT } from '../i18n';
import { Metric, Metrics, Section, num, sci } from './primitives';
/** Live instrument readout for the current instant (brief §35). */
export function LivePanel({ pose, theta, rpm, ledKin, gravityTau, torque, collisionCount, minMemberDistance, solverFailed, failureReason, assemblyJump, metrics, }) {
    const t = useT();
    const muNow = pose ? Math.min(...pose.transmissionAngles) : NaN;
    const muTone = !pose
        ? 'dim'
        : muNow < CONFIG.muHardMin || muNow > CONFIG.muHardMax
            ? 'bad'
            : muNow < CONFIG.muGoodMin || muNow > CONFIG.muGoodMax
                ? 'warn'
                : 'good';
    const sigmaTone = !pose
        ? 'dim'
        : pose.sigmaMin < CONFIG.singularityTol * 0.3
            ? 'bad'
            : pose.sigmaMin < CONFIG.singularityTol
                ? 'warn'
                : 'good';
    const closureTone = !pose
        ? 'dim'
        : pose.loopClosureError < CONFIG.loopClosureTol
            ? 'good'
            : 'bad';
    const degrees = ((radToDeg(theta) % 360) + 360) % 360;
    return (_jsxs(Section, { title: t('live.title'), children: [solverFailed && (_jsxs("div", { className: "banner bad", children: [t('canvas.solverFailed'), _jsx("br", {}), failureReason ?? '—', _jsx("br", {}), _jsx("span", { className: "dim", children: t('live.failedHint') })] })), assemblyJump && !solverFailed && (_jsx("div", { className: "banner warn", children: t('live.assemblyJump') })), _jsxs(Metrics, { children: [_jsx(Metric, { label: t('live.motorAngle'), value: `${degrees.toFixed(2)}°` }), _jsx(Metric, { label: t('live.motorSpeed'), value: `${rpm.toFixed(0)} rpm` }), _jsx(Metric, { label: t('live.ledX'), value: num(pose?.led.x, 2, ' mm') }), _jsx(Metric, { label: t('live.ledY'), value: num(pose?.led.y, 2, ' mm') }), _jsx(Metric, { label: t('live.ledVelocity'), value: ledKin?.ok ? `${(ledKin.speed / 1000).toFixed(3)} m/s` : '—' }), _jsx(Metric, { label: t('live.ledAccel'), value: ledKin?.ok ? `${(ledKin.accelMagnitude / 1000).toFixed(2)} m/s²` : '—' }), _jsx(Metric, { label: t('live.gravityTorque'), value: num(gravityTau, 4, ' N·m'), title: t('live.gravityTorqueTip') }), _jsx(Metric, { label: t('live.motorTorque'), value: torque?.ok ? num(torque.total, 4, ' N·m') : '—', title: t('live.motorTorqueTip') }), _jsx(Metric, { label: t('live.inertialPart'), value: torque?.ok ? num(torque.inertial, 4, ' N·m') : '—', tone: "dim" }), _jsx(Metric, { label: t('live.reducedInertia'), value: torque?.ok ? `${torque.reducedInertia.toExponential(2)} kg·m²` : '—', tone: "dim" }), _jsx(Metric, { label: t('live.trajectoryRms'), value: num(metrics?.match.chamferRms, 2, ' mm'), tone: !metrics
                            ? 'dim'
                            : metrics.match.chamferRms < 10
                                ? 'good'
                                : metrics.match.chamferRms < 25
                                    ? 'warn'
                                    : 'bad' }), _jsx(Metric, { label: t('live.minMu'), value: num(muNow, 2, '°'), tone: muTone }), _jsx(Metric, { label: t('live.singularity'), value: num(pose?.sigmaMin, 4), tone: sigmaTone, title: t('live.singularityTip') }), _jsx(Metric, { label: t('live.loopClosure'), value: pose ? `${sci(pose.loopClosureError)} mm` : '—', tone: closureTone }), _jsx(Metric, { label: t('live.interference'), value: collisionCount === 0 ? t('live.clear') : t('live.pairs', { n: collisionCount }), tone: collisionCount === 0 ? 'good' : 'bad', title: t('live.interferenceTip') }), _jsx(Metric, { label: t('live.minGap'), value: Number.isFinite(minMemberDistance) ? num(minMemberDistance, 1, ' mm') : '—', tone: "dim" })] })] }));
}
/** Whole-cycle verification (brief §37, §44, §45). */
export function CyclePanel({ metrics }) {
    const t = useT();
    if (!metrics) {
        return (_jsx(Section, { title: t('cycle.title'), children: _jsx("div", { className: "note", children: t('cycle.noSweep') }) }));
    }
    const rot = metrics.fullRotation && metrics.validFrames === metrics.frames;
    const pathOk = metrics.pathClosure < CONFIG.pathClosureTol;
    const loopOk = metrics.maxLoopClosureError < CONFIG.loopClosureTol;
    return (_jsxs(Section, { title: t('cycle.title'), children: [_jsxs("div", { className: "row wrap", children: [_jsx("span", { className: `badge ${rot ? 'pass' : 'fail'}`, children: t(rot ? 'cycle.badge.rotationPass' : 'cycle.badge.rotationFail') }), _jsx("span", { className: `badge ${metrics.assemblyJumps === 0 ? 'pass' : 'fail'}`, children: t('cycle.badge.jumps', { n: metrics.assemblyJumps }) }), _jsx("span", { className: `badge ${loopOk ? 'pass' : 'fail'}`, children: t(loopOk ? 'cycle.badge.closureOk' : 'cycle.badge.closureFail') }), _jsx("span", { className: `badge ${pathOk ? 'pass' : 'fail'}`, children: t(pathOk ? 'cycle.badge.pathClosed' : 'cycle.badge.pathOpen') })] }), _jsxs(Metrics, { children: [_jsx(Metric, { label: t('cycle.framesSolved'), value: `${metrics.validFrames} / ${metrics.frames}`, tone: rot ? 'good' : 'bad' }), _jsx(Metric, { label: t('cycle.maxLoopClosure'), value: `${sci(metrics.maxLoopClosureError)} mm`, tone: loopOk ? 'good' : 'bad', title: t('cycle.toleranceTip', { n: CONFIG.loopClosureTol }) }), _jsx(Metric, { label: t('cycle.pathClosure'), value: `${sci(metrics.pathClosure)} mm`, tone: pathOk ? 'good' : 'bad', title: t('cycle.pathClosureTip') }), _jsx(Metric, { label: t('cycle.minMu'), value: num(metrics.minTransmissionAngle, 2, '°'), tone: metrics.minTransmissionAngle >= CONFIG.muHardMin ? 'good' : 'bad' }), _jsx(Metric, { label: t('cycle.effectiveMu'), value: num(metrics.effectiveTransmissionAngle, 2, '°'), tone: metrics.effectiveTransmissionAngle >= CONFIG.muHardMin ? 'good' : 'warn', title: t('cycle.effectiveMuTip') }), _jsx(Metric, { label: t('cycle.singularity'), value: num(metrics.minSigma, 4), tone: metrics.minSigma > CONFIG.singularityTol ? 'good' : 'warn' }), _jsx(Metric, { label: t('cycle.peakTorque'), value: num(metrics.peakGravityTorque, 4, ' N·m') })] })] }));
}
/** Target vs. achieved geometry (brief §37). */
export function TargetPanel({ metrics }) {
    const t = useT();
    const score = metrics?.heartMatchPercent ?? 0;
    return (_jsxs(Section, { title: t('target.title'), children: [_jsxs(Metrics, { children: [_jsx(Metric, { label: t('target.width'), value: `${CONFIG.targetWidth.toFixed(2)} mm`, tone: "dim" }), _jsx(Metric, { label: t('target.height'), value: `${CONFIG.targetHeight.toFixed(2)} mm`, tone: "dim" }), _jsx(Metric, { label: t('target.actualWidth'), value: num(metrics?.width, 2, ' mm'), tone: metrics && Math.abs(metrics.width - CONFIG.targetWidth) < 25 ? 'good' : 'warn' }), _jsx(Metric, { label: t('target.actualHeight'), value: num(metrics?.height, 2, ' mm'), tone: metrics && Math.abs(metrics.height - CONFIG.targetHeight) < 25 ? 'good' : 'warn' }), _jsx(Metric, { label: t('target.rmsChamfer'), value: num(metrics?.match.chamferRms, 2, ' mm') }), _jsx(Metric, { label: t('target.rmsParam'), value: num(metrics?.match.paramRms, 2, ' mm'), tone: "dim" }), _jsx(Metric, { label: t('target.maxError'), value: num(metrics?.match.maxError, 2, ' mm') }), _jsx(Metric, { label: t('target.ledToTarget'), value: num(metrics?.match.rmsLedToTarget, 2, ' mm'), tone: "dim" }), _jsx(Metric, { label: t('target.targetToLed'), value: num(metrics?.match.rmsTargetToLed, 2, ' mm'), tone: "dim" })] }), _jsxs("div", { className: "row", style: { gap: 10, alignItems: 'baseline' }, children: [_jsx("span", { className: "dim", style: { fontSize: 11 }, children: t('target.heartMatch') }), _jsxs("b", { style: { fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--led)' }, children: [score.toFixed(1), " %"] })] }), _jsx("div", { className: "progress", children: _jsx("i", { style: { width: `${Math.max(0, Math.min(100, score))}%` } }) }), _jsx("div", { className: "note", children: t('target.scoreNote', { n: CONFIG.scoreCharacteristicLength }) })] }));
}
/** Objective breakdown, so the score is never a black box. */
export function ObjectivePanel({ metrics }) {
    const t = useT();
    if (!metrics)
        return null;
    const terms = metrics.terms;
    return (_jsxs(Section, { title: t('objective.title'), defaultOpen: false, children: [_jsxs(Metrics, { children: [_jsx(Metric, { label: t('objective.total'), value: num(metrics.J, 4) }), _jsx(Metric, { label: t('objective.curve'), value: num(terms.curve, 4), tone: "dim" }), _jsx(Metric, { label: t('objective.size'), value: num(terms.size, 4), tone: "dim" }), _jsx(Metric, { label: t('objective.closure'), value: num(terms.closure, 4), tone: "dim" }), _jsx(Metric, { label: t('objective.singularity'), value: num(terms.singularity, 4), tone: "dim" }), _jsx(Metric, { label: t('objective.buildability'), value: num(terms.collision, 4), tone: "dim" }), _jsx(Metric, { label: t('objective.ratio'), value: num(terms.ratio, 4), tone: "dim" }), _jsx(Metric, { label: t('objective.gravity'), value: num(terms.gravity, 4), tone: "dim" })] }), metrics.rejectReason && _jsx("div", { className: "banner bad", children: metrics.rejectReason })] }));
}
