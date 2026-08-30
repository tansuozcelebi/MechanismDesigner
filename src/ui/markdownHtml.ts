import { parseMarkdown, tocOf, type Block, type TocEntry } from './Markdown';

/**
 * Serialise parsed Markdown to an HTML string, for the static pages the build
 * emits for crawlers.
 *
 * It deliberately reuses `parseMarkdown` rather than parsing again: the static
 * page and the in-app page must have the same headings and the same anchor ids,
 * or a deep link that works in one is broken in the other. One parser, two
 * renderers.
 *
 * Everything is escaped on the way out. The documents are ours today, but a
 * generator that interpolates raw text into HTML is a generator that will
 * eventually interpolate something it should not have.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** `**bold**`, `*italic*`, `` `code` `` and `[text](href)`, matching the app. */
export function inlineHtml(text: string): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out += escapeHtml(text.slice(last, at));
    const tok = m[0];
    if (tok.startsWith('**')) out += `<strong>${escapeHtml(tok.slice(2, -2))}</strong>`;
    else if (tok.startsWith('`')) out += `<code>${escapeHtml(tok.slice(1, -1))}</code>`;
    else if (tok.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      const href = link?.[2] ?? '#';
      const label = link?.[1] ?? tok;
      const external = /^https?:/i.test(href);
      const rel = external ? ' target="_blank" rel="noreferrer noopener"' : '';
      out += `<a href="${escapeHtml(href)}"${rel}>${escapeHtml(label)}</a>`;
    } else out += `<em>${escapeHtml(tok.slice(1, -1))}</em>`;
    last = at + tok.length;
  }
  return out + escapeHtml(text.slice(last));
}

export function blockToHtml(b: Block): string {
  switch (b.kind) {
    case 'heading': {
      const h = `h${b.level}`;
      return `<${h} id="${escapeHtml(b.id)}">${inlineHtml(b.text)}</${h}>`;
    }
    case 'paragraph':
      return `<p>${inlineHtml(b.text)}</p>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return `<${tag}>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</${tag}>`;
    }
    case 'quote':
      return `<blockquote>${b.lines.map((l) => `<p>${inlineHtml(l)}</p>`).join('')}</blockquote>`;
    case 'pre':
      return `<pre><code>${escapeHtml(b.lines.join('\n'))}</code></pre>`;
    case 'table': {
      const head = b.header.map((c) => `<th>${inlineHtml(c)}</th>`).join('');
      const body = b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`)
        .join('');
      return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }
    case 'rule':
      return '<hr>';
  }
}

export const blocksToHtml = (blocks: Block[]): string =>
  blocks.map(blockToHtml).join('\n');

export const markdownToHtml = (src: string): string => blocksToHtml(parseMarkdown(src));

/* ------------------------------------------------------------------ */
/* Plain text, for llms.txt and meta descriptions                       */
/* ------------------------------------------------------------------ */

/** Strip inline markup, leaving readable prose. */
export const stripInline = (text: string): string =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

/**
 * First paragraph after a heading, trimmed to a meta-description length.
 *
 * Cut on a word boundary: a description sliced mid-word reads as broken text in
 * a search result, which is the one place it is guaranteed to be seen.
 */
export function summarise(blocks: Block[], maxLen = 300): string {
  const first = blocks.find((b) => b.kind === 'paragraph');
  if (!first || first.kind !== 'paragraph') return '';
  const text = stripInline(first.text).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/* ------------------------------------------------------------------ */
/* FAQ extraction, for FAQPage structured data                          */
/* ------------------------------------------------------------------ */

export type Faq = { question: string; answer: string };

/**
 * Pull question/answer pairs out of the reference's FAQ chapter.
 *
 * Both language documents write the chapter the same way — a level-1 heading
 * whose text matches `chapterMatch`, then one level-2 heading per question with
 * the answer beneath it — so one extractor serves both. Answers are flattened to
 * plain text because structured data carries no markup.
 */
export function extractFaq(blocks: Block[], chapterMatch: RegExp, limit = 12): Faq[] {
  const startIdx = blocks.findIndex(
    (b) => b.kind === 'heading' && b.level === 1 && chapterMatch.test(b.text),
  );
  if (startIdx < 0) return [];

  const faqs: Faq[] = [];
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    if (question && answer.length) faqs.push({ question, answer: answer.join(' ') });
    question = null;
    answer = [];
  };

  for (let i = startIdx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'heading' && b.level === 1) break; // next chapter
    if (b.kind === 'heading' && b.level === 2) {
      flush();
      // The heading is the question, in typographic quotes in both documents.
      question = stripInline(b.text)
        .replace(/^\d+(\.\d+)*\s*/, '')
        .replace(/^[“"']|[”"']$/g, '')
        .trim();
      continue;
    }
    if (!question) continue;
    if (b.kind === 'paragraph') answer.push(stripInline(b.text));
    else if (b.kind === 'list') answer.push(b.items.map(stripInline).join(' '));
  }
  flush();

  return faqs.slice(0, limit);
}

export { parseMarkdown, tocOf };
export type { Block, TocEntry };
