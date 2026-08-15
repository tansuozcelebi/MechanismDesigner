/**
 * Developer and project facts shown on the About page.
 *
 * Everything here is either verifiable from the repository (the author of the
 * commits on `main`, the GitHub owner, the contact address) or measured by the
 * app itself. Nothing about the developer is inferred or filled in with
 * plausible-sounding detail: the biography fields below are exactly as supplied,
 * and the honest place to extend them is this file — not a page template that
 * would make invented text look authoritative.
 */

export type Bilingual = { tr: string; en: string };

export type ProfileLink = {
  label: string;
  href: string;
  /** Shown instead of the raw URL. */
  text: string;
};

export const DEVELOPER = {
  name: 'Tansu Özçelebi',
  /** Initials for the avatar; explicit so "Ö" is not mangled by a substring. */
  initials: 'TÖ',
  role: {
    tr: 'Yazılım geliştirici · KREAMET tasarımcısı',
    en: 'Software developer · Designer of KREAMET',
  } satisfies Bilingual,
  /**
   * Supplied biography. Deliberately short and restricted to what is actually
   * known; see the module comment.
   */
  bio: [
    {
      tr: 'KREAMET’in mühendislik gereksinimlerini tanımlayan ve geliştirilmesini yürüten kişidir. Projenin kapsamı — tek motorlu, kamsız, düzlemsel ve kapalı çevrimli bir mekanizmanın verilen bir yörüngeyi çizmesi — buradaki her modülün neden var olduğunu belirleyen şartnameden gelir.',
      en: 'Defined the engineering requirements for KREAMET and directed its development. The project’s scope — a single-motor, cam-free, planar, closed-loop mechanism made to trace a given trajectory — is what determines why every module here exists.',
    },
    {
      tr: 'Proje, mekanizma sentezini bir “deneme-yanılma çizimi” olmaktan çıkarıp ölçülebilir bir mühendislik problemine dönüştürmeyi hedefler: her tasarım, tam tur dönebilirlik, çevrim kapanma hatası, iletim açısı, tekillik payı ve montaj edilebilirlik açısından sayılarla değerlendirilir.',
      en: 'The project aims to turn mechanism synthesis from trial-and-error sketching into a measurable engineering problem: every design is judged numerically on full rotatability, loop-closure residual, transmission angle, singularity margin and buildability.',
    },
  ] satisfies Bilingual[],
  links: [
    { label: 'GitHub', href: 'https://github.com/tansuozcelebi', text: '@tansuozcelebi' },
    {
      label: 'Repository',
      href: 'https://github.com/tansuozcelebi/MechanismDesigner',
      text: 'tansuozcelebi/MechanismDesigner',
    },
    { label: 'E-posta · E-mail', href: 'mailto:tansuozcelebi@gmail.com', text: 'tansuozcelebi@gmail.com' },
  ] satisfies ProfileLink[],
};

/**
 * Project figures. Every one of these is produced by the code in this
 * repository — the test and check counts by `npm test` and `npm run smoke`, the
 * mechanism numbers by re-evaluating the shipped design with the same solver the
 * optimiser minimised. None of them is an estimate.
 */
export const PROJECT_FACTS: {
  label: Bilingual;
  value: string;
  note: Bilingual;
}[] = [
  {
    label: { tr: 'Serbestlik derecesi', en: 'Degrees of freedom' },
    value: 'M = 1',
    note: {
      tr: 'Kurulan graf üzerinden hesaplanır, formülden varsayılmaz; 4–14 kolun hepsinde.',
      en: 'Computed from the constructed graph, not assumed from the formula; at every size from 4 to 14 bars.',
    },
  },
  {
    label: { tr: 'Yörünge hatası (RMS)', en: 'Trajectory error (RMS)' },
    value: '11.41 mm',
    note: {
      tr: '250 × 250 mm kalp hedefine karşı, simetrik Chamfer uzaklığı.',
      en: 'Symmetric Chamfer distance against the 250 × 250 mm heart target.',
    },
  },
  {
    label: { tr: 'Çevrim kapanma hatası', en: 'Loop closure residual' },
    value: '1.3 × 10⁻¹³ mm',
    note: {
      tr: 'Kapalı form çözüm kullanıldığı için bu bağımsız bir doğrulamadır, çözücü toleransı değil.',
      en: 'Closed-form solution throughout, so this is an independent check rather than a solver tolerance.',
    },
  },
  {
    label: { tr: 'Tam tur', en: 'Full rotation' },
    value: '720 / 720',
    note: {
      tr: 'Motor turunun her karesi çözülür; montaj modu sıçraması yok.',
      en: 'Every frame of the motor revolution solves; no assembly-mode jumps.',
    },
  },
  {
    label: { tr: 'İletim açısı', en: 'Transmission angle' },
    value: '44.70°',
    note: {
      tr: 'Bu topoloji ve 50 mm krank için analitik tavan 44.75°’dir.',
      en: 'The analytic ceiling for this topology and a 50 mm crank is 44.75°.',
    },
  },
  {
    label: { tr: 'Montaj katmanı', en: 'Assembly layers' },
    value: '2',
    note: {
      tr: 'Girişim grafı renklendirilerek bulunur; kaç paralel düzlem gerektiğini verir.',
      en: 'Found by colouring the interference graph; tells you how many parallel planes are needed.',
    },
  },
];

export const TECH_STACK: { name: string; role: Bilingual }[] = [
  { name: 'TypeScript', role: { tr: 'Tüm çözücü ve sentez katmanı', en: 'The whole solver and synthesis layer' } },
  { name: 'React 18', role: { tr: 'Yalnızca arayüz; çözücü render döngüsünün içinde yaşamaz', en: 'Interface only; the solver never lives inside the render cycle' } },
  { name: 'Three.js', role: { tr: 'Milimetre biriminde ortografik 2B sahne', en: 'Orthographic 2-D scene in millimetres' } },
  { name: 'Web Worker', role: { tr: 'Optimizasyon; tuval 60 FPS’te kalır', en: 'Optimisation, so the canvas keeps 60 FPS' } },
  { name: 'Vite', role: { tr: 'Geliştirme sunucusu ve üretim derlemesi', en: 'Dev server and production build' } },
  { name: 'Vitest + Playwright', role: { tr: 'Birim/entegrasyon testleri ve tarayıcı smoke testi', en: 'Unit/integration tests and the browser smoke test' } },
];

export const METHODS: { title: Bilingual; body: Bilingual }[] = [
  {
    title: { tr: 'Kapalı form kinematik', en: 'Closed-form kinematics' },
    body: {
      tr: 'Her RRR diyadı tek bir çember-çember kesişiminden çözülür. Hiçbir yerde Newton iterasyonu yoktur; bu yüzden çevrim kapanma kalıntısı gerçek bir doğrulamadır.',
      en: 'Every RRR dyad is solved by a single circle–circle intersection. There is no Newton iteration anywhere, which is what makes the loop-closure residual a genuine check.',
    },
  },
  {
    title: { tr: 'Assur diyadları ve değişken kol sayısı', en: 'Assur dyads and variable link count' },
    body: {
      tr: 'Bir krank artı N adet RRR Assur diyadı. Assur grubunun mobilitesi sıfır olduğu için, her N değerinde M = 1’dir; kol sayısı çalışma anında değiştirilebilir.',
      en: 'One crank plus N RRR Assur dyads. An Assur group has zero mobility, so M = 1 for every N and the link count can be changed at runtime.',
    },
  },
  {
    title: { tr: 'Dal sürekliliği', en: 'Branch continuity' },
    body: {
      tr: 'Her karede, çember kesişiminin bir önceki kareye en yakın kökü seçilir. Böylece mekanizma tur boyunca tek bir montaj modunda kalır.',
      en: 'At every frame the circle-intersection root nearest the previous frame is chosen, so the mechanism stays in one assembly mode through the revolution.',
    },
  },
  {
    title: { tr: 'Katı Procrustes hizalama', en: 'Rigid Procrustes alignment' },
    body: {
      tr: 'Hedef eğri, LED yörüngesine yalnızca dönme ve öteleme ile oturtulur — ölçekleme yoktur, çünkü 250 × 250 mm fiziksel bir şarttır. En iyi hizalama dairesel çapraz korelasyonla tam olarak bulunur.',
      en: 'The target is placed onto the LED path by rotation and translation only — never scale, since 250 × 250 mm is a physical requirement. The optimum is found exactly by circular cross-correlation.',
    },
  },
  {
    title: { tr: 'Montaj katmanlama', en: 'Assembly layering' },
    body: {
      tr: '454 geçerli mekanizmanın hiçbiri 12 mm kol genişliğinde tamamen aynı düzlemde girişimsizdi. Bu yüzden girişim grafı Welsh–Powell ile renklendirilip kaç paralel düzlem gerektiği raporlanır.',
      en: 'None of 454 valid mechanisms was interference-free in a single plane at 12 mm bar width, so the interference graph is coloured (Welsh–Powell) and the required number of parallel planes is reported.',
    },
  },
  {
    title: { tr: 'Global + yerel optimizasyon', en: 'Global + local optimisation' },
    body: {
      tr: 'Yapıcı bir uygulanabilir başlangıç popülasyonu üzerinde Diferansiyel Evrim, ardından sınırlı Nelder–Mead. Örnekleme tur başına 180 → 360 → 720 kareye incelir.',
      en: 'Differential Evolution over a constructively feasible seed population, then bounded Nelder–Mead. Sampling refines 180 → 360 → 720 frames per revolution.',
    },
  },
];

export const VERIFICATION: Bilingual[] = [
  {
    tr: '78 birim ve entegrasyon testi — mobilite, kapalı form çözüm, dal sürekliliği, yerçekimi momentinin sonlu farkla doğrulanması, hedef eğri gidiş-dönüşü ve kısıtların sıfırlanması.',
    en: '78 unit and integration tests — mobility, closed-form solution, branch continuity, gravity torque checked against a finite difference, target round-tripping and constraint reset.',
  },
  {
    tr: '35 tarayıcı smoke kontrolü — krank sürükleme, ekran↔dünya gidiş-dönüşü, oynatma, hata ayıklama katmanı, kol sayısı değişimi, seçim ve düzenleme, hedef düzenleme, kısıt değişimi ve EN/TR geçişi.',
    en: '35 browser smoke checks — crank dragging, screen↔world round-tripping, playback, the debug overlay, changing the link count, selection and editing, target editing, constraint changes and the EN/TR switch.',
  },
  {
    tr: 'Uygulamayla gelen optimize tasarımlar, testlerde aynı çözücüyle yeniden değerlendirilir ve kayıtlı metriklerini yeniden üretmek zorundadır.',
    en: 'The optimised designs shipped with the app are re-evaluated by the tests with the same solver and must reproduce their recorded metrics.',
  },
];
