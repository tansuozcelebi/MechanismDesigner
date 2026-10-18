import type { Bilingual } from './about';

/**
 * Two pieces of guidance, written once and shown in three places (the
 * optimiser panel, the Free Sketch side panel, and the crawlable pages):
 *
 * - how to set the optimiser's parameters, and what to change when a run
 *   does not give the mechanism you wanted;
 * - the classical design method for a linkage — type, number and
 *   dimensional synthesis, then analysis and refinement — as it maps onto
 *   the tools in this application.
 *
 * The numbers in the optimiser guide are this application's own: population
 * and generation defaults from CONFIG.optimizer, the 180 → 360 → 720 frame
 * sampling schedule switching at 55 % and 85 % of the generations, the fresh
 * seeds injected every 25 generations, and the shipped result, which came
 * from seven runs of about 9 500 evaluations each.
 */

export type GuideItem = { title: Bilingual; body: Bilingual[] };

export const OPTIMIZER_GUIDE: GuideItem[] = [
  {
    title: { en: 'What each parameter does', tr: 'Her parametre ne yapar' },
    body: [
      {
        en: 'Population is how many candidate mechanisms Differential Evolution keeps at once. Rule of thumb: 4–10 × the number of design variables. The 8-bar has 15 variables, so 60 is the floor and 100–150 explores better; the 12- and 14-bar have 27 and 33, so use 120–250.',
        tr: 'Popülasyon, Diferansiyel Evrim’in aynı anda tuttuğu aday mekanizma sayısıdır. Kural: tasarım değişkeni sayısının 4–10 katı. 8 kollu mekanizmada 15 değişken vardır; 60 alt sınırdır, 100–150 daha iyi arar. 12 ve 14 kolluda 27 ve 33 değişken vardır; 120–250 kullanın.',
      },
      {
        en: 'Generations is how many times the whole population is improved. Each frame count is used for part of the run — 180 frames per revolution for the first 55 %, 360 until 85 %, 720 for the rest — so a run of fewer than about 80 generations never reaches the fine sampling the final figures are measured with. 150–300 is a sound range.',
        tr: 'Nesil, tüm popülasyonun kaç kez iyileştirileceğidir. Koşunun ilk %55’inde tur başına 180, %85’e kadar 360, kalanında 720 kare kullanılır; yaklaşık 80 nesilden kısa bir koşu, son değerlerin ölçüldüğü ince örneklemeye hiç ulaşmaz. 150–300 sağlam bir aralıktır.',
      },
      {
        en: 'Restarts runs the whole search again from a different seed and pools the results. A linkage objective has many separate valleys, and one run settles in one of them; 3–7 restarts is the cheapest way to find a better valley. The shipped designs came from seven runs.',
        tr: 'Yeniden başlatma, aramayı farklı bir tohumla baştan çalıştırır ve sonuçları birleştirir. Mekanizma amaç fonksiyonunun birbirinden ayrı pek çok vadisi vardır ve tek koşu bunlardan birine yerleşir; 3–7 yeniden başlatma, daha iyi bir vadi bulmanın en ucuz yoludur. Uygulamayla gelen tasarımlar yedi koşudan çıkmıştır.',
      },
      {
        en: 'The RNG seed makes a run repeatable: the same seed, settings and target give the same result. Change it to get a different run; keep it to reproduce one.',
        tr: 'Rastgele tohum, koşuyu tekrarlanabilir yapar: aynı tohum, ayarlar ve hedef aynı sonucu verir. Farklı bir koşu için değiştirin, bir sonucu yeniden üretmek için aynı bırakın.',
      },
      {
        en: 'Cost: the number of evaluations is roughly population × generations × restarts. 60 × 120 × 2 ≈ 14 000 runs in under a minute on a laptop; 150 × 250 × 5 ≈ 190 000 takes several minutes. The canvas keeps running meanwhile because the search is in a Web Worker.',
        tr: 'Maliyet: değerlendirme sayısı yaklaşık popülasyon × nesil × yeniden başlatmadır. 60 × 120 × 2 ≈ 14 000 bir dizüstünde bir dakikadan kısa sürer; 150 × 250 × 5 ≈ 190 000 birkaç dakika sürer. Arama Web Worker içinde olduğu için tuval bu sırada çalışmaya devam eder.',
      },
    ],
  },
  {
    title: { en: 'Constraints and weights', tr: 'Kısıtlar ve ağırlıklar' },
    body: [
      {
        en: 'Min/max link length bound every printed member. They are the most powerful setting: a target that is large compared with the longest allowed link (250 mm against 200 mm by default) leaves little freedom, and widening the upper limit often helps more than any amount of extra search.',
        tr: 'Min./maks. kol uzunluğu, basılan her elemanı sınırlar. En güçlü ayar budur: izin verilen en uzun kola göre büyük bir hedef (varsayılan olarak 200 mm’ye karşı 250 mm) az serbestlik bırakır; üst sınırı genişletmek çoğu zaman ek aramadan daha çok işe yarar.',
      },
      {
        en: 'Reject below transmission angle throws out designs that come too close to a dead point. Lower it (to 20–25°) when a run finds few feasible designs; raise it once you have a good shape and want a smoother-running one.',
        tr: 'İletim açısı ret sınırı, ölü noktaya fazla yaklaşan tasarımları eler. Bir koşu az uygulanabilir tasarım bulduğunda düşürün (20–25°); iyi bir şekil bulduktan sonra daha yumuşak çalışan bir tasarım için yükseltin.',
      },
      {
        en: 'w₁ curve rewards matching the target shape; w₂ size its width and height; w₃ closure a path that closes; w₄ singularity a large transmission angle; w₅ buildability no interference between bars; w₆ ratio balanced link lengths; w₇ gravity a low motor torque. Only the ratios matter. Raise the one whose result disappoints, by a factor of 2–5, rather than changing several at once.',
        tr: 'w₁ eğri hedef şekle uymayı, w₂ boyut genişlik ve yüksekliği, w₃ kapanma yolun kapanmasını, w₄ tekillik büyük iletim açısını, w₅ yapılabilirlik kollar arasında girişim olmamasını, w₆ oran dengeli kol boylarını, w₇ yerçekimi düşük motor momentini ödüllendirir. Yalnızca oranlar önemlidir. Sonucu hayal kırıklığı yaratan ağırlığı, birkaçını birden değiştirmek yerine 2–5 kat artırın.',
      },
    ],
  },
  {
    title: { en: 'When the result is not what you wanted', tr: 'Sonuç istediğiniz gibi değilse' },
    body: [
      {
        en: '“Few feasible” or no results: the limits leave no mechanism that turns a full revolution. Widen the link-length range, lower the transmission-angle rejection, or choose a larger mechanism size.',
        tr: '“Az uygulanabilir” ya da sonuç yok: sınırlar tam tur dönebilen hiçbir mekanizma bırakmıyor. Kol uzunluğu aralığını genişletin, iletim açısı ret sınırını düşürün ya da daha büyük bir mekanizma boyutu seçin.',
      },
      {
        en: 'Valid but the shape is poor (RMS well above 10 mm): search more — population 100+, generations 200+, restarts 5 — and if it still stalls, add links: a 10- or 12-bar has more freedom to bend the path. Check the target too: sharp corners and cusps are hard for any linkage; Smooth (spline) helps.',
        tr: 'Geçerli ama şekil zayıf (RMS 10 mm’nin epey üstünde): daha çok arayın — popülasyon 100+, nesil 200+, yeniden başlatma 5 — yine durursa kol ekleyin: 10 ya da 12 kollu bir mekanizmanın yolu bükecek daha çok serbestliği vardır. Hedefi de kontrol edin: keskin köşeler ve sivri uçlar her mekanizma için zordur; Yumuşak (spline) seçeneği yardımcı olur.',
      },
      {
        en: 'Good shape but the mechanism nearly locks (small transmission angle, large singularity term): raise w₄ singularity and the rejection threshold, then run again from the same seed to compare.',
        tr: 'Şekil iyi ama mekanizma neredeyse kilitleniyor (küçük iletim açısı, büyük tekillik terimi): w₄ tekillik ağırlığını ve ret sınırını yükseltin, karşılaştırmak için aynı tohumla yeniden çalıştırın.',
      },
      {
        en: 'Bars collide: raise w₅ buildability, or accept more assembly layers. Size is wrong: raise w₂. Different results every run: that is the method working — keep the best rows; the table accumulates across runs.',
        tr: 'Kollar çarpışıyor: w₅ yapılabilirlik ağırlığını yükseltin ya da daha çok montaj katmanını kabul edin. Boyut yanlış: w₂’yi yükseltin. Her koşuda farklı sonuç: yöntem böyle çalışır — en iyi satırları tutun; tablo koşular boyunca birikir.',
      },
      {
        en: 'The path is rotated or shifted against the target: that is intended. Error is measured after the best rigid placement (rotation and translation, no scaling), so the mechanism is free to trace the shape anywhere.',
        tr: 'Yol hedefe göre döndürülmüş ya da kaydırılmış: bu bilerek böyledir. Hata en iyi katı yerleştirmeden (döndürme ve öteleme, ölçekleme yok) sonra ölçülür; mekanizma şekli herhangi bir yerde çizmekte serbesttir.',
      },
    ],
  },
  {
    title: { en: 'A workflow that works', tr: 'İşe yarayan bir akış' },
    body: [
      {
        en: '1. Quick check: population 40, generations 80, restarts 1 — does anything feasible come out? 2. Long run: population 100–150, generations 200–300, restarts 3–5. 3. Pick the best row, fine-tune lengths in the Selection panel while watching the target fit. 4. Star it, and compare it with other sizes in the table and on the favourites page.',
        tr: '1. Hızlı kontrol: popülasyon 40, nesil 80, yeniden başlatma 1 — uygulanabilir bir şey çıkıyor mu? 2. Uzun koşu: popülasyon 100–150, nesil 200–300, yeniden başlatma 3–5. 3. En iyi satırı seçin, hedef uyumunu izleyerek Seçim panelinde uzunlukları ince ayarlayın. 4. Yıldızlayın; tabloda ve favoriler sayfasında diğer boyutlarla karşılaştırın.',
      },
    ],
  },
];

/**
 * The design method, in the order textbooks give it (Erdman & Sandor; Norton;
 * Uicker, Pennock & Shigley) and engineers use it: decide what the mechanism
 * must do, choose its kind, count its parts, size them, analyse, refine.
 */
export const METHODOLOGY: GuideItem[] = [
  {
    title: { en: '1. Define the task', tr: '1. Görevi tanımlayın' },
    body: [
      {
        en: 'Name the synthesis task first, because each has its own methods: function generation (output angle as a function of input angle), path generation (a point follows a curve — this application’s heart), or motion generation (a body passes through given positions). Write down precision points, space limits, speed, loads and how many motors you may use.',
        tr: 'Önce sentez görevini adlandırın; her birinin kendi yöntemleri vardır: fonksiyon üretimi (çıkış açısı giriş açısının fonksiyonu), yol üretimi (bir nokta bir eğriyi izler — bu uygulamadaki kalp) ya da hareket üretimi (bir cisim verilen konumlardan geçer). Hassas noktaları, alan sınırlarını, hızı, yükleri ve kaç motor kullanılabileceğini yazın.',
      },
    ],
  },
  {
    title: { en: '2. Type synthesis', tr: '2. Tip sentezi' },
    body: [
      {
        en: 'Choose the kind of mechanism: linkage, cam, gears or a combination. A linkage is cheap, has only pin joints and runs continuously, but traces a curve only approximately; a cam traces exactly but wears and needs a follower spring. For a closed path from one motor, the four-bar coupler curve is the first candidate and a six-bar the next.',
        tr: 'Mekanizma türünü seçin: kol mekanizması, kam, dişli ya da bunların birleşimi. Kol mekanizması ucuzdur, yalnızca pim mafsalları vardır ve sürekli çalışır, ama eğriyi yalnızca yaklaşık izler; kam tam izler ama aşınır ve izleyici yayı ister. Tek motorla kapalı bir yol için ilk aday dört çubuk kavrayıcı eğrisi, sonraki altı çubuktur.',
      },
    ],
  },
  {
    title: { en: '3. Number synthesis', tr: '3. Sayı sentezi' },
    body: [
      {
        en: 'Count links and joints so that one motor gives one determinate motion: Grübler–Kutzbach, M = 3(n − 1) − 2j₁ = 1. With pin joints that means 4, 6, 8 … links: the four-bar, the Watt and Stephenson six-bars, and the sixteen eight-bar chains. In the Free Sketch the count is shown live as M = 2·(free points) − (links).',
        tr: 'Tek motor tek belirli hareket versin diye kol ve mafsalları sayın: Grübler–Kutzbach, M = 3(n − 1) − 2j₁ = 1. Pim mafsallarla bu 4, 6, 8 … kol demektir: dört çubuk, Watt ve Stephenson altı çubukları ve on altı sekiz çubuk zinciri. Serbest Tasarım’da bu sayı canlı olarak M = 2·(serbest nokta) − (kol) şeklinde gösterilir.',
      },
    ],
  },
  {
    title: { en: '4. Dimensional synthesis', tr: '4. Boyut sentezi' },
    body: [
      {
        en: 'Find the lengths. Graphical construction handles two or three precision positions; Freudenstein’s equation solves function generation for three positions in closed form; Burmester theory handles four and five; Chebyshev spacing places precision points to minimise the error between them. Atlases (Hrones–Nelson’s four-bar coupler curves) give a starting shape by eye. Beyond five points, or with constraints on transmission angle and size, numerical optimisation takes over — the Optimiser here uses Differential Evolution.',
        tr: 'Uzunlukları bulun. Grafik çizim iki ya da üç hassas konumu çözer; Freudenstein denklemi üç konumlu fonksiyon üretimini kapalı formda çözer; Burmester teorisi dört ve beş konumu çözer; Chebyshev aralığı, aradaki hatayı en aza indirecek şekilde hassas noktaları yerleştirir. Atlaslar (Hrones–Nelson dört çubuk kavrayıcı eğrileri) gözle bir başlangıç şekli verir. Beş noktanın ötesinde ya da iletim açısı ve boyut kısıtları varken sayısal optimizasyon devreye girer — buradaki Optimizasyon, Diferansiyel Evrim kullanır.',
      },
    ],
  },
  {
    title: { en: '5. Analyse', tr: '5. Analiz edin' },
    body: [
      {
        en: 'Check that it works before checking how well: Grashof’s criterion (s + l ≤ p + q, with the crank the shortest link) for a crank that turns fully; a transmission angle kept between 40° and 140° over the whole cycle; no dead point and no branch change; then velocity, acceleration and motor torque. The Free Sketch reports mobility, Grashof type, full rotation and the smallest transmission angle as you edit.',
        tr: 'Ne kadar iyi çalıştığından önce çalıştığını kontrol edin: tam dönen bir krank için Grashof ölçütü (s + l ≤ p + q, krank en kısa kol); tüm çevrim boyunca 40°–140° arasında kalan iletim açısı; ölü nokta ve dal değişimi olmaması; ardından hız, ivme ve motor momenti. Serbest Tasarım siz düzenlerken serbestlik derecesini, Grashof tipini, tam turu ve en küçük iletim açısını gösterir.',
      },
    ],
  },
  {
    title: { en: '6. Refine and build', tr: '6. İyileştirin ve üretin' },
    body: [
      {
        en: 'Every four-bar coupler curve is traced by two other four-bars, its Roberts–Chebyshev cognates: use them to move the ground pivots somewhere more convenient without changing the path. Then lay the bars out in layers so they cannot collide, allow for pin clearance and tolerance, and check the whole cycle once more in the Runner.',
        tr: 'Her dört çubuk kavrayıcı eğrisi, Roberts–Chebyshev eşdeğerleri olan iki başka dört çubuk tarafından da çizilir: yolu değiştirmeden sabit mafsalları daha uygun bir yere taşımak için bunları kullanın. Sonra kolları çarpışmayacakları katmanlara yerleştirin, pim boşluğunu ve toleransı hesaba katın ve tüm çevrimi Çalıştırıcı’da bir kez daha kontrol edin.',
      },
    ],
  },
];

/** FAQ for the Free Sketch page: answer first, one question each. */
export const SKETCH_FAQ: { q: Bilingual; a: Bilingual }[] = [
  {
    q: { en: 'How do I build a linkage from scratch in KREAMET?', tr: 'KREAMET’te sıfırdan nasıl mekanizma kurarım?' },
    a: {
      en: 'Open Free Sketch from the Design menu. Press G and click to place ground pivots, L and click points to draw links, M and click a link on a ground pivot to make it the motor crank, T to trace a point, then Run.',
      tr: 'Tasarım menüsünden Serbest Tasarım’ı açın. G’ye basıp tıklayarak sabit mafsal koyun, L ile noktalara tıklayarak kol çizin, M ile sabit mafsala bağlı bir kola tıklayarak motor krankı yapın, T ile bir noktanın yörüngesini izleyin, sonra Çalıştır’a basın.',
    },
  },
  {
    q: { en: 'How many pivots and links can a sketch have?', tr: 'Bir çizimde kaç mafsal ve kol olabilir?' },
    a: {
      en: 'As many as you like. Each link is solved as a distance constraint, so any planar pin-jointed linkage works, not only chains of dyads; the mobility shown must be 1 for one motor to drive it.',
      tr: 'İstediğiniz kadar. Her kol bir uzaklık kısıtı olarak çözülür; bu yüzden yalnızca diyad zincirleri değil, her düzlemsel pim mafsallı mekanizma çalışır. Tek motorun sürebilmesi için gösterilen serbestlik derecesi 1 olmalıdır.',
    },
  },
  {
    q: { en: 'Can I change a link length while the mechanism is shown?', tr: 'Mekanizma görünürken bir kolun uzunluğunu değiştirebilir miyim?' },
    a: {
      en: 'Yes. Select the link and turn the mouse wheel: ±1 mm per notch, Shift for ±10 mm, Alt for ±0.1 mm. The linkage re-assembles and every traced path updates at once; a length with no assembly is refused.',
      tr: 'Evet. Kolu seçip fare tekerleğini çevirin: her adımda ±1 mm, Shift ile ±10 mm, Alt ile ±0,1 mm. Mekanizma yeniden montaj edilir ve izlenen her yol anında güncellenir; montajı olmayan bir uzunluk reddedilir.',
    },
  },
  {
    q: { en: 'Why does my crank stop part way round?', tr: 'Krankım neden yolun bir kısmında duruyor?' },
    a: {
      en: 'The lengths do not let it turn fully: check Grashof’s criterion in the analysis panel. For a four-bar the crank must be the shortest link and s + l ≤ p + q. The sketch then plays the motion back and forth between the limits.',
      tr: 'Uzunluklar tam dönmesine izin vermiyor: analiz panelinde Grashof ölçütüne bakın. Dört çubukta krank en kısa kol olmalı ve s + l ≤ p + q sağlanmalıdır. Çizim bu durumda hareketi sınırlar arasında ileri geri oynatır.',
    },
  },
];
