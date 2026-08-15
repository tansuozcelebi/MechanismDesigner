/**
 * Interface strings for KREAMET, in English and Turkish.
 *
 * `en` is the reference dictionary.  `tr` is typed as
 * `Record<keyof typeof en, string>`, so TypeScript fails the build if a key is
 * added to one language and forgotten in the other — the usual way bilingual
 * UIs rot.
 *
 * Engineering symbols (mm, N·m, θ, μ, σ, RMS, J) are deliberately NOT
 * translated: they are standard notation and a Turkish mechanism engineer
 * expects them unchanged.  Only prose and labels are localised.
 */

export const APP_NAME = 'KREAMET';

export const en = {
  /* ---- shell ---- */
  'app.subtitle': '8-bar · 1-DOF · single motor at O2 · target {w}×{h} mm',
  'app.loadInitial': 'Load Initial Guess',
  'app.export': 'Export JSON',
  'app.label.optimized': 'OPTIMIZED RESULT',
  'app.label.initial': 'INITIAL GUESS',
  'app.label.manual': 'MANUAL EDIT',
  'app.lang.aria': 'Language',

  /* ---- canvas overlay ---- */
  'canvas.scale': '{n} mm · view {h} mm tall',
  'canvas.legend.target': 'target heart',
  'canvas.legend.led': 'LED path',
  'canvas.legend.crank': 'crank',
  'canvas.legend.output': 'output',
  'canvas.solverFailed': 'KINEMATIC SOLUTION FAILED',

  /* ---- timeline ---- */
  'timeline.motorAngle': 'Motor Angle',
  'timeline.clearTrail': 'Clear Trail',
  'timeline.play': 'Play',
  'timeline.pause': 'Pause',
  'timeline.toStart': 'Go to 0°',
  'timeline.toEnd': 'Go to 360°',
  'timeline.framesOk': '{valid}/{total} frames OK',
  'timeline.sweepFailed': 'sweep failed',

  /* ---- motor & physics ---- */
  'motor.title': 'Motor & Physics',
  'motor.speed': 'Motor speed',
  'motor.omegaFormula': 'ω = 2π·rpm/60',
  'motor.gravityOn': 'Gravity ON',
  'motor.gravityVector': 'g = [0, −9.807] m/s², +y up',
  'motor.playing': 'Playing',
  'motor.paused': 'Paused',
  'motor.oneRev': '— one motor revolution traces one complete LED path.',

  /* ---- display ---- */
  'display.title': 'Display',
  'display.grid': 'Grid',
  'display.showTarget': 'Show Target',
  'display.showTrail': 'Show Trail',
  'display.debug': 'Debug',
  'display.dbg.names': 'Names',
  'display.dbg.coords': 'Coords',
  'display.dbg.loops': 'Loops',
  'display.dbg.com': 'COM',
  'display.dbg.velocity': 'Velocity',
  'display.dbg.gravity': 'Gravity',
  'display.dbg.mu': 'μ angles',
  'display.clearTrail': 'Clear Trail',
  'display.fullPath': 'Draw Full Path',
  'display.fitView': 'Fit View',
  'display.hint':
    'Drag the orange crank to turn the motor by hand. Drag empty space to pan, wheel to zoom.',

  /* ---- cycle verification ---- */
  'cycle.title': 'Cycle Verification',
  'cycle.noSweep': 'No valid sweep — adjust the design.',
  'cycle.badge.rotationPass': 'FULL ROTATION PASS',
  'cycle.badge.rotationFail': 'FULL ROTATION FAIL',
  'cycle.badge.jumps': 'JUMPS {n}',
  'cycle.badge.closureOk': 'CLOSURE OK',
  'cycle.badge.closureFail': 'CLOSURE FAIL',
  'cycle.badge.pathClosed': 'PATH CLOSED',
  'cycle.badge.pathOpen': 'PATH OPEN',
  'cycle.framesSolved': 'Frames solved',
  'cycle.maxLoopClosure': 'Max loop closure',
  'cycle.pathClosure': 'Path closure',
  'cycle.pathClosureTip': '|P_LED(0) − P_LED(2π)|',
  'cycle.minMu': 'Min transmission μ',
  'cycle.effectiveMu': 'Effective μ margin',
  'cycle.effectiveMuTip':
    "min(μ, 180−μ) over the cycle; this frame's physical ceiling is 44.75°",
  'cycle.singularity': 'Singularity margin',
  'cycle.peakTorque': 'Peak gravity torque',
  'cycle.toleranceTip': 'tolerance {n} mm',

  /* ---- live instrumentation ---- */
  'live.title': 'Live Instrumentation',
  'live.failedHint': 'showing last valid configuration',
  'live.assemblyJump': 'ASSEMBLY MODE JUMP detected on this step',
  'live.motorAngle': 'Motor angle',
  'live.motorSpeed': 'Motor speed',
  'live.ledX': 'LED X',
  'live.ledY': 'LED Y',
  'live.ledVelocity': 'LED velocity',
  'live.ledAccel': 'LED acceleration',
  'live.gravityTorque': 'Gravity torque',
  'live.gravityTorqueTip':
    'dU/dθ — quasi-static torque the motor must supply against gravity',
  'live.motorTorque': 'Est. motor torque',
  'live.motorTorqueTip':
    'Lagrange estimate: gravity + inertial terms at constant motor speed',
  'live.inertialPart': '  ↳ inertial part',
  'live.reducedInertia': '  ↳ reduced inertia',
  'live.trajectoryRms': 'Trajectory RMS',
  'live.minMu': 'Min transmission μ',
  'live.singularity': 'Singularity margin',
  'live.singularityTip': 'Smallest singular value of ∂F/∂q (constraint Jacobian)',
  'live.loopClosure': 'Loop closure error',
  'live.interference': 'Interference',
  'live.interferenceTip':
    'Coplanar interference at 12 mm bar width between bodies not sharing a joint',
  'live.clear': 'CLEAR',
  'live.pairs': '{n} pair(s)',
  'live.minGap': 'Min member gap',

  /* ---- target heart ---- */
  'target.title': 'Target Heart',
  'target.width': 'Target width',
  'target.height': 'Target height',
  'target.actualWidth': 'Actual width',
  'target.actualHeight': 'Actual height',
  'target.rmsChamfer': 'RMS error (Chamfer)',
  'target.rmsParam': 'RMS error (parameterised)',
  'target.maxError': 'Max error',
  'target.ledToTarget': 'LED → target',
  'target.targetToLed': 'target → LED',
  'target.heartMatch': 'Heart Match',
  'target.scoreNote':
    'Display score only — 100·exp(−RMS/{n}). Engineering decisions use the millimetre values above.',

  /* ---- objective ---- */
  'objective.title': 'Objective Breakdown',
  'objective.total': 'J (total)',
  'objective.curve': 'w₁ · curve',
  'objective.size': 'w₂ · size',
  'objective.closure': 'w₃ · closure',
  'objective.singularity': 'w₄ · singularity',
  'objective.buildability': 'w₅ · buildability',
  'objective.ratio': 'w₆ · ratio',
  'objective.gravity': 'w₇ · gravity',

  /* ---- gravity torque chart ---- */
  'torque.title': 'Gravity Torque τ(θ)',
  'torque.note':
    'τ_g(θ) = dU/dθ by central difference on the analytic solver, U = Σ mᵢ g y_comᵢ.',
  'torque.gravityOff': 'Gravity is OFF — the motor torque estimate drops this term.',
  'torque.unavailable': 'Torque profile unavailable.',
  'torque.peak': 'peak ±{n} N·m',

  /* ---- link table ---- */
  'links.title': 'Link Table',
  'links.member': 'Member',
  'links.length': 'Length',
  'links.angle': 'Angle',
  'links.mass': 'Mass',
  'links.layer': 'Ly',
  'links.note':
    'Lengths are fixed rigid-body dimensions; angles update every frame. “Ly” is the assembly layer (parallel plane) the body sits in. All members are constrained to {min}–{max} mm.',

  /* ---- topology ---- */
  'topology.title': 'Topology',
  'topology.mobility': 'Mobility = {n}',
  'topology.loops': '{n} independent loops',
  'topology.counts': '8 links / 10 joints',
  'topology.note':
    'Solved as three RRR Assur dyads in series — every joint comes from a closed-form circle–circle intersection, so no Newton iteration is used anywhere.',

  /* ---- design vector ---- */
  'design.title': 'Design Vector — {label}',
  'design.fixedNote':
    'Fixed by the brief: O2 = (0, 0), |O2 O4| = {a} mm, |O4 O6| = {b} mm, crank |O2 A| = {c} mm.',
  'design.export': 'Export Design JSON',
  'design.geometryTitle': 'Geometry Report — {label}',
  'design.lengthMm': 'Length (mm)',

  /* ---- optimizer ---- */
  'opt.title': 'Synthesis / Optimizer',
  'opt.population': 'Population',
  'opt.generations': 'Generations',
  'opt.restarts': 'Restarts',
  'opt.seed': 'RNG seed',
  'opt.run': 'Run Optimization',
  'opt.cancel': 'Cancel',
  'opt.running': 'run {run}/{total} · {message}',
  'opt.starting': 'starting…',
  'opt.bestJ': 'best J = {j} · {n} evals',
  'opt.finished': '{n} evaluations in {s} s',
  'opt.note':
    'Differential Evolution (rand/1 + current-to-best/1) with a constructive feasible seed population, then bounded Nelder–Mead refinement. Runs in a Web Worker so the canvas keeps animating. Sampling refines {a} → {b} → {c} frames per revolution.',
  'opt.bestTitle': 'Best Mechanisms ({n})',
  'opt.sourceStored': 'Loaded from the offline optimisation run shipped with the app.',
  'opt.sourceLive': 'From the optimisation you just ran in this browser.',
  'opt.detail.score': 'Score J',
  'opt.detail.rms': 'RMS error',
  'opt.detail.maxError': 'Max error',
  'opt.detail.size': 'Width × Height',
  'opt.detail.minMu': 'Min transmission μ',
  'opt.detail.singularity': 'Singularity margin',
  'opt.detail.interference': 'Coplanar interference',
  'opt.detail.frames': '{n} frames',
  'opt.detail.layers': 'Assembly layers',
  'opt.detail.peakTorque': 'Peak gravity torque',
  'opt.detail.fullRotation': 'Full rotation',
} as const;

export type TranslationKey = keyof typeof en;

export const tr: Record<TranslationKey, string> = {
  /* ---- kabuk ---- */
  'app.subtitle': '8 kollu · 1 SD · O2’de tek motor · hedef {w}×{h} mm',
  'app.loadInitial': 'Başlangıç Tahminini Yükle',
  'app.export': 'JSON Dışa Aktar',
  'app.label.optimized': 'OPTİMİZE SONUÇ',
  'app.label.initial': 'BAŞLANGIÇ TAHMİNİ',
  'app.label.manual': 'ELLE DÜZENLENDİ',
  'app.lang.aria': 'Dil',

  /* ---- tuval bindirmesi ---- */
  'canvas.scale': '{n} mm · görüş {h} mm',
  'canvas.legend.target': 'hedef kalp',
  'canvas.legend.led': 'LED yörüngesi',
  'canvas.legend.crank': 'krank',
  'canvas.legend.output': 'çıkış',
  'canvas.solverFailed': 'KİNEMATİK ÇÖZÜM BAŞARISIZ',

  /* ---- zaman çizelgesi ---- */
  'timeline.motorAngle': 'Motor Açısı',
  'timeline.clearTrail': 'İzi Temizle',
  'timeline.play': 'Oynat',
  'timeline.pause': 'Duraklat',
  'timeline.toStart': '0°’ye git',
  'timeline.toEnd': '360°’ye git',
  'timeline.framesOk': '{valid}/{total} kare geçerli',
  'timeline.sweepFailed': 'tarama başarısız',

  /* ---- motor ve fizik ---- */
  'motor.title': 'Motor ve Fizik',
  'motor.speed': 'Motor hızı',
  'motor.omegaFormula': 'ω = 2π·dev/dk/60',
  'motor.gravityOn': 'Yerçekimi AÇIK',
  'motor.gravityVector': 'g = [0, −9,807] m/s², +y yukarı',
  'motor.playing': 'Çalışıyor',
  'motor.paused': 'Duraklatıldı',
  'motor.oneRev': '— motorun bir tam turu, LED’in tam bir yörüngesini çizer.',

  /* ---- görünüm ---- */
  'display.title': 'Görünüm',
  'display.grid': 'Izgara',
  'display.showTarget': 'Hedefi Göster',
  'display.showTrail': 'İzi Göster',
  'display.debug': 'Hata Ayıklama',
  'display.dbg.names': 'Adlar',
  'display.dbg.coords': 'Koordinatlar',
  'display.dbg.loops': 'Çevrimler',
  'display.dbg.com': 'Ağırlık merkezi',
  'display.dbg.velocity': 'Hız',
  'display.dbg.gravity': 'Yerçekimi',
  'display.dbg.mu': 'μ açıları',
  'display.clearTrail': 'İzi Temizle',
  'display.fullPath': 'Tam Yörüngeyi Çiz',
  'display.fitView': 'Görüşe Sığdır',
  'display.hint':
    'Motoru elle çevirmek için turuncu krankı sürükleyin. Kaydırmak için boş alanı sürükleyin, yakınlaştırmak için tekerleği kullanın.',

  /* ---- çevrim doğrulama ---- */
  'cycle.title': 'Çevrim Doğrulama',
  'cycle.noSweep': 'Geçerli tarama yok — tasarımı değiştirin.',
  'cycle.badge.rotationPass': 'TAM TUR GEÇTİ',
  'cycle.badge.rotationFail': 'TAM TUR BAŞARISIZ',
  'cycle.badge.jumps': 'SIÇRAMA {n}',
  'cycle.badge.closureOk': 'KAPANMA TAMAM',
  'cycle.badge.closureFail': 'KAPANMA HATALI',
  'cycle.badge.pathClosed': 'YÖRÜNGE KAPALI',
  'cycle.badge.pathOpen': 'YÖRÜNGE AÇIK',
  'cycle.framesSolved': 'Çözülen kare',
  'cycle.maxLoopClosure': 'Maks. çevrim kapanma hatası',
  'cycle.pathClosure': 'Yörünge kapanması',
  'cycle.pathClosureTip': '|P_LED(0) − P_LED(2π)|',
  'cycle.minMu': 'Min. iletim açısı μ',
  'cycle.effectiveMu': 'Etkin μ payı',
  'cycle.effectiveMuTip':
    'Çevrim boyunca min(μ, 180−μ); bu şasenin fiziksel tavanı 44,75°',
  'cycle.singularity': 'Tekillik payı',
  'cycle.peakTorque': 'Tepe yerçekimi momenti',
  'cycle.toleranceTip': 'tolerans {n} mm',

  /* ---- canlı ölçüm ---- */
  'live.title': 'Canlı Ölçüm',
  'live.failedHint': 'son geçerli konfigürasyon gösteriliyor',
  'live.assemblyJump': 'Bu adımda MONTAJ MODU SIÇRAMASI algılandı',
  'live.motorAngle': 'Motor açısı',
  'live.motorSpeed': 'Motor hızı',
  'live.ledX': 'LED X',
  'live.ledY': 'LED Y',
  'live.ledVelocity': 'LED hızı',
  'live.ledAccel': 'LED ivmesi',
  'live.gravityTorque': 'Yerçekimi momenti',
  'live.gravityTorqueTip':
    'dU/dθ — motorun yerçekimine karşı sağlaması gereken yarı-statik moment',
  'live.motorTorque': 'Tahmini motor momenti',
  'live.motorTorqueTip':
    'Lagrange tahmini: sabit motor hızında yerçekimi + atalet terimleri',
  'live.inertialPart': '  ↳ atalet bileşeni',
  'live.reducedInertia': '  ↳ indirgenmiş atalet',
  'live.trajectoryRms': 'Yörünge RMS',
  'live.minMu': 'Min. iletim açısı μ',
  'live.singularity': 'Tekillik payı',
  'live.singularityTip': '∂F/∂q (kısıt Jacobian’ı) en küçük tekil değeri',
  'live.loopClosure': 'Çevrim kapanma hatası',
  'live.interference': 'Girişim',
  'live.interferenceTip':
    'Ortak mafsalı olmayan gövdeler arasında 12 mm kol genişliğinde eş düzlem girişimi',
  'live.clear': 'TEMİZ',
  'live.pairs': '{n} çift',
  'live.minGap': 'Min. eleman açıklığı',

  /* ---- hedef kalp ---- */
  'target.title': 'Hedef Kalp',
  'target.width': 'Hedef genişlik',
  'target.height': 'Hedef yükseklik',
  'target.actualWidth': 'Gerçek genişlik',
  'target.actualHeight': 'Gerçek yükseklik',
  'target.rmsChamfer': 'RMS hata (Chamfer)',
  'target.rmsParam': 'RMS hata (parametrik)',
  'target.maxError': 'Maks. hata',
  'target.ledToTarget': 'LED → hedef',
  'target.targetToLed': 'hedef → LED',
  'target.heartMatch': 'Kalp Uyumu',
  'target.scoreNote':
    'Yalnızca gösterim puanı — 100·exp(−RMS/{n}). Mühendislik kararlarında yukarıdaki milimetre değerleri kullanılır.',

  /* ---- amaç fonksiyonu ---- */
  'objective.title': 'Amaç Fonksiyonu Dağılımı',
  'objective.total': 'J (toplam)',
  'objective.curve': 'w₁ · eğri',
  'objective.size': 'w₂ · boyut',
  'objective.closure': 'w₃ · kapanma',
  'objective.singularity': 'w₄ · tekillik',
  'objective.buildability': 'w₅ · üretilebilirlik',
  'objective.ratio': 'w₆ · oran',
  'objective.gravity': 'w₇ · yerçekimi',

  /* ---- moment grafiği ---- */
  'torque.title': 'Yerçekimi Momenti τ(θ)',
  'torque.note':
    'τ_g(θ) = analitik çözücü üzerinde merkezi farkla dU/dθ, U = Σ mᵢ g y_agmᵢ.',
  'torque.gravityOff': 'Yerçekimi KAPALI — motor momenti tahmini bu terimi içermiyor.',
  'torque.unavailable': 'Moment profili kullanılamıyor.',
  'torque.peak': 'tepe ±{n} N·m',

  /* ---- kol tablosu ---- */
  'links.title': 'Kol Tablosu',
  'links.member': 'Eleman',
  'links.length': 'Uzunluk',
  'links.angle': 'Açı',
  'links.mass': 'Kütle',
  'links.layer': 'Kat',
  'links.note':
    'Uzunluklar sabit rijit gövde ölçüleridir; açılar her karede güncellenir. “Kat”, gövdenin bulunduğu montaj katmanıdır (paralel düzlem). Tüm elemanlar {min}–{max} mm aralığında sınırlandırılmıştır.',

  /* ---- topoloji ---- */
  'topology.title': 'Topoloji',
  'topology.mobility': 'Serbestlik derecesi = {n}',
  'topology.loops': '{n} bağımsız çevrim',
  'topology.counts': '8 kol / 10 mafsal',
  'topology.note':
    'Seri bağlı üç RRR Assur diyadı olarak çözülür — her mafsal kapalı formda çember–çember kesişiminden gelir, bu yüzden hiçbir yerde Newton iterasyonu kullanılmaz.',

  /* ---- tasarım vektörü ---- */
  'design.title': 'Tasarım Vektörü — {label}',
  'design.fixedNote':
    'Şartnameyle sabit: O2 = (0, 0), |O2 O4| = {a} mm, |O4 O6| = {b} mm, krank |O2 A| = {c} mm.',
  'design.export': 'Tasarım JSON’unu Dışa Aktar',
  'design.geometryTitle': 'Geometri Raporu — {label}',
  'design.lengthMm': 'Uzunluk (mm)',

  /* ---- optimizasyon ---- */
  'opt.title': 'Sentez / Optimizasyon',
  'opt.population': 'Popülasyon',
  'opt.generations': 'Nesil',
  'opt.restarts': 'Yeniden başlatma',
  'opt.seed': 'Rastgele tohum',
  'opt.run': 'Optimizasyonu Çalıştır',
  'opt.cancel': 'İptal',
  'opt.running': 'koşu {run}/{total} · {message}',
  'opt.starting': 'başlıyor…',
  'opt.bestJ': 'en iyi J = {j} · {n} değerlendirme',
  'opt.finished': '{s} s içinde {n} değerlendirme',
  'opt.note':
    'Yapıcı bir uygulanabilir başlangıç popülasyonu üzerinde Diferansiyel Evrim (rand/1 + current-to-best/1), ardından sınırlı Nelder–Mead iyileştirmesi. Tuval akıcı kalsın diye Web Worker içinde çalışır. Örnekleme tur başına {a} → {b} → {c} kareye incelir.',
  'opt.bestTitle': 'En İyi Mekanizmalar ({n})',
  'opt.sourceStored': 'Uygulamayla gelen çevrimdışı optimizasyon koşusundan yüklendi.',
  'opt.sourceLive': 'Bu tarayıcıda az önce çalıştırdığınız optimizasyondan.',
  'opt.detail.score': 'Puan J',
  'opt.detail.rms': 'RMS hata',
  'opt.detail.maxError': 'Maks. hata',
  'opt.detail.size': 'Genişlik × Yükseklik',
  'opt.detail.minMu': 'Min. iletim açısı μ',
  'opt.detail.singularity': 'Tekillik payı',
  'opt.detail.interference': 'Eş düzlem girişimi',
  'opt.detail.frames': '{n} kare',
  'opt.detail.layers': 'Montaj katmanı',
  'opt.detail.peakTorque': 'Tepe yerçekimi momenti',
  'opt.detail.fullRotation': 'Tam tur',
};

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'tr', label: 'TR', name: 'Türkçe' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

export const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, tr };
