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
export type Dock = 'left' | 'right' | 'hidden';

export const DOCKS: Dock[] = ['left', 'right', 'hidden'];

export type DockLayout = Record<string, Dock>;

const STORAGE_KEY = 'kreamet.dock';

/* ------------------------------------------------------------------ */
/* Layout state                                                        */
/* ------------------------------------------------------------------ */

export type DockApi = {
  layout: DockLayout;
  /** Where a panel sits, falling back to the default it was registered with. */
  dockOf: (id: string, fallback: Dock) => Dock;
  move: (id: string, dock: Dock) => void;
  reset: () => void;
  /** True when the reader has moved anything, so "reset" can be offered only then. */
  customised: boolean;
};

const read = (): DockLayout => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    // Drop anything that is not a dock we know: a layout saved by a future
    // version must not be able to make a panel unreachable.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((e): e is [string, Dock] =>
        DOCKS.includes(e[1] as Dock),
      ),
    );
  } catch {
    return {};
  }
};

export function useDockLayout(): DockApi {
  const [layout, setLayout] = useState<DockLayout>(() =>
    typeof localStorage === 'undefined' ? {} : read(),
  );

  useEffect(() => {
    try {
      if (Object.keys(layout).length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Private browsing, blocked storage: the layout still works for this
      // session, it just will not be remembered. Not worth failing over.
    }
  }, [layout]);

  const move = useCallback((id: string, dock: Dock) => {
    setLayout((l) => ({ ...l, [id]: dock }));
  }, []);

  const reset = useCallback(() => setLayout({}), []);

  const dockOf = useCallback((id: string, fallback: Dock) => layout[id] ?? fallback, [layout]);

  return useMemo(
    () => ({ layout, dockOf, move, reset, customised: Object.keys(layout).length > 0 }),
    [layout, dockOf, move, reset],
  );
}

/* ------------------------------------------------------------------ */
/* Per-panel context                                                   */
/* ------------------------------------------------------------------ */

export type DockSlotInfo = {
  id: string;
  dock: Dock;
  move: (dock: Dock) => void;
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
  children,
}: {
  id: string;
  dock: Dock;
  move: (id: string, dock: Dock) => void;
  children: ReactNode;
}) {
  const value = useMemo<DockSlotInfo>(
    () => ({ id, dock, move: (d) => move(id, d) }),
    [id, dock, move],
  );
  return <DockSlotContext.Provider value={value}>{children}</DockSlotContext.Provider>;
}
