import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_URL,
  LANGS,
  PAGES,
  SITE_URL,
  abs,
  allUrls,
  pageById,
} from '../src/seo/config';
import { extractFaq, markdownToHtml, parseMarkdown, stripInline, summarise } from '../src/ui/markdownHtml';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * The generator is run once into a temporary directory, and the tests read what
 * it produced. Asserting on the real output is the only way to catch the
 * failures that matter here — a sitemap listing a URL nobody generated, or
 * JSON-LD that does not parse — which no amount of unit-testing the helpers
 * would reveal.
 */
let OUT: string;
const read = (rel: string) => readFileSync(join(OUT, rel), 'utf8');

beforeAll(() => {
  OUT = mkdtempSync(join(tmpdir(), 'kreamet-seo-'));
  execFileSync('npx', ['tsx', 'scripts/seo.ts', '--out', OUT], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}, 120_000);

afterAll(() => {
  if (OUT) rmSync(OUT, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */

describe('site configuration', () => {
  it('has no trailing slash, so joined paths never double up', () => {
    expect(SITE_URL.endsWith('/')).toBe(false);
    expect(abs('/sitemap.xml')).toBe(`${SITE_URL}/sitemap.xml`);
    expect(abs('sitemap.xml')).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('gives every page a distinct, language-specific, directory-style path', () => {
    const paths = PAGES.flatMap((p) => LANGS.map((l) => p[l].path));
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) {
      expect(p.startsWith('/')).toBe(true);
      // Directory-style URLs so the server can resolve them to index.html.
      expect(p.endsWith('/')).toBe(true);
    }
  });

  it('keeps titles and descriptions inside the lengths search engines display', () => {
    for (const page of PAGES) {
      for (const lang of LANGS) {
        const m = page[lang];
        expect(m.title.length, `${page.id}/${lang} title`).toBeLessThanOrEqual(70);
        expect(m.description.length, `${page.id}/${lang} description`).toBeGreaterThan(80);
        expect(m.description.length, `${page.id}/${lang} description`).toBeLessThanOrEqual(320);
        expect(m.keywords.length).toBeGreaterThan(0);
      }
    }
  });

  it('the shell in index.html is pinned to the default site URL', () => {
    // The generator rewrites this origin when SITE_URL differs. If the literal
    // in index.html drifted, that rewrite would silently miss and ship a
    // canonical pointing at the wrong origin.
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html);
    expect(canonical).not.toBeNull();
    expect(canonical![1].replace(/\/$/, '')).toBe(DEFAULT_SITE_URL);
  });
});

describe('generated files', () => {
  it('writes an HTML page for every URL in the sitemap', () => {
    const xml = read('sitemap.xml');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBe(PAGES.length * LANGS.length);

    for (const loc of locs) {
      const rel = loc.slice(SITE_URL.length);
      expect(existsSync(join(OUT, rel, 'index.html')), `${rel} was listed but not generated`).toBe(
        true,
      );
    }
    // And the reverse: every generated page is listed.
    for (const { url } of allUrls()) expect(locs).toContain(url);
  });

  it('produces a well-formed sitemap with reciprocal hreflang', () => {
    const xml = read('sitemap.xml');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
    // Balanced tags — a truncated sitemap is silently ignored by crawlers.
    for (const tag of ['url', 'loc', 'lastmod', 'changefreq', 'priority']) {
      const open = xml.split(`<${tag}>`).length - 1;
      const close = xml.split(`</${tag}>`).length - 1;
      expect(open, tag).toBe(close);
    }
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    // Every entry offers both languages plus x-default.
    const entries = xml.split('<url>').length - 1;
    for (const lang of LANGS) {
      expect(xml.split(`hreflang="${lang}"`).length - 1).toBe(entries);
    }
    expect(xml.split('hreflang="x-default"').length - 1).toBe(entries);
  });

  it('points robots.txt at the sitemap and allows crawling', () => {
    const txt = read('robots.txt');
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain(`Sitemap: ${abs('/sitemap.xml')}`);
    expect(txt).not.toMatch(/^Disallow: \/$/m); // would deindex the whole site
  });

  it('writes an llms.txt index whose links all resolve to generated pages', () => {
    const txt = read('llms.txt');
    expect(txt.startsWith('# KREAMET')).toBe(true);
    expect(txt).toMatch(/^> /m); // the convention's one-line summary
    expect(txt).toContain(abs('/llms-full.txt'));

    const links = [...txt.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(3);
    for (const l of links) {
      if (!l.startsWith(SITE_URL)) continue; // external, e.g. the repository
      const rel = l.slice(SITE_URL.length);
      const ok = existsSync(join(OUT, rel)) || existsSync(join(OUT, rel, 'index.html'));
      expect(ok, `${l} is linked from llms.txt but was not generated`).toBe(true);
    }
  });

  it('writes llms-full.txt containing both complete references', () => {
    const txt = read('llms-full.txt');
    // Substantial, and carrying the actual document, not a summary of it.
    expect(txt.length).toBeGreaterThan(200_000);
    expect(txt).toContain('Mekanizma Tekniği — Kapsamlı Referans');
    expect(txt).toContain('Mechanism Theory — A Working Reference');
    expect(txt).toContain('44.75'); // the derived transmission-angle ceiling
  });
});

describe('generated pages', () => {
  const pageHtml = (id: 'home' | 'about' | 'theory', lang: 'tr' | 'en') =>
    read(join(pageById(id)[lang].path, 'index.html'));

  it('declares the right language, canonical and alternates on every page', () => {
    for (const page of PAGES) {
      for (const lang of LANGS) {
        const html = pageHtml(page.id, lang);
        const where = `${page.id}/${lang}`;
        expect(html, where).toContain(`<html lang="${lang}">`);
        expect(html, where).toContain(
          `<link rel="canonical" href="${abs(page[lang].path)}">`,
        );
        for (const other of LANGS) {
          expect(html, where).toContain(
            `<link rel="alternate" hreflang="${other}" href="${abs(page[other].path)}">`,
          );
        }
        expect(html, where).toContain('hreflang="x-default"');
        expect(html, where).toContain(`<title>`);
        expect(html, where).toContain(page[lang].description);
        expect(html, where).toContain('property="og:title"');
        expect(html, where).toContain('name="twitter:card"');
      }
    }
  });

  it('carries valid JSON-LD on every page', () => {
    for (const page of PAGES) {
      for (const lang of LANGS) {
        const html = pageHtml(page.id, lang);
        const blocks = [
          ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
        ].map((m) => m[1]);
        expect(blocks.length, `${page.id}/${lang}`).toBeGreaterThan(0);
        for (const b of blocks) {
          const parsed = JSON.parse(b.replace(/\\u003c/g, '<'));
          expect(parsed['@context']).toBe('https://schema.org');
          expect(typeof parsed['@type']).toBe('string');
        }
      }
    }
  });

  it('escapes `<` inside JSON-LD so a script tag cannot break out', () => {
    // JSON strings can legally contain "</script>", which would terminate the
    // block early and inject markup. The generator escapes every `<`.
    for (const lang of LANGS) {
      const html = pageHtml('theory', lang);
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ].map((m) => m[1]);
      for (const b of blocks) expect(b).not.toContain('<');
    }
  });

  it('renders the whole reference as real HTML, not a JavaScript placeholder', () => {
    for (const lang of LANGS) {
      const html = pageHtml('theory', lang);
      // Chapter headings with stable ids, so deep links match the app's.
      expect(html.split('<h1 id=').length - 1).toBeGreaterThan(40);
      expect(html.split('<h2 id=').length - 1).toBeGreaterThan(100);
      expect(html).toContain('<table>');
      expect(html).toContain('<pre><code>');
      expect(html.length).toBeGreaterThan(120_000);
    }
    // Neither language is the abridged one. Comparing sizes directly would only
    // measure how long the words are; comparing chapter counts measures cover.
    const chapters = (lang: (typeof LANGS)[number]) =>
      pageHtml('theory', lang).split('<h1 id=').length - 1;
    expect(chapters('tr')).toBe(chapters('en'));
  });

  it('marks the FAQ up as structured data in both languages', () => {
    for (const lang of LANGS) {
      const html = pageHtml('theory', lang);
      const faq = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((m) => JSON.parse(m[1].replace(/\\u003c/g, '<')))
        .find((j) => j['@type'] === 'FAQPage');
      expect(faq, `${lang} FAQPage`).toBeDefined();
      const entities = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(entities.length).toBeGreaterThanOrEqual(9);
      for (const e of entities) {
        expect(e.name.length).toBeGreaterThan(5);
        expect(e.acceptedAnswer.text.length).toBeGreaterThan(40);
        expect(e.name).not.toMatch(/^[“"]/); // quotes stripped
      }
    }
  });

  it('links each static page back into the interactive app', () => {
    for (const page of PAGES) {
      for (const lang of LANGS) {
        expect(pageHtml(page.id, lang)).toContain(`${abs('/')}${page[lang].appHash}`);
      }
    }
  });

  it('does not redirect — the content must stay on the crawlable URL', () => {
    for (const page of PAGES) {
      for (const lang of LANGS) {
        const html = pageHtml(page.id, lang);
        expect(html).not.toMatch(/http-equiv=["']refresh/i);
        // Only a real script-driven redirect counts. Matching bare
        // `location =` also flagged the prose — §38.3 of the reference sets a
        // pseudo-rigid-body pivot with "location = (1 − γ)·L".
        expect(html).not.toMatch(/(?:window|document|top|self)\s*\.\s*location\s*=/i);
        expect(html).not.toMatch(/location\s*\.\s*(?:href|replace|assign)\s*[=(]/i);
      }
    }
  });
});

/* ------------------------------------------------------------------ */

describe('html serialisation', () => {
  it('escapes text so document content cannot inject markup', () => {
    const html = markdownToHtml('A <script>alert(1)</script> & "quoted" text');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('escapes link targets too', () => {
    const html = markdownToHtml('[x](https://e.com/"onmouseover="alert(1))');
    expect(html).not.toContain('"onmouseover="');
  });

  it('gives headings the same ids the app uses, so deep links match', () => {
    // One parser, two renderers: an anchor that works in the app has to work on
    // the static page, or a shared link silently lands in the wrong place.
    const md = '# İletim açısı\n\n## Kısıtlar\n\ntext';
    const ids = parseMarkdown(md)
      .filter((b) => b.kind === 'heading')
      .map((b) => (b.kind === 'heading' ? b.id : ''));
    expect(ids).toEqual(['iletim-acisi', 'kisitlar']);
    const html = markdownToHtml(md);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
  });

  it('summarises on a word boundary', () => {
    const blocks = parseMarkdown('# T\n\n' + 'word '.repeat(200));
    const s = summarise(blocks, 100);
    expect(s.length).toBeLessThanOrEqual(101);
    expect(s.endsWith('…')).toBe(true);
    expect(s).not.toMatch(/wor…$/);
  });

  it('strips inline markup for plain-text contexts', () => {
    expect(stripInline('**a** *b* `c` [d](http://e)')).toBe('a b c d');
  });

  it('returns nothing rather than guessing when no FAQ chapter exists', () => {
    expect(extractFaq(parseMarkdown('# Other\n\n## Q\n\ntext'), /Nope/)).toEqual([]);
  });
});
