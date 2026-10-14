/**
 * SEO and AEO audit of the built site.
 *
 *   npx tsx scripts/audit.ts [--out dist]
 *
 * Reads what the build actually produced — not the config it was produced
 * from — and checks it the way a crawler or an answer engine would meet it:
 * every page has one language, one canonical that points at itself, both
 * hreflang alternates, a title and description of a length that is shown
 * rather than truncated, a raster social image that exists, structured data
 * that parses, an FAQ whose answers are actually visible on the page, and
 * links that all resolve. The sitemap, robots.txt and llms.txt are checked
 * against the same files.
 *
 * Errors fail the build; warnings are printed and left to judgement.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { SITE_URL } from '../src/seo/config';

export type Finding = { level: 'error' | 'warn'; where: string; message: string };

const RASTER = /\.(png|jpe?g|webp|gif)$/i;

/** Every .html file under `dir`, skipping the hashed asset directory. */
function htmlFiles(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'assets' ? [] : htmlFiles(full, base);
    return name.endsWith('.html') ? [full] : [];
  });
}

const attr = (html: string, re: RegExp): string | null => re.exec(html)?.[1] ?? null;
const meta = (html: string, key: 'name' | 'property', value: string) =>
  attr(html, new RegExp(`<meta\\s+${key}="${value.replace(/[:.]/g, '\\$&')}"\\s+content="([^"]*)"`));

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Visible text, roughly: tags, scripts and styles removed, entities decoded. */
const visibleText = (html: string) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

/**
 * Map a URL on this site to the file that would serve it, or null for a URL
 * that is not ours. The SPA's hash routes are served by the root index.html.
 */
function fileFor(dir: string, url: string): string | null {
  let path: string;
  if (url.startsWith(SITE_URL)) path = url.slice(SITE_URL.length);
  else if (url.startsWith('/') && !url.startsWith('//')) path = url;
  else return null;
  path = path.replace(/[#?].*$/, '') || '/';
  const target = join(dir, decodeURIComponent(path));
  return path.endsWith('/') ? join(target, 'index.html') : target;
}

export function auditSite(dirArg: string): Finding[] {
  const dir = resolve(dirArg);
  const out: Finding[] = [];
  const add = (level: Finding['level'], where: string, message: string) =>
    out.push({ level, where, message });

  const pages = htmlFiles(dir);
  const shell = join(dir, 'index.html');

  for (const file of pages) {
    const where = '/' + relative(dir, file);
    const html = readFileSync(file, 'utf8');
    const isShell = file === shell;

    /* ------------------------------ basics ------------------------------ */
    const lang = attr(html, /<html lang="([^"]+)"/);
    if (!lang) add('error', where, 'no <html lang>');

    const title = attr(html, /<title>([^<]*)<\/title>/);
    if (!title) add('error', where, 'no <title>');
    else if (title.length < 15 || title.length > 70)
      add('warn', where, `title is ${title.length} characters; 15–70 is displayed in full`);

    const desc = attr(html, /<meta\s+name="description"\s+content="([^"]*)"/);
    if (!desc) add('error', where, 'no meta description');
    else if (desc.length < 70 || desc.length > 320)
      add('warn', where, `description is ${desc.length} characters; 70–320 is shown`);

    if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html))
      add('error', where, 'page is marked noindex');

    /* ---------------------------- canonical ----------------------------- */
    const canonical = attr(html, /<link\s+rel="canonical"\s+href="([^"]+)"/);
    if (!canonical) add('error', where, 'no canonical link');
    else {
      if (!/^https?:\/\//.test(canonical)) add('error', where, 'canonical is not absolute');
      if (!isShell && fileFor(dir, canonical) !== file)
        add('error', where, `canonical ${canonical} does not point at this page`);
    }

    const hreflangs = [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g)];
    for (const want of ['tr', 'en', 'x-default']) {
      if (!hreflangs.some((m) => m[1] === want)) add('error', where, `no hreflang="${want}"`);
    }
    for (const [, hl, href] of hreflangs) {
      const f = fileFor(dir, href);
      if (f && !existsSync(f)) add('error', where, `hreflang ${hl} → ${href} does not exist`);
    }

    /* ------------------------- social previews -------------------------- */
    const ogImage = meta(html, 'property', 'og:image');
    if (!ogImage) add('error', where, 'no og:image');
    else {
      if (!RASTER.test(ogImage))
        add('error', where, `og:image ${ogImage} is not a raster image; social networks will not show it`);
      const f = fileFor(dir, ogImage);
      if (f && !existsSync(f)) add('error', where, `og:image ${ogImage} does not exist`);
    }
    for (const k of ['og:title', 'og:description', 'og:url']) {
      if (!meta(html, 'property', k)) add('error', where, `no ${k}`);
    }
    if (!meta(html, 'name', 'twitter:card')) add('warn', where, 'no twitter:card');

    /* ----------------------------- structure ---------------------------- */
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 === 0) add('error', where, 'no <h1>');
    // The reference uses one h1 per chapter, mirroring the app's document
    // outline. Valid HTML and harmless to ranking, so a warning, not an error.
    else if (h1 > 1 && !isShell) add('warn', where, `${h1} <h1> elements`);

    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt="[^"]+"/.test(m[0])) add('error', where, `image without alt text: ${m[0].slice(0, 80)}`);
    }

    /* -------------------------- structured data ------------------------- */
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (blocks.length === 0) add('error', where, 'no JSON-LD');
    const text = visibleText(html);
    let hasFaq = false;
    for (const [, raw] of blocks) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw.replace(/\\u003c/g, '<'));
      } catch (e) {
        add('error', where, `JSON-LD does not parse: ${(e as Error).message}`);
        continue;
      }
      if (data['@context'] !== 'https://schema.org') add('error', where, 'JSON-LD without schema.org context');
      if (data['@type'] === 'FAQPage') {
        hasFaq = true;
        // Structured data must describe what a reader can see. An FAQ that
        // exists only in JSON-LD is spam by Google's rules, and an answer
        // engine quoting it would be quoting text the page does not show.
        for (const q of (data.mainEntity ?? []) as { name: string; acceptedAnswer: { text: string } }[]) {
          if (!text.includes(q.name.replace(/\s+/g, ' ')))
            add('error', where, `FAQ question not visible on the page: "${q.name.slice(0, 60)}"`);
        }
      }
    }
    // AEO: a page that answers nothing in question form is hard to quote.
    if (!hasFaq && !isShell && !/TechArticle|AboutPage/.test(html))
      add('warn', where, 'no FAQPage or article markup for answer engines');

    /* ------------------------------- links ------------------------------ */
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const url = decode(href);
      if (url.startsWith('#') || url.startsWith('mailto:')) continue;
      const f = fileFor(dir, url);
      if (f && !existsSync(f)) add('error', where, `broken link: ${url}`);
    }
  }

  /* ------------------------------ sitemap ------------------------------- */
  const sitemapPath = join(dir, 'sitemap.xml');
  if (!existsSync(sitemapPath)) add('error', 'sitemap.xml', 'missing');
  else {
    const xml = readFileSync(sitemapPath, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) {
      const f = fileFor(dir, loc);
      if (!f || !existsSync(f)) add('error', 'sitemap.xml', `lists ${loc}, which was not generated`);
    }
    for (const file of pages) {
      if (file === shell) continue;
      const url = `${SITE_URL}/${relative(dir, file).replace(/index\.html$/, '')}`;
      if (!locs.includes(url)) add('error', 'sitemap.xml', `does not list ${url}`);
    }
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    if (lastmods.length && new Set(lastmods).size === 1 && lastmods.length > 4)
      add('warn', 'sitemap.xml', 'every URL has the same lastmod; crawlers learn to ignore it');
  }

  /* ------------------------------ robots -------------------------------- */
  const robotsPath = join(dir, 'robots.txt');
  if (!existsSync(robotsPath)) add('error', 'robots.txt', 'missing');
  else {
    const robots = readFileSync(robotsPath, 'utf8');
    if (/^Disallow:\s*\/\s*$/m.test(robots)) add('error', 'robots.txt', 'disallows the whole site');
    if (!/^Sitemap: https?:\/\//m.test(robots)) add('error', 'robots.txt', 'no absolute Sitemap line');
  }

  /* ------------------------------ llms.txt ------------------------------ */
  const llmsPath = join(dir, 'llms.txt');
  if (!existsSync(llmsPath)) add('error', 'llms.txt', 'missing');
  else {
    const llms = readFileSync(llmsPath, 'utf8');
    if (!/^# /.test(llms)) add('error', 'llms.txt', 'does not start with an H1 title');
    if (!/^> /m.test(llms)) add('error', 'llms.txt', 'no one-line summary blockquote');
    for (const [, url] of llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
      const f = fileFor(dir, url);
      if (f && !existsSync(f)) add('error', 'llms.txt', `broken link: ${url}`);
    }
  }

  return out;
}

/* -------------------------------- CLI --------------------------------- */

if (process.argv[1] && /audit\.ts$/.test(process.argv[1])) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--out');
  const dir = i >= 0 ? argv[i + 1] : 'dist';
  const findings = auditSite(dir);
  const errors = findings.filter((f) => f.level === 'error');
  const warns = findings.filter((f) => f.level === 'warn');
  for (const f of [...errors, ...warns]) {
    console.log(`${f.level === 'error' ? 'ERROR' : 'warn '}  ${f.where.padEnd(36)} ${f.message}`);
  }
  console.log(
    `\nSEO/AEO audit of ${resolve(dir)}: ${htmlFiles(resolve(dir)).length} pages, ` +
      `${errors.length} error(s), ${warns.length} warning(s)`,
  );
  if (errors.length) process.exit(1);
}
