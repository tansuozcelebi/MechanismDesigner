import { useEffect, useState } from 'react';
import { hrefFor } from '../app/router';
import {
  designKey,
  favoriteKey,
  isFavorite,
  loadFavorites,
  newFavoriteId,
  renamed,
  subscribeFavorites,
  updateFavorites,
  withFavorite,
  withoutFavorite,
  type Favorite,
} from '../app/favorites';
import { OPTIMIZED, storedDesign } from '../app/designPresets';
import { downloadJson, readFileText } from '../app/exportDesign';
import { heartTarget } from '../synthesis/targetCurve';
import { MechanismRunner } from '../ui/MechanismRunner';
import { num } from '../ui/primitives';
import { useI18n, useT } from '../i18n';

/**
 * The favourite-mechanisms module.
 *
 * Every card runs its mechanism in place — solved with the workbench's own
 * solver and drawn as SVG — so the list can be compared by watching it, not
 * by reading numbers. A card can also hand its design to the Runner (full
 * physics, live readouts) or to the Designer (editing), by link: the design
 * travels as `#/runner/<id>`, so the link can be bookmarked or opened in a
 * new tab like any other.
 */

/** Shipped designs offered for starring, built from the recorded solver output. */
function shippedCandidates(name: (n: number) => string): Favorite[] {
  return (OPTIMIZED?.solutions ?? []).flatMap((s, i) => {
    const d = storedDesign(i);
    if (!d) return [];
    const m = s.metrics as Record<string, number | boolean>;
    return [
      {
        // Deterministic, so the same shipped design is recognised as already added.
        id: `shipped-${i + 1}`,
        name: name(i + 1),
        spec: d.spec,
        params: d.params,
        // Shipped designs were optimised against the default heart.
        target: heartTarget(),
        summary: {
          links: 2 + 2 * d.spec.dyads.length,
          fullRotation: Boolean(m.fullRotation),
          rms: Number.isFinite(Number(m.rmsError_mm)) ? Number(m.rmsError_mm) : null,
          J: Number.isFinite(Number(m.objective ?? s.score)) ? Number(m.objective ?? s.score) : null,
        },
        addedAt: '',
      },
    ];
  });
}

function FavoriteCard({
  fav,
  onRemove,
  onRename,
}: {
  fav: Favorite;
  onRemove: () => void;
  onRename: (name: string) => void;
}) {
  const t = useT();
  const { lang } = useI18n();
  const when = fav.addedAt
    ? new Date(fav.addedAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB')
    : '';
  return (
    <article className="favcard">
      <header>
        <h3>{fav.name}</h3>
        <button
          className="linkish"
          onClick={() => {
            const next = window.prompt(t('fav.renamePrompt'), fav.name);
            if (next !== null) onRename(next);
          }}
        >
          {t('fav.rename')}
        </button>
      </header>
      <MechanismRunner
        spec={fav.spec}
        params={fav.params}
        label={t('fav.drawing', { name: fav.name })}
      />
      <ul className="favmeta">
        <li>{t('fav.links', { n: fav.summary.links })}</li>
        <li className={fav.summary.fullRotation ? 'good' : 'bad'}>
          {t(fav.summary.fullRotation ? 'fav.fullRotation' : 'fav.noRotation')}
        </li>
        {fav.summary.rms !== null && <li>{t('fav.rms', { v: num(fav.summary.rms, 2) })}</li>}
        {fav.summary.J !== null && <li>{t('fav.objective', { v: num(fav.summary.J, 3) })}</li>}
        {when && <li className="dim">{t('fav.added', { when })}</li>}
      </ul>
      <div className="favactions">
        <a className="btn primary" href={hrefFor('runner', fav.id)}>
          ▶ {t('fav.openRunner')}
        </a>
        <a className="btn" href={hrefFor('designer', fav.id)}>
          {t('fav.openDesigner')}
        </a>
        <button onClick={onRemove}>{t('fav.remove')}</button>
      </div>
    </article>
  );
}

export default function FavoritesPage() {
  const t = useT();
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => subscribeFavorites(setFavorites), []);

  const shipped = shippedCandidates((n) => t('fav.shippedName', { n }));
  const keys = new Set(favorites.map(favoriteKey));

  const exportAll = () => downloadJson(favorites, 'kreamet-favorites.json');

  const importAll = async () => {
    const file = await readFileText();
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(file.text);
      if (!Array.isArray(parsed)) throw new Error('expected a list');
      const valid = parsed.filter(isFavorite);
      if (valid.length === 0) throw new Error('no valid mechanisms in the file');
      updateFavorites((list) =>
        // Fresh ids, so an imported entry can never collide with, and be
        // confused for, a different design already saved under that id.
        valid.reduce((acc, f) => withFavorite(acc, { ...f, id: newFavoriteId() }), list),
      );
      setMessage(t('fav.importOk', { n: valid.length }));
    } catch (e) {
      setMessage(t('fav.importFail', { msg: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="page favorites">
      <div className="page-inner">
      <h1>{t('fav.title')}</h1>
      <p className="lede">{t('fav.lede')}</p>

      <div className="favtoolbar">
        <span className="mono dim">{t('fav.count', { n: favorites.length })}</span>
        <button onClick={exportAll} disabled={favorites.length === 0}>
          {t('fav.export')}
        </button>
        <button onClick={importAll}>{t('fav.import')}</button>
        {message && (
          <span className="note" role="status">
            {message}
          </span>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="favempty">
          <p>
            <strong>{t('fav.empty')}</strong>
          </p>
          <p>{t('fav.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="favgrid">
            {favorites.map((f) => (
              <FavoriteCard
                key={f.id}
                fav={f}
                onRemove={() => updateFavorites((list) => withoutFavorite(list, f.id))}
                onRename={(name) => updateFavorites((list) => renamed(list, f.id, name))}
              />
            ))}
          </div>
          <p className="note">{t('fav.recorded')}</p>
        </>
      )}

      {shipped.length > 0 && (
        <section>
          <h2>{t('fav.shippedTitle')}</h2>
          <p className="note">{t('fav.shippedNote')}</p>
          <ul className="shippedlist">
            {shipped.map((s) => {
              const added = keys.has(designKey(s.spec, s.params));
              return (
                <li key={s.id}>
                  <span>{s.name}</span>
                  <span className="mono dim">
                    {t('fav.links', { n: s.summary.links })}
                    {s.summary.rms !== null && ` · ${t('fav.rms', { v: num(s.summary.rms, 2) })}`}
                  </span>
                  <button
                    disabled={added}
                    onClick={() =>
                      updateFavorites((list) =>
                        withFavorite(list, {
                          ...s,
                          id: newFavoriteId(),
                          addedAt: new Date().toISOString(),
                        }),
                      )
                    }
                  >
                    {t(added ? 'fav.inFavorites' : 'fav.addShipped')}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      </div>
    </div>
  );
}
