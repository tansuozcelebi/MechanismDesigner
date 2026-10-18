import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Where a panel lives.
 *
 * Panels are docked rather than fixed, because which ones matter depends
 * entirely on what you are doing: someone tuning link lengths wants the design
 * panels and the inspector side by side, and someone reading optimiser output
 * wants the results dock to itself. The arrangement is the reader's, so it is
 * remembered.
 */
export type Dock = 'left' | 'right' | 'float' | 'hidden';

export const DOCKS: Dock[] = ['left', 'right', 'float', 'hidden'];

export type DockLayout = Record<string, Dock>;

/**
 * Where a floating panel sits over the canvas, in pixels from the canvas's
 * top-left corner. Clamped when drawn, so a position saved on a wide monitor
 * cannot leave a panel stranded off the edge of a laptop screen.
 */
export type FloatPos = { x: number; y: number };

/** The drag payload: which panel, and where inside it the pointer grabbed it. */
export const DRAG_TYPE = 'text/kreamet-panel';
export const DRAG_OFFSET_TYPE = 'text/kreamet-offset';

/**
 * Each workspace keeps its own arrangement. The designer's key is the one the
 * layout has always been saved under, so an existing arrangement survives the
 * introduction of workspaces instead of silently resetting.
 */
export const storageKeyFor = (scope: string): string =>
  scope === 'designer' ? 'kreamet.dock' : `kreamet.dock.${scope}`;

/**
 * Panels pinned in place: no drag handle, no move or hide buttons. Shared by
 * every workspace, because whether a panel should be movable is a property of
 * how the reader works with it, not of which view it is in.
 */
const FIXED_KEY = 'kreamet.dock.fixed';

/** Order and floating positions are per workspace, next to the layout itself. */
const extraKeyFor = (scope: string): string => `${storageKeyFor(scope)}.extra`;

type Extra = { order: string[]; pos: Record<string, FloatPos> };

export const parseExtra = (v: unknown): Extra => {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Extra>;
  const order = Array.isArray(o.order) ? o.order.filter((x): x is string => typeof x === 'string') : [];
  const pos: Record<string, FloatPos> = {};
  if (o.pos && typeof o.pos === 'object') {
    for (const [k, p] of Object.entries(o.pos as Record<string, unknown>)) {
      const q = p as Partial<FloatPos>;
      if (q && Number.isFinite(q.x) && Number.isFinite(q.y)) pos[k] = { x: q.x as number, y: q.y as number };
    }
  }
  return { order, pos };
};

/**
 * Move `id` to sit just before `before` (or to the end when `before` is null),
 * within an order that may not mention every panel yet. Unmentioned panels
 * keep their registration order, so a fresh layout reorders predictably.
 */
export function reorder(order: string[], all: string[], id: string, before: string | null): string[] {
  const full = [...order.filter((x) => all.includes(x)), ...all.filter((x) => !order.includes(x))];
  const rest = full.filter((x) => x !== id);
  const i = before === null ? -1 : rest.indexOf(before);
  if (i < 0) rest.push(id);
  else rest.splice(i, 0, id);
  return rest;
}

/* ------------------------------------------------------------------ */
/* Layout state                                                        */
/* ------------------------------------------------------------------ */

export type DockApi = {
  layout: DockLayout;
  /** Where a panel sits, falling back to the default it was registered with. */
  dockOf: (id: string, fallback: Dock) => Dock;
  move: (id: string, dock: Dock) => void;
  /** Move several panels in one update, so "hide all" is one render and one write. */
  moveMany: (moves: Record<string, Dock>) => void;
  reset: () => void;
  /** True when the reader has moved anything, so "reset" can be offered only then. */
  customised: boolean;
  /** Panel ids in display order (docks top to bottom, floats back to front). */
  order: string[];
  /** Move `id` to just before `before` in the display order (null = last). */
  placeBefore: (id: string, before: string | null, all: string[]) => void;
  floatPos: (id: string) => FloatPos | undefined;
  /** Float a panel at a position, bringing it to the front. */
  floatAt: (id: string, pos: FloatPos, all: string[]) => void;
  /** Whether a panel can be dragged, moved and hidden from its own header. */
  isDockable: (id: string) => boolean;
  setDockable: (ids: string[], dockable: boolean) => void;
};

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
};

/** Parse a saved layout, dropping anything that is not a dock we know. */
export const parseLayout = (parsed: unknown): DockLayout => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  // A layout saved by a future version must not be able to make a panel
  // unreachable, so unknown values are discarded rather than trusted.
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter((e): e is [string, Dock] =>
      DOCKS.includes(e[1] as Dock),
    ),
  );
};

const readLayout = (scope: string): DockLayout =>
  typeof localStorage === 'undefined' ? {} : parseLayout(readJson(storageKeyFor(scope)));

const readFixed = (): string[] => {
  if (typeof localStorage === 'undefined') return [];
  const v = readJson(FIXED_KEY);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};

const writeJson = (key: string, value: unknown, empty: boolean) => {
  try {
    if (empty) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing, blocked storage: the layout still works for this
    // session, it just will not be remembered. Not worth failing over.
  }
};

export function useDockLayout(scope = 'designer'): DockApi {
  const [state, setState] = useState(() => ({ scope, layout: readLayout(scope) }));
  // Switching workspace swaps in that workspace's saved arrangement. Done
  // during render rather than in an effect so the first frame of the new
  // workspace is already laid out correctly instead of flashing the old one.
  if (state.scope !== scope) setState({ scope, layout: readLayout(scope) });
  const layout = state.scope === scope ? state.layout : readLayout(scope);

  const [fixed, setFixed] = useState<string[]>(readFixed);

  const readExtra = (sc: string): Extra =>
    typeof localStorage === 'undefined' ? { order: [], pos: {} } : parseExtra(readJson(extraKeyFor(sc)));
  const [extraState, setExtraState] = useState(() => ({ scope, extra: readExtra(scope) }));
  if (extraState.scope !== scope) setExtraState({ scope, extra: readExtra(scope) });
  const extra = extraState.scope === scope ? extraState.extra : readExtra(scope);

  useEffect(() => {
    const e = extraState.extra;
    writeJson(extraKeyFor(extraState.scope), e, e.order.length === 0 && Object.keys(e.pos).length === 0);
  }, [extraState]);

  const placeBefore = useCallback((id: string, before: string | null, all: string[]) => {
    setExtraState((s) => ({ ...s, extra: { ...s.extra, order: reorder(s.extra.order, all, id, before) } }));
  }, []);

  const floatAt = useCallback((id: string, pos: FloatPos, all: string[]) => {
    setState((s) => ({ ...s, layout: { ...s.layout, [id]: 'float' } }));
    setExtraState((s) => ({
      ...s,
      extra: {
        // Last placed is drawn last, i.e. on top.
        order: reorder(s.extra.order, all, id, null),
        pos: { ...s.extra.pos, [id]: { x: Math.round(pos.x), y: Math.round(pos.y) } },
      },
    }));
  }, []);

  const floatPos = useCallback((id: string) => extra.pos[id], [extra]);

  useEffect(() => {
    writeJson(storageKeyFor(state.scope), state.layout, Object.keys(state.layout).length === 0);
  }, [state]);

  useEffect(() => {
    writeJson(FIXED_KEY, fixed, fixed.length === 0);
  }, [fixed]);

  const move = useCallback((id: string, dock: Dock) => {
    setState((s) => ({ ...s, layout: { ...s.layout, [id]: dock } }));
  }, []);

  const moveMany = useCallback((moves: Record<string, Dock>) => {
    setState((s) => ({ ...s, layout: { ...s.layout, ...moves } }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, layout: {} }));
    setExtraState((s) => ({ ...s, extra: { order: [], pos: {} } }));
  }, []);

  const dockOf = useCallback((id: string, fallback: Dock) => layout[id] ?? fallback, [layout]);

  const isDockable = useCallback((id: string) => !fixed.includes(id), [fixed]);

  const setDockable = useCallback((ids: string[], dockable: boolean) => {
    setFixed((f) => {
      const next = new Set(f);
      for (const id of ids) {
        if (dockable) next.delete(id);
        else next.add(id);
      }
      return [...next].sort();
    });
  }, []);

  return useMemo(
    () => ({
      layout,
      dockOf,
      move,
      moveMany,
      reset,
      customised: Object.keys(layout).length > 0 || extra.order.length > 0,
      order: extra.order,
      placeBefore,
      floatPos,
      floatAt,
      isDockable,
      setDockable,
    }),
    [layout, dockOf, move, moveMany, reset, extra, placeBefore, floatPos, floatAt, isDockable, setDockable],
  );
}

/* ------------------------------------------------------------------ */
/* Per-panel context                                                   */
/* ------------------------------------------------------------------ */

export type DockSlotInfo = {
  id: string;
  dock: Dock;
  move: (dock: Dock) => void;
  /** False when the panel is pinned: its header then carries no dock controls. */
  dockable: boolean;
};

const DockSlotContext = createContext<DockSlotInfo | null>(null);

export const useDockSlot = (): DockSlotInfo | null => useContext(DockSlotContext);

/**
 * Wraps one panel so that the `Section` inside it grows dock controls.
 *
 * The controls are rendered by `Section` rather than by a header of our own,
 * so a docked panel looks exactly like an undocked one — no second title bar,
 * and no panel component had to learn that docking exists.
 */
export function DockSlot({
  id,
  dock,
  move,
  dockable = true,
  children,
}: {
  id: string;
  dock: Dock;
  move: (id: string, dock: Dock) => void;
  dockable?: boolean;
  children: ReactNode;
}) {
  const value = useMemo<DockSlotInfo>(
    () => ({ id, dock, move: (d) => move(id, d), dockable }),
    [id, dock, move, dockable],
  );
  return <DockSlotContext.Provider value={value}>{children}</DockSlotContext.Provider>;
}
