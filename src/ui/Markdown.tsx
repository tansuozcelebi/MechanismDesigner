import { Fragment, type ReactNode } from 'react';

/**
 * A small Markdown subset, parsed to React elements.
 *
 * Written rather than pulled in as a dependency for two reasons. First, the
 * output is React nodes throughout — no `dangerouslySetInnerHTML` anywhere — so
 * long-form content cannot inject markup into the app even if a document is
 * later edited by someone else. Second, the reference document only needs
 * headings, paragraphs, lists, tables, fenced formula blocks, notes and inline
 * emphasis; a general-purpose parser would be an order of magnitude more code
 * for features this app has no use for.
 */

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; text: string; id: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'pre'; lang: string; lines: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'rule' };

export type TocEntry = { id: string; text: string; level: 1 | 2 | 3 };

/* ------------------------------------------------------------------ */
/* Slugs                                                               */
/* ------------------------------------------------------------------ */

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

/**
 * Turkish letters are folded explicitly rather than left to `normalize('NFD')`:
 * `ı` and `İ` are separate letters, not accented forms of `i`, so Unicode
 * decomposition leaves them intact and they would end up stripped from the slug
 * — turning "Kısıtlar" and "Kstlar" into different anchors on the same heading.
 */
export function slugify(text: string): string {
  return text
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => TR_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'section';
}

/* ------------------------------------------------------------------ */
/* Block parsing                                                       */
/* ------------------------------------------------------------------ */

const splitRow = (line: string): string[] =>
  line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const usedIds = new Map<string, number>();

  const pushHeading = (level: 1 | 2 | 3 | 4, text: string) => {
    const base = slugify(text);
    // Duplicate headings are legitimate ("Örnek" appears in many chapters), so
    // ids are disambiguated instead of colliding and breaking deep links.
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    blocks.push({ kind: 'heading', level, text, id: seen ? `${base}-${seen + 1}` : base });
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced block: kept verbatim, used for formulas and worked numbers.
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      blocks.push({ kind: 'pre', lang: fence[1] ?? '', lines: body });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      pushHeading(heading[1].length as 1 | 2 | 3 | 4, heading[2].trim());
      i++;
      continue;
    }

    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
      i++;
      continue;
    }

    // Table: a header row followed by a separator row of dashes.
    if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i++]));
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i++].replace(/^\s*>\s?/, ''));
      }
      blocks.push({ kind: 'quote', lines: body });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered
          ? /^\s*\d+[.)]\s+(.*)$/.exec(lines[i])
          : /^\s*[-*+]\s+(.*)$/.exec(lines[i]);
        if (m) {
          items.push(m[1]);
          i++;
          continue;
        }
        // An indented continuation line belongs to the item above it.
        if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
          continue;
        }
        break;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Paragraph: consecutive plain lines, joined.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|\s*[-*+]\s|\s*\d+[.)]\s|\s*>|\s*\|)/.test(lines[i]) &&
      !/^\s*(---+|\*\*\*+)\s*$/.test(lines[i])
    ) {
      para.push(lines[i++].trim());
    }
    if (para.length) blocks.push({ kind: 'paragraph', text: para.join(' ') });
    else i++; // never stall on a line no rule consumed
  }

  return blocks;
}

export function tocOf(blocks: Block[]): TocEntry[] {
  return blocks
    .filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading' && b.level <= 3)
    .map((b) => ({ id: b.id, text: b.text, level: b.level as 1 | 2 | 3 }));
}

/* ------------------------------------------------------------------ */
/* Inline parsing                                                      */
/* ------------------------------------------------------------------ */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** `**bold**`, `*italic*`, `` `code` `` and `[text](href)`, nothing else. */
export function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const tok = m[0];
    const key = `${keyPrefix}${n++}`;
    if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      const href = link?.[2] ?? '#';
      const external = /^https?:/i.test(href);
      out.push(
        <a
          key={key}
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          {link?.[1] ?? tok}
        </a>,
      );
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export function Markdown({ blocks }: { blocks: Block[] }) {
  return (
    <div className="md">
      {blocks.map((b, k) => (
        <Fragment key={k}>{renderBlock(b, k)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(b: Block, k: number): ReactNode {
  switch (b.kind) {
    case 'heading': {
      const H = (['h1', 'h2', 'h3', 'h4'] as const)[b.level - 1];
      // The anchor sits inside the heading so deep links land on the heading
      // itself rather than scrolling it just off the top of the viewport.
      return (
        <H id={b.id}>
          {inline(b.text, `h${k}`)}
          <a className="anchor" href={`#${b.id}`} aria-label={b.text}>
            §
          </a>
        </H>
      );
    }
    case 'paragraph':
      return <p>{inline(b.text, `p${k}`)}</p>;
    case 'list':
      return b.ordered ? (
        <ol>
          {b.items.map((it, j) => (
            <li key={j}>{inline(it, `l${k}-${j}`)}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {b.items.map((it, j) => (
            <li key={j}>{inline(it, `l${k}-${j}`)}</li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <blockquote>
          {b.lines.map((l, j) => (
            <p key={j}>{inline(l, `q${k}-${j}`)}</p>
          ))}
        </blockquote>
      );
    case 'pre':
      return (
        <pre className={b.lang ? `lang-${b.lang}` : undefined}>
          <code>{b.lines.join('\n')}</code>
        </pre>
      );
    case 'table':
      return (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                {b.header.map((h, j) => (
                  <th key={j}>{inline(h, `th${k}-${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((c, j) => (
                    <td key={j}>{inline(c, `td${k}-${r}-${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'rule':
      return <hr />;
  }
}
