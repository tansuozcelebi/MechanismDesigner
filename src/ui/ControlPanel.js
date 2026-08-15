import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CONFIG } from '../mechanism/config';
import { DESIGN_KEYS } from '../mechanism/types';
import { BOUNDS, designToArray } from '../mechanism/mechanism';
import { useT } from '../i18n';
import { Check, Section, Slider, num } from './primitives';
export function DisplayPanel({ display, onDisplay, debugOptions, onDebugOptions, onClearTrail, onFullPath, onFitView, }) {
    const t = useT();
    const set = (k, v) => onDisplay({ ...display, [k]: v });
    const setDbg = (k, v) => onDebugOptions({ ...debugOptions, [k]: v });
    return (_jsxs(Section, { title: t('display.title'), children: [_jsxs("div", { className: "row wrap", children: [_jsx(Check, { label: t('display.grid'), checked: display.grid, onChange: (v) => set('grid', v) }), _jsx(Check, { label: t('display.showTarget'), checked: display.target, onChange: (v) => set('target', v) }), _jsx(Check, { label: t('display.showTrail'), checked: display.trail, onChange: (v) => set('trail', v) }), _jsx(Check, { label: t('display.debug'), checked: display.debug, onChange: (v) => set('debug', v) })] }), display.debug && (_jsxs("div", { className: "row wrap", style: { paddingLeft: 6 }, children: [_jsx(Check, { label: t('display.dbg.names'), checked: debugOptions.names, onChange: (v) => setDbg('names', v) }), _jsx(Check, { label: t('display.dbg.coords'), checked: debugOptions.coordinates, onChange: (v) => setDbg('coordinates', v) }), _jsx(Check, { label: t('display.dbg.loops'), checked: debugOptions.loops, onChange: (v) => setDbg('loops', v) }), _jsx(Check, { label: t('display.dbg.com'), checked: debugOptions.com, onChange: (v) => setDbg('com', v) }), _jsx(Check, { label: t('display.dbg.velocity'), checked: debugOptions.velocity, onChange: (v) => setDbg('velocity', v) }), _jsx(Check, { label: t('display.dbg.gravity'), checked: debugOptions.gravity, onChange: (v) => setDbg('gravity', v) }), _jsx(Check, { label: t('display.dbg.mu'), checked: debugOptions.transmission, onChange: (v) => setDbg('transmission', v) })] })), _jsxs("div", { className: "row wrap", children: [_jsx("button", { onClick: onClearTrail, children: t('display.clearTrail') }), _jsx("button", { onClick: onFullPath, children: t('display.fullPath') }), _jsx("button", { onClick: onFitView, children: t('display.fitView') })] }), _jsx("div", { className: "note", children: t('display.hint') })] }));
}
export function MotorPanel({ rpm, onRpm, gravityOn, onGravity, playing, }) {
    const t = useT();
    const omega = (2 * Math.PI * rpm) / 60;
    return (_jsxs(Section, { title: t('motor.title'), children: [_jsx(Slider, { label: t('motor.speed'), value: rpm, min: CONFIG.rpmMin, max: CONFIG.rpmMax, step: 1, unit: " rpm", digits: 0, onChange: onRpm }), _jsxs("div", { className: "row", style: { justifyContent: 'space-between' }, children: [_jsx("span", { className: "note", children: t('motor.omegaFormula') }), _jsxs("span", { className: "note", style: { fontFamily: 'var(--mono)' }, children: [omega.toFixed(3), " rad/s"] })] }), _jsxs("div", { className: "row", children: [_jsx(Check, { label: t('motor.gravityOn'), checked: gravityOn, onChange: onGravity }), _jsx("span", { className: "note", children: t('motor.gravityVector') })] }), _jsxs("div", { className: "note", children: [t(playing ? 'motor.playing' : 'motor.paused'), " ", t('motor.oneRev')] })] }));
}
/** Live design vector, editable (brief §51 formatting: two decimals). */
export function DesignPanel({ design, label, onChange, onExport, }) {
    const t = useT();
    const arr = designToArray(design);
    const update = (i, v) => {
        const next = arr.slice();
        next[i] = v;
        const d = { ...design };
        DESIGN_KEYS.forEach((k, j) => {
            d[k] = next[j];
        });
        onChange(d);
    };
    return (_jsxs(Section, { title: t('design.title', { label }), defaultOpen: false, children: [_jsx("div", { className: "note", children: t('design.fixedNote', {
                    a: CONFIG.O2O4,
                    b: CONFIG.O4O6,
                    c: CONFIG.crankLength,
                }) }), DESIGN_KEYS.map((k, i) => {
                const [lo, hi] = BOUNDS[k];
                const isAngle = k === 'phi6' || k.endsWith('a');
                return (_jsx(Slider, { label: `${k} (${isAngle ? '°' : 'mm'})`, value: arr[i], min: lo, max: hi, step: 0.5, digits: 2, onChange: (v) => update(i, v) }, k));
            }), _jsx("button", { onClick: onExport, children: t('design.export') })] }));
}
/** Final numeric report (brief §51). */
export function GeometryReport({ design, pivots, members, label, }) {
    const t = useT();
    return (_jsxs(Section, { title: t('design.geometryTitle', { label }), defaultOpen: false, children: [_jsx("table", { children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: "O2" }), _jsxs("td", { children: ["(", pivots.O2.x.toFixed(2), ", ", pivots.O2.y.toFixed(2), ")"] })] }), _jsxs("tr", { children: [_jsx("td", { children: "O4" }), _jsxs("td", { children: ["(", pivots.O4.x.toFixed(2), ", ", pivots.O4.y.toFixed(2), ")"] })] }), _jsxs("tr", { children: [_jsx("td", { children: "O6" }), _jsxs("td", { children: ["(", pivots.O6.x.toFixed(2), ", ", pivots.O6.y.toFixed(2), ")"] })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u03C6\u2086" }), _jsxs("td", { children: [design.phi6.toFixed(2), "\u00B0"] })] })] }) }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('links.member') }), _jsx("th", { children: t('design.lengthMm') })] }) }), _jsx("tbody", { children: members.map((m) => (_jsxs("tr", { children: [_jsxs("td", { children: [m.linkId, ": ", m.from, "\u2013", m.to] }), _jsx("td", { children: num(m.length, 2) })] }, `${m.linkId}-${m.from}-${m.to}`))) })] })] }));
}
