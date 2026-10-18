import { useEffect, useId, useRef, useState } from 'react';
import type { Dock, DockApi } from './dock';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/translations';

export type PanelEntry = { id: string; def: Dock };

/**
 * One place that controls every panel at once.
 *
 * The per-panel header controls are good for moving the panel you are looking
 * at, and useless for the panel you cannot see: a hidden panel has no header,
 * and on a long dock the one you want may be twenty sections down. This menu
 * lists all of them, so any panel is two clicks away whatever state the layout
 * is in. It also owns the two global switches — show or hide everything,
 * dockable or pinned — which have no sensible home on a single panel.
 */
export function PanelLayoutMenu({
  panels,
  dock,
  workspaceLabel,
  onCollapseAll,
}: {
  panels: PanelEntry[];
  dock: DockApi;
  workspaceLabel: string;
  onCollapseAll: (open: boolean) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  // Close on Escape (returning focus to the button that opened it) and on a
  // click anywhere outside — the two ways out every popover is expected to have.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const where = (p: PanelEntry) => dock.dockOf(p.id, p.def);
  const shown = panels.filter((p) => where(p) !== 'hidden').length;
  const dockableCount = panels.filter((p) => dock.isDockable(p.id)).length;

  /** A panel being shown again goes back where it was registered, or left if it started hidden. */
  const homeOf = (p: PanelEntry): Dock => (p.def === 'hidden' ? 'left' : p.def);

  const showAll = () =>
    dock.moveMany(
      Object.fromEntries(panels.filter((p) => where(p) === 'hidden').map((p) => [p.id, homeOf(p)])),
    );
  const hideAll = () =>
    dock.moveMany(Object.fromEntries(panels.map((p) => [p.id, 'hidden' as Dock])));

  return (
    <div className="panelmenu" ref={rootRef}>
      <button
        ref={buttonRef}
        className={`panelmenu-toggle${open ? ' active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        title={t('layout.title')}
        aria-label={t('layout.title')}
      >
        <span aria-hidden="true">▤</span> <span className="label">{t('layout.menu')}</span>{' '}
        <span className="mono dim">{shown}/{panels.length}</span>
      </button>

      {open && (
        <div className="panelmenu-pop" id={menuId} role="dialog" aria-label={t('layout.title')}>
          <div className="panelmenu-head">
            <strong>{t('layout.title')}</strong>
            <button
              className="drawer-close"
              onClick={() => setOpen(false)}
              aria-label={t('layout.close')}
              title={t('layout.close')}
            >
              ✕
            </button>
          </div>
          <p className="note">{t('layout.scope', { ws: workspaceLabel })}</p>

          <div className="panelmenu-actions">
            <button onClick={showAll} disabled={shown === panels.length}>
              {t('layout.showAll')}
            </button>
            <button onClick={hideAll} disabled={shown === 0}>
              {t('layout.hideAll')}
            </button>
            <button onClick={() => onCollapseAll(true)}>{t('panels.expandAll')}</button>
            <button onClick={() => onCollapseAll(false)}>{t('panels.collapseAll')}</button>
            <button
              onClick={() => dock.setDockable(panels.map((p) => p.id), true)}
              disabled={dockableCount === panels.length}
            >
              {t('layout.allDockable')}
            </button>
            <button
              onClick={() => dock.setDockable(panels.map((p) => p.id), false)}
              disabled={dockableCount === 0}
            >
              {t('layout.allFixed')}
            </button>
            {dock.customised && (
              <button className="dock-reset" onClick={dock.reset}>
                {t('dock.reset')}
              </button>
            )}
          </div>

          <table className="panelmenu-table">
            <thead>
              <tr>
                <th scope="col">{t('layout.panel')}</th>
                <th scope="col">{t('layout.visible')}</th>
                <th scope="col">{t('layout.dock')}</th>
                <th scope="col">{t('layout.dockable')}</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((p) => {
                const at = where(p);
                const name = t(`panelName.${p.id}` as TranslationKey);
                return (
                  <tr key={p.id} className={at === 'hidden' ? 'is-hidden' : ''}>
                    <th scope="row">{name}</th>
                    <td>
                      <input
                        type="checkbox"
                        checked={at !== 'hidden'}
                        aria-label={`${t('layout.visible')}: ${name}`}
                        onChange={(e) => dock.move(p.id, e.target.checked ? homeOf(p) : 'hidden')}
                      />
                    </td>
                    <td>
                      <select
                        value={at === 'hidden' ? homeOf(p) : at}
                        aria-label={`${t('layout.dock')}: ${name}`}
                        onChange={(e) => dock.move(p.id, e.target.value as Dock)}
                      >
                        <option value="left">{t('layout.left')}</option>
                        <option value="right">{t('layout.right')}</option>
                        <option value="float">{t('layout.float')}</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={dock.isDockable(p.id)}
                        aria-label={`${t('layout.dockable')}: ${name}`}
                        onChange={(e) => dock.setDockable([p.id], e.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="note">{t('layout.dockableNote')}</p>
        </div>
      )}
    </div>
  );
}
