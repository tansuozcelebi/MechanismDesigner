import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPACT_QUERY } from '../src/ui/useMediaQuery';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

const CSS = read('../src/ui/styles.css');
const APP = read('../src/app/App.tsx');
const PRIMITIVES = read('../src/ui/primitives.tsx');

/** The `@media` blocks in the stylesheet, as their raw query text. */
const mediaQueries = [...CSS.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim());

describe('compact layout', () => {
  it('uses the same breakpoint in CSS as in JavaScript', () => {
    // The drift this catches is silent and confusing: move the CSS breakpoint
    // without moving COMPACT_QUERY and there is a band of widths where the
    // drawer toggles are on screen while the sidebars are still in the grid —
    // buttons that open a panel which is already open — or the reverse, panels
    // off-canvas with nothing to open them.
    expect(mediaQueries).toContain(COMPACT_QUERY);
  });

  it('gives the canvas a column of its own below the breakpoint', () => {
    // The bug: three fixed columns (336px + 300px) on a 390px phone left the
    // canvas with zero width and the document scrolling 588px sideways.
    const block = CSS.slice(CSS.indexOf(`@media ${COMPACT_QUERY}`));
    expect(block).toMatch(/grid-template-columns:\s*1fr/);
    expect(block).toMatch(/'canvas'/);
  });

  it('takes a closed drawer out of the tab order, not just out of sight', () => {
    // `opacity: 0` or a bare off-screen transform would leave ~50 controls
    // focusable behind the canvas. `visibility: hidden` actually removes them.
    const block = CSS.slice(CSS.indexOf(`@media ${COMPACT_QUERY}`));
    expect(block).toMatch(/\.app\.compact \.sidebar\s*\{[^}]*visibility:\s*hidden/);
    expect(block).toMatch(/\.app\.compact \.sidebar\.open\s*\{[^}]*visibility:\s*visible/);
  });

  it('mounts the drawer toggles only in the compact layout', () => {
    // Rendered unconditionally and hidden with CSS, they would stay in the tab
    // order and the accessibility tree on a desktop, where the panels they
    // open are already on screen.
    expect(APP).toMatch(/\{compact && \(\s*<div className="panel-toggles">/);
  });

  it('keeps the drawer state consistent with the layout', () => {
    // Widening the window returns the sidebars to the grid; a drawer left open
    // would then sit over the canvas with no way to dismiss it.
    expect(APP).toMatch(/if \(!compact\) setDrawer\(null\)/);
  });

  it('closes a drawer with Escape and with the backdrop', () => {
    expect(APP).toMatch(/e\.key === 'Escape'/);
    expect(APP).toMatch(/className="drawer-backdrop" onClick=\{\(\) => setDrawer\(null\)\}/);
  });

  it('opens at most one drawer at a time', () => {
    // Two open at once would cover the canvas they annotate from both sides.
    expect(APP).toMatch(/useState<'left' \| 'right' \| null>\(null\)/);
  });

  it('keeps the design actions reachable after the header drops them', () => {
    // Below 560px the header has no room for the badge and the two buttons, so
    // they move into the drawer. Hiding them without that would remove Export
    // from the phone UI altogether.
    expect(CSS).toMatch(/\.sitenav-actions \.badge,\s*\n\s*\.sitenav-actions button \{\s*\n\s*display: none/);
    expect(APP).toMatch(/className="drawer-actions"/);
  });

  it('lets the nav scroll rather than dropping routes', () => {
    const block = CSS.slice(CSS.indexOf(`@media ${COMPACT_QUERY}`));
    expect(block).toMatch(/\.sitenav\s*\{[^}]*overflow-x:\s*auto/);
  });

  it('gives the toggles a touch-sized target', () => {
    const block = CSS.slice(CSS.indexOf(`@media ${COMPACT_QUERY}`));
    expect(block).toMatch(/\.panel-toggles button\s*\{[^}]*min-height:\s*44px/);
  });
});

describe('section groups', () => {
  it('drives sections from a command, not from a shared open flag', () => {
    // Keyed on `stamp` so that "collapse all" closes a section the reader has
    // since reopened by hand, instead of silently doing nothing because the
    // group's state already reads `false`.
    expect(PRIMITIVES).toMatch(/stamp: number; open: boolean/);
    expect(PRIMITIVES).toMatch(/if \(!group \|\| group\.stamp === seen\.current\) return/);
  });

  it('wraps both sidebars so one control collapses either one', () => {
    expect(APP.match(/<SectionGroup command=\{groupCommand\}>/g)).toHaveLength(2);
  });

  it('leaves each section independently collapsible', () => {
    // The group is an addition, not a replacement: the per-panel chevron has
    // to keep working.
    expect(PRIMITIVES).toMatch(/onClick=\{\(\) => setOpen\(\(o\) => !o\)\}/);
  });

  it('makes the section header operable from the keyboard', () => {
    expect(PRIMITIVES).toMatch(/aria-expanded=\{open\}/);
    expect(PRIMITIVES).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
  });
});
