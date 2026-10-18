import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FAVORITES_LIMIT,
  designKey,
  isFavorite,
  newFavoriteId,
  renamed,
  withFavorite,
  withoutFavorite,
  type Favorite,
} from '../src/app/favorites';
import { OPTIMIZED_SPEC, storedDesign } from '../src/app/designPresets';
import { defaultSpec, paramLayout } from '../src/mechanism/spec';
import { buildGeometry } from '../src/mechanism/mechanism';
import { sweep } from '../src/kinematics/forwardSolver';
import { parseExtra, parseLayout, reorder, storageKeyFor } from '../src/ui/dock';
import { ROUTES, WORKSPACES, isWorkspace, parseHash } from '../src/app/router';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

const shipped = storedDesign(0)!;

const fav = (over: Partial<Favorite> = {}): Favorite => ({
  id: 'fabc12345',
  name: 'Test',
  spec: shipped.spec,
  params: shipped.params,
  target: null,
  summary: { links: 8, fullRotation: true, rms: 11.4, J: 1.2 },
  addedAt: '2026-10-13T00:00:00.000Z',
  ...over,
});

describe('favourite mechanisms store', () => {
  it('accepts a well-formed favourite', () => {
    expect(isFavorite(fav())).toBe(true);
  });

  it('rejects a parameter vector that does not fit its spec', () => {
    // Reinterpreting it against the wrong layout would draw a different
    // linkage under the saved name.
    expect(isFavorite(fav({ params: shipped.params.slice(1) }))).toBe(false);
    expect(isFavorite(fav({ spec: defaultSpec(2) }))).toBe(false);
  });

  it('rejects garbage from storage', () => {
    for (const v of [null, 1, 'x', [], {}, { ...fav(), params: [NaN] }, { ...fav(), id: '../x' }]) {
      expect(isFavorite(v)).toBe(false);
    }
  });

  it('does not add the same design twice, whatever it is called', () => {
    const a = fav();
    const b = fav({ id: 'fother000', name: 'Other name' });
    const list = withFavorite(withFavorite([], a), b);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Test');
  });

  it('keeps the newest first and stays bounded', () => {
    let list: Favorite[] = [];
    for (let i = 0; i < FAVORITES_LIMIT + 5; i++) {
      const params = shipped.params.slice();
      params[0] += i * 0.01;
      list = withFavorite(list, fav({ id: `f${i}`, params }));
    }
    expect(list).toHaveLength(FAVORITES_LIMIT);
    expect(list[0].id).toBe(`f${FAVORITES_LIMIT + 4}`);
  });

  it('removes and renames by id, ignoring a blank name', () => {
    const list = [fav()];
    expect(withoutFavorite(list, 'fabc12345')).toEqual([]);
    expect(renamed(list, 'fabc12345', '  New  ')[0].name).toBe('New');
    expect(renamed(list, 'fabc12345', '   ')[0].name).toBe('Test');
  });

  it('makes URL-safe ids for #/runner/<id> links', () => {
    for (let i = 0; i < 50; i++) {
      const id = newFavoriteId();
      expect(id).toMatch(/^f[a-z0-9]{8}$/);
      expect(parseHash(`#/runner/${id}`)).toEqual({ route: 'runner', anchor: id });
    }
  });

  it('identifies a design by size and parameters', () => {
    expect(designKey(OPTIMIZED_SPEC, shipped.params)).toBe(designKey(shipped.spec, shipped.params.slice()));
    const moved = shipped.params.slice();
    moved[2] += 1;
    expect(designKey(OPTIMIZED_SPEC, moved)).not.toBe(designKey(OPTIMIZED_SPEC, shipped.params));
  });

  it('can run a shipped favourite through a whole revolution', () => {
    // What the favourites card plays: the same solver, coarser sampling.
    const geo = buildGeometry(shipped.spec, shipped.params);
    expect(paramLayout(shipped.spec)).toHaveLength(shipped.params.length);
    const sw = sweep(geo, 180, { computeSigma: false });
    expect(sw.fullRotation).toBe(true);
    expect(sw.poses).toHaveLength(180);
  });
});

describe('panel layout', () => {
  it('keeps the designer on the key its layout was always saved under', () => {
    // Otherwise every existing arrangement would silently reset.
    expect(storageKeyFor('designer')).toBe('kreamet.dock');
    expect(storageKeyFor('runner')).toBe('kreamet.dock.runner');
    expect(new Set(WORKSPACES.map(storageKeyFor)).size).toBe(WORKSPACES.length);
  });

  it('drops values that are not a dock, so no panel can become unreachable', () => {
    expect(parseLayout({ a: 'left', b: 'floating', c: 3, d: 'hidden' })).toEqual({
      a: 'left',
      d: 'hidden',
    });
    for (const v of [null, 'x', [], 4]) expect(parseLayout(v)).toEqual({});
  });

  it('keeps floating as a dock, so a floated panel survives a reload', () => {
    expect(parseLayout({ a: 'float' })).toEqual({ a: 'float' });
  });

  it('reorders by dropping before a panel, or at the end', () => {
    const all = ['a', 'b', 'c', 'd'];
    expect(reorder([], all, 'c', 'a')).toEqual(['c', 'a', 'b', 'd']);
    expect(reorder([], all, 'a', null)).toEqual(['b', 'c', 'd', 'a']);
    expect(reorder(['d', 'c', 'b', 'a'], all, 'a', 'c')).toEqual(['d', 'a', 'c', 'b']);
    // Stale ids in a saved order are dropped, new ones join at the end.
    expect(reorder(['zz', 'b'], all, 'd', 'b')).toEqual(['d', 'b', 'a', 'c']);
  });

  it('drops malformed floating positions instead of placing a panel at NaN', () => {
    expect(parseExtra({ order: ['a', 3], pos: { a: { x: 10, y: 20 }, b: { x: 'x' }, c: null } })).toEqual({
      order: ['a'],
      pos: { a: { x: 10, y: 20 } },
    });
    expect(parseExtra(null)).toEqual({ order: [], pos: {} });
  });

  it('lets the panel menu control visibility, side and dockability of every panel', () => {
    const MENU = read('../src/ui/PanelLayoutMenu.tsx');
    expect(MENU).toMatch(/checked=\{at !== 'hidden'\}/);
    expect(MENU).toMatch(/<option value="left">/);
    expect(MENU).toMatch(/checked=\{dock\.isDockable\(p\.id\)\}/);
    expect(MENU).toMatch(/e\.key === 'Escape'/);
  });

  it('removes the header dock controls from a pinned panel', () => {
    const PRIMITIVES = read('../src/ui/primitives.tsx');
    expect(PRIMITIVES).toMatch(/draggable=\{slot\?\.dockable === true\}/);
    expect(PRIMITIVES).toMatch(/\{slot\?\.dockable && <DockControls/);
  });

  it('gives every workspace a starting place for every panel id it names', () => {
    const APP = read('../src/app/App.tsx');
    expect(APP).toMatch(/const WORKSPACE_DEFAULTS: Record<Workspace/);
    expect(APP).toMatch(/useDockLayout\(workspace\)/);
  });
});

describe('navigation', () => {
  it('has Designer (with Free Sketch in its menu), Optimiser, Runner and Favourite Mechanisms in that order', () => {
    expect(ROUTES.slice(0, 5)).toEqual(['designer', 'sketch', 'optimizer', 'runner', 'favorites']);
    const NAV = read('../src/ui/SiteNav.tsx');
    // Sketch is reached from the Design menu, not as a sixth top-level link.
    expect(NAV).toMatch(/ROUTES\.filter\(\(r\) => r !== 'sketch'\)/);
    expect(NAV).toMatch(/\{ r: 'sketch', label: 'nav\.sketch'/);
  });

  it('treats the three workbench views as one mounted app', () => {
    expect(WORKSPACES).toEqual(['designer', 'optimizer', 'runner']);
    expect(isWorkspace('favorites')).toBe(false);
    const SHELL = read('../src/app/Shell.tsx');
    expect(SHELL).toMatch(/if \(workbench\) return <App workspace=\{route\} anchor=\{anchor\} \/>/);
  });
});
