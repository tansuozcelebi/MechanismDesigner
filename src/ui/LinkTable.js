import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CONFIG } from '../mechanism/config';
import { LINKS } from '../mechanism/topology';
import { poseMassProperties } from '../dynamics/massProperties';
import { angleOf, radToDeg, sub } from '../utils/math';
import { useT } from '../i18n';
import { Section, num } from './primitives';
/**
 * Live link table (brief §36).  Lengths are constant by construction — they are
 * the rigid-body dimensions — while the body angles update every frame.
 */
export function LinkTable({ geo, pose, collidingLinks, layerOf, }) {
    const t = useT();
    const props = pose ? poseMassProperties(geo, pose) : [];
    const massOf = new Map(props.map((p) => [p.linkId, p.mass]));
    const at = (id) => {
        if (!pose)
            return null;
        return id === 'P_LED' ? pose.led : pose.joints[id];
    };
    const rows = geo.members.map((m) => {
        const link = LINKS.find((l) => l.id === m.linkId);
        const a = at(m.from);
        const b = at(m.to);
        const ang = a && b ? radToDeg(angleOf(sub(b, a))) : NaN;
        return { m, link, ang };
    });
    return (_jsxs(Section, { title: t('links.title'), children: [_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('links.member') }), _jsx("th", { children: t('links.length') }), _jsx("th", { children: t('links.angle') }), _jsx("th", { children: t('links.mass') }), _jsx("th", { children: t('links.layer') })] }) }), _jsx("tbody", { children: rows.map(({ m, link, ang }, i) => {
                            const cls = [
                                link.role === 'input' ? 'input' : '',
                                link.role === 'output' ? 'output' : '',
                                collidingLinks.has(m.linkId) ? 'collide' : '',
                            ]
                                .filter(Boolean)
                                .join(' ');
                            // Mass is a property of the whole rigid body, shown on its first row.
                            const first = rows.findIndex((r) => r.m.linkId === m.linkId) === i;
                            return (_jsxs("tr", { className: cls, children: [_jsxs("td", { children: [m.linkId, ": ", m.from, "\u2013", m.to] }), _jsx("td", { children: num(m.length, 2) }), _jsx("td", { children: num(ang, 1, '°') }), _jsx("td", { className: "dim", children: first ? num((massOf.get(m.linkId) ?? 0) * 1000, 1, ' g') : '' }), _jsx("td", { className: "dim", children: first ? (layerOf?.[m.linkId] ?? '—') : '' })] }, `${m.linkId}-${m.from}-${m.to}`));
                        }) })] }), _jsx("div", { className: "note", children: t('links.note', { min: CONFIG.Lmin, max: CONFIG.Lmax }) })] }));
}
/** Topology + mobility readout (brief §5). */
export function TopologyPanel({ mobility, loopCount, loops, }) {
    const t = useT();
    return (_jsxs(Section, { title: t('topology.title'), defaultOpen: false, children: [_jsxs("div", { className: "row wrap", children: [_jsx("span", { className: `badge ${mobility === 1 ? 'pass' : 'fail'}`, children: t('topology.mobility', { n: mobility }) }), _jsx("span", { className: "badge info", children: t('topology.loops', { n: loopCount }) }), _jsx("span", { className: "badge info", children: t('topology.counts') })] }), _jsxs("div", { className: "note", style: { fontFamily: 'var(--mono)', fontSize: 10.5 }, children: ["M = 3(n\u22121) \u2212 2j\u2081 \u2212 j\u2082 = 3(8\u22121) \u2212 2(10) \u2212 0 = ", _jsx("b", { children: "1" })] }), _jsx("div", { className: "note", style: { fontFamily: 'var(--mono)', fontSize: 10 }, children: loops.map((l) => (_jsx("div", { children: l }, l))) }), _jsx("div", { className: "note", children: t('topology.note') })] }));
}
