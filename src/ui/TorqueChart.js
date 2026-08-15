import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { THEME } from '../rendering/theme';
import { useT } from '../i18n';
/**
 * Gravity-torque profile over one revolution (brief §22).
 * Plain inline SVG — no charting dependency (brief §53).
 */
export function TorqueChart({ samples, cursorTheta, height = 78, }) {
    const t = useT();
    const view = useMemo(() => {
        const finite = samples.filter((s) => Number.isFinite(s.tau));
        if (finite.length < 2)
            return null;
        const peak = Math.max(...finite.map((s) => Math.abs(s.tau)), 1e-6);
        const W = 300;
        const H = height;
        const pad = 4;
        const toX = (t) => (t / (2 * Math.PI)) * W;
        const toY = (v) => H / 2 - (v / peak) * (H / 2 - pad);
        const d = finite
            .map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.theta).toFixed(2)},${toY(s.tau).toFixed(2)}`)
            .join(' ');
        return { d, peak, W, H, toX, toY };
    }, [samples, height]);
    if (!view)
        return _jsx("div", { className: "note", children: t('torque.unavailable') });
    const cursorX = view.toX(((cursorTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
    const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    return (_jsxs("div", { children: [_jsxs("svg", { className: "chart", viewBox: `0 0 ${view.W} ${view.H}`, preserveAspectRatio: "none", children: [_jsx("line", { x1: 0, y1: view.H / 2, x2: view.W, y2: view.H / 2, stroke: hex(THEME.axis), strokeWidth: 1 }), [0.25, 0.5, 0.75].map((f) => (_jsx("line", { x1: view.W * f, y1: 0, x2: view.W * f, y2: view.H, stroke: hex(THEME.grid), strokeWidth: 1 }, f))), _jsx("path", { d: view.d, fill: "none", stroke: hex(THEME.com), strokeWidth: 1.5 }), _jsx("line", { x1: cursorX, y1: 0, x2: cursorX, y2: view.H, stroke: hex(THEME.led), strokeWidth: 1.2 })] }), _jsxs("div", { className: "row", style: { justifyContent: 'space-between' }, children: [_jsx("span", { className: "note", children: "0\u00B0" }), _jsx("span", { className: "note", children: t('torque.peak', { n: view.peak.toFixed(4) }) }), _jsx("span", { className: "note", children: "360\u00B0" })] })] }));
}
