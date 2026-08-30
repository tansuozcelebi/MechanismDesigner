/**
 * Emit the crawlable surface of the site into `dist/`, after `vite build`.
 *
 *   npx tsx scripts/seo.ts [--out dist]
 *
 * Why this exists at all: the app is a single page with **hash routing**, and a
 * crawler does not treat `#/theory` as a URL distinct from `/`. Left alone, the
 * whole site is one indexable page whose body is an empty `<div id="root">` —
 * the 5000-line reference is invisible to search engines and to answer engines
 * alike, no matter how many meta tags the shell carries.
 *
 * So the build also writes real HTML at real paths. Those pages contain the
 * actual text, are self-contained, and link into the interactive app. They are
 * the SEO/AEO surface; the SPA remains the product.
 *
 * They are NOT redirects. A redirect would hand the crawler back to the same
 * empty shell and throw away the only thing worth indexing.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  AUTHOR,
  LANGS,
  PAGES,
  REPO_URL,
  DEFAULT_SITE_URL,
  SITE_URL,
  abs,
  pageById,
  type Lang,
  type Page,
  type PageMeta,
} from '../src/seo/config';
import {
  blocksToHtml,
  escapeHtml,
  extractFaq,
  parseMarkdown,
  stripInline,
  type Block,
} from '../src/ui/markdownHtml';
import {
  DEVELOPER,
  METHODS,
  PROJECT_FACTS,
  TECH_STACK,
  VERIFICATION,
  type Bilingual,
} from '../src/content/about';

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const OUT = resolve(process.cwd(), outIdx >= 0 ? argv[outIdx + 1] : 'dist');
const ROOT = resolve(new URL('..', import.meta.url).pathname);

const write = (rel: string, body: string) => {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return { rel, bytes: Buffer.byteLength(body) };
};

const readDoc = (lang: Lang) =>
  readFileSync(join(ROOT, `src/content/theory.${lang}.md`), 'utf8');

const L = (b: Bilingual, lang: Lang) => b[lang];
const today = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

/**
 * Inlined rather than linked: these pages must render correctly the first time
 * they are fetched, including by a crawler that never runs JavaScript and may
 * not follow a stylesheet at all.
 */
const PAGE_CSS = `
:root{--bg:#0e1116;--panel:#151a21;--border:#242c38;--text:#dbe3ee;--dim:#8493a8;--faint:#61708a;--accent:#f2a33c;--blue:#2f8bee;
--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--sans:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.7}
.wrap{max-width:860px;margin:0 auto;padding:28px 22px 80px}
header.top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 22px;border-bottom:1px solid var(--border);background:var(--panel)}
header.top img{height:30px;width:auto;display:block}
header.top nav{display:flex;gap:4px;flex-wrap:wrap}
header.top nav a{color:var(--dim);text-decoration:none;font-size:13px;padding:5px 9px;border-radius:4px}
header.top nav a:hover{color:var(--text);background:#1a212b}
header.top .lang{margin-left:auto;display:flex;gap:6px;font-size:12px}
h1{font-size:31px;line-height:1.25;margin:26px 0 10px;letter-spacing:-.01em}
h2{font-size:22px;margin:36px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border)}
h3{font-size:17px;margin:26px 0 8px;color:var(--accent)}
h4{font-size:15px;margin:20px 0 6px;color:#9fb3cc}
p{margin:0 0 14px}
a{color:#5aa9f5}
ul,ol{margin:0 0 16px;padding-left:22px}
li{margin-bottom:6px}
code{font-family:var(--mono);font-size:.88em;background:#191f28;border:1px solid #232b36;border-radius:3px;padding:1px 4px}
pre{margin:0 0 18px;padding:12px 14px;background:#12171e;border:1px solid var(--border);border-left:2px solid var(--blue);border-radius:5px;overflow-x:auto}
pre code{background:none;border:none;padding:0;font-size:13px;line-height:1.6;white-space:pre}
blockquote{margin:0 0 18px;padding:12px 16px;background:#161c24;border-left:2px solid var(--accent);border-radius:0 5px 5px 0}
blockquote p:last-child{margin:0}
.tablewrap{overflow-x:auto;margin:0 0 18px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #1c232d;vertical-align:top}
th{color:var(--faint);font-weight:600;white-space:nowrap}
hr{border:none;border-top:1px solid var(--border);margin:32px 0}
.lede{font-size:18px;color:var(--dim);margin-bottom:22px}
.cta{display:inline-block;margin:6px 8px 20px 0;padding:11px 18px;border:1px solid var(--accent);border-radius:6px;color:var(--accent);text-decoration:none;font-weight:600}
.cta:hover{background:#1c1a15}
.note{font-size:13.5px;color:var(--faint);border-top:1px solid var(--border);margin-top:44px;padding-top:16px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0}
.fact{background:var(--panel);border:1px solid var(--border);border-left:2px solid var(--accent);border-radius:6px;padding:14px 16px}
.fact b{display:block;font-family:var(--mono);font-size:21px;font-weight:500}
.fact span{display:block;font-size:13px;color:var(--accent);margin:3px 0 5px}
.fact em{display:block;font-style:normal;font-size:13px;color:var(--dim)}
.toc{background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:14px 18px;margin:22px 0}
.toc ol{margin:0;padding-left:20px;columns:2;column-gap:28px}
.toc li{margin-bottom:3px;font-size:14px;break-inside:avoid}
@media(max-width:640px){.toc ol{columns:1}}
`.trim();

type Jsonld = Record<string, unknown>;

function shell(opts: {
  lang: Lang;
  meta: PageMeta;
  alternates: { lang: Lang; url: string }[];
  jsonld: Jsonld[];
  body: string;
}): string {
  const { lang, meta, alternates, jsonld, body } = opts;
  const canonical = abs(meta.path);
  const nav = PAGES.map(
    (p) => `<a href="${escapeHtml(abs(p[lang].path))}">${escapeHtml(p[lang].heading)}</a>`,
  ).join('');
  const langLinks = alternates
    .map(
      (a) =>
        `<a href="${escapeHtml(a.url)}"${a.lang === lang ? ' aria-current="true"' : ''}>${a.lang.toUpperCase()}</a>`,
    )
    .join(' ');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="keywords" content="${escapeHtml(meta.keywords.join(', '))}">
<meta name="author" content="${escapeHtml(AUTHOR.name)}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="theme-color" content="#0e1116">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="icon" type="image/svg+xml" href="${escapeHtml(abs('/favicon.svg'))}">
${alternates
  .map(
    (a) =>
      `<link rel="alternate" hreflang="${a.lang}" href="${escapeHtml(a.url)}">`,
  )
  .join('\n')}
<link rel="alternate" hreflang="x-default" href="${escapeHtml(abs(pageById('home').en.path))}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="KREAMET">
<meta property="og:locale" content="${lang === 'tr' ? 'tr_TR' : 'en_US'}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(abs('/kreamet-logo.svg'))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(abs('/kreamet-logo.svg'))}">
<style>${PAGE_CSS}</style>
${jsonld
  .map(
    (j) =>
      `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`,
  )
  .join('\n')}
</head>
<body>
<header class="top">
  <a href="${escapeHtml(abs('/'))}"><img src="${escapeHtml(abs('/kreamet-logo.svg'))}" alt="KREAMET" width="252" height="58"></a>
  <nav>${nav}</nav>
  <span class="lang">${langLinks}</span>
</header>
<main class="wrap">
${body}
<p class="note">${
    lang === 'tr'
      ? `Bu sayfa, tarayıcı gerektirmeden okunabilmesi için üretilmiş durağan bir kopyadır. Etkileşimli uygulama <a href="${escapeHtml(abs('/'))}${escapeHtml(meta.appHash)}">buradadır</a>. Kaynak kod: <a href="${REPO_URL}">GitHub</a>.`
      : `This is a static copy, generated so the content can be read without running a browser. The interactive application is <a href="${escapeHtml(abs('/'))}${escapeHtml(meta.appHash)}">here</a>. Source: <a href="${REPO_URL}">GitHub</a>.`
  }</p>
</main>
</body>
</html>
`;
}

const alternatesFor = (page: Page) =>
  LANGS.map((l) => ({ lang: l, url: abs(page[l].path) }));

/* ------------------------------------------------------------------ */
/* Structured data                                                     */
/* ------------------------------------------------------------------ */

const personLd = (): Jsonld => ({
  '@type': 'Person',
  '@id': `${SITE_URL}/#author`,
  name: AUTHOR.name,
  url: AUTHOR.url,
  sameAs: [AUTHOR.url, REPO_URL],
});

const softwareLd = (lang: Lang): Jsonld => {
  const home = pageById('home')[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#app`,
    name: 'KREAMET',
    alternateName:
      lang === 'tr' ? 'KREAMET Mekanizma Tasarım Yazılımı' : 'KREAMET Mechanism Design Software',
    applicationCategory: 'EngineeringApplication',
    applicationSubCategory:
      lang === 'tr' ? 'Mekanizma sentezi ve kinematik analiz' : 'Mechanism synthesis and kinematic analysis',
    operatingSystem: 'Web browser',
    url: abs(home.path),
    description: home.description,
    inLanguage: LANGS,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: personLd(),
    codeRepository: REPO_URL,
    featureList:
      lang === 'tr'
        ? [
            '4–14 kol arası değişken mekanizma boyutu, her boyutta 1 serbestlik derecesi',
            'Kapalı form kinematik çözüm; hiçbir yerde Newton iterasyonu yok',
            'Elle çizilebilen, içe/dışa aktarılabilen hedef yörünge',
            'Tarayıcıda Web Worker içinde Diferansiyel Evrim optimizasyonu',
            'İletim açısı, tekillik payı, girişim ve montaj katmanı ölçümü',
            'Lagrange motor momenti ve yerçekimi momenti analizi',
            'Türkçe ve İngilizce arayüz',
          ]
        : [
            'Variable mechanism size from 4 to 14 bars, 1 DOF at every size',
            'Closed-form kinematics; no Newton iteration anywhere',
            'Hand-drawn, importable and exportable target trajectory',
            'In-browser Differential Evolution optimisation in a Web Worker',
            'Transmission angle, singularity margin, interference and assembly layers',
            'Lagrange motor torque and gravity torque analysis',
            'Turkish and English interface',
          ],
  };
};

const websiteLd = (lang: Lang): Jsonld => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: 'KREAMET',
  url: abs(pageById('home')[lang].path),
  inLanguage: lang,
  publisher: personLd(),
});

const breadcrumbLd = (lang: Lang, page: Page): Jsonld => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'KREAMET',
      item: abs(pageById('home')[lang].path),
    },
    { '@type': 'ListItem', position: 2, name: page[lang].heading, item: abs(page[lang].path) },
  ],
});

const articleLd = (lang: Lang, page: Page, wordCount: number, sections: string[]): Jsonld => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: page[lang].heading,
  description: page[lang].description,
  inLanguage: lang,
  url: abs(page[lang].path),
  mainEntityOfPage: { '@type': 'WebPage', '@id': abs(page[lang].path) },
  author: personLd(),
  wordCount,
  dateModified: today,
  articleSection: sections,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: page[lang].keywords.map((k) => ({ '@type': 'Thing', name: k })),
});

const faqLd = (faqs: { question: string; answer: string }[]): Jsonld => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
});

/* ------------------------------------------------------------------ */
/* Page bodies                                                         */
/* ------------------------------------------------------------------ */

function homeBody(lang: Lang): string {
  const m = pageById('home')[lang];
  const tr = lang === 'tr';
  const facts = PROJECT_FACTS.map(
    (f) =>
      `<div class="fact"><b>${escapeHtml(f.value)}</b><span>${escapeHtml(
        L(f.label, lang),
      )}</span><em>${escapeHtml(L(f.note, lang))}</em></div>`,
  ).join('');
  const methods = METHODS.map(
    (x) => `<h3>${escapeHtml(L(x.title, lang))}</h3><p>${escapeHtml(L(x.body, lang))}</p>`,
  ).join('');

  return `<h1>${escapeHtml(m.heading)}</h1>
<p class="lede">${escapeHtml(m.description)}</p>
<p><a class="cta" href="${escapeHtml(abs('/'))}${escapeHtml(m.appHash)}">${
    tr ? 'Uygulamayı aç' : 'Open the application'
  }</a>
<a class="cta" href="${escapeHtml(abs(pageById('theory')[lang].path))}">${
    tr ? 'Mekanizma tekniği referansı' : 'Mechanism theory reference'
  }</a></p>
<h2>${tr ? 'Ölçülmüş sonuçlar' : 'Measured results'}</h2>
<div class="facts">${facts}</div>
<h2>${tr ? 'Nasıl çalışıyor' : 'How it works'}</h2>
${methods}
<h2>${tr ? 'Nasıl doğrulanıyor' : 'How it is verified'}</h2>
<ul>${VERIFICATION.map((v) => `<li>${escapeHtml(L(v, lang))}</li>`).join('')}</ul>
<h2>${tr ? 'Kullanılan teknolojiler' : 'Built with'}</h2>
<div class="tablewrap"><table><tbody>${TECH_STACK.map(
    (s) => `<tr><td><code>${escapeHtml(s.name)}</code></td><td>${escapeHtml(L(s.role, lang))}</td></tr>`,
  ).join('')}</tbody></table></div>`;
}

function aboutBody(lang: Lang): string {
  const m = pageById('about')[lang];
  const tr = lang === 'tr';
  return `<h1>${escapeHtml(m.heading)}</h1>
<p class="lede">${escapeHtml(m.description)}</p>
<h2>${tr ? 'Geliştirici' : 'Developer'}</h2>
<p><strong>${escapeHtml(DEVELOPER.name)}</strong> — ${escapeHtml(L(DEVELOPER.role, lang))}</p>
${DEVELOPER.bio.map((b) => `<p>${escapeHtml(L(b, lang))}</p>`).join('')}
<ul>${DEVELOPER.links
    .map(
      (l) =>
        `<li>${escapeHtml(l.label)}: <a href="${escapeHtml(l.href)}"${
          l.href.startsWith('mailto:') ? '' : ' rel="noreferrer noopener"'
        }>${escapeHtml(l.text)}</a></li>`,
    )
    .join('')}</ul>
<h2>${tr ? 'Ölçülmüş sonuçlar' : 'Measured results'}</h2>
<div class="facts">${PROJECT_FACTS.map(
    (f) =>
      `<div class="fact"><b>${escapeHtml(f.value)}</b><span>${escapeHtml(
        L(f.label, lang),
      )}</span><em>${escapeHtml(L(f.note, lang))}</em></div>`,
  ).join('')}</div>
<h2>${tr ? 'Yöntemler' : 'Methods'}</h2>
${METHODS.map(
    (x) => `<h3>${escapeHtml(L(x.title, lang))}</h3><p>${escapeHtml(L(x.body, lang))}</p>`,
  ).join('')}`;
}

function theoryBody(lang: Lang, blocks: Block[]): string {
  const chapters = blocks.filter(
    (b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading' && b.level === 1,
  );
  const toc = chapters
    .slice(1) // the first h1 is the document title, already the page heading
    .map((c) => `<li><a href="#${escapeHtml(c.id)}">${escapeHtml(stripInline(c.text))}</a></li>`)
    .join('');
  const label = lang === 'tr' ? 'İçindekiler' : 'Contents';
  return `<nav class="toc" aria-label="${label}"><strong>${label}</strong><ol>${toc}</ol></nav>
${blocksToHtml(blocks)}`;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const written: { rel: string; bytes: number }[] = [];

const docs = Object.fromEntries(
  LANGS.map((l) => {
    const src = readDoc(l);
    return [l, { src, blocks: parseMarkdown(src) }];
  }),
) as Record<Lang, { src: string; blocks: Block[] }>;

for (const lang of LANGS) {
  const { src, blocks } = docs[lang];
  const wordCount = stripInline(src).split(/\s+/).filter(Boolean).length;
  const chapterNames = blocks
    .filter((b) => b.kind === 'heading' && b.level === 1)
    .map((b) => stripInline((b as Extract<Block, { kind: 'heading' }>).text));
  const faqs = extractFaq(blocks, lang === 'tr' ? /Sıkça sorulan/i : /Frequently asked/i);

  // Home
  const home = pageById('home');
  written.push(
    write(
      join(home[lang].path, 'index.html'),
      shell({
        lang,
        meta: home[lang],
        alternates: alternatesFor(home),
        jsonld: [softwareLd(lang), websiteLd(lang)],
        body: homeBody(lang),
      }),
    ),
  );

  // About
  const about = pageById('about');
  written.push(
    write(
      join(about[lang].path, 'index.html'),
      shell({
        lang,
        meta: about[lang],
        alternates: alternatesFor(about),
        jsonld: [
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: about[lang].heading,
            description: about[lang].description,
            inLanguage: lang,
            url: abs(about[lang].path),
            mainEntity: personLd(),
            isPartOf: { '@id': `${SITE_URL}/#website` },
          },
          breadcrumbLd(lang, about),
        ],
        body: aboutBody(lang),
      }),
    ),
  );

  // Theory — the whole reference as static HTML. This is the page an answer
  // engine can actually read, and the reason any of this is worth doing.
  const theory = pageById('theory');
  written.push(
    write(
      join(theory[lang].path, 'index.html'),
      shell({
        lang,
        meta: theory[lang],
        alternates: alternatesFor(theory),
        jsonld: [
          articleLd(lang, theory, wordCount, chapterNames.slice(0, 40)),
          breadcrumbLd(lang, theory),
          ...(faqs.length ? [faqLd(faqs)] : []),
        ],
        body: theoryBody(lang, blocks),
      }),
    ),
  );

  console.log(
    `${lang}: ${chapterNames.length} chapters, ${wordCount} words, ${faqs.length} FAQ entries`,
  );
}

/* ---------------------------- sitemap.xml --------------------------- */

const SITEMAP_HEAD =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
  ' xmlns:xhtml="http://www.w3.org/1999/xhtml">';

const urls = PAGES.flatMap((page) =>
  LANGS.map((lang) => {
    const alts = alternatesFor(page)
      .map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${escapeHtml(a.url)}"/>`,
      )
      .join('\n');
    return `  <url>
    <loc>${escapeHtml(abs(page[lang].path))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(
      abs(pageById('home').en.path),
    )}"/>
  </url>`;
  }),
).join('\n');

written.push(write('sitemap.xml', `${SITEMAP_HEAD}\n${urls}\n</urlset>\n`));

/* ----------------------------- robots.txt --------------------------- */

written.push(
  write(
    'robots.txt',
    `# KREAMET — ${REPO_URL}
User-agent: *
Allow: /

# Source maps and the worker bundle carry nothing a crawler can use.
Disallow: /assets/*.map$

Sitemap: ${abs('/sitemap.xml')}
`,
  ),
);

/* ------------------------------ llms.txt ---------------------------- */

/**
 * llmstxt.org convention: a short, link-first index an LLM can read instead of
 * scraping rendered pages. `llms-full.txt` carries the whole reference as plain
 * text, which is what actually answers a mechanism question.
 */
const llms = `# KREAMET

> ${pageById('home').en.description}

KREAMET is a browser-based workbench for synthesising planar linkages: given a
target curve, it searches mechanism dimensions and then proves the result by
measurement rather than assertion. Every figure it reports — trajectory error,
transmission angle, loop closure, singularity margin, assembly layers — is
computed by the same solver the optimiser minimised.

The application uses hash routing, so the pages below are static copies
generated for reading; the interactive app lives at ${abs('/')}.

## Documentation

- [Mechanism Theory — A Working Reference](${abs(pageById('theory').en.path)}): ${
  pageById('theory').en.description
}
- [Mekanizma Tekniği — Kapsamlı Referans (Türkçe, 5000 satır)](${abs(
  pageById('theory').tr.path,
)}): ${pageById('theory').tr.description}
- [About the project and its methods](${abs(pageById('about').en.path)})
- [Proje ve yöntemler hakkında (Türkçe)](${abs(pageById('about').tr.path)})

## Full text

- [llms-full.txt](${abs('/llms-full.txt')}): the complete reference in both
  languages as plain text.

## Source

- [GitHub repository](${REPO_URL})

## Notes

- Languages: Turkish (primary for the reference) and English.
- Units: millimetres for geometry, SI for dynamics, degrees for angles in prose.
- The Turkish reference is the fuller document; where the two differ in detail,
  it is the authoritative one.
`;
written.push(write('llms.txt', llms));

const fullText = [
  `# KREAMET — full documentation`,
  ``,
  `Source: ${REPO_URL}`,
  `Site: ${abs('/')}`,
  `Generated: ${today}`,
  ``,
  `This file contains the complete mechanism-theory reference in both languages.`,
  `The Turkish document is the fuller one.`,
  ``,
  `---`,
  ``,
  `# Türkçe — ${abs(pageById('theory').tr.path)}`,
  ``,
  docs.tr.src,
  ``,
  `---`,
  ``,
  `# English — ${abs(pageById('theory').en.path)}`,
  ``,
  docs.en.src,
  '',
].join('\n');
written.push(write('llms-full.txt', fullText));

/* ------------------- rewrite the SPA shell's origin ------------------ */

/**
 * `index.html` carries absolute URLs (canonical, hreflang, og:url, JSON-LD)
 * written against the default deploy target, because a relative canonical is
 * not valid and the dev server has to serve something sensible. When the build
 * is pointed elsewhere with SITE_URL, those literals would otherwise be wrong —
 * a canonical pointing at a different origin is worse than none at all.
 *
 * A test pins the literal in index.html to DEFAULT_SITE_URL, so this rewrite
 * can never silently miss.
 */
if (SITE_URL !== DEFAULT_SITE_URL) {
  const shellPath = join(OUT, 'index.html');
  try {
    const html = readFileSync(shellPath, 'utf8');
    const fixed = html.split(DEFAULT_SITE_URL).join(SITE_URL);
    writeFileSync(shellPath, fixed);
    console.log(`Rewrote ${DEFAULT_SITE_URL} -> ${SITE_URL} in index.html`);
  } catch {
    console.warn('index.html not found in the output directory; run vite build first.');
  }
}

/* ------------------------------ report ------------------------------ */

console.log(`\nSite URL: ${SITE_URL}`);
for (const w of written) {
  console.log(`  ${w.rel.padEnd(38)} ${(w.bytes / 1024).toFixed(1)} kB`);
}
console.log(`\n${written.length} files written to ${OUT}`);
