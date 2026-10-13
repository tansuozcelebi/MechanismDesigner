import type { Bilingual } from './about';

/**
 * Prose for the crawlable pages that describe the Optimiser, the Runner and
 * the favourite-mechanisms module, plus the home page's FAQ.
 *
 * Answer engines quote short, self-contained passages that answer one
 * question each, so the content is organised that way: every section opens
 * with the answer and every FAQ entry stands on its own. Everything stated
 * here is checked against the code — numbers come from `CONFIG` and the
 * workbench, not from a description of what it might do.
 */

export type QA = { q: Bilingual; a: Bilingual };
export type ProseSection = { title: Bilingual; body: Bilingual[] };

export type FeatureContent = {
  sections: ProseSection[];
  faq: QA[];
};

export const OPTIMIZER_CONTENT: FeatureContent = {
  sections: [
    {
      title: { en: 'What the optimiser does', tr: 'Optimizasyon ne yapar' },
      body: [
        {
          en: 'The optimiser searches the dimensions of a single-motor planar linkage — link lengths, ground-pivot angles and the positions of the rigid points that carry later dyads — so that its output point traces the target curve. It runs Differential Evolution (population 60, 220 generations by default) followed by a local refinement, inside a Web Worker, so the interface stays responsive while it works.',
          tr: 'Optimizasyon, tek motorlu düzlemsel bir mekanizmanın boyutlarını — kol boyları, sabit mafsal açıları ve sonraki diyadları taşıyan katı noktaların konumları — çıkış noktası hedef eğriyi çizecek şekilde arar. Varsayılan olarak 60 bireylik popülasyon ve 220 nesillik Diferansiyel Evrim ile ardından yerel iyileştirme çalıştırır; bunu bir Web Worker içinde yaptığı için arayüz çalışma sırasında donmaz.',
        },
        {
          en: 'Every candidate is scored by the same closed-form solver the rest of the application uses. A design that cannot complete a full revolution, breaks loop closure, or violates the 50–200 mm member limits is penalised or rejected, so the best result is a mechanism that actually turns, not just a curve that looks right.',
          tr: 'Her aday, uygulamanın geri kalanının kullandığı kapalı form çözücüyle puanlanır. Tam tur dönemeyen, çevrim kapanmasını bozan ya da 50–200 mm eleman sınırlarını aşan tasarım cezalandırılır veya elenir; böylece en iyi sonuç, yalnızca doğru görünen bir eğri değil, gerçekten dönen bir mekanizmadır.',
        },
      ],
    },
    {
      title: { en: 'What it optimises against', tr: 'Neye göre optimize eder' },
      body: [
        {
          en: 'The objective combines the symmetric Chamfer RMS between the output path and the target (after the best rigid alignment), a size term for the requested width and height, the transmission angle, the singularity margin, interference between members, and gravity torque. The weights are editable in the Constraints panel while the search runs.',
          tr: 'Amaç fonksiyonu; çıkış yolu ile hedef arasındaki simetrik Chamfer RMS hatasını (en iyi katı hizalamadan sonra), istenen genişlik ve yükseklik için boyut terimini, iletim açısını, tekillik payını, elemanlar arası girişimi ve yerçekimi momentini birleştirir. Ağırlıklar arama sürerken Kısıtlar panelinden değiştirilebilir.',
        },
      ],
    },
    {
      title: { en: 'Results that accumulate', tr: 'Biriken sonuçlar' },
      body: [
        {
          en: 'Each finished run adds its designs to the best-mechanisms table instead of replacing it, so an 8-bar result can be compared with a 10-bar one. Rows record their link count and whether they shipped with the application or were found in this browser, and they survive a page reload.',
          tr: 'Biten her koşu, tasarımlarını en iyi mekanizmalar tablosuna ekler, tabloyu silmez; böylece 8 kollu bir sonuç 10 kollu biriyle karşılaştırılabilir. Satırlar kol sayısını ve uygulamayla mı geldiğini yoksa bu tarayıcıda mı bulunduğunu kaydeder ve sayfa yenilense de kaybolmaz.',
        },
      ],
    },
  ],
  faq: [
    {
      q: { en: 'Which algorithm does the KREAMET optimiser use?', tr: 'KREAMET optimizasyonu hangi algoritmayı kullanır?' },
      a: {
        en: 'Differential Evolution with a local refinement stage, run in a Web Worker in the browser. Population, generations, restarts and the random seed are all set in the Optimiser panel.',
        tr: 'Yerel iyileştirme aşamasıyla birlikte Diferansiyel Evrim; tarayıcıda bir Web Worker içinde çalışır. Popülasyon, nesil sayısı, yeniden başlatma ve rastgele tohum Optimizasyon panelinden ayarlanır.',
      },
    },
    {
      q: { en: 'Can the optimiser search mechanisms with more than eight bars?', tr: 'Optimizasyon sekizden fazla kollu mekanizmaları arayabilir mi?' },
      a: {
        en: 'Yes. Choose 4, 6, 8, 10, 12 or 14 links in the Mechanism panel; the optimiser searches whichever size is selected, and every size is a one-degree-of-freedom chain driven by a single motor.',
        tr: 'Evet. Mekanizma panelinden 4, 6, 8, 10, 12 veya 14 kol seçin; optimizasyon seçili boyutta arama yapar ve her boyut tek motorla sürülen bir serbestlik dereceli bir zincirdir.',
      },
    },
    {
      q: { en: 'How is trajectory error measured?', tr: 'Yörünge hatası nasıl ölçülür?' },
      a: {
        en: 'As the symmetric Chamfer RMS in millimetres between the output path and the target, after the target is rigidly placed onto the path (rotation and translation only, no scaling), so the number is a physical distance.',
        tr: 'Hedef, yol üzerine katı olarak yerleştirildikten sonra (yalnızca döndürme ve öteleme, ölçekleme yok) çıkış yolu ile hedef arasındaki milimetre cinsinden simetrik Chamfer RMS olarak; bu yüzden değer fiziksel bir uzaklıktır.',
      },
    },
  ],
};

export const RUNNER_CONTENT: FeatureContent = {
  sections: [
    {
      title: { en: 'What the runner is for', tr: 'Çalıştırıcı ne içindir' },
      body: [
        {
          en: 'The runner plays the current mechanism through its motor revolution and shows what you read while it moves: motor angle and speed, output-point position, velocity and acceleration, gravity torque, estimated motor torque, transmission angle, singularity margin and member interference. Arriving in the runner starts the motor.',
          tr: 'Çalıştırıcı, mevcut mekanizmayı motor turu boyunca oynatır ve hareket ederken okunan değerleri gösterir: motor açısı ve hızı, çıkış noktasının konumu, hızı ve ivmesi, yerçekimi momenti, tahmini motor momenti, iletim açısı, tekillik payı ve elemanlar arası girişim. Çalıştırıcıya geçmek motoru başlatır.',
        },
        {
          en: 'The motor speed is adjustable from 10 to 300 rpm, the crank can be dragged by hand on the canvas, and the timeline scrubs to any angle. The runner is a view of the same workbench as the designer and the optimiser, so switching between them keeps the mechanism and the playback.',
          tr: 'Motor hızı 10–300 rpm arasında ayarlanabilir, krank tuval üzerinde elle sürüklenebilir ve zaman çizelgesi istenen açıya getirilebilir. Çalıştırıcı, tasarım ve optimizasyon ekranlarıyla aynı tezgâhın bir görünümüdür; aralarında geçiş yapmak mekanizmayı ve oynatmayı korur.',
        },
      ],
    },
    {
      title: { en: 'How the torque is computed', tr: 'Moment nasıl hesaplanır' },
      body: [
        {
          en: 'Gravity torque at the motor is the derivative of the moving assembly’s gravitational potential energy with respect to the motor angle; the motor torque estimate adds the inertial part from a Lagrange formulation with the reduced inertia of the chain. Both are evaluated at the current pose, and the gravity torque over a full revolution is plotted alongside.',
          tr: 'Motordaki yerçekimi momenti, hareketli montajın yerçekimi potansiyel enerjisinin motor açısına göre türevidir; motor momenti tahmini, zincirin indirgenmiş ataletiyle Lagrange formülasyonundan gelen eylemsizlik payını ekler. İkisi de anlık konumda hesaplanır ve tam tur boyunca yerçekimi momenti yanında çizilir.',
        },
      ],
    },
  ],
  faq: [
    {
      q: { en: 'Can I run a mechanism without installing anything?', tr: 'Bir mekanizmayı hiçbir şey kurmadan çalıştırabilir miyim?' },
      a: {
        en: 'Yes. KREAMET runs entirely in a web browser; open the Runner view and the current mechanism starts turning. Nothing is uploaded — the kinematics are solved on your machine.',
        tr: 'Evet. KREAMET tamamen web tarayıcısında çalışır; Çalıştırıcı görünümünü açtığınızda mevcut mekanizma dönmeye başlar. Hiçbir şey sunucuya yüklenmez — kinematik sizin bilgisayarınızda çözülür.',
      },
    },
    {
      q: { en: 'How do I open a saved mechanism in the runner?', tr: 'Kaydedilmiş bir mekanizmayı çalıştırıcıda nasıl açarım?' },
      a: {
        en: 'Star it with the ☆ button in the header, then choose “Open in Runner” on the Favourite Mechanisms page. The link has the form #/runner/<id> and can be bookmarked.',
        tr: 'Başlıktaki ☆ düğmesiyle yıldızlayın, ardından Favori Mekanizmalar sayfasında “Çalıştırıcıda aç”ı seçin. Bağlantı #/runner/<id> biçimindedir ve yer imlerine eklenebilir.',
      },
    },
  ],
};

export const FAVORITES_CONTENT: FeatureContent = {
  sections: [
    {
      title: { en: 'Keep the mechanisms worth keeping', tr: 'Saklamaya değer mekanizmaları tutun' },
      body: [
        {
          en: 'The ☆ button in the workbench header saves the mechanism on screen — its topology, its dimensions and the target curve it was measured against — to the Favourite Mechanisms list. The list lives in your browser; it can be exported to a JSON file and imported on another machine.',
          tr: 'Tezgâh başlığındaki ☆ düğmesi, ekrandaki mekanizmayı — topolojisini, boyutlarını ve ölçüldüğü hedef eğriyi — Favori Mekanizmalar listesine kaydeder. Liste tarayıcınızda tutulur; bir JSON dosyasına aktarılıp başka bir bilgisayarda içe alınabilir.',
        },
      ],
    },
    {
      title: { en: 'Run them in place', tr: 'Yerinde çalıştırın' },
      body: [
        {
          en: 'Every favourite is solved through a revolution and played back on its own card, so designs can be compared by watching them move. A card opens its design in the Runner for the full physics readout, or in the Designer to edit it. The shipped optimised designs can be added to the list in one click.',
          tr: 'Her favori bir tur boyunca çözülür ve kendi kartında oynatılır; böylece tasarımlar hareket ederken izlenerek karşılaştırılabilir. Kart, tasarımı tam fizik okuması için Çalıştırıcıda ya da düzenlemek için Tasarım ekranında açar. Uygulamayla gelen optimize tasarımlar tek tıkla listeye eklenebilir.',
        },
      ],
    },
  ],
  faq: [
    {
      q: { en: 'Where are favourite mechanisms stored?', tr: 'Favori mekanizmalar nerede saklanır?' },
      a: {
        en: 'In your browser’s local storage, on this device only. Use “Export favourites” to save them as a JSON file and “Import favourites” to load that file elsewhere.',
        tr: 'Tarayıcınızın yerel deposunda, yalnızca bu cihazda. JSON dosyası olarak kaydetmek için “Favorileri dışa aktar”ı, bu dosyayı başka yerde yüklemek için “Favorileri içe aktar”ı kullanın.',
      },
    },
    {
      q: { en: 'Does a favourite remember the target curve?', tr: 'Bir favori hedef eğriyi hatırlar mı?' },
      a: {
        en: 'Yes. The target travels with the design, because the error figures only mean something against the curve they were measured on; opening the favourite restores both.',
        tr: 'Evet. Hata değerleri yalnızca ölçüldükleri eğriye göre anlam taşıdığından hedef, tasarımla birlikte saklanır; favoriyi açmak ikisini birden geri yükler.',
      },
    },
  ],
};

/** The home page's FAQ: the questions someone asks before opening the app. */
export const HOME_FAQ: QA[] = [
  {
    q: { en: 'What is KREAMET?', tr: 'KREAMET nedir?' },
    a: {
      en: 'KREAMET is free, browser-based mechanism design software. It synthesises single-motor, cam-free, planar closed-loop linkages of 4 to 14 bars whose output point traces a chosen curve, and it verifies each design by measurement: full rotation, loop closure, transmission angle, singularity margin and buildability.',
      tr: 'KREAMET, ücretsiz ve tarayıcıda çalışan bir mekanizma tasarım yazılımıdır. Çıkış noktası seçilen bir eğriyi çizen, 4–14 kollu, tek motorlu, kamsız, düzlemsel ve kapalı çevrimli mekanizmaları sentezler ve her tasarımı ölçerek doğrular: tam tur, çevrim kapanması, iletim açısı, tekillik payı ve montaj edilebilirlik.',
    },
  },
  {
    q: { en: 'Is KREAMET free to use?', tr: 'KREAMET ücretsiz mi?' },
    a: {
      en: 'Yes. It runs in any modern browser with no account and no installation, and its source code is on GitHub.',
      tr: 'Evet. Hesap ve kurulum gerektirmeden her modern tarayıcıda çalışır; kaynak kodu GitHub’dadır.',
    },
  },
  {
    q: { en: 'What are the Designer, Optimiser and Runner?', tr: 'Tasarım, Optimizasyon ve Çalıştırıcı nedir?' },
    a: {
      en: 'Three views of one workbench. The Designer edits the linkage and its target curve, the Optimiser searches dimensions that make the linkage trace the target, and the Runner plays the mechanism with live kinematics and torque. Each view remembers its own panel layout.',
      tr: 'Tek bir tezgâhın üç görünümü. Tasarım ekranı mekanizmayı ve hedef eğriyi düzenler, Optimizasyon mekanizmanın hedefi çizmesini sağlayan boyutları arar, Çalıştırıcı ise mekanizmayı anlık kinematik ve momentle oynatır. Her görünüm kendi panel yerleşimini hatırlar.',
    },
  },
  {
    q: { en: 'Can I rearrange or hide the panels?', tr: 'Panelleri yeniden düzenleyebilir veya gizleyebilir miyim?' },
    a: {
      en: 'Yes. The Panels menu in the header lists every panel with switches to show or hide it, choose its dock, and make it dockable or pin it in place; panels can also be dragged between the left and right docks.',
      tr: 'Evet. Başlıktaki Paneller menüsü her paneli listeler; panel gösterilebilir veya gizlenebilir, yeri seçilebilir, taşınabilir yapılabilir ya da yerine sabitlenebilir. Paneller sol ve sağ alanlar arasında sürüklenerek de taşınabilir.',
    },
  },
];
