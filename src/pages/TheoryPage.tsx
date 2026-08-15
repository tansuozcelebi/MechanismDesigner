import { useEffect, useMemo, useRef, useState } from 'react';
import { Markdown, parseMarkdown, tocOf, type Block, type TocEntry } from '../ui/Markdown';
import { hrefFor, useRoute } from '../app/router';
import { useI18n, useT } from '../i18n';

/**
 * The mechanism-technique reference.
 *
 * The document is a plain Markdown file per language, pulled in with a dynamic
 * `?raw` import so it lands in its own chunk: it is by far the largest asset in
 * the project, and someone who only opens the designer should never pay to
 * download it. Parsing happens once per document and is memoised, because the
 * result feeds both the rendered body and the contents sidebar.
 */
const LOADERS: Record<string, () => Promise<{ default: string }>> = {
  tr: () => import('../content/theory.tr.md?raw'),
  en: () => import('../content/theory.en.md?raw'),
};

export default function TheoryPage() {
  const t = useT();
  const { lang } = useI18n();
  const { anchor } = useRoute();

  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setSource(null);
    setFailed(false);
    (LOADERS[lang] ?? LOADERS.en)()
      .then((m) => alive && setSource(m.default))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [lang]);

  const blocks: Block[] = useMemo(() => (source ? parseMarkdown(source) : []), [source]);
  const toc: TocEntry[] = useMemo(() => tocOf(blocks), [blocks]);

  const shown = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase('tr');
    if (!q) return toc;
    return toc.filter((e) => e.text.toLocaleLowerCase('tr').includes(q));
  }, [toc, filter]);

  /* Scroll spy. Rebuilt whenever the document changes. */
  useEffect(() => {
    if (!blocks.length) return;
    const root = bodyRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll('h1[id], h2[id], h3[id]'));
    if (!headings.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // The topmost heading currently inside the reading band wins; without
        // that tie-break, a burst of entries would leave the last one in DOM
        // order highlighted, which is usually the wrong end of the screen.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-72px 0px -70% 0px', threshold: 0 },
    );
    for (const h of headings) io.observe(h);
    return () => io.disconnect();
  }, [blocks]);

  /* Keep the active entry visible in a contents list hundreds of items long.
     `nearest` scrolls only when the entry is actually off-screen, so reading
     down the page does not make the sidebar twitch on every heading. */
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(`.toc nav a[href$="/${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  /* Deep link: scroll once the document that contains the anchor is rendered. */
  useEffect(() => {
    if (!anchor || !blocks.length) return;
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      setActive(anchor);
    }
  }, [anchor, blocks]);

  const headingCount = toc.length;
  // Trailing newline: a file of N lines ends with one, so a naive split reports
  // N+1. Counting the document as one line longer than it is would be a small
  // lie in a place the reader is explicitly told to trust.
  const lineCount = useMemo(
    () => (source ? source.replace(/\n$/, '').split('\n').length : 0),
    [source],
  );

  return (
    <div className="page theory">
      <aside className="toc">
        <div className="toc-head">
          <h2>{t('theory.contents')}</h2>
          <input
            type="search"
            value={filter}
            placeholder={t('theory.filter')}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="toc-meta">
            {t('theory.meta', { sections: headingCount, lines: lineCount })}
          </div>
        </div>
        <nav>
          {shown.map((e) => (
            <a
              key={e.id}
              href={hrefFor('theory', e.id)}
              className={`lvl${e.level} ${active === e.id ? 'active' : ''}`}
              onClick={() => setActive(e.id)}
            >
              {e.text}
            </a>
          ))}
          {filter && !shown.length && <div className="toc-empty">{t('theory.noMatch')}</div>}
        </nav>
      </aside>

      <div className="theory-body" ref={bodyRef}>
        <div className="page-inner">
          {failed && <div className="banner bad">{t('theory.loadFailed')}</div>}
          {!source && !failed && <div className="loading">{t('theory.loading')}</div>}
          {source && <Markdown blocks={blocks} />}
        </div>
      </div>
    </div>
  );
}
