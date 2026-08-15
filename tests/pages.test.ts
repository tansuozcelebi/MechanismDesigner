import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTES, hrefFor, parseHash } from '../src/app/router';
import { parseMarkdown, slugify, tocOf, type Block } from '../src/ui/Markdown';
import { DEVELOPER, METHODS, PROJECT_FACTS, TECH_STACK, VERIFICATION } from '../src/content/about';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const TR = read('../src/content/theory.tr.md');
const EN = read('../src/content/theory.en.md');

describe('routing', () => {
  it('reads a route and an optional anchor out of the hash', () => {
    expect(parseHash('#/about')).toEqual({ route: 'about', anchor: null });
    expect(parseHash('#/theory/ch-04')).toEqual({ route: 'theory', anchor: 'ch-04' });
    expect(parseHash('#/designer')).toEqual({ route: 'designer', anchor: null });
  });

  it('falls back to the designer for anything unrecognised', () => {
    // A stale bookmark or a hand-typed hash must land somewhere useful rather
    // than rendering nothing.
    for (const hash of ['', '#', '#/', '#/nope', '#/../etc', 'garbage']) {
      expect(parseHash(hash).route).toBe('designer');
    }
  });

  it('round-trips every route through its href', () => {
    for (const r of ROUTES) {
      expect(parseHash(hrefFor(r))).toEqual({ route: r, anchor: null });
      expect(parseHash(hrefFor(r, 'x-1'))).toEqual({ route: r, anchor: 'x-1' });
    }
  });
});

describe('markdown', () => {
  it('parses each block kind', () => {
    const blocks = parseMarkdown(
      [
        '# Title',
        '',
        'A paragraph that',
        'spans two lines.',
        '',
        '- one',
        '- two',
        '',
        '1. first',
        '2. second',
        '',
        '> a note',
        '',
        '```',
        'x = 1',
        '```',
        '',
        '| a | b |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        '---',
      ].join('\n'),
    );
    const kinds = blocks.map((b) => b.kind);
    expect(kinds).toEqual([
      'heading', 'paragraph', 'list', 'list', 'quote', 'pre', 'table', 'rule',
    ]);
    const para = blocks[1] as Extract<Block, { kind: 'paragraph' }>;
    expect(para.text).toBe('A paragraph that spans two lines.');
    const ordered = blocks[3] as Extract<Block, { kind: 'list' }>;
    expect(ordered.ordered).toBe(true);
    const table = blocks[6] as Extract<Block, { kind: 'table' }>;
    expect(table.header).toEqual(['a', 'b']);
    expect(table.rows).toEqual([['1', '2']]);
  });

  it('keeps fenced content verbatim, including markdown-looking lines', () => {
    const blocks = parseMarkdown(['```', '# not a heading', '- not a list', '```'].join('\n'));
    expect(blocks).toHaveLength(1);
    const pre = blocks[0] as Extract<Block, { kind: 'pre' }>;
    expect(pre.lines).toEqual(['# not a heading', '- not a list']);
  });

  it('folds Turkish letters that Unicode decomposition leaves intact', () => {
    // 'ı' and 'İ' are separate letters, not accented forms, so NFD does not
    // touch them; without an explicit map they would be stripped and two
    // different headings could collide on one anchor.
    expect(slugify('Kısıtlar ve Ağırlıklar')).toBe('kisitlar-ve-agirliklar');
    expect(slugify('İletim açısı')).toBe('iletim-acisi');
    expect(slugify('Şase / Öteleme')).toBe('sase-oteleme');
  });

  it('never emits an empty slug', () => {
    expect(slugify('§ — ···')).toBe('section');
    expect(slugify('')).toBe('section');
  });

  it('disambiguates repeated headings instead of colliding', () => {
    const blocks = parseMarkdown('# Örnek\n\n# Örnek\n\n# Örnek');
    const ids = blocks.map((b) => (b as Extract<Block, { kind: 'heading' }>).id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('ornek');
  });

  it('terminates on input no rule consumes', () => {
    // The parser advances unconditionally on an unmatched line; a regression
    // here would hang the page rather than render it wrong.
    expect(() => parseMarkdown('|\n||\n   \n\t\n>')).not.toThrow();
  });
});

describe('theory reference', () => {
  const trBlocks = parseMarkdown(TR);
  const enBlocks = parseMarkdown(EN);

  it('the Turkish reference is the full-length document', () => {
    expect(TR.replace(/\n$/, '').split('\n').length).toBeGreaterThanOrEqual(5000);
  });

  it('both languages are substantial and structured', () => {
    for (const [name, blocks] of [
      ['tr', trBlocks],
      ['en', enBlocks],
    ] as const) {
      const chapters = blocks.filter((b) => b.kind === 'heading' && b.level === 1);
      expect(chapters.length, `${name} chapters`).toBeGreaterThanOrEqual(40);
      expect(tocOf(blocks).length, `${name} sections`).toBeGreaterThan(150);
      expect(blocks.filter((b) => b.kind === 'table').length, `${name} tables`).toBeGreaterThan(20);
      expect(blocks.filter((b) => b.kind === 'pre').length, `${name} formulas`).toBeGreaterThan(30);
    }
  });

  it('every heading anchor is unique, so deep links are unambiguous', () => {
    for (const blocks of [trBlocks, enBlocks]) {
      const ids = blocks
        .filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading')
        .map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has no unterminated code fence', () => {
    for (const src of [TR, EN]) {
      expect(src.split('\n').filter((l) => /^```/.test(l)).length % 2).toBe(0);
    }
  });

  it('states the measured results consistently with the shipped design', () => {
    // The reference quotes numbers that the tests elsewhere re-derive from the
    // solver. If a scoring definition moves, this catches the document going
    // stale alongside the data.
    for (const src of [TR, EN]) {
      expect(src).toContain('11.41');
      expect(src).toContain('44.75');
      expect(src).toContain('720 / 720');
    }
  });
});

describe('brand asset', () => {
  const svg = read('../public/kreamet-logo.svg');

  it('is a self-contained SVG with an accessible name', () => {
    expect(svg).toMatch(/<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('aria-label="KREAMET"');
    // A logo that reaches out for an external asset breaks the moment it is
    // opened from a file path or a different origin.
    expect(svg).not.toMatch(/<image|xlink:href|url\(http/);
  });

  it('pins the wordmark width so it does not depend on the viewer’s fonts', () => {
    expect(svg).toMatch(/textLength="\d+"/);
    expect(svg).toContain('lengthAdjust=');
  });

  it('the viewBox is wide enough for the wordmark', () => {
    // The regression this guards: the box was 252 wide while the wordmark ran
    // to x = 270, so the final "T" was clipped at every size it was drawn.
    const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
    expect(box).not.toBeNull();
    const width = Number(box![1]);
    const x = Number(/<text x="([\d.]+)"/.exec(svg)![1]);
    const len = Number(/textLength="([\d.]+)"/.exec(svg)![1]);
    expect(x + len).toBeLessThanOrEqual(width);
  });
});

describe('about content', () => {
  it('carries a developer profile with working links', () => {
    expect(DEVELOPER.name.length).toBeGreaterThan(0);
    expect(DEVELOPER.bio.length).toBeGreaterThan(0);
    expect(DEVELOPER.links.length).toBeGreaterThan(0);
    for (const l of DEVELOPER.links) {
      expect(l.href).toMatch(/^(https:\/\/|mailto:)/);
    }
  });

  it('is fully bilingual — no section is one language only', () => {
    const pairs = [
      DEVELOPER.role,
      ...DEVELOPER.bio,
      ...PROJECT_FACTS.flatMap((f) => [f.label, f.note]),
      ...TECH_STACK.map((s) => s.role),
      ...METHODS.flatMap((m) => [m.title, m.body]),
      ...VERIFICATION,
    ];
    for (const p of pairs) {
      expect(p.tr.trim().length).toBeGreaterThan(0);
      expect(p.en.trim().length).toBeGreaterThan(0);
      // A copy-paste of the English into the Turkish slot is the failure this
      // guards against; identical strings are almost never a real translation.
      expect(p.tr).not.toBe(p.en);
    }
  });
});
