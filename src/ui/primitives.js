import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function Section({ title, children, defaultOpen = true, right, }) {
    const [open, setOpen] = useState(defaultOpen);
    return (_jsxs("div", { className: "section", children: [_jsxs("header", { onClick: () => setOpen((o) => !o), children: [_jsx("span", { className: `chev ${open ? 'open' : ''}`, children: "\u25B6" }), _jsx("h2", { children: title }), right] }), open && _jsx("div", { className: "body", children: children })] }));
}
export function Slider({ label, value, min, max, step = 1, unit = '', digits = 1, onChange, }) {
    return (_jsxs("div", { className: "slider", children: [_jsxs("div", { className: "head", children: [_jsx("span", { children: label }), _jsxs("b", { children: [value.toFixed(digits), unit] })] }), _jsx("input", { type: "range", min: min, max: max, step: step, value: value, onChange: (e) => onChange(Number(e.target.value)) })] }));
}
export function Check({ label, checked, onChange, }) {
    return (_jsxs("label", { className: "check", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => onChange(e.target.checked) }), label] }));
}
export function Metric({ label, value, tone, title, }) {
    return (_jsxs(_Fragment, { children: [_jsx("dt", { title: title ?? label, children: label }), _jsx("dd", { className: tone, children: value })] }));
}
export const Metrics = ({ children }) => (_jsx("dl", { className: "metrics", children: children }));
/** Format a number, degrading gracefully for NaN / Infinity. */
export function num(v, digits = 2, suffix = '') {
    if (v === undefined || v === null || !Number.isFinite(v))
        return '—';
    return `${v.toFixed(digits)}${suffix}`;
}
/** Scientific notation for the very small residuals. */
export function sci(v, digits = 2) {
    if (v === undefined || v === null || !Number.isFinite(v))
        return '—';
    if (v === 0)
        return '0';
    if (Math.abs(v) < 1e-4)
        return v.toExponential(digits);
    return v.toFixed(4);
}
