/**
 * Everything the site says about itself to crawlers and answer engines.
 *
 * Kept as data in one module so the sitemap, the llms.txt index, the static
 * pages and the app's own <head> cannot drift apart: a URL that appears in the
 * sitemap but is never generated is a 404 reported to Google, and a canonical
 * that disagrees with the sitemap is worse than having neither.
 */

export type Lang = 'tr' | 'en';
export const LANGS: Lang[] = ['tr', 'en'];

/**
 * Absolute origin plus base path, no trailing slash.
 *
 * There is no committed deploy target — no CNAME, no `homepage` field — so this
 * defaults to the GitHub Pages URL the repository would publish to and is
 * overridden at build time with `SITE_URL=https://example.com npm run build`.
 * Canonicals, hreflang and the sitemap are only correct if this matches where
 * the site actually lives, so it is deliberately one setting rather than a
 * value repeated in five files.
 */
export const DEFAULT_SITE_URL = 'https://tansuozcelebi.github.io/MechanismDesigner';

export const SITE_URL = (
  (typeof process !== 'undefined' ? process.env?.SITE_URL : undefined) ?? DEFAULT_SITE_URL
).replace(/\/+$/, '');

export const abs = (path: string): string =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export type PageId = 'home' | 'about' | 'theory';

export type PageMeta = {
  /** Crawlable path, one per language. Localised, because a Turkish keyword in
   *  the URL is worth more to a Turkish search than a tidy shared slug. */
  path: string;
  title: string;
  description: string;
  keywords: string[];
  /** Where the same content lives inside the single-page app. */
  appHash: string;
  /** Heading shown at the top of the static page. */
  heading: string;
};

export type Page = {
  id: PageId;
  /** Priority and change frequency for the sitemap. */
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tr: PageMeta;
  en: PageMeta;
};

export const PAGES: Page[] = [
  {
    id: 'home',
    priority: 1.0,
    changefreq: 'weekly',
    tr: {
      path: '/tr/',
      appHash: '#/designer',
      heading: 'KREAMET — Mekanizma Tasarım Yazılımı',
      title: 'KREAMET — Mekanizma Tasarım Yazılımı | Kol Mekanizması Sentezi',
      description:
        'KREAMET, tek motorlu, kamsız, düzlemsel ve kapalı çevrimli mekanizmaları verilen bir yörüngeyi çizecek şekilde sentezler. 4–14 kol, düzenlenebilir hedef eğri, tarayıcıda çalışan optimizasyon ve ölçülmüş doğrulama.',
      keywords: [
        'mekanizma tasarımı',
        'kol mekanizması',
        'dört çubuk mekanizması',
        'mekanizma sentezi',
        'kinematik analiz',
        'serbestlik derecesi',
        'iletim açısı',
        'kavrayıcı eğrisi',
        'Assur diyadı',
        'mekanizma tekniği',
      ],
    },
    en: {
      path: '/en/',
      appHash: '#/designer',
      heading: 'KREAMET — Mechanism Design Software',
      title: 'KREAMET — Mechanism Design Software | Planar Linkage Synthesis',
      description:
        'KREAMET synthesises single-motor, cam-free, planar closed-loop linkages that trace a given path. 4–14 bars, an editable target curve, in-browser optimisation and measured verification.',
      keywords: [
        'mechanism design',
        'linkage synthesis',
        'four-bar linkage',
        'path generation',
        'kinematic analysis',
        'degrees of freedom',
        'transmission angle',
        'coupler curve',
        'Assur dyad',
        'mechanism theory',
      ],
    },
  },
  {
    id: 'about',
    priority: 0.6,
    changefreq: 'monthly',
    tr: {
      path: '/tr/hakkinda/',
      appHash: '#/about',
      heading: 'KREAMET Hakkında',
      title: 'Hakkında — KREAMET Mekanizma Tasarım Yazılımı',
      description:
        'KREAMET projesi, geliştiricisi, kullanılan yöntemler ve ölçülmüş sonuçlar: kapalı form kinematik, Assur diyadları, dal sürekliliği, katı Procrustes hizalama ve montaj katmanlama.',
      keywords: ['KREAMET', 'mekanizma tasarım yazılımı', 'proje hakkında', 'geliştirici'],
    },
    en: {
      path: '/en/about/',
      appHash: '#/about',
      heading: 'About KREAMET',
      title: 'About — KREAMET Mechanism Design Software',
      description:
        'The KREAMET project, its developer, the methods it uses and the results it measures: closed-form kinematics, Assur dyads, branch continuity, rigid Procrustes alignment and assembly layering.',
      keywords: ['KREAMET', 'mechanism design software', 'about the project', 'developer'],
    },
  },
  {
    id: 'theory',
    priority: 0.9,
    changefreq: 'monthly',
    tr: {
      path: '/tr/mekanizma-teknigi/',
      appHash: '#/theory',
      heading: 'Mekanizma Tekniği — Kapsamlı Referans',
      title: 'Mekanizma Tekniği — Kapsamlı Referans | KREAMET',
      description:
        'Mekanizma tekniğinin kapsamlı Türkçe referansı: serbestlik derecesi, Grübler–Kutzbach, Assur grupları, dört çubuk ve Grashof, konum/hız/ivme analizi, tekillikler, iletim açısı, kavrayıcı eğrileri, boyut sentezi, dinamik, kam, dişli ve imalat.',
      keywords: [
        'mekanizma tekniği',
        'Grübler Kutzbach',
        'Grashof koşulu',
        'Assur grupları',
        'iletim açısı',
        'kavrayıcı eğrisi',
        'Burmester teorisi',
        'Freudenstein denklemi',
        'kinematik sentez',
        'kam mekanizması',
      ],
    },
    en: {
      path: '/en/theory/',
      appHash: '#/theory',
      heading: 'Mechanism Theory — A Working Reference',
      title: 'Mechanism Theory — A Working Reference | KREAMET',
      description:
        'A working reference on mechanism theory: degrees of freedom, Grübler–Kutzbach, Assur groups, four-bar and Grashof, position/velocity/acceleration analysis, singularities, transmission angle, coupler curves, dimensional synthesis, dynamics, cams, gears and manufacture.',
      keywords: [
        'mechanism theory',
        'Grubler Kutzbach',
        'Grashof condition',
        'Assur groups',
        'transmission angle',
        'coupler curve',
        'Burmester theory',
        'Freudenstein equation',
        'kinematic synthesis',
        'cam mechanism',
      ],
    },
  },
];

export const pageById = (id: PageId): Page => {
  const p = PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown page: ${id}`);
  return p;
};

/** Every crawlable URL the build produces, in sitemap order. */
export const allUrls = (): { url: string; lang: Lang; page: Page }[] =>
  PAGES.flatMap((page) => LANGS.map((lang) => ({ url: abs(page[lang].path), lang, page })));

/* ------------------------------------------------------------------ */
/* Organisation-level facts                                            */
/* ------------------------------------------------------------------ */

export const AUTHOR = {
  name: 'Tansu Özçelebi',
  url: 'https://github.com/tansuozcelebi',
  email: 'tansuozcelebi@gmail.com',
};

export const REPO_URL = 'https://github.com/tansuozcelebi/MechanismDesigner';

export const LICENSE_NOTE =
  'Source available at ' + REPO_URL;
