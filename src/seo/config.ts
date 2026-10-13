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

export type PageId = 'home' | 'optimizer' | 'runner' | 'favorites' | 'about' | 'theory';

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
  /** Short label for the static pages' navigation bar — the app's own nav wording. */
  nav: string;
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
      nav: 'Tasarım',
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
      nav: 'Designer',
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
    id: 'optimizer',
    priority: 0.8,
    changefreq: 'monthly',
    tr: {
      path: '/tr/optimizasyon/',
      appHash: '#/optimizer',
      nav: 'Optimizasyon',
      heading: 'Mekanizma Optimizasyonu — Diferansiyel Evrim ile Boyut Sentezi',
      title: 'Mekanizma Optimizasyonu — Boyut Sentezi | KREAMET',
      description:
        'KREAMET optimizasyonu, tek motorlu düzlemsel bir mekanizmanın kol boylarını hedef yörüngeyi çizecek şekilde tarayıcıda Diferansiyel Evrim ile arar; tam tur, iletim açısı, tekillik payı ve girişim ölçülerek puanlanır.',
      keywords: [
        'mekanizma optimizasyonu',
        'boyut sentezi',
        'diferansiyel evrim',
        'yörünge sentezi',
        'kavrayıcı eğrisi sentezi',
        'Chamfer RMS',
        'iletim açısı',
      ],
    },
    en: {
      path: '/en/optimizer/',
      appHash: '#/optimizer',
      nav: 'Optimiser',
      heading: 'Linkage Optimiser — Dimensional Synthesis by Differential Evolution',
      title: 'Linkage Optimiser — Dimensional Synthesis | KREAMET',
      description:
        'The KREAMET optimiser searches the link lengths of a single-motor planar linkage so its output traces a target path, using Differential Evolution in the browser and scoring full rotation, transmission angle, singularity margin and interference.',
      keywords: [
        'linkage optimisation',
        'dimensional synthesis',
        'differential evolution',
        'path synthesis',
        'coupler curve synthesis',
        'Chamfer RMS',
        'transmission angle',
      ],
    },
  },
  {
    id: 'runner',
    priority: 0.7,
    changefreq: 'monthly',
    tr: {
      path: '/tr/calistirici/',
      appHash: '#/runner',
      nav: 'Çalıştırıcı',
      heading: 'Mekanizma Çalıştırıcı — Canlı Kinematik ve Moment Simülasyonu',
      title: 'Mekanizma Çalıştırıcı — Kinematik Simülasyon | KREAMET',
      description:
        'KREAMET çalıştırıcısı mekanizmayı motor turu boyunca oynatır; çıkış noktasının hızı ve ivmesi, yerçekimi ve motor momenti, iletim açısı ve girişim anlık olarak gösterilir. Kurulum gerektirmez, tarayıcıda çalışır.',
      keywords: [
        'mekanizma simülasyonu',
        'kinematik simülasyon',
        'motor momenti',
        'yerçekimi momenti',
        'iletim açısı',
        'kol mekanizması animasyonu',
      ],
    },
    en: {
      path: '/en/runner/',
      appHash: '#/runner',
      nav: 'Runner',
      heading: 'Mechanism Runner — Live Kinematics and Torque Simulation',
      title: 'Mechanism Runner — Kinematic Simulation | KREAMET',
      description:
        'The KREAMET runner plays a linkage through its motor revolution with live output velocity and acceleration, gravity and motor torque, transmission angle and interference. Nothing to install: it runs in the browser.',
      keywords: [
        'mechanism simulation',
        'kinematic simulation',
        'linkage animation',
        'motor torque',
        'gravity torque',
        'transmission angle',
      ],
    },
  },
  {
    id: 'favorites',
    priority: 0.5,
    changefreq: 'monthly',
    tr: {
      path: '/tr/favori-mekanizmalar/',
      appHash: '#/favorites',
      nav: 'Favori Mekanizmalar',
      heading: 'Favori Mekanizmalar — Kaydet, Karşılaştır, Çalıştır',
      title: 'Favori Mekanizmalar — Kaydet ve Çalıştır | KREAMET',
      description:
        'KREAMET’te beğendiğiniz mekanizmaları hedef eğrisiyle birlikte yıldızlayıp saklayın; her favori kendi kartında hareket ederek oynar, Çalıştırıcıda veya Tasarım ekranında açılır ve JSON olarak dışa aktarılabilir.',
      keywords: [
        'favori mekanizmalar',
        'mekanizma kütüphanesi',
        'mekanizma karşılaştırma',
        'kol mekanizması animasyonu',
      ],
    },
    en: {
      path: '/en/favorites/',
      appHash: '#/favorites',
      nav: 'Favourite Mechanisms',
      heading: 'Favourite Mechanisms — Save, Compare and Run',
      title: 'Favourite Mechanisms — Save and Run | KREAMET',
      description:
        'Star the mechanisms worth keeping in KREAMET, together with their target curve. Each favourite plays on its own card, opens in the Runner or the Designer, and can be exported as JSON to move between machines.',
      keywords: [
        'favourite mechanisms',
        'mechanism library',
        'compare linkages',
        'linkage animation',
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
      nav: 'Hakkında',
      heading: 'KREAMET Hakkında',
      title: 'Hakkında — KREAMET Mekanizma Tasarım Yazılımı',
      description:
        'KREAMET projesi, geliştiricisi, kullanılan yöntemler ve ölçülmüş sonuçlar: kapalı form kinematik, Assur diyadları, dal sürekliliği, katı Procrustes hizalama ve montaj katmanlama.',
      keywords: ['KREAMET', 'mekanizma tasarım yazılımı', 'proje hakkında', 'geliştirici'],
    },
    en: {
      path: '/en/about/',
      appHash: '#/about',
      nav: 'About',
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
      nav: 'Mekanizma Tekniği',
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
      nav: 'Mechanism Theory',
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

/**
 * IndexNow key.
 *
 * IndexNow lets a site tell Bing, Yandex, Seznam and Naver that a URL changed
 * instead of waiting to be crawled. Ownership is proved by serving this exact
 * string at `/<key>.txt`, so the key is public by design — there is nothing to
 * keep secret and it belongs in the repository rather than in a secret, where
 * it would be invisible to the generator that has to write the file.
 *
 * Google does not participate: it retired its sitemap ping endpoint in 2023
 * and takes submissions only through Search Console.
 */
export const INDEXNOW_KEY = '4721d342fa3af55a396b972fcbde50ca';

/**
 * Social preview image. Raster, because Facebook, LinkedIn, X and most chat
 * unfurlers do not render SVG in `og:image` — the logo SVG used before showed
 * as a blank card everywhere a link was shared.
 */
export const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 };

export const LICENSE_NOTE =
  'Source available at ' + REPO_URL;
