# Mekanizma Tekniği — Kapsamlı Referans

Bu belge, KREAMET’in arkasındaki mühendislik disiplinini bir bütün olarak
toparlar. Amaç ansiklopedik bir derleme değil, **çalışan bir mekanizma
tasarlamak için gerçekten gereken** kavramları, denklemleri ve karar
ölçütlerini, birbirine bağlanmış bir sırayla vermektir.

Her bölüm üç soruya cevap verecek şekilde yazılmıştır:

1. Bu kavram fiziksel olarak neyi anlatıyor?
2. Hesabı nasıl yapılır, hangi denklem kullanılır?
3. Tasarımda hangi kararı değiştirir — yani neden umursamalıyım?

Gösterim, iki dilde de aynıdır: uzunluklar milimetre, açılar derece (metinde
`°`) veya radyan (denklemlerde), kütleler kilogram, momentler N·m. Vektörler
koyu değil, bileşenleriyle yazılır: `r = (rx, ry)`.

---

# 1. Giriş: mekanizma nedir, ne değildir

## 1.1 Tanım

Bir **mekanizma**, birbirine hareketli bağlantılarla tutturulmuş rijit
cisimlerden oluşan, bir girişteki hareketi belirli ve tekrarlanabilir bir çıkış
hareketine dönüştüren düzenektir. Üç şart aynı anda sağlanmalıdır:

- Cisimler (uzuvlar) **rijit** kabul edilir; şekil değiştirmeleri hareketin
  yanında ihmal edilebilir.
- Bağlantılar (mafsallar) göreli hareketi **kısıtlar**, tamamen engellemez.
- Zincir **kapalıdır** veya en azından bir gövdeye (şase) bağlıdır; serbestçe
  yüzen bir cisim topluluğu mekanizma değildir.

**Makine** ile farkı amaçtır: mekanizma hareketi iletir ve dönüştürür; makine
bunu iş yapmak, yani enerji dönüştürmek için kullanır. Aynı dört çubuk, bir
silecek kolunda mekanizma, bir presin içinde makinenin parçasıdır.

## 1.2 Neden hâlâ önemli

Servo motor ve hareket denetleyicileri ucuzlarken “her ekseni ayrı motorla
sürelim” yaklaşımı yaygınlaştı. Mekanizmanın hâlâ kazandığı yerler nettir:

- **Tek aktüatör, çok eksenli hareket.** Bir motor, bir çevrimde karmaşık bir
  yörünge çizebilir. Senkronizasyon problemi yoktur çünkü senkronizasyon
  geometriye gömülüdür.
- **Tekrarlanabilirlik.** Hareket, denetleyici çevrim süresine değil, imalat
  toleransına bağlıdır. İyi bir bağlantı kolu, kapalı çevrim denetimli bir
  eksenden daha kararlı bir yörünge verir.
- **Hız.** Yüksek çevrim hızlarında (paketleme, tekstil, baskı) elektronik
  eksenlerin bant genişliği yetmez; kam ve bağlantı kolları yeter.
- **Güvenlik ve basitlik.** Yazılım hatası bir mekanizmayı beklenmedik bir
  konuma götüremez; ulaşabileceği konumlar kümesi fizikseldir.

Bu belgedeki her yöntem, sonuçta şu soruya hizmet eder: *verilen bir görevi
mümkün olan en az aktüatörle, kabul edilebilir doğrulukta ve gerçekten
imal edilebilir biçimde nasıl yaparım?*

## 1.3 Tasarım akışı

Klasik akış üç kademelidir ve KREAMET de bu sırayı izler:

1. **Tip sentezi (yapısal sentez).** Kaç uzuv, kaç mafsal, hangi türden? Bu
   adımın çıktısı bir *topoloji*: hangi uzuv hangisine hangi mafsalla bağlı.
   Burada henüz hiçbir boyut yoktur.
2. **Boyut sentezi.** Topoloji sabitken uzunluklar, açılar ve mafsal konumları
   belirlenir. Görev burada devreye girer: hangi yörünge, hangi fonksiyon,
   hangi konumlar?
3. **Analiz ve doğrulama.** Konum, hız, ivme, kuvvet, tekillik, girişim,
   tolerans. Bu adım sentezi *reddedebilir* ve genellikle reddeder.

Acemi hata, 2. adımı 3. adımdan bağımsız yapmaktır. İyi bir yörünge uyumu,
mekanizma ölü noktadan geçemiyorsa hiçbir şey ifade etmez. Bu yüzden KREAMET’in
amaç fonksiyonu yalnızca eğri hatasını değil, tam tur dönebilirliği, iletim
açısını, tekillik payını ve montaj edilebilirliği birlikte ölçer.

## 1.4 Bu belgenin kapsamı

- Düzlemsel mekanizmalar ayrıntılı, uzaysal mekanizmalar özet olarak.
- Alt çiftler (döner, kayar) ayrıntılı; üst çiftler (kam, dişli) uygulama
  düzeyinde.
- Rijit cisim varsayımı esas; esnek mekanizmalar ayrı bir bölümde.
- Her yerde **kapalı form** çözümler tercih edilir; sayısal yöntemler yalnızca
  kapalı form olmadığında.

---

# 2. Temel kavramlar ve tanımlar

## 2.1 Uzuv (link)

**Uzuv**, üzerindeki iki nokta arasındaki uzaklık hareket boyunca değişmeyen
rijit cisimdir. Kinematikte uzvun şekli değil, üzerindeki **mafsal
noktalarının** göreli konumu önemlidir. Bir uzvu tanımlamak için:

- **İkili (binary) uzuv:** iki mafsal noktası. Tek bir uzunlukla tanımlanır.
- **Üçlü (ternary) uzuv:** üç mafsal noktası. Bir üçgenle tanımlanır; üç kenar
  uzunluğu veya iki kenar ve aradaki açı.
- **Dörtlü (quaternary) ve üstü:** dört veya daha çok nokta.

KREAMET’te üçlü uzuvlar, üçüncü noktanın gövdenin kendi çerçevesindeki
`(r, α)` kutupsal koordinatıyla parametrelenir. Bunun sebebi önemlidir:
üç kenar uzunluğunu bağımsız değişken yapsaydınız, üçgen eşitsizliğini ayrıca
zorlamanız gerekirdi ve optimizasyon sürekli geçersiz üçgenler üretirdi.
`(r, α)` ile gövde **yapısı gereği** rijittir, üçüncü kenar kosinüs teoreminden
çıkar:

```
c² = a² + r² − 2·a·r·cos(α)
```

Bu, “kısıtı denklemle zorlamak” yerine “kısıtı parametrelemeyle ortadan
kaldırmak” ilkesinin somut örneğidir ve sentez problemlerinde tekrar tekrar
karşınıza çıkar.

## 2.2 Şase (ground / frame)

Hareketi ölçtüğümüz referans uzvu **şase**dir. Numaralandırmada geleneksel
olarak 1 numaradır. Şase seçimi keyfidir ve değiştirilebilir: aynı kinematik
zincirin farklı uzuvlarını sabitleyerek farklı mekanizmalar elde edilir. Buna
**kinematik inversiyon** denir.

Dört çubuk zincirin dört inversiyonu:

| Sabitlenen uzuv | Ortaya çıkan mekanizma |
|---|---|
| Şase (en kısa komşusu) | Krank-sarkaç |
| En kısa uzuv | Çift krank (drag-link) |
| En kısanın karşısı | Çift sarkaç |
| Kavrayıcı | Ters çift krank |

İnversiyon, tasarımda ucuz bir çeşitlilik kaynağıdır: elinizdeki zincir
istediğiniz hareketi vermiyorsa, farklı bir uzvu sabitlemek çoğu zaman yeni bir
mekanizma tasarlamaktan hızlıdır.

## 2.3 Mafsal (joint / kinematic pair)

İki uzvu birbirine bağlayan ve göreli hareketlerini kısıtlayan elemandır.
Sınıflandırma iki eksende yapılır:

- **Temas biçimi:** *alt çift* (lower pair) yüzey teması, *üst çift* (higher
  pair) çizgi veya nokta teması.
- **Kalan serbestlik:** mafsalın bıraktığı göreli serbestlik derecesi sayısı.

Alt çiftler aşınmaya karşı daha dayanıklıdır (yük yüzeye yayılır), üst çiftler
daha zengin hareket verir (kam profili istediğiniz hareket kanununu üretebilir).

## 2.4 Kinematik zincir

Uzuvların mafsallarla bağlanmasıyla oluşan yapıdır.

- **Kapalı zincir:** her uzuv en az iki mafsala sahiptir, bir veya daha çok
  kapalı çevrim vardır. Dört çubuk, sekiz çubuk mekanizmalar böyledir.
- **Açık zincir:** bir uç serbesttir. Endüstriyel robot kolları böyledir.
- **Karma zincir:** hem kapalı çevrimler hem serbest uçlar içerir.

Kapalı zincir daha rijittir ve tek aktüatörle çok eksenli hareket verir; açık
zincir daha büyük çalışma hacmi verir ama her eksen için aktüatör ister.

## 2.5 Çevrim (loop)

Bir uzuvdan başlayıp mafsallar üzerinden ilerleyip aynı uzva dönen kapalı
yoldur. **Bağımsız çevrim sayısı** grafik teorisinden gelir:

```
L = j − n + 1
```

burada `n` uzuv sayısı (şase dahil), `j` mafsal sayısıdır. Bu sayı, yazmanız
gereken bağımsız vektör kapalılık denklemi sayısıdır ve düzlemde `2L` skaler
denklem verir.

KREAMET’in sekiz kollu mekanizmasında `n = 8`, `j = 10` olduğundan `L = 3`:
üç bağımsız çevrim, altı skaler denklem, altı bilinmeyen (üç mafsalın x ve y
koordinatı) — ve bir bilinen (motor açısı). Bu sayım tutarlılığı, topolojinin
doğru kurulduğunun ilk kontrolüdür.

## 2.6 Hareket türleri

| Tür | Tanım | Örnek |
|---|---|---|
| Öteleme | Her noktanın yörüngesi aynı, gövde dönmez | Kayar kızak |
| Dönme | Bir nokta sabit, diğerleri çember çizer | Krank |
| Genel düzlemsel | Dönme + öteleme birlikte | Kavrayıcı uzuv |
| Küresel | Tüm noktalar eşmerkezli küreler üzerinde | Kardan mafsalı |
| Uzaysal | Genel üç boyutlu | RSSR mekanizması |

Düzlemsel genel hareket, her an bir **ani dönme merkezi** etrafındaki saf dönme
olarak görülebilir; bu, hız analizinin temelidir (bkz. Bölüm 12).

## 2.7 Yörünge, iz ve kavrayıcı eğri

Bir noktanın hareket boyunca çizdiği eğri **yörüngesidir**. Kavrayıcı uzuv
üzerindeki bir noktanın çizdiği yörüngeye **kavrayıcı eğri (coupler curve)**
denir ve mekanizma tasarımının en verimli aracıdır: basit bir dört çubuk,
kavrayıcı üzerindeki nokta seçimine göre yaklaşık doğru, D harfi, sekiz
rakamı, damla ve daha pek çok eğri üretir.

KREAMET’in kalp yörüngesi de bu ailedendir: hiçbir uzvun ucu kalp çizmez;
kalbi çizen, çıkış uzvuna rijit bağlı bir **işaret noktasıdır**.

## 2.8 Serbestlik derecesi (kısa tanım)

Mekanizmanın konumunu tam belirlemek için gereken bağımsız değişken sayısıdır.
`M = 1` ise tek motor yeter ve mekanizma **tam kısıtlıdır**. `M = 0` ise yapı
(kafes) olur, hareket etmez. `M < 0` ise aşırı kısıtlıdır; ya montaj olmaz ya
da özel geometri sayesinde olur (bkz. Bölüm 5.6).

Ayrıntılı ele alış Bölüm 5’tedir.

---

# 3. Kinematik çiftler

## 3.1 Alt çiftler

Altı temel alt çift vardır. Düzlemsel mekanizmalarda yalnızca ilk ikisi ve
nadiren üçüncüsü kullanılır.

| Sembol | Ad | Serbestlik | Hareket |
|---|---|---|---|
| R | Döner (revolute, pin) | 1 | Bir eksen etrafında dönme |
| P | Kayar (prismatic, slider) | 1 | Bir eksen boyunca öteleme |
| H | Vidalı (helical, screw) | 1 | Dönme ve ötelemenin bağlı hareketi |
| C | Silindirik (cylindrical) | 2 | Bağımsız dönme + öteleme |
| S | Küresel (spherical, ball) | 3 | Nokta etrafında serbest dönme |
| F/E | Düzlemsel (planar, flat) | 3 | Düzlem içinde 2 öteleme + 1 dönme |

### 3.1.1 Döner mafsal (R)

Mekanizma tekniğinin en önemli elemanıdır. İmalatı kolaydır, yükü iyi taşır,
boşluğu (backlash) ölçülebilir ve sınırlanabilir, ömrü uzundur.

Düzlemde bir R mafsalı, bağladığı iki uzvun göreli hareketinden iki serbestlik
kaldırır ve bir tane bırakır: göreli dönme açısı. Bunu denklem olarak yazmak,
iki uzvun mafsal noktasındaki koordinatlarının eşit olmasıdır:

```
x_A^(uzuv i) − x_A^(uzuv j) = 0
y_A^(uzuv i) − y_A^(uzuv j) = 0
```

İki skaler denklem, iki kısıt. Grübler formülündeki `−2·j₁` terimi tam olarak
budur.

### 3.1.2 Kayar mafsal (P)

Bir uzvun diğeri üzerinde belirli bir doğrultuda kaymasına izin verir. Düzlemde
yine iki kısıt getirir: kayma doğrultusuna dik konum farkı sıfır olmalı ve
göreli dönme açısı sabit olmalı.

Kayar mafsalın pratik sorunları döner mafsaldan fazladır:

- Sürtünme yüzeyi büyüktür ve yağlama gerektirir.
- Kirlenmeye açıktır.
- Yanal yük altında sıkışma (jamming) eğilimi vardır; kılavuz boyu, kayma
  mesafesine göre yeterince uzun olmalıdır (pratik kural: kılavuz boyu ≥ 1.5 ×
  strok, aksi hâlde açısal boşluk hızla büyür).

Bu yüzden mümkün olan yerde P yerine R tercih edilir; KREAMET yalnızca R
kullanır ve bu bilinçli bir seçimdir.

### 3.1.3 Küresel mafsal (S)

Uzaysal mekanizmaların temel taşıdır. Üç serbestlik bırakır, yani düzlemsel
karşılığı yoktur. RSSR gibi uzaysal dört çubuklarda iki S mafsalı, uzuvların
kendi ekseni etrafındaki dönmesini **pasif serbestlik** olarak bırakır; bu
serbestlik hareketi etkilemez ama serbestlik derecesi sayımında görünür
(bkz. Bölüm 5.5).

## 3.2 Üst çiftler

Çizgi veya nokta teması olan çiftlerdir. Düzlemde bir serbestlik kaldırır, iki
bırakır (kayma + yuvarlanma).

- **Kam–izleyici:** profil, istenen hareket kanununu doğrudan üretir.
- **Dişli teması:** evolvent profiller sabit oran sağlar.
- **Yuvarlanan temas:** kaymasız yuvarlanma ek bir kısıt getirir ve çifti alt
  çift gibi davrandırır.

Üst çiftler mekanizmayı basitleştirir (kam ile tek uzuvda karmaşık hareket) ama
temas gerilmesi yüksektir ve aşınma yönetimi gerektirir.

## 3.3 Mafsal seçimi: karar tablosu

| İhtiyaç | Tercih | Gerekçe |
|---|---|---|
| Yüksek çevrim sayısı, uzun ömür | R | Yüzey teması, yatak standart |
| Doğrusal çıkış | R + bağlantı (yaklaşık doğru) veya P | P sürtünme ve sıkışma riski taşır |
| Serbest yörünge tanımı | Kam (üst çift) | Profil doğrudan kanunu kodlar |
| Uzaysal hareket | S + R | S pasif serbestlik verir, montajı kolaylaştırır |
| Düşük maliyetli imalat | R | Delik + pim yeterli |

## 3.4 Mafsal boşluğu (backlash)

Gerçek bir R mafsalında pim ile delik arasında `δ` boşluğu vardır. Bu boşluk,
uzvun konumunda `±δ/2` belirsizlik yaratır ve zincir boyunca **birikir**.
Kabaca, seri bağlı `k` mafsallı bir zincirde uç nokta belirsizliği en kötü
durumda:

```
Δ_uç ≈ Σ (δ_i / 2) · (L_i / L_toplam) ... yönlere bağlı, en kötü hâl toplamıdır
```

İstatistiksel (RSS) tahmin daha gerçekçidir:

```
Δ_uç ≈ sqrt( Σ (δ_i/2)² )
```

Tasarım sonucu: **mafsal sayısını gereksiz artırmayın.** Sekiz kollu bir
mekanizma, dört kollunun iki katı boşluk biriktirir. KREAMET’in kol sayısını
artırma seçeneği sunarken bunu bir “ücretsiz iyileşme” gibi göstermemesinin
sebebi budur; daha çok kol daha çok serbestlik ve daha çok belirsizlik demektir.

---

# 4. Kinematik zincirler ve topoloji

## 4.1 Topolojinin grafik gösterimi

Bir kinematik zincir, düğümleri uzuvlar ve kenarları mafsallar olan bir
**graf** olarak gösterilebilir. Bu gösterim üç şeyi kolaylaştırır:

- Serbestlik derecesi sayımı (kenar/düğüm sayıları).
- Bağımsız çevrimlerin bulunması (graf çevrim tabanı).
- İzomorfizm kontrolü (iki farklı çizim aynı zincir mi?).

KREAMET, topolojiyi bu şekilde **kurar ve doğrular**: mafsal–uzuv insidansı
`Σ deg(uzuv) = 2j` olmak zorundadır ve bağlantılılık kontrolü her gövdenin
şaseye bir yol üzerinden ulaşmasını şart koşar. Bu iki kontrol, yanlış
kurulmuş bir topolojinin çözücüye hiç ulaşmamasını sağlar.

## 4.2 Uzuv sayımı ve mafsal dağılımı

`n` uzuv ve `j` döner mafsallı düzlemsel bir zincirde, mafsal insidansı
toplamı `2j`’dir. Uzuvların türlerine göre:

```
2j = 2·n₂ + 3·n₃ + 4·n₄ + ...
n  = n₂ + n₃ + n₄ + ...
```

burada `n_k`, `k` mafsallı uzuv sayısıdır. `M = 1` şartıyla birlikte bu
denklemler, belirli `n` için mümkün uzuv dağılımlarını verir.

**Örnek — altı çubuk, M = 1:**
`M = 3(n−1) − 2j = 1` ve `n = 6` ⇒ `j = 7`.
`2·7 = 14 = 2n₂ + 3n₃` ve `n₂ + n₃ = 6` ⇒ `n₃ = 2`, `n₂ = 4`.
Yani altı çubuk mekanizmada tam olarak iki üçlü ve dört ikili uzuv olmalıdır.
Bu dağılım iki farklı topoloji verir: **Watt** (iki üçlü uzuv komşu) ve
**Stephenson** (iki üçlü uzuv ayrık). Sanayide ikisi de yaygındır ve
davranışları farklıdır.

**Örnek — sekiz çubuk, M = 1:**
`n = 8` ⇒ `j = 10`. `2·10 = 20 = 2n₂ + 3n₃ + 4n₄` ve `n₂+n₃+n₄ = 8`.
Çözümler: `(n₂,n₃,n₄) = (4,4,0)`, `(5,2,1)`. Sekiz çubuk için 16 farklı
izomorfik olmayan topoloji vardır; hepsi 1 serbestlik derecelidir ama kavrayıcı
eğri zenginlikleri çok farklıdır.

## 4.3 İzomorfizm

İki zincir, düğüm etiketleri değiştirilerek birbirine dönüştürülebiliyorsa
**izomorftur** — yani aynı mekanizmadır, farklı çizilmiştir. İzomorfizm
kontrolü, tip sentezinde aynı topolojiyi defalarca değerlendirmeyi önler.

Pratik yöntemler:

- **Derece dizisi:** uzuvların mafsal sayılarının sıralı listesi. Farklıysa
  izomorf değildir; aynıysa kesin sonuç vermez.
- **Karakteristik polinom:** komşuluk matrisinin özdeğerleri. Güçlü ama
  nadir durumlarda yanıltıcı.
- **Kanonik etiketleme:** kesin ama pahalı; küçük `n` için pratiktir.

## 4.4 Yapısal sentezde eleme ölçütleri

Sayım tüm olası topolojileri verir ama hepsi kullanışlı değildir. Elemede
kullanılan ölçütler:

- **Dejenere zincir:** bir alt zincir kendi içinde `M = 0` ise (rijit alt
  yapı), o kısım hareketsizdir ve zincir aslında daha küçüktür.
- **Sürücü uzvun konumu:** motoru şaseye komşu bir uzva bağlayamıyorsanız
  aktarım zorlaşır.
- **Çıkış noktasının erişimi:** hedef yörüngeye ulaşabilecek bir kavrayıcı
  nokta var mı?
- **İmal edilebilirlik:** çok sayıda uzvun aynı mafsalda buluşması (yüksek
  dereceli mafsal) montajı zorlaştırır.

## 4.5 KREAMET’in topoloji ailesi

KREAMET tek bir aile kullanır: **bir krank + N adet RRR Assur diyadı, seri
olarak çözülür**. Bunun sebebi Bölüm 6’da ayrıntılanır; burada topolojik
sonucu verelim:

```
n = 2 + 2N   uzuv    (şase + krank + diyad başına iki kol)
j = 1 + 3N   mafsal  (O2 + diyad başına üç döner çift)
L = j − n + 1 = N     bağımsız çevrim
M = 3(n−1) − 2j = 1   her N için
```

`N = 3` orijinal sekiz kollu mekanizmayı verir. Aile, `N = 1` (dört kol,
klasik dört çubuk) ile `N = 6` (on dört kol) arasında sunulur.

Bu ailenin kısıtı da açıktır: yalnızca RRR diyadları kullanılır, yani kayar
mafsal, kam veya dişli yoktur. Karşılığında **her boyutta kapalı form çözüm**
ve **her boyutta garantili M = 1** elde edilir.

---

# 5. Serbestlik derecesi

## 5.1 Grübler–Kutzbach formülü (düzlem)

Düzlemde serbest bir rijit cismin 3 serbestliği vardır (x, y, θ). `n` uzuvlu
bir zincirde biri şasedir, dolayısıyla `3(n−1)` serbestlik başlangıçta vardır.
Her alt çift (R veya P) 2, her üst çift 1 serbestlik alır:

```
M = 3(n − 1) − 2·j₁ − j₂
```

- `n` : uzuv sayısı, **şase dahil**
- `j₁`: bir serbestlikli mafsal sayısı (R, P)
- `j₂`: iki serbestlikli mafsal sayısı (kam, dişli teması)

## 5.2 Doğru sayma

Formülün yanlış uygulanmasının üç klasik sebebi vardır.

**(a) Şaseyi unutmak.** Dört çubuk mekanizmada `n = 4`’tür; hareketli üç uzuv
artı şase. `n = 3` yazarsanız `M = 3·2 − 2·4 = −2` çıkar ve mekanizmanın
çalışmadığı sonucuna varırsınız.

**(b) Çok uzuvlu mafsalı tek saymak.** Bir pimde `k` uzuv buluşuyorsa, bu
**`k − 1` döner çift** demektir, bir tane değil. Üç uzvun buluştuğu bir pim iki
çifttir.

Bu, KREAMET’te somut bir hataya yol açmıştı: bir kolun taşıdığı rijit noktaya
iki farklı diyad bağlandığında, o noktada **iki çakışık döner çift** vardır.
Nokta kimliği ile çift kimliğini aynı şey saymak, mafsal sayısını eksik
gösterip mobilite hesabını bozar. Çözüm, `pointId` (nerede) ile `jointId`
(hangi çift) kavramlarını ayırmaktır.

**(c) Hareket etmeyen “mafsalları” saymak.** Kaynaklı veya cıvatalı birleşim
mafsal değildir; iki uzvu tek uzuv yapar.

## 5.3 Yorumlama

| M | Anlam | Örnek |
|---|---|---|
| M < 0 | Aşırı kısıtlı (statik olarak belirsiz yapı) | Üçgen kafese ek çubuk |
| M = 0 | Yapı, hareketsiz | Üçgen kafes |
| M = 1 | Tam kısıtlı mekanizma, tek giriş | Dört çubuk |
| M = 2 | İki giriş gerekir | Beş çubuk |
| M ≥ 3 | Çok girişli / robotik | Seri robot kolu |

Tasarım hedefi neredeyse her zaman `M = 1`’dir: tek motor, belirlenmiş hareket.

## 5.4 Uzaysal genelleme

Uzayda serbest cismin 6 serbestliği vardır:

```
M = 6(n − 1) − Σ (6 − f_i)
```

burada `f_i`, `i`-inci mafsalın bıraktığı serbestlik sayısıdır. R ve P için
`f = 1`, C için 2, S için 3.

**Örnek — RSSR:** `n = 4`, mafsallar R, S, S, R.
`M = 6·3 − [(6−1) + (6−3) + (6−3) + (6−1)] = 18 − 16 = 2`.
İki serbestlik çıkar ama mekanizma pratikte tek serbestliklidir: ikinci
serbestlik, bağlantı çubuğunun kendi ekseni etrafındaki **pasif dönmesidir** ve
çıkış hareketini etkilemez. Bu, formülün “yanlış” olduğu değil, pasif
serbestliklerin ayrıca sayılması gerektiği anlamına gelir:

```
M_etkin = M_formül − F_pasif
```

## 5.5 Pasif serbestlikler

Pasif serbestlik, çıkışı hiç etkilemeyen bir göreli harekettir. Tanınması:
o serbestliği kilitlediğinizde (örneğin çubuğu S yerine U mafsalıyla bağlarsanız)
mekanizmanın hareketi değişmiyorsa, serbestlik pasiftir.

Pasif serbestlik **istenen** bir şeydir: montaj toleranslarını yutar ve aşırı
kısıtlamayı önler. RSSR’de S mafsalları yerine R kullanmak, mekanizmayı imal
edilemez hâle getirir çünkü dört R ekseninin tam paralel olması gerekir.

## 5.6 Aşırı kısıtlı (overconstrained) mekanizmalar

Formül `M ≤ 0` verdiği hâlde hareket eden mekanizmalar vardır. Bunlar özel
geometrik koşullar sayesinde çalışır:

- **Paralelkenar mekanizması:** karşılıklı kenarlar eşit olduğu için ek kol
  eklenebilir; formül `M = 0` der ama mekanizma çalışır.
- **Bennett mekanizması:** dört R mafsallı uzaysal zincir. `M = 6·3 − 4·5 = −2`
  çıkar; yine de belirli uzunluk ve eksen açısı ilişkileri altında tek
  serbestlikle hareket eder.
- **Sarrus mekanizması:** iki üçlü RRR zinciri, saf öteleme üretir.

Bu mekanizmalar üretimde **tolerans hassastır**: geometrik koşul bozulursa
sıkışırlar. Tasarımda bilinçli tercih edilmelidir, kazara değil.

## 5.7 Yerel (anlık) serbestlik

Bazı konfigürasyonlarda mekanizma, formülün öngördüğünden fazla anlık
serbestlik kazanır. Bu **tekillik**tir ve Bölüm 14’ün konusudur. Serbestlik
derecesi genel bir konfigürasyon için tanımlıdır; özel konumlarda geçerliliğini
yitirir. Bu yüzden `M = 1` doğrulaması gerekli ama yeterli değildir; ayrıca
tur boyunca tekillikten uzak kalındığı gösterilmelidir.

## 5.8 KREAMET’te mobilite doğrulaması

Uygulama iki bağımsız hesap yapar ve karşılaştırır:

1. Spec’ten kapalı formül: `M = 3(2+2N−1) − 2(1+3N) = 1`.
2. **Kurulan graftan** sayım: uzuv listesi ve mafsal listesi oluşturulur,
   `M = 3(n−1) − 2j` yeniden hesaplanır.

İkisi uyuşmazsa topoloji kurulumu hata fırlatır. Ekranda gösterilen
`Mobility = 1` rozeti, formülün tekrarı değil, **simüle edilen mekanizmanın
ölçülmüş özelliğidir**.

---

# 6. Assur grupları ve yapısal sentez

## 6.1 Assur grubu nedir

**Assur grubu**, şaseye bağlandığında serbestlik derecesi sıfır olan, daha
küçük parçalara ayrılamayan kinematik zincir parçasıdır. Düzlemde bir Assur
grubu için:

```
3·n_grup − 2·j_grup = 0
```

Buradan `n_grup : j_grup = 2 : 3` oranı çıkar. En küçük çözüm `n = 2, j = 3`:
iki uzuv, üç mafsal — yani **diyad**.

## 6.2 Diyad türleri

İki uzuvlu Assur grubunun beş türü vardır; harfler mafsal sırasını gösterir:

| Tür | Mafsallar | Açıklama |
|---|---|---|
| RRR | Üç döner | En yaygın; iki çember kesişimiyle çözülür |
| RRP | İki döner, bir kayar | Çember–doğru kesişimi |
| RPR | Döner–kayar–döner | Kayar mafsal ortada |
| PRP | Kayar–döner–kayar | İki doğrultu kısıtı |
| RPP | Döner–kayar–kayar | Nadir |

KREAMET yalnızca **RRR** kullanır. Sebep: çözümü iki çemberin kesişimidir,
kapalı formdur, iki kök verir ve kök seçimi montaj modunu belirler. Diğer
türler de kapalı formdur ama kayar mafsal getirdikleri için imalat ve sürtünme
açısından tercih edilmemiştir.

## 6.3 Neden bu kadar önemli

Assur grubunun serbestlik derecesi **sıfır** olduğundan, çalışan bir
mekanizmaya bir diyad eklemek serbestlik derecesini **değiştirmez**. Bu, iki
büyük pratik sonuç doğurur:

**(1) Değişken kol sayısı güvenlidir.** `M = 1` olan bir zincire istediğiniz
kadar diyad ekleyin, hâlâ `M = 1` olur. KREAMET’in 4–14 kol seçeneği bu
teoremin doğrudan uygulamasıdır; her boyut “deneyip görülmüş” değil, **yapısı
gereği** tek serbestliklidir.

**(2) Çözüm sıralanabilir.** Diyadlar, ankraj noktaları bilindiği sırayla
çözülür. Her diyad kendi bilinmeyenini kapalı formda verir; sistemin tamamını
aynı anda çözmek gerekmez. Bu yüzden hiçbir yerde Newton iterasyonu yoktur ve
çevrim kapanma kalıntısı gerçek bir doğrulama kalır.

## 6.4 Diyad çözümü: çember–çember kesişimi

RRR diyadının iki kolu, uzunlukları `r₁` ve `r₂` olsun; ankrajları `P₁` ve
`P₂`. Bilinmeyen mafsal `J`, iki çemberin kesişimidir:

```
d  = |P₂ − P₁|
a  = (r₁² − r₂² + d²) / (2d)
h² = r₁² − a²
Pm = P₁ + a·(P₂ − P₁)/d
J± = Pm ± h·( −(P₂−P₁)_y , (P₂−P₁)_x )/d
```

Çözümün varlığı için:

```
|r₁ − r₂| ≤ d ≤ r₁ + r₂
```

Bu koşul sağlanmazsa diyad **montaj olamaz** ve mekanizma o motor açısında
çözülemez. KREAMET bu durumda kareyi başarısız sayar ve `h² < 0` büyüklüğünü
“ne kadar uzakta kaldı” ölçüsü olarak amaç fonksiyonuna verir; böylece
optimizasyon düz bir plato yerine eğim görür.

## 6.5 İki kök: montaj modu

`J₊` ve `J₋` iki geçerli çözümdür. Aynı uzunluklarla iki farklı mekanizma
konfigürasyonu (montaj modu, branch) elde edilir. Hangi kökün seçildiği
**kritik**tir:

- Kök seçimi keyfi yapılırsa, mekanizma tur ortasında bir moddan diğerine
  “atlar”. Fiziksel olarak imkânsız bir sıçramadır; ekranda mekanizma anlık
  olarak katlanır.
- Doğru yaklaşım, her karede **bir önceki kareye en yakın kökü** seçmektir.
  Böylece çözüm bir dal üzerinde kalır.

KREAMET ayrıca bir **ısınma turu** yapar: raporlanan tur başlamadan önce bir
tam tur çözülür, böylece `θ = 0` da diğer kareler gibi süreklilik geçmişiyle
çözülür ve yörünge kapanma testi anlamlı olur.

## 6.6 Assur grubu sınıfı ve mertebesi

Diyad, **2. sınıf** Assur grubudur. Daha yüksek sınıflar vardır:

- **3. sınıf:** dört uzuv, altı mafsal; bir üçlü uzuv üç ikili uzuvla çevrelenir.
  Kapalı form çözümü yoktur; genellikle sayısal çözülür.
- **4. sınıf:** daha karmaşık, çok çevrimli.

Bir mekanizmanın **sınıfı**, içerdiği en yüksek sınıf Assur grubunun sınıfıdır.
Sınıf 2 mekanizmalar tamamen kapalı formda çözülür; bu, sentez sırasında
milyonlarca değerlendirme yapılacaksa belirleyici bir avantajdır.

## 6.7 Ayrıştırma (decomposition)

Verilen bir mekanizmayı Assur gruplarına ayırmak, çözüm sırasını verir:

1. Sürücü uzvu (krank) ve şaseyi ayır. Kalan zincirin `M = 0` olmalıdır.
2. Kalan zincirden, ankrajları bilinen bir Assur grubu ayır.
3. Kalan boşalana kadar tekrarla.

Ayrıştırma benzersiz olmayabilir; farklı sıralar farklı çözüm sıraları verir
ama aynı sonuca ulaşır.

---

# 7. Dört çubuk mekanizması ve Grashof koşulu

## 7.1 Neden dört çubuk

Dört çubuk, kapalı çevrimli düzlemsel mekanizmaların en basitidir: dört uzuv,
dört döner mafsal, `M = 3·3 − 2·4 = 1`. Sanayideki mekanizmaların büyük
çoğunluğu ya dört çubuktur ya da dört çubukların birleşimidir.

Uzuv adlandırması:

- **Şase (ground, `d`)** — sabit uzuv, iki sabit mafsal arasındaki mesafe.
- **Giriş (crank/input, `a`)** — motora bağlı uzuv.
- **Kavrayıcı (coupler, `b`)** — iki hareketli uzvu bağlayan; genel düzlemsel
  hareket yapar, ilginç eğrileri o çizer.
- **Çıkış (output/rocker, `c`)** — şaseye bağlı diğer hareketli uzuv.

## 7.2 Grashof koşulu

En az bir uzvun tam tur dönebilmesi için gerekli ve yeterli koşul:

```
s + l ≤ p + q
```

burada `s` en kısa, `l` en uzun, `p` ve `q` diğer iki uzuvdur.

- **Grashof (s + l < p + q):** en kısa uzuv tam tur döner.
- **Sınır durumu (s + l = p + q):** mekanizma bazı konumlarda katlanır
  (change point); tekilliğe girer, dal değiştirebilir.
- **Grashof olmayan (s + l > p + q):** hiçbir uzuv tam tur dönemez; hepsi
  sarkaçtır.

## 7.3 Sınıflandırma

Grashof koşulu sağlanıyorsa, hangi uzvun sabitlendiği mekanizma tipini belirler:

| Sabitlenen | Tip | Davranış |
|---|---|---|
| `s`’nin komşusu | Krank-sarkaç | Giriş tam tur, çıkış salınır |
| `s`’nin kendisi | Çift krank | Giriş ve çıkış tam tur |
| `s`’nin karşısı | Çift sarkaç | İkisi de salınır, kavrayıcı tam tur |

Motor tahriki için **krank-sarkaç** veya **çift krank** gerekir: motorun bağlı
olduğu uzuv tam tur dönmelidir.

## 7.4 Konum analizi (kapalı form)

Vektör kapalılığı:

```
a·e^{iθ₂} + b·e^{iθ₃} = d + c·e^{iθ₄}
```

Gerçek ve sanal kısımlar iki denklem verir. `θ₂` (giriş) bilinirken `θ₃, θ₄`
çözülür. Doğrudan yol, KREAMET’in de kullandığı **çember–çember** yaklaşımıdır:
kavrayıcı ile çıkış uzvunun buluştuğu mafsal, giriş ucundan `b` ve sabit
mafsaldan `c` yarıçaplı iki çemberin kesişimidir.

Freudenstein denklemi (Bölüm 20) aynı problemi açı cinsinden verir:

```
K₁·cos θ₄ − K₂·cos θ₂ + K₃ = cos(θ₂ − θ₄)
K₁ = d/a,  K₂ = d/c,  K₃ = (a² − b² + c² + d²)/(2ac)
```

Bu form, **fonksiyon sentezi** için doğrudan kullanışlıdır: üç bilinmeyen
`K₁, K₂, K₃` üç konum eşleşmesinden lineer olarak çözülür.

## 7.5 Kavrayıcı eğrileri

Kavrayıcı uzuv üzerindeki bir `P` noktası, `(θ₃, uzuv çerçevesindeki konum)`
ile belirlenir. `P`’nin çizdiği eğri, genel olarak **altıncı dereceden**
(sextic) bir cebirsel eğridir. Bu yüksek derece, dört çubuğun neden bu kadar
çeşitli eğri üretebildiğini açıklar.

Özel biçimler:

- **Yaklaşık doğru:** Watt, Chebyshev, Hoeken, Roberts mekanizmaları.
- **Duraklamalı (dwell):** eğrinin bir bölümü çembersel yayla örtüşür; oraya
  ikinci bir uzuv bağlanırsa çıkış bir süre durur.
- **Simetrik eğriler:** `b` ve `c` eşitse ve `P` simetri ekseni üzerindeyse.

## 7.6 Boyut oranları ve pratik sınırlar

Uzuv oranları hem kinematiği hem imalatı etkiler:

- Çok kısa krank + çok uzun kavrayıcı: iletim açısı iyi ama çıkış strogu küçük.
- Birbirine yakın uzunluklar: strok büyük ama tekilliğe yakın çalışma riski.
- Pratik kural: hiçbir uzuv, en uzun uzvun 1/5’inden kısa olmasın; aksi hâlde
  mafsal yatakları çakışır ve gövde imal edilemez.

KREAMET bu tür oran problemlerini `w₆` ağırlıklı bir **oran cezası** ile amaç
fonksiyonuna katar ve tüm elemanları 50–200 mm bandına zorlar.

---

# 8. Konum analizi — kapalı form yöntemler

## 8.1 Problem tanımı

Giriş açısı `θ` verildiğinde, mekanizmanın tüm mafsal koordinatlarını bulmak.
Bu, her sonraki analizin (hız, ivme, kuvvet, girişim) ön koşuludur ve bir tur
boyunca yüzlerce kez tekrarlanır; bu yüzden **hızı ve güvenilirliği** kritiktir.

## 8.2 Vektör çevrim yöntemi

Her bağımsız çevrim için vektörlerin toplamı sıfırdır:

```
Σ L_i · e^{i θ_i} = 0
```

Düzlemde her çevrim iki skaler denklem verir. `L` bağımsız çevrim ⇒ `2L`
denklem, `2L` bilinmeyen (giriş bilindiğine göre).

Bu genel yöntem her topolojiye uygulanır ama doğrudan çözümü zordur; genellikle
Newton–Raphson gerektirir.

## 8.3 Diyad yöntemi (tercih edilen)

Mekanizma Assur diyadlarına ayrılabiliyorsa, her diyad kendi bilinmeyenini
kapalı formda verir ve sistem hiç kurulmaz. Sıra:

1. Krank ucu doğrudan hesaplanır: `A = O₂ + a·(cos θ, sin θ)`.
2. Birinci diyadın iki ankrajı bilinir ⇒ çember–çember ⇒ `J₀`.
3. `J₀` bilindiğine göre o diyadın kolları üzerindeki rijit noktalar hesaplanır.
4. İkinci diyadın ankrajları artık bilinir ⇒ `J₁`. Ve böyle devam eder.

Maliyet: diyad başına birkaç karekök ve çarpma. 720 kare × 3 diyad, modern bir
tarayıcıda milisaniyeler mertebesindedir. Bu, sentez sırasında yüz binlerce
mekanizma değerlendirmeyi mümkün kılan şeydir.

## 8.4 Rijit nokta dönüşümü

Bir kolun ankrajı `P`, diyad mafsalı `J` ise, kol üzerindeki üçüncü nokta:

```
u   = (J − P) / |J − P|          (kol ekseni birim vektörü)
v   = (−u_y, u_x)                (dik birim vektör)
E   = P + r·cos(α)·u + r·sin(α)·v
```

`r` ve `α` tasarım değişkenleridir; `E` her karede bunlardan türetilir. Bu
formülasyon gövdenin rijitliğini **yapısı gereği** korur: `|E − P| = r` her
zaman tam olarak sağlanır, sayısal hata birikmez.

## 8.5 Çevrim kapanma kalıntısı

Kapalı form çözümde, çevrim denklemleri **çözülmez**, çözümden sonra
**kontrol edilir**. Her çevrim için:

```
res = | Σ vektörler |
```

Bu değer makine hassasiyetinde (≈10⁻¹³ mm) olmalıdır. Büyükse:

- Topoloji yanlış kurulmuştur, veya
- Rijit nokta dönüşümü tutarsızdır, veya
- Bir kol uzunluğu geometriden değil, bağımsız bir değişkenden geliyordur
  (üçgen eşitsizliği ihlali).

Newton iterasyonu kullanılsaydı bu kalıntı iterasyonun durma ölçütü olurdu ve
hiçbir şey doğrulamazdı. Kapalı form olduğu için **bağımsız bir testtir**. Bu
ayrım, KREAMET’in mimari kararlarından biridir.

## 8.6 Analitik çözümün başarısızlık modları

| Belirti | Sebep | Ne yapmalı |
|---|---|---|
| `h² < 0` | Diyad ulaşamıyor | Kol uzunluklarını değiştir; boşluk miktarı ceza olarak kullanılabilir |
| İki kök çok yakın | Tekilliğe yakın | İletim açısı kontrolü; tasarımı reddet |
| Kök seçimi zıplıyor | Dal süreklilik hatası | Önceki kareye en yakın kökü seç, tolerans genişlet |
| NaN yayılıyor | `d = 0` (ankrajlar çakışık) | Ankraj ayrımı için alt sınır koy |

## 8.7 Sayısal koşullanma

`d`, `r₁ + r₂`’ye çok yakınsa `h² = r₁² − a²` küçük iki sayının farkıdır ve
**yıkıcı yuvarlama hatası** üretir. Pratik önlem:

```
h² = ((r₁+r₂)² − d²) · (d² − (r₁−r₂)²) / (4d²)
```

Bu form, aynı büyüklüğü daha iyi koşullanmış çarpanlarla verir. KREAMET
kesişim hesabında bu tür bir düzenlemeyi kullanır ve ayrıca ulaşılamama
miktarını (`gap`) döndürür.

---

# 9. Konum analizi — sayısal yöntemler

## 9.1 Ne zaman gerekir

Kapalı form her zaman mümkün değildir. 3. sınıf ve üzeri Assur grupları,
karmaşık uzaysal zincirler ve serbest topolojili mekanizmalar sayısal çözüm
ister. Ayrıca **ters kinematik** problemleri (çıkış verildi, giriş nedir?)
genellikle sayısaldır.

## 9.2 Newton–Raphson

Kısıt denklemleri `F(q) = 0` biçiminde yazılır; `q` bilinmeyen koordinat
vektörüdür. İterasyon:

```
q_{k+1} = q_k − J(q_k)^{-1} · F(q_k)
J = ∂F/∂q
```

Yakınsama kareseldir ama şartlar var:

- Başlangıç tahmini yeterince yakın olmalı.
- `J` tekil olmamalı — tekillik yakınında yöntem patlar veya yanlış dala atlar.

Bir mekanizmayı tur boyunca çözerken **bir önceki karenin çözümü başlangıç
tahmini olarak kullanılır**. Bu hem yakınsamayı garantiye yaklaştırır hem de
dal sürekliliğini doğal olarak sağlar. Ama küçük bir açı adımı gerektirir;
adım büyürse yöntem başka bir dala kayabilir ve fark edilmez.

## 9.3 Homotopi / süreklilik yöntemleri

Zor problemi kolay bir problemden başlayıp sürekli deforme ederek çözmek:

```
H(q, s) = (1−s)·G(q) + s·F(q),   s: 0 → 1
```

`G` çözümü bilinen kolay bir sistem, `F` gerçek sistem. `s` küçük adımlarla
artırılırken `q` izlenir. Polinom sistemler için **tüm** çözümleri bulur; bu,
mekanizma sentezinde (kaç farklı mekanizma verilen görevi yapar?) değerlidir.

Maliyeti yüksektir; günlük analiz için değil, sentez araştırması için uygundur.

## 9.4 Gröbner tabanları ve rezültant

Kısıt denklemleri polinom sisteme çevrilerek (yarım açı `t = tan(θ/2)`
dönüşümüyle trigonometri elenir) cebirsel olarak çözülebilir. Bu, bir
mekanizmanın **kaç montaj modu** olduğunu kesin söyler.

Dört çubuk: 2 mod. Stephenson altı çubuk: 4 mod. Watt altı çubuk: 6 mod.
Genel sekiz çubuk: 16’ya kadar.

Bu sayı, dal sürekliliğinin neden ciddiye alınması gerektiğini gösterir: 16
farklı geometri aynı uzuv uzunluklarıyla montaj edilebilir ve yalnızca biri
istediğiniz yörüngeyi çizer.

## 9.5 Sayısal yöntemin gizli maliyeti

İteratif çözümde çevrim kapanma kalıntısı **durma ölçütüdür**, bağımsız bir
doğrulama değil. `1e−10` tolerans koyup “kapanma hatası 1e−10” diye rapor
etmek totolojidir. Kapalı formda ise kalıntı, hesabın kendisinden bağımsız
olarak ölçülür.

Bu ayrım, KREAMET’in yalnızca RRR diyadları kullanma tercihinin arkasındaki
mühendislik gerekçesidir: raporlanan `1.3 × 10⁻¹³ mm` gerçek bir ölçümdür.

---

# 10. Dal (montaj modu) ve süreklilik

## 10.1 Montaj modu nedir

Aynı uzuv uzunlukları ve aynı giriş açısı için, mekanizma birden çok farklı
geometrik konfigürasyonda montaj edilebilir. Bunlara **montaj modu**, **dal**
veya **devre (circuit)** denir.

Dört çubukta iki mod vardır: kavrayıcı–çıkış mafsalı, giriş ucundan geçen
doğrunun bir tarafında veya diğerinde.

## 10.2 Devre ve kol (circuit vs. branch)

Literatürde iki ayrı kavram vardır ve karıştırılır:

- **Devre (circuit):** mekanizmayı sökmeden ulaşılabilen konfigürasyonlar
  kümesi. Farklı devreler arasında geçiş, mekanizmayı sökmeyi gerektirir.
- **Kol (branch):** bir devre içinde, tekillik geçmeden ulaşılabilen bölge.
  Bir devre birden çok kol içerebilir; kollar arası geçiş için mekanizma bir
  ölü noktadan geçmelidir.

Tasarım açısından sonuç aynıdır: **çalışma çevrimi tek bir kol içinde
kalmalıdır.** Aksi hâlde mekanizma ya sıkışır ya da kestirilemez şekilde
diğer kola geçer.

## 10.3 Dal sürekliliği nasıl sağlanır

Üç yöntem vardır:

**(a) İşaret seçici (sign selector).** Kesişim formülündeki `±h` teriminin
işareti bir tasarım parametresi yapılır. Basittir ama yanlış tercihtir:
işaret sabit tutulursa, mekanizma bir tekillikten geçtiğinde fiziksel olarak
diğer köke geçmesi gerekirken geçemez ve çözüm süreksizleşir.

**(b) Önceki kareye en yakın kök.** Her karede iki kök hesaplanır, bir önceki
karenin çözümüne yakın olan seçilir. Fiziksel olarak doğru davranıştır: gerçek
mekanizma da sürekli hareket eder.

**(c) Sayısal süreklilik.** Newton iterasyonunu önceki çözümden başlatmak.
(b) ile aynı etkiyi verir, ek maliyetle.

KREAMET (b)’yi kullanır ve ayrıca sıçramayı **ölçer**: ardışık kareler
arasındaki mafsal yer değiştirmesi bir eşiği aşarsa `assemblyJumps` sayacı
artar ve tasarım reddedilir.

## 10.4 Sıçrama toleransı seçimi

Tolerans çok küçükse hızlı ama meşru hareketler sıçrama sanılır; çok büyükse
gerçek sıçramalar kaçar. Ölçekli bir yaklaşım:

```
tol = k · ω · Δt = k · (2π / N_kare) · L_karakteristik
```

`k ≈ 3–5` pratikte iyi çalışır. Fare ile elle sürüklerken açı adımı büyük
olabileceğinden KREAMET, etkileşimli modda toleransı 4 kat genişletir —
yanlış uyarı vermemek için.

## 10.5 Ölü nokta üzerinden geçiş

Bir mekanizma tekillikten geçerken hangi kola gideceği **belirsizdir**;
fiziksel sistemde bunu atalet, sürtünme veya bir yardımcı eleman belirler:

- **Volan:** ataletle taşır.
- **Ofset kol:** ikinci bir mekanizma, ölü noktada moment sağlar.
- **Yay:** tercih edilen yöne iter.
- **Çift krank tasarımı:** ölü noktadan hiç geçmemek.

Sentezde en temiz çözüm sonuncusudur: mekanizmayı ölü noktadan uzak tutan
tasarımlar seçilir. İletim açısı alt sınırı tam olarak bu işi görür.

## 10.6 Isınma turu

Tur başında `θ = 0`’ın “önceki karesi” yoktur. Kök keyfi seçilirse, `θ = 0` ile
`θ = 2π` farklı kollarda olabilir ve yörünge kapanmaz — üstelik bu, gerçek bir
kusur değil, ölçüm artefaktıdır.

Çözüm: **raporlanan turdan önce bir tam tur çöz.** Böylece `θ = 0` da diğer
kareler gibi bir süreklilik geçmişiyle çözülür ve `|P(0) − P(2π)|` testi
anlamlı olur. KREAMET bunu yapar ve yörünge kapanmasını `1.4 × 10⁻¹⁴ mm`
mertebesinde ölçer.

---

# 11. Hız analizi

## 11.1 Neden ayrı bir analiz

Konum analizi mekanizmanın nerede olduğunu söyler; hız analizi ne kadar hızlı
hareket ettiğini. Gerekli olduğu yerler:

- Aktüatör seçimi (gerekli açısal hız, güç).
- Atalet kuvvetleri (ivme analizinin girdisi).
- Tekillik tespiti (hızlar patlıyorsa tekillik yakındır).
- Mekanik avantaj (giriş–çıkış hız oranı).

## 11.2 Türev alma yöntemi

Kısıt denklemleri `F(q, θ) = 0` zamana göre türetilir:

```
∂F/∂q · q̇ + ∂F/∂θ · θ̇ = 0
⇒ q̇ = −J⁻¹ · (∂F/∂θ) · θ̇
```

`J = ∂F/∂q` **Jakobiyen**dir. Bu, hız analizini bir lineer sistem çözümüne
indirger. `J` tekilse hız çözülemez — tekillik tanımı buradan gelir.

## 11.3 Vektör yöntemi (elle hesap)

Rijit cisim üzerindeki iki nokta arasında:

```
v_B = v_A + ω × r_{A→B}
```

Düzlemde `ω × r = ω·(−r_y, r_x)`. Bir dört çubukta:

```
v_A = ω₂ × r_{O2→A}                    (biliniyor)
v_B = v_A + ω₃ × r_{A→B}               (ω₃ bilinmiyor)
v_B = ω₄ × r_{O4→B}                    (ω₄ bilinmiyor)
```

İki bilinmeyen, iki skaler denklem (x ve y). Çözüm doğrudan.

## 11.4 Sonlu fark yöntemi

Kapalı form konum çözümü hızlıysa, hız sayısal türevle alınabilir:

```
v ≈ (P(θ+h) − P(θ−h)) / (2h) · θ̇
```

Merkezî fark `O(h²)` hatalıdır. `h` seçimi: çok büyükse kesme hatası, çok
küçükse yuvarlama hatası. Çift hassasiyette `h ≈ 1e−4` rad pratik bir
dengedir.

KREAMET bu yolu kullanır ve **çözümü önceki kareyle tohumlar** — aksi hâlde
`θ+h` ve `θ−h` farklı kollara düşebilir ve türev tamamen anlamsız çıkar. Bu,
sonlu fark kullanan her mekanizma kodunda gözden kaçan bir tuzaktır.

## 11.5 Hız oranı ve mekanik avantaj

Enerji korunumundan (sürtünmesiz):

```
T_giriş · ω_giriş = F_çıkış · v_çıkış
MA = F_çıkış / F_giriş = (ω_giriş · r_giriş) / v_çıkış
```

Mekanik avantaj, mekanizmanın konumuna göre değişir ve tekilliklerde sonsuza
gider veya sıfırlanır. Bu yüzden “bu mekanizmanın mekanik avantajı 3’tür”
demek eksiktir; **çevrim boyunca en kötü değeri** verilmelidir.

## 11.6 Hız çokgeni

Elle çözümde grafik yöntem: hız vektörleri uç uca eklenir, kapalı çokgen
oluşturulur. Bilgisayar çağında hesap için kullanılmaz ama **sezgi** için hâlâ
değerlidir: çokgenin bir kenarı çok kısaldığında o uzuv neredeyse duruyordur;
çok uzadığında tekillik yakındır.

---

# 12. Ani dönme merkezleri

## 12.1 Tanım

İki cismin göreli hareketi, her an bir nokta etrafındaki saf dönme olarak
görülebilir. Bu noktaya **ani dönme merkezi (instant centre)** denir ve
`I_{ij}` ile gösterilir: `i` ve `j` cisimlerinin göreli dönme merkezi.

Özellikleri:

- `I_{ij} = I_{ji}`.
- O anda, iki cismin bu noktadaki hız vektörleri **eşittir**.
- `n` uzuvlu bir mekanizmada ani merkez sayısı `n(n−1)/2`’dir.

## 12.2 Kennedy (üç merkez) teoremi

Üç cismin üç ani merkezi **aynı doğru üzerindedir**:

```
I₁₂, I₁₃, I₂₃  eş doğrusaldır
```

Bu teorem, bilinen merkezlerden bilinmeyenleri geometrik olarak bulmayı sağlar
ve elle mekanizma analizinin en güçlü aracıdır.

## 12.3 Dört çubukta ani merkezler

`n = 4` ⇒ 6 ani merkez:

- `I₁₂`: `O₂` (giriş–şase) — sabit mafsal.
- `I₁₄`: `O₄` (çıkış–şase) — sabit mafsal.
- `I₂₃`: `A` (giriş–kavrayıcı) — mafsal.
- `I₃₄`: `B` (kavrayıcı–çıkış) — mafsal.
- `I₁₃`: kavrayıcı–şase. Kennedy ile: `O₂A` ve `O₄B` doğrularının kesişimi.
- `I₂₄`: giriş–çıkış. Kennedy ile: `AB` ve `O₂O₄` doğrularının kesişimi.

`I₁₃` özellikle önemlidir: kavrayıcının o andaki dönme merkezidir, dolayısıyla
kavrayıcı üzerindeki her noktanın hızı bu merkez etrafındaki dönmeden çıkar.
Kavrayıcı eğrisinin eğrilik merkezi de bu noktayla ilişkilidir.

## 12.4 Hız oranı ani merkezle

```
ω₄ / ω₂ = (I₁₂ I₂₄ uzaklığı) / (I₁₄ I₂₄ uzaklığı)
```

`I₂₄` sonsuza giderse (`AB` ve `O₂O₄` paralel) oran 1 olur — paralelkenar
davranışı. `I₂₄` `O₂`’ye düşerse çıkış durur; `O₄`’e düşerse giriş kilitlenir.

## 12.5 Ani merkez ve tekillik

Tekillikler, ani merkezlerin dejenere olmasıyla doğrudan ilişkilidir:

- İki mafsal ve bir ani merkez çakışırsa, o mafsal çifti bir kısıt kaybeder.
- `I₂₄` `O₂` veya `O₄` ile çakıştığında mekanizma ölü noktadadır.

Bu, tekilliği Jakobiyen hesaplamadan **geometrik olarak görmenin** yoludur ve
tasarım aşamasında hızlı bir kontroldür.

## 12.6 Kavrayıcı eğrisinin eğriliği

Euler–Savary denklemi, kavrayıcı üzerindeki bir noktanın çizdiği eğrinin
eğrilik merkezini verir:

```
(1/r − 1/r') · sin ψ = 1/a
```

burada `r` noktanın ani merkeze uzaklığı, `r'` eğrilik merkezine uzaklığı,
`ψ` normal ile yaptığı açı, `a` ise dönme kutbunun eğrilik yarıçapıdır
(inflection circle çapı).

Pratik sonucu: **inflection circle** üzerindeki noktalar o anda **doğrusal**
hareket eder (eğrilik sonsuz). Yaklaşık doğru mekanizmaları bu gerçeğe
dayanır — nokta, çevrimin büyük bölümünde inflection circle yakınında tutulur.

---

# 13. İvme analizi

## 13.1 Neden gerekir

Atalet kuvvetleri `F = m·a`’dır ve yüksek hızda ağırlık kuvvetini kolayca
geçer. Mafsal yükleri, yatak seçimi, gövde mukavemeti ve motor momenti
ivme analizini gerektirir.

Büyüklük sezgisi: 60 rpm’de `ω = 6.28 rad/s`; 150 mm yarıçapta merkezcil ivme
`ω²r = 5.9 m/s²`, yani yerçekiminin %60’ı. 600 rpm’de aynı nokta `591 m/s²`,
60 g. Hız on kat artınca atalet yüz kat artar.

## 13.2 Rijit cisim ivme denklemi

```
a_B = a_A + α × r_{A→B} + ω × (ω × r_{A→B})
```

Üç terim:

- `a_A` — referans noktanın ivmesi.
- `α × r` — **teğetsel ivme**, açısal ivmeden.
- `ω × (ω × r)` — **merkezcil (normal) ivme**, düzlemde `−ω²·r`.

## 13.3 Coriolis ivmesi

İki cisim birbirine göre **kayıyorsa** ek bir terim doğar:

```
a_Coriolis = 2 · ω × v_rel
```

Kayar mafsallı mekanizmalarda (RPR, kam izleyicisi) mutlaka hesaba katılır.
Yalnızca döner mafsallı bir mekanizmada Coriolis terimi yoktur — KREAMET’in
saf RRR seçiminin bir yan faydası budur.

## 13.4 Türev yöntemi

Hız denkleminin bir kez daha türevi:

```
J·q̈ + (dJ/dt)·q̇ + ∂F/∂θ·θ̈ + (d/dt)(∂F/∂θ)·θ̇ = 0
```

`dJ/dt` terimi karmaşıktır; pratikte sonlu farkla alınır.

## 13.5 İkinci mertebeden sonlu fark

```
a ≈ (P(θ+h) − 2·P(θ) + P(θ−h)) / h² · θ̇²  +  (P(θ+h) − P(θ−h))/(2h) · θ̈
```

Sabit hızda (`θ̈ = 0`) ikinci terim düşer. `h` seçimi hızdan daha kritiktir:
ikinci fark, yuvarlama hatasını `1/h²` ile büyütür. Çift hassasiyette
`h ≈ 1e−3 … 1e−4` rad uygundur.

Yine dal tohumlaması şarttır: üç nokta aynı kolda olmalıdır.

## 13.6 İvme çokgeni

Grafik karşılığı hız çokgenine benzer ama her uzuv için iki bileşen (teğetsel
ve normal) çizilir. Elle hesapta hâlâ öğretilir; sezgisel değeri, normal
ivmenin `ω²` ile ölçeklendiğini ve dolayısıyla hızlı uzuvlarda baskın
olduğunu göstermesidir.

## 13.7 Şok ve jerk

Üçüncü türev **jerk** (`da/dt`), ivmenin değişim hızıdır. Kam tasarımında
kritiktir: süreksiz jerk, titreşim ve gürültü üretir. Bağlantı kollu
mekanizmalarda hareket doğal olarak düzgündür (analitik fonksiyonlar), bu
yüzden jerk nadiren problem olur — kam mekanizmalarına karşı önemli bir
avantajdır.

---

# 14. Jakobiyen ve tekillikler

## 14.1 Kısıt Jakobiyeni

Mekanizmanın kısıt denklemleri `F(q) = 0` olsun; `q`, bilinmeyen mafsal
koordinatlarının vektörü. Jakobiyen:

```
J_{mn} = ∂F_m / ∂q_n
```

Boyutu `2L × 2L`’dir (düzlemde `L` bağımsız çevrim için).

## 14.2 Tekillik tanımı

`det(J) = 0` olduğunda:

- Hız denklemi çözülemez veya sonsuz çözümü olur.
- Mekanizma anlık olarak fazladan serbestlik kazanır veya bir serbestlik
  kaybeder.
- Küçük giriş değişimi büyük çıkış değişimine (veya tersine) yol açar.

## 14.3 Tekillik türleri

**(a) Giriş tekilliği (ölü nokta).** Giriş uzvu hareket etse de çıkış
hareket etmez. Krank ve kavrayıcı aynı doğrultuya geldiğinde oluşur.
Mekanizma bu noktada kilitlenmez ama moment sonsuza gider.

**(b) Çıkış tekilliği.** Çıkış uzvu giriş sabitken hareket edebilir; mekanizma
anlık olarak serbestlik kazanır. Paralel mekanizmalarda tehlikelidir: yapı
kontrol edilemez hâle gelir.

**(c) Karma tekillik.** İkisi birden; özel geometrilerde (eşit uzuvlar).

## 14.4 En küçük tekil değer

`det(J)` tek başına iyi bir ölçü değildir: birimlere ve ölçeğe bağlıdır, ayrıca
büyük matrislerde taşar. Daha iyi ölçü **en küçük tekil değer** `σ_min`:

```
σ_min(J) = sqrt( λ_min(JᵀJ) )
```

`σ_min → 0` tekilliğe yaklaşmayı gösterir. Ayrıca **koşullanma sayısı**
`κ = σ_max / σ_min` kullanılır; `κ` büyükse mekanizma o konumda kötü
koşullanmıştır.

KREAMET, `JᵀJ`’nin özdeğerlerini Jacobi döndürmeleriyle hesaplar ve `σ_min`’i
tur boyunca izler. Bu, tekillik payının doğrudan ölçüsüdür.

## 14.5 İletim açısı: bedava ve tam vekil

Jakobiyen hesabı pahalıdır. RRR diyadları için çok daha ucuz ve **tam** bir
vekil vardır.

Bir RRR diyadının `2×2` Jakobiyen bloğunun determinantı, iki kolun arasındaki
açının sinüsüyle orantılıdır:

```
det(J_diyad) ∝ r₁ · r₂ · sin(μ)
```

Yani `μ → 0` veya `μ → 180°` iken determinant sıfırlanır — tam olarak tekillik
koşulu. `μ` zaten konum çözümünde hesaplanan bir büyüklüktür (kosinüs teoremi
ile), dolayısıyla **ek maliyeti yoktur**.

Bu, sentez sırasında yüz binlerce değerlendirme yapılırken belirleyicidir:
tekillik cezası, Jakobiyen kurmadan tam doğrulukla hesaplanır.

## 14.6 Tekillikten kaçınma stratejileri

- **Tasarımla:** iletim açısını çevrim boyunca `40°–140°` bandında tutmak.
- **Yörünge planlamayla:** tekillik bölgesini çalışma alanının dışına atmak.
- **Fazlalıkla:** ek aktüatör veya ek kol eklemek (paralel mekanizmalarda
  yaygın).
- **Ataletle:** volanla ölü noktadan geçmek (düşük hızda işe yaramaz).

## 14.7 Tekillik yer eğrisi

Tasarım uzayında `det(J) = 0` bir yüzey tanımlar. Bu yüzey, çalışma alanını
ulaşılabilir bölgelere böler. İki nokta arasında hareket ederken bu yüzeyi
geçmek zorundaysanız, mekanizma o iki noktayı sürekli bir hareketle
bağlayamaz.

Bu, sentez problemine doğrudan bir kısıt olarak girer: hedef yörüngenin tamamı
**tek bir tekilliksiz bölgede** olmalıdır.

---

# 15. İletim açısı ve mekanik avantaj

## 15.1 Tanım

**İletim açısı `μ`**, kavrayıcı uzuv ile çıkış uzvu arasındaki açıdır. Kuvvetin
ne kadar verimli iletildiğini ölçer:

- `μ = 90°`: kuvvet tamamen faydalı bileşende; ideal.
- `μ → 0°` veya `μ → 180°`: kuvvetin neredeyse tamamı mafsal yatağına biner,
  faydalı moment sıfıra gider.

## 15.2 Hesabı

Dört çubukta kosinüs teoremiyle:

```
cos μ = (b² + c² − d'²) / (2bc)
```

burada `d'`, giriş ucunu sabit çıkış mafsalına bağlayan mesafedir:

```
d'² = a² + d² − 2ad·cos(θ₂)
```

RRR diyadı için genel form aynıdır: iki kolun uzunlukları `r₁, r₂` ve
ankrajlar arası mesafe `d`:

```
cos μ = (r₁² + r₂² − d²) / (2 r₁ r₂)
```

## 15.3 Etkin iletim açısı

`μ` ile `180° − μ` aynı kalitededir (kuvvet iletimi simetriktir). Bu yüzden
tek bir sayıya indirgemek için:

```
μ_etkin = min(μ, 180° − μ)
```

Bu, `[0°, 90°]` aralığında bir sayıdır ve `90°` en iyisidir. Bir tasarımı
değerlendirirken **çevrim boyunca en küçük `μ_etkin`** raporlanmalıdır.

## 15.4 Kabul sınırları

| `μ_etkin` | Değerlendirme |
|---|---|
| ≥ 60° | Mükemmel; yüksek yük ve hızda güvenli |
| 45°–60° | İyi |
| 40°–45° | Kabul edilebilir; yatak yükü artar |
| 30°–40° | Sınırda; yalnızca düşük yükte |
| < 30° | Reddedilmeli; sıkışma ve aşınma riski |

## 15.5 Analitik tavan — somut bir örnek

Bu, KREAMET’in tasarımında karşılaşılan ve **şartnameyi düzelten** bir
sonuçtur, dolayısıyla ayrıntısıyla verilmeye değer.

Giriş diyadı, krank ucundan (`A`) ikinci sabit mafsala (`O₄`) uzanan bir RRR
diyadıdır. Krank uzunluğu `a = 50 mm`, sabit mafsallar arası `d = 120 mm` ise,
`|A O₄|` mesafesi bir turda şu bandı tarar:

```
d_min = 120 − 50 = 70 mm
d_max = 120 + 50 = 170 mm
```

Diyadın kolları `r₁, r₂` olsun. `μ ≥ μ_min` koşulunu **tüm band boyunca**
sağlamak için iki eşitsizlik aynı anda gerekir.

En uzak konumda (`d = d_max`) kollar açılır, `μ` küçülür:

```
cos μ ≥ (r₁² + r₂² − d_max²) / (2 r₁ r₂)     ... aslında bu −cos μ tarafı
```

En yakın konumda (`d = d_min`) kollar katlanır, `μ` `180°`’ye yaklaşır.
İki koşulu birlikte yazıp `r₁² + r₂²` terimini elersek:

```
4·r₁·r₂·cos μ ≥ d_max² − d_min² = 170² − 70² = 24000
2·r₁·r₂·(1 − cos μ) ≤ d_min² = 4900
```

İkinci eşitsizlikten `r₁r₂ ≤ 2450/(1−cos μ)`. Birinciye koyarsak:

```
4 · 2450 · cos μ / (1 − cos μ) ≥ 24000
9800·cos μ ≥ 24000 − 24000·cos μ
33800·cos μ ≥ 24000
cos μ ≥ 0.71006
μ ≤ 44.75°
```

**Sonuç:** bu şase ve bu krank uzunluğuyla, giriş diyadının iletim açısı
`44.75°`’yi hiçbir tasarımda geçemez. Eşitlik `r₁ = r₂ = 91.9 mm`’de sağlanır.

Bu, ders kitaplarının önerdiği `60°–120°` “optimum bandın” bu problem için
**erişilemez** olduğu anlamına gelir. `40°–140°` sert sınırı erişilebilir ama
yalnızca dar bir uzunluk bandında.

Tasarım kararı: tekillik cezası `60°`’ye değil `45°`’ye referanslanır; böylece
fiziksel optimumda sıfırlanır ve hâlâ eğim taşır. Bunu yapmadan optimizasyon,
ulaşılamaz bir hedefe karşı sürekli ceza alır ve eğri uyumunu gereksiz yere
feda eder.

Bandı genişletmenin tek yolu geometriyi değiştirmektir: `d`’yi büyütmek veya
`a`’yı uzatmak. `d = 200 mm` yapılırsa aynı hesap `μ_max = 61.5°` verir.

## 15.6 Mekanik avantaj ile ilişki

```
MA ∝ sin(μ) / sin(giriş açısı terimi)
```

`μ` küçüldükçe `MA` düşer ve aynı çıkış kuvveti için giriş momenti büyür.
Ölü noktada `MA = 0`: sonsuz moment gerekir.

## 15.7 Çok diyadlı zincirlerde

Her diyadın kendi `μ`’sü vardır. Zincirin kalitesini **en kötüsü** belirler:

```
μ_zincir = min_k ( min(μ_k, 180° − μ_k) )
```

KREAMET bu değeri her karede hesaplar, tur boyunca minimumunu alır ve hem
ekranda gösterir hem de amaç fonksiyonuna sokar. Belirlenen sert eşiğin
altındaki tasarımlar, eğri uyumu ne olursa olsun **reddedilir**.

---

# 16. Ölü noktalar ve çalışma aralığı

## 16.1 Ölü nokta

Giriş uzvunun hareketinin çıkışa iletilemediği konumdur. Dört çubukta,
kavrayıcı ile çıkış uzvu aynı doğrultuya geldiğinde (`μ = 0°` veya `180°`).

Ölü noktada:

- Çıkışın hızı sıfırdır (yön değiştirir).
- Giriş momenti sonsuza gider (teorik olarak).
- Mekanizma hangi yöne devam edeceğine karar veremez.

## 16.2 Sınır konumu (limit position)

Çıkış uzvunun salınım aralığının uçlarıdır. Krank-sarkaçta çıkışın en sağ ve
en sol konumları, giriş uzvu ile kavrayıcının çakıştığı veya üst üste bindiği
anlardır:

```
d_uzak  = a + b   ⇒ çıkışın bir ucu
d_yakın = |b − a| ⇒ diğer ucu
```

Bu konumlarda `μ` genellikle en kötüdür; tasarım kontrolü buralarda yapılır.

## 16.3 Zaman oranı (time ratio)

Krank-sarkaçta ileri ve geri stroklar farklı sürede tamamlanır:

```
Q = (180° + β) / (180° − β)
```

`β`, iki sınır konumu arasındaki krank açısı farkının `180°`’den sapmasıdır.
`Q > 1`, hızlı geri dönüş (quick-return) mekanizmasıdır: kesme, itme ve
biçme makinelerinde iş stroğu yavaş, dönüş hızlı olsun diye kullanılır.

`Q = 1` için mekanizma simetrik olmalıdır (`β = 0`).

## 16.4 Çalışma alanı (workspace)

Çıkış noktasının ulaşabildiği noktalar kümesidir. Sınırları:

- **Ulaşılabilirlik sınırı:** kollar tam açık veya tam katlı.
- **Tekillik sınırı:** `det(J) = 0` yüzeyi.
- **Girişim sınırı:** uzuvlar çarpışıyor.
- **Mafsal limiti:** mafsal açısı fiziksel sınırını aşıyor.

Kullanılabilir alan bunların **kesişimidir** ve genellikle geometrik ulaşım
alanından çok daha küçüktür. Yalnızca ulaşımı kontrol edip tekilliği
atlamak, sık yapılan bir hatadır.

## 16.5 Tam tur dönebilirlik

Motor tahrikli bir mekanizmada, giriş uzvunun **tam tur dönebilmesi**
zorunludur. Test:

- Dört çubukta Grashof koşulu + doğru inversiyon.
- Genel zincirde: tur boyunca her karede çözümün var olması.

KREAMET bunu doğrudan ölçer: `720` kare denenir, hepsi çözülmelidir. Bir kare
bile çözülemezse tasarım en ağır ceza bandına düşer. Kısmi başarı (örneğin
`335/720`) “biraz iyi” değildir; motorla döndürülemeyen bir mekanizmadır.

## 16.6 Kilitlenme (locking) ve kendini kilitleme

Sürtünme yeterince yüksekse, bazı konumlarda mekanizma dışarıdan kuvvet
uygulansa bile hareket etmez — **kendini kilitleme**. Vidalarda istenen,
mekanizmalarda genellikle istenmeyen bir durumdur.

Koşul kabaca:

```
tan(μ_etkin) < f   (f: sürtünme katsayısı)
```

`f = 0.15` için `μ_etkin < 8.5°`. Yani çok kötü iletim açılarında mekanizma
fiilen kilitlenir. Bu, `μ` alt sınırının yalnızca “verim” değil, **işlevsellik**
meselesi olduğunu gösterir.

---

# 17. Kavrayıcı eğrileri

## 17.1 Neden kavrayıcı

Bir mekanizmada mafsal noktaları çember veya yay çizer; ilginç değildir.
Zenginlik, **kavrayıcı uzuv üzerindeki noktalarda**dır: genel düzlemsel hareket
yaptıkları için yörüngeleri yüksek dereceli eğrilerdir.

Dört çubuk kavrayıcı eğrisi genel olarak **altıncı dereceden** (sextic) cebirsel
bir eğridir. Üç çift katlı noktası vardır ve bu, eğrinin kendisiyle kesişme
(ilmek) yapabilmesinin sebebidir.

## 17.2 Eğri ailesi

Aynı dört çubuk, kavrayıcı üzerindeki nokta seçimine göre çok farklı eğriler
verir:

- **Yaklaşık doğru:** eğrinin bir bölümü neredeyse düz.
- **Damla / böbrek:** tek ilmekli kapalı eğri.
- **Sekiz (figure-eight):** kendini bir kez kesen eğri.
- **Duraklamalı:** bir bölümü çembersel yaya çok yakın.
- **Simetrik:** kavrayıcı noktası simetri ekseni üzerindeyse.

## 17.3 Klasik yaklaşık doğru mekanizmaları

| Mekanizma | Özellik | Kullanım |
|---|---|---|
| Watt | İki eşit uzuv, kavrayıcı ortası; sekiz biçimi | Buhar makinesi |
| Chebyshev | Simetrik; orta bölge çok düz | Yürüyen makineler |
| Hoeken | Chebyshev inversiyonu; düz bölümde sabit hız | Konveyör, yürüyüş |
| Roberts | Üçgen kavrayıcı; uzun düz bölüm | Süspansiyon |
| Peaucellier | 8 uzuv; **tam** doğru (yaklaşık değil) | Teorik önem |

**Hoeken** özellikle değerlidir: yörüngenin düz bölümünde kavrayıcı noktası
**yaklaşık sabit hızla** ilerler. Bu, yürüyen robotlarda ve konveyör
mekanizmalarında doğrudan işe yarar.

Tipik Hoeken oranları (`d` şase, `a` krank): `a = 1`, `b = 2.5`, `c = 2.5`,
`d = 2`, kavrayıcı noktası `AB` uzantısında `2.5` birim.

## 17.4 Duraklama (dwell) mekanizmaları

Çıkışın bir süre hareketsiz kalması istendiğinde:

1. Kavrayıcı eğrisinde **çembersel yaya yakın** bir bölge bulunur.
2. O yayın merkezine bir uzuv bağlanır, uzunluğu yayın yarıçapı yapılır.
3. Nokta o bölgedeyken bağlı uzuv neredeyse hiç dönmez.

Bu, altı çubuk duraklama mekanizmalarının temelidir. Kam ile aynı işi yapar
ama temas gerilmesi ve aşınma olmadan.

## 17.5 Kavrayıcı eğrisi atlası

Klasik yaklaşım, uzunluk oranlarını tarayıp eğri şekillerini kataloglamaktır
(Hrones–Nelson atlası, 1951; yaklaşık 7000 eğri). Sayısal çağda bu, otomatik
arama ile değiştirilmiştir:

1. Uzunluk uzayını örnekle.
2. Her mekanizmanın kavrayıcı eğrisini hesapla.
3. Hedef eğriye benzerlik ölçüsüyle sırala.

KREAMET tam olarak bunu yapar, ama körlemesine tarama yerine yönlendirilmiş
optimizasyon kullanır ve benzerliğin yanına kinematik geçerlilik ölçütlerini
koyar.

## 17.6 Fourier tanımlayıcıları ile eğri ailesi

Kapalı bir eğri, karmaşık düzlemde parametrize edilip Fourier serisine
açılabilir:

```
z(t) = Σ c_k · e^{i k t}
```

Katsayılar `c_k`, eğrinin **şekil imzasıdır**. Dönme ve öteleme, katsayıları
öngörülebilir şekilde değiştirir (`c_0` öteleme, faz dönme). Bu, atlas
aramasını hızlandırır: her mekanizmanın eğrisi için katsayılar önceden
hesaplanır, hedefle karşılaştırma birkaç sayı üzerinden yapılır.

Sınırı: Fourier imzası küçük ama önemli yerel özellikleri (kalbin alt sivri
ucu gibi) düzler. Bu yüzden KREAMET son karşılaştırmayı Chamfer mesafesiyle,
yani doğrudan geometrik olarak yapar.

## 17.7 Kalp eğrisi özelinde

Kalp eğrisinin zorluğu iki yerdedir:

- **Alt sivri uç (cusp):** eğrinin türevi orada süreksizdir. Bir bağlantı
  mekanizması analitik hareket ürettiği için gerçek bir cusp **üretemez**;
  ancak çok küçük yarıçaplı bir dönüşle yaklaşabilir.
- **Üstteki iki lob ve aradaki çentik:** eğrinin `y` ekseni yakınında yön
  değiştirmesi gerekir, bu da kavrayıcı eğrisinde bir ilmek veya keskin dönüş
  ister.

Bu iki özellik, tek bir dört çubuğun yeteneğinin ötesindedir; bu yüzden problem
sekiz kollu bir zincir (üç diyad) ile kurulmuştur. Ölçülen sonuç, `11.41 mm`
RMS ile bu topolojinin ve `50–200 mm` uzunluk bandının sınırını gösterir.

---

# 18. Cognate mekanizmalar

## 18.1 Roberts–Chebyshev teoremi

**Her dört çubuk kavrayıcı eğrisi, üç farklı dört çubuk tarafından üretilir.**
Bu üç mekanizmaya birbirinin **cognate**’i (eşdeğeri) denir.

Teorem 1875’te Roberts, bağımsız olarak 1878’de Chebyshev tarafından
kanıtlanmıştır ve tasarımda çok pratik bir sonucu vardır.

## 18.2 Cognate’in inşası

Orijinal mekanizmanın kavrayıcı üçgeni `A–B–P` olsun. Cognate’ler, bu üçgene
**benzer** üçgenler kullanılarak kurulur. Roberts diyagramı:

1. `O₂`, `A`, `P` noktalarından bir paralelkenar kur.
2. `O₄`, `B`, `P` noktalarından ikinci paralelkenar.
3. Üçüncü sabit mafsal `O₆`, `O₂O₄` tabanı üzerine kurulan ve kavrayıcı
   üçgenine benzer üçgenin tepe noktasıdır.

Her cognate’in uzuv uzunlukları orijinalinkilerden benzerlik oranlarıyla
çıkar.

## 18.3 Neden işe yarar

Aynı eğriyi çizen üç mekanizma, **farklı pratik özelliklere** sahiptir:

- Farklı sabit mafsal konumları — montaj alanı kısıtlıysa belirleyici.
- Farklı uzuv uzunlukları — biri imalat bandına girerken diğeri girmeyebilir.
- Farklı iletim açıları — biri ölü noktaya yaklaşırken diğeri rahat olabilir.
- Farklı girişim davranışı.

Yani: **iyi bir eğri bulduğunuzda, bedava iki alternatif tasarımınız var.**
Biri kısıtlarınıza uymuyorsa diğerini deneyin.

## 18.4 Altı çubuk cognate’leri

Watt ve Stephenson altı çubukların da cognate’leri vardır ama sayıları ve
inşaları daha karmaşıktır. Genel kural: cognate sayısı topolojiyle artar.

## 18.5 Cognate ve sentez

Sentez algoritması cognate’leri bilmiyorsa, aynı eğriyi üç kez keşfeder ve
üçünü de “farklı çözüm” sanır. Sonuç listesinde çeşitlilik yanılsaması olur.

Karşı önlem: çözüm listesinde **tasarım vektörü uzaklığı** yerine **çizilen
eğri** üzerinden benzerlik kontrolü yapmak. KREAMET, tasarım vektörü uzaklığına
göre eleme yapar ve bu, cognate’leri ayrı çözüm olarak listeleyebilir; bu
bilinçli bir sadeleştirmedir çünkü cognate’ler pratik olarak gerçekten farklı
mekanizmalardır (farklı şase konumu, farklı montaj).

---

# 19. Boyut sentezi — genel çerçeve

## 19.1 Üç görev türü

Boyut sentezi problemleri üçe ayrılır:

**(a) Fonksiyon sentezi.** Giriş açısı ile çıkış açısı arasında istenen bir
fonksiyon ilişkisi kurulur: `θ_çıkış = f(θ_giriş)`. Mekanik hesap makineleri,
oran mekanizmaları.

**(b) Yörünge sentezi (path generation).** Kavrayıcı üzerindeki bir noktanın
belirli bir eğriyi izlemesi istenir. Noktanın **yönelimi** umursanmaz.

**(c) Hareket sentezi (motion / rigid-body guidance).** Kavrayıcı uzvun hem
konumu hem yönelimi belirli konumlardan geçmelidir. Örneğin bir kapının hem
konumunun hem açısının belirli olması.

KREAMET (b) tipindedir: LED noktasının kalbi çizmesi istenir, LED’i taşıyan
kolun açısı serbesttir.

## 19.2 Hassas nokta (precision point) yöntemi

Klasik yaklaşım: hedef eğriden `k` nokta seçilir ve mekanizmanın **tam olarak**
o noktalardan geçmesi istenir. Aradaki sapma (**yapısal hata**) kabullenilir.

Serbest parametre sayısı, geçilebilecek hassas nokta sayısını sınırlar. Dört
çubuk yörünge sentezinde 9 bağımsız parametre vardır (uzunluklar, sabit mafsal
konumları, kavrayıcı noktası), dolayısıyla **9 hassas noktaya** kadar tam
çözüm aranabilir. Denklem sistemi 9 noktada aşırı karmaşıklaşır; pratik
uygulamalar 3–5 nokta kullanır.

## 19.3 Yapısal hata ve Chebyshev aralığı

Hassas noktalar arasında hata sıfır değildir. Hatayı en aza indirmek için
noktalar eşit aralıklı **seçilmez**; Chebyshev dağılımı kullanılır:

```
x_j = ½(x_0 + x_n) − ½(x_n − x_0)·cos( (2j−1)π / (2k) ),  j = 1..k
```

Bu dağılım, maksimum hatayı minimize eder (minimax). Eşit aralıklı noktalar,
aralığın uçlarında büyük hata bırakır.

## 19.4 Optimizasyon tabanlı sentez

Modern yaklaşım hassas noktaları terk eder: mekanizma parametreleri sürekli
değişkenler olarak alınır, hedef eğri ile üretilen eğri arasındaki fark bir
**amaç fonksiyonu** ile ölçülür ve minimize edilir.

Avantajları:

- Hassas nokta sayısı sınırı yoktur.
- Kinematik kısıtlar (Grashof, iletim açısı, tekillik) doğrudan amaç
  fonksiyonuna katılabilir.
- İmalat kısıtları (uzunluk sınırları, girişim) aynı şekilde.

Dezavantajı: çözüm uzayı çok modludur ve yerel minimumlarla doludur; global
arama gerekir.

## 19.5 Amaç fonksiyonu tasarımı

Kötü tasarlanmış bir amaç fonksiyonu, optimizasyonu güvenle yanlış yere
götürür. Üç kural:

**(1) Terimler karşılaştırılabilir ölçekte olmalı.** Milimetre cinsinden eğri
hatası (10–100 mertebesinde) ile boyutsuz bir tekillik cezası (0–1) toplanırsa,
eğri terimi her şeyi ezer. Sonuç: mükemmel eğri çizen, `1°` iletim açılı,
imal edilemez mekanizmalar.

Çözüm: her terimi kendi karakteristik ölçeğine bölmek.

```
J = w₁·(E_eğri/S_eğri) + w₂·E_boyut + w₃·E_kapanma + w₄·E_tekillik + ...
```

**(2) Sert kısıtlar bant hâlinde ayrılmalı.** Montaj olamayan bir tasarım,
montaj olan **her** tasarımdan kötü olmalıdır. Ama bandın içinde de eğim
olmalı ki arama uygun bölgeye tırmanabilsin:

```
J = BAND_BÜYÜK + (ihlal miktarı)
```

**(3) Referans değerler ulaşılabilir olmalı.** Tekillik cezasını `60°`’ye
referanslamak, `44.75°`’nin tavan olduğu bir problemde sürekli ceza demektir.
Optimizasyon, hiç ulaşamayacağı bir hedefi kovalarken eğri uyumunu feda eder.

## 19.6 Sentezde kısıt işleme

| Yöntem | Nasıl | Ne zaman |
|---|---|---|
| Ceza fonksiyonu | Amaca ek terim | Yumuşak kısıtlar |
| Bant ayırma | Ceza + büyük sabit | Sert kısıtlar |
| Parametreleme | Kısıtı geometriyle yok etme | Üçgen eşitsizliği, rijitlik |
| Onarım (repair) | Geçersiz bireyi düzelt | Kurtarma operatörü olarak |
| Reddetme | Geçersizse at | Uygun bölge büyükse |

**Parametreleme** her zaman en iyisidir çünkü arama uzayında geçersiz bölge
kalmaz. KREAMET’in üçlü uzuvları `(r, α)` ile parametrelemesi buna örnektir.

**Onarım** dikkatli kullanılmalıdır. KREAMET’te her yavruyu onarmak, arama
çeşitliliğini yok edip aramayı durdurmuştu (`J` platosu `4.85` civarında
takılırken, yalnızca montaj olamayan yavruları onarmak `2.64`’e indirdi).
Onarım bir **kurtarma** operatörüdür, bir normalleştirme değil.

---

# 20. Fonksiyon sentezi ve Freudenstein denklemi

## 20.1 Problem

Giriş açısı `θ₂` ile çıkış açısı `θ₄` arasında istenen bir `f` ilişkisi:

```
θ₄ = f(θ₂)
```

Mekanik olarak `log`, `sin`, karekök gibi fonksiyonlar üretilebilir. Analog
hesap makinelerinin ve mekanik ateş kontrol sistemlerinin temeliydi; bugün
oran mekanizmaları ve valf zamanlamasında kullanılır.

## 20.2 Freudenstein denklemi

Dört çubuğun kapalılık denklemi açı cinsinden düzenlenirse:

```
K₁·cos θ₄ − K₂·cos θ₂ + K₃ = cos(θ₂ − θ₄)
```

burada:

```
K₁ = d / a
K₂ = d / c
K₃ = (a² − b² + c² + d²) / (2ac)
```

Denklemin güzelliği, `K₁, K₂, K₃` cinsinden **lineer** olmasıdır.

## 20.3 Üç konum sentezi

Üç `(θ₂ⁱ, θ₄ⁱ)` çifti verilirse, üç lineer denklem elde edilir:

```
| cos θ₄¹   −cos θ₂¹   1 |   | K₁ |   | cos(θ₂¹ − θ₄¹) |
| cos θ₄²   −cos θ₂²   1 | · | K₂ | = | cos(θ₂² − θ₄²) |
| cos θ₄³   −cos θ₂³   1 |   | K₃ |   | cos(θ₂³ − θ₄³) |
```

Doğrudan çözülür. Sonra `K`’lerden uzunluklar çıkarılır: `d` serbestçe seçilir
(ölçek), `a = d/K₁`, `c = d/K₂`, `b` ise `K₃` denkleminden.

Bu, mekanizma sentezinin en zarif sonuçlarından biridir: **üç konum için tam
çözüm, lineer cebirle**.

## 20.4 Dört ve beş konum

Dört konumda dört denklem, üç bilinmeyen — aşırı belirlenmiş. Bir açı
serbest bırakılır (örneğin `θ₂¹` bir tasarım değişkeni yapılır) ve sistem
tekrar çözülebilir hâle gelir; sonuç bir eğri boyunca sonsuz çözüm ailesidir.

Beş konumda sistem doğrusal olmaktan çıkar; genellikle iki çözüm bulunur.

## 20.5 Ölçek, aralık ve kalibrasyon

Fonksiyon sentezinde giriş ve çıkış aralıkları eşlenir:

```
θ₂ = θ₂_min + (x − x_min)·Δθ₂/Δx
θ₄ = θ₄_min + (y − y_min)·Δθ₄/Δy
```

`Δθ₂` ve `Δθ₄` tasarım tercihleridir. Büyük aralıklar daha iyi çözünürlük
verir ama iletim açısını kötüleştirir; küçük aralıklar tersi. Tipik olarak
`Δθ₂ ≤ 120°` ve `Δθ₄ ≤ 90°` makul bir başlangıçtır.

## 20.6 Sıralama (order) problemi

Sentez, konumların **doğru sırada** gerçekleşeceğini garanti etmez. Mekanizma
üç konumdan da geçebilir ama sırası `1 → 3 → 2` olabilir. Ayrıca konumlar farklı
kollarda olabilir ve mekanizma birinden diğerine geçemez.

Kontrol: sentez sonrası tam bir tur simülasyonu yapıp konumların sırasını
doğrulamak. Bu, hesabın değil, **doğrulamanın** işidir — ve atlanması sık bir
hatadır.

---

# 21. Yörünge sentezi

## 21.1 Problem

Kavrayıcı üzerindeki bir noktanın verilen bir eğriyi izlemesi. Yönelim serbest.

Serbest parametreler (dört çubuk, düzlemsel):

```
O₂ = (x₂, y₂)      2
O₄ = (x₄, y₄)      2
a, b, c            3
kavrayıcı noktası   2   (uzuv çerçevesinde r, α)
──────────────────────
toplam              9
```

Yörünge şekli, konumdan ve yönelimden bağımsızsa (eğri istenen yere sonradan
taşınabiliyorsa) bu sayı efektif olarak `9 − 3 = 6`’ya düşer.

## 21.2 Zamanlamalı ve zamanlamasız sentez

- **Zamanlamalı (prescribed timing):** noktanın hangi giriş açısında nerede
  olacağı da belirtilir. Daha kısıtlı, çözümü zor.
- **Zamanlamasız:** yalnızca eğrinin şekli önemlidir; nokta eğri üzerinde
  istediği hızla gidebilir. Çok daha esnek.

KREAMET zamanlamasız sentez yapar ve bu, hata ölçüsünün seçimini doğrudan
etkiler (bkz. Bölüm 24): nokta-nokta karşılaştırma yerine **eğri-eğri**
karşılaştırma gerekir.

## 21.3 Hassas nokta yaklaşımı

`k` nokta için denklem sayısı `2k`’dir (her nokta x ve y). Dokuz serbest
parametre ile `k = 4` (8 denklem) rahatça, `k = 5` sınırda çözülür. Daha
fazlası için parametreler yetmez.

Klasik sonuç: **dört çubuk, yörünge sentezinde en fazla 9 hassas noktadan
geçebilir** ama pratik çözüm 5’te durur.

## 21.4 Optimizasyon yaklaşımı

Hassas nokta sınırı, sürekli optimizasyonda yoktur. Amaç:

```
min  E(x) = eğri_uyumsuzluğu(P(x), hedef)
s.t. kinematik ve imalat kısıtları
```

Bu, KREAMET’in yaklaşımıdır. Kritik tasarım kararları:

- **Örnekleme yoğunluğu.** Az örnek hızlıdır ama eğrinin ince özelliklerini
  kaçırır ve optimizasyon “kısayol” bulur. KREAMET kademeli artırır:
  `180 → 360 → 720` kare.
- **Hizalama.** Eğri konumu ve yönelimi serbestse, karşılaştırmadan önce
  optimal yerleştirme yapılmalıdır.
- **Ölçek.** Boyut fiziksel bir şartsa, hizalama **ölçekleme içermemelidir**.

## 21.5 Neden ölçekleme yasak

Procrustes hizalamasının klasik biçimi ölçek de içerir (benzerlik dönüşümü).
Yörünge sentezinde bu, sessizce yanlış sonuç verir: `25 × 25 mm` çizen bir
mekanizma, `10×` ölçeklenip mükemmel uyum raporlar. Oysa şartname
`250 × 250 mm` istiyordu.

Doğrusu: **katı (rijid) hizalama** — yalnızca dönme ve öteleme. Boyut, ayrı bir
amaç terimi olarak ölçülür:

```
E_boyut = |W_gerçek − W_hedef|/W_hedef + |H_gerçek − H_hedef|/H_hedef
```

## 21.6 Yörünge kapanması

Kapalı bir hedef eğri için mekanizmanın yörüngesi de kapalı olmalıdır:

```
|P(0) − P(2π)| < tol
```

Kapalı form çözümde bu değer makine hassasiyetindedir. Büyükse mekanizma tur
boyunca dal değiştirmiştir. Yani bu test, aslında bir **dal sürekliliği
testidir**.

---

# 22. Hareket sentezi ve Burmester teorisi

## 22.1 Problem

Kavrayıcı uzvun belirli **konum ve yönelimlerden** geçmesi. Her konum, bir
düzlem konumu (pose) tanımlar: `(x, y, φ)`.

Uygulamalar: kapı ve kaput menteşeleri, katlanır mekanizmalar, aktarma
kolları, hasta transfer düzenekleri.

## 22.2 Kutup (pole) kavramı

İki düzlem konumu arasındaki geçiş, bir nokta etrafındaki **saf dönme** olarak
gerçekleştirilebilir. Bu noktaya **kutup** `P₁₂` denir ve şöyle bulunur:

1. Cismin iki noktasının iki konumdaki yerleri: `A₁, A₂` ve `B₁, B₂`.
2. `A₁A₂` ve `B₁B₂` doğru parçalarının orta dikmeleri çizilir.
3. Kesişim noktası `P₁₂`’dir.

Dönme açısı, `A₁P₁₂A₂` açısına eşittir.

## 22.3 İki konum sentezi

İki konumdan geçmek kolaydır: kavrayıcı üzerinde herhangi bir nokta seçin,
o noktanın iki konumdaki yerlerinin orta dikmesi üzerinde herhangi bir sabit
mafsal seçin. Sonsuz çözüm vardır.

## 22.4 Üç konum sentezi

Üç konum için: kavrayıcı üzerindeki bir `A` noktasının üç konumdaki yerleri
`A₁, A₂, A₃` bir **çember üzerindedir** ve o çemberin merkezi sabit mafsaldır.

İnşa: `A₁A₂` ve `A₂A₃` orta dikmelerinin kesişimi merkezi verir.

Kavrayıcı üzerindeki her nokta için bir sabit mafsal bulunur, dolayısıyla
sonsuz çözüm ailesi vardır. İki nokta seçilerek dört çubuk tamamlanır.

## 22.5 Dört konum ve Burmester eğrileri

Dört konumda, keyfi bir noktanın dört konumdaki yerleri genellikle bir çember
üzerinde **değildir**. Yalnızca özel noktalar bu şartı sağlar.

- **Çember noktası eğrisi (circle-point curve):** kavrayıcı üzerinde, dört
  konumdaki yerleri eş çembersel olan noktaların yer eğrisi.
- **Merkez noktası eğrisi (centre-point curve):** karşılık gelen çember
  merkezlerinin yer eğrisi.

İkisi de **üçüncü dereceden** düzlem eğrileridir (sirküler kübik). Bunlara
**Burmester eğrileri** denir (Ludwig Burmester, 1888).

Tasarım: çember noktası eğrisinden iki nokta seçilir, merkez noktası
eğrisinden karşılıkları alınır, dört çubuk tamamlanır. Seçim serbestliği,
iletim açısı ve montaj alanı gibi ikincil ölçütleri iyileştirmek için
kullanılır.

## 22.6 Beş konum

Beş konumda Burmester eğrileri kesişir ve **sonlu sayıda** çözüm kalır:
genellikle en fazla **dört** çember noktası. Bu, dört çubukla tam çözülebilen
maksimum konum sayısıdır.

Altı ve daha fazla konum için dört çubuk yetmez; altı çubuk veya yaklaşık
sentez gerekir.

## 22.7 Sonuç tablosu

| Konum sayısı | Dört çubuk çözümü |
|---|---|
| 2 | Sonsuz (iki serbest parametre ailesi) |
| 3 | Sonsuz (bir serbest parametre ailesi) |
| 4 | Sonsuz (Burmester eğrileri boyunca) |
| 5 | Sonlu (≤ 4 çözüm) |
| ≥ 6 | Genellikle çözüm yok; yaklaşık sentez |

---

# 23. Optimizasyon tabanlı sentez

## 23.1 Problemin doğası

Mekanizma sentezi optimizasyon problemi olarak:

- **Çok modludur.** Onlarca yerel minimum; farklı montaj modları farklı
  çukurlar açar.
- **Süreksizdir.** Uygun bölgeler, montaj olamayan bölgelerle ayrılır.
- **Kısıtlıdır.** Uzunluk sınırları, iletim açısı, girişim.
- **Gürültülüdür.** Örnekleme yoğunluğu değişince amaç değeri hafifçe değişir.

Bu özellikler, gradyan tabanlı yöntemleri tek başına yetersiz kılar.

## 23.2 Diferansiyel Evrim (DE)

Popülasyon tabanlı, türev gerektirmeyen bir yöntem. Temel döngü:

```
her birey x_i için:
  üç farklı birey seç: x_r1, x_r2, x_r3
  mutant  v = x_r1 + F·(x_r2 − x_r3)
  çaprazla: u_j = v_j  (rastgele < CR ise), yoksa x_ij
  u daha iyiyse x_i yerine geçer
```

Parametreler:

- `F` (ölçek): 0.5–0.9 tipik. Büyük `F` keşif, küçük `F` sömürü.
- `CR` (çaprazlama oranı): 0.7–0.95.
- Popülasyon: boyutun 5–10 katı.

**Varyantlar:**

- `rand/1/bin`: yukarıdaki. Çeşitlilik iyi, yakınsama yavaş.
- `best/1/bin`: `x_r1` yerine en iyi birey. Hızlı ama yerel minimuma sıkışır.
- `current-to-best/1`: ikisinin dengesi.

KREAMET `rand/1` ve `current-to-best/1`’i karıştırır: keşif ile sömürü arasında
tek bir sabit tercihe bağlanmamak için.

## 23.3 CMA-ES

Kovaryans matrisi uyarlamalı evrim stratejisi. Arama dağılımının şeklini
öğrenir; dar vadilerde DE’den çok daha etkilidir. Maliyeti `O(d²)` bellek ve
`d` boyut için eigen ayrışması.

Mekanizma sentezinde `d` küçüktür (15–30), dolayısıyla CMA-ES uygundur ve
literatürde sık kullanılır.

## 23.4 Yerel iyileştirme

Global arama iyi bir bölge bulduktan sonra yerel bir yöntem son basamağı
tamamlar:

- **Nelder–Mead:** türev gerektirmez, gürültüye toleranslı. Sınırlar için
  yansıtma/kırpma gerekir.
- **BFGS / L-BFGS:** hızlı ama gradyan ister. Sonlu farkla gradyan, gürültülü
  amaçta güvenilmez.
- **Powell:** yön kümesi yöntemi; türevsiz ve Nelder–Mead’den daha kararlı.

KREAMET sınırlı Nelder–Mead kullanır; amaç fonksiyonu örnekleme kaynaklı hafif
gürültü taşıdığı için gradyan tabanlı yöntemler uygun değildir.

## 23.5 Başlangıç popülasyonu: yapıcı örnekleme

Rastgele bir parametre vektörü genellikle montaj olamaz. Sınır bandından
düzgün örnekleme yaparsanız, popülasyonun büyük kısmı geçersiz doğar ve DE
hiçbir yere gidemez.

**Yapıcı örnekleme** çözümü: mekanizmayı diyad diyad büyütmek.

1. Krank ve ilk diyadı, tam tur dönebilirlik koşulunu sağlayacak şekilde seç.
2. Kısmi mekanizmayı bir tur süpür ve **gerçek ankraj ayrım bandını** ölç.
3. Bir sonraki diyadın kol uzunluklarını, o bandı kapsayan kapalı-form uygun
   aralıktan seç.
4. Tekrarla.

Ölçülen isabet oranları (KREAMET, 2000 deneme):

| Diyad sayısı | Uygulanabilir örnek oranı |
|---|---|
| 1 | %100 |
| 2 | %66 |
| 3 | %47 |
| 4 | %47 |

Düzgün rastgele örneklemeyle bu oranlar yüzde birin altındadır. Fark,
optimizasyonun çalışıp çalışmaması demektir.

## 23.6 Uygun aralık hesabı

Bir diyadın bir kolu `r₁` seçildiğinde, ankraj ayrımı `[d_min, d_max]` bandını
tarıyorsa, diğer kolun `r₂` için uygun aralığı kapalı formda bulunabilir:

`μ ≥ μ_min` koşulu iki eşitsizlik verir:

```
r₁² + r₂² − 2·r₁·r₂·cos(μ_min) ≥ d_max²
r₁² + r₂² + 2·r₁·r₂·cos(μ_min) ≤ ... (katlanma tarafı)
```

Bunlar `r₂` cinsinden ikinci dereceden eşitsizliklerdir ve kökleri doğrudan
verir. Boş küme çıkarsa, o `r₁` değeri için hiçbir `r₂` çalışmaz — ve bu,
girdi diyadının neden bu kadar dar bir bantta çalıştığının kanıtıdır.

## 23.7 Kademeli örnekleme (progressive refinement)

Amaç fonksiyonunun maliyeti örnek sayısıyla doğrusaldır. Erken nesillerde
kaba örnekleme yeterlidir:

```
180 kare  → keşif aşaması
360 kare  → orta aşama
720 kare  → son değerlendirme ve raporlama
```

Dikkat: kaba örnekleme, ince özellikleri kaçırır ve arama “kısayol” bulabilir.
Bu yüzden son sıralama **her zaman en ince örneklemede** yapılmalıdır; aksi
hâlde raporlanan sayı, optimizasyonun küçülttüğü sayı olmaz.

## 23.8 Çeşitlilik ve çoklu çözüm

Tek bir en iyi çözüm yeterli değildir: pratik kısıtlar (montaj alanı, girişim,
estetik) sonradan devreye girebilir. Bu yüzden **en iyi K çözüm** saklanır.

Çözümlerin gerçekten farklı olması için eleme gerekir:

```
||x_i − x_j|| < ε  ise aynı say
```

`ε` seçimi önemlidir: çok küçükse aynı çözümün kopyaları listeyi doldurur, çok
büyükse gerçek alternatifler elenir.

## 23.9 Çok amaçlı yaklaşım

Ağırlıklı toplam yerine **Pareto cephesi** aranabilir: eğri hatası ile iletim
açısı arasındaki ödünleşimi kullanıcıya göstermek. NSGA-II bu iş için
standarttır.

Avantajı: ağırlık seçme zorunluluğu ortadan kalkar. Dezavantajı: kullanıcının
sonunda yine bir seçim yapması gerekir ve cephe yüksek boyutta okunması zor
hâle gelir.

KREAMET ağırlıklı toplam kullanır ama **terim ayrıştırmasını ekranda gösterir**,
böylece skor bir kara kutu olmaz ve kullanıcı ağırlıkları değiştirebilir.

---

# 24. Eğri karşılaştırma ölçütleri

## 24.1 Problem

İki kapalı eğri ne kadar benziyor? Bu soru, yörünge sentezinin kalbindedir ve
cevabı düşünüldüğü kadar basit değildir.

## 24.2 Nokta-nokta (parametrik) hata

En basit ölçü, iki eğriyi aynı sayıda noktaya örnekleyip eşleşen indeksler
arasındaki mesafeyi almaktır:

```
E = sqrt( (1/n) · Σ |P_i − Q_i|² )
```

Sorunu: **parametrelemeye bağlıdır.** Aynı eğriyi farklı hızla çizen iki
mekanizma, geometrik olarak özdeş olsa da büyük hata verir. Zamanlamasız
sentezde bu ölçü yanıltıcıdır.

Yine de bir bilgi taşır: mekanizmanın eğri üzerindeki **hız dağılımını**
gösterir. KREAMET bunu ikincil bir ölçü olarak raporlar (`paramRms`).

## 24.3 Chamfer (en yakın nokta) mesafesi

Her noktadan diğer eğriye olan en kısa mesafe:

```
d(P, Q) = min_{q ∈ Q} |P − q|
```

**Tek yönlü** Chamfer:

```
E_{P→Q} = sqrt( (1/n) Σ_i d(P_i, Q)² )
```

Bu tek başına yetersizdir: yörüngenin yalnızca küçük bir bölümü hedefin
üzerinde olan bir mekanizma, mükemmel skor alır. Örnek: hedefin sol lobunda
küçük bir daire çizen mekanizma, `E_{P→Q} ≈ 0` verir.

**Simetrik** Chamfer bunu kapatır:

```
E = sqrt( ½ (E²_{P→Q} + E²_{Q→P}) )
```

`Q→P` yönü, hedefin **kapsanmayan** bölümlerini cezalandırır. Bu yüzden
simetrik biçim zorunludur.

## 24.4 Nokta-doğru parçası mesafesi

Örneklenmiş eğriler arasında nokta-nokta mesafe kullanmak, örnek yoğunluğuna
bağlı bir hata tabanı yaratır. Doğrusu, en yakın **doğru parçasına** olan
mesafedir:

```
t = clamp( ((P−A)·(B−A)) / |B−A|², 0, 1 )
d = |P − (A + t·(B−A))|
```

Bu, örnek sayısını artırmadan doğruluğu artırır ve `n` yerine `n/4` örnekle
aynı hassasiyeti verir.

## 24.5 Uzamsal indeksleme

Naif Chamfer hesabı `O(n·m)`’dir. `n = m = 720` için 518 400 mesafe hesabı,
her amaç değerlendirmesinde. Yüz binlerce değerlendirmede bu kabul edilemez.

**Düzgün ızgara (uniform grid)** indeksi bunu `O(n)`’e yaklaştırır:

1. Hedef eğriyi bir ızgaraya yerleştir; hücre boyu ortalama örnek aralığı
   mertebesinde.
2. Sorgu noktası için önce kendi hücresine, sonra genişleyen halkalara bak.
3. Bulunan en iyi mesafe, halka yarıçapından küçükse dur.

KD-ağacı da kullanılabilir ama kapalı eğriler için ızgara daha basittir ve
önbellek davranışı daha iyidir.

## 24.6 Hausdorff mesafesi

En kötü durum ölçüsü:

```
H(P,Q) = max( max_i d(P_i,Q), max_j d(Q_j,P) )
```

Tek bir kötü nokta tüm skoru belirler. Optimizasyon için fazla katıdır (gradyan
bilgisi taşımaz) ama **raporlama** için değerlidir: “en büyük sapma” kullanıcı
için anlamlı bir sayıdır.

## 24.7 Hizalama: dairesel çapraz korelasyon

Karşılaştırmadan önce hedef eğri, üretilen eğriye en iyi şekilde
yerleştirilmelidir. Katı dönüşüm için:

**(1) Merkezleri hizala.** Her iki eğrinin ağırlık merkezini orijine taşı.

**(2) Optimal dönmeyi bul.** Karmaşık düzlemde `p_k` ve `q_k` için:

```
θ* = arg( Σ_k p_k · conj(q_k) )
```

Bu, Kabsch/Procrustes çözümünün düzlemsel hâlidir ve **kapalı formdur**;
iterasyon gerekmez.

**(3) Faz kaymasını bul.** Kapalı eğrilerde başlangıç noktası keyfidir. Tüm
kaymalar için korelasyon, FFT ile `O(n log n)`’de hesaplanır:

```
c[s] = Σ_k p_k · conj(q_{k+s})
```

En büyük `|c[s]|`, en iyi kaymayı verir; `arg(c[s])` de dönmeyi.

**(4) Yön (orientation).** Eğri ters yönde de taranmış olabilir; her iki yön
denenir.

Sonuç: en iyi (kayma, yön, dönme, öteleme) dörtlüsü **tam olarak** bulunur,
optimizasyon gerekmez.

## 24.8 Boyut hatası

Katı hizalama ölçek içermediğinden, boyut ayrı ölçülür:

```
E_boyut = |W − W*|/W* + |H − H*|/H*
```

`W, H` üretilen eğrinin sınır kutusu; `W*, H*` hedefinki. Sınır kutusu basit
ve sağlam bir ölçüdür; alan veya çevre gibi alternatifler şekil değişimlerine
karşı daha az duyarlıdır.

## 24.9 Ölçütlerin karşılaştırması

| Ölçüt | Parametreleme bağımsız | Kapsama cezası | Maliyet | Kullanım |
|---|---|---|---|---|
| Nokta-nokta | Hayır | Kısmen | `O(n)` | Zamanlamalı sentez |
| Tek yön Chamfer | Evet | **Hayır** | `O(n log n)` | Kullanmayın |
| Simetrik Chamfer | Evet | Evet | `O(n log n)` | Yörünge sentezi |
| Hausdorff | Evet | Evet | `O(n log n)` | Raporlama |
| Fourier | Evet | Kısmen | `O(n log n)` | Ön eleme, atlas |
| Alan farkı | Evet | Evet | `O(n)` | Kaba ölçü |

---

# 25. Kütle, atalet ve ağırlık merkezi

## 25.1 Neden kinematikten sonra

Kinematik “nereye gider” sorusunu cevaplar; dinamik “ne kadar kuvvet gerekir”
sorusunu. İkincisi olmadan motor seçilemez, yatak boyutlandırılamaz, gövde
mukavemeti kontrol edilemez.

## 25.2 Kütle modeli

Bir mekanizma gövdesi için üç seviye model vardır:

**(a) Nokta kütle.** Tüm kütle ağırlık merkezinde toplanır. Atalet momenti
ihmal edilir. Çok kaba; yalnızca ön hesap için.

**(b) Çizgisel yoğunluk.** Gövde, sabit kesitli çubukların birleşimi kabul
edilir; kütle uzunlukla orantılıdır:

```
m = ρ_çizgi · L
```

`ρ_çizgi` birim uzunluk başına kütledir (kg/mm). Sabit kesitli lazer kesim veya
3B baskı parçalar için oldukça doğrudur.

**(c) Katı model.** Gerçek geometriden CAD ile hesaplanır. En doğru, en pahalı.

KREAMET (b)’yi kullanır. Sebep: sentez sırasında gövde geometrisi henüz
tasarlanmamıştır — yalnızca mafsal konumları bellidir. Uzunlukla orantılı kütle,
bu aşamada elde edilebilecek en dürüst modeldir ve **göreli** karşılaştırmalar
için yeterlidir.

## 25.3 Ağırlık merkezi

İkili bir uzuv için, kütle düzgün dağılmışsa:

```
c = (A + B) / 2
```

Üçlü bir uzuv (üç çubuğun birleşimi) için, her çubuk ayrı ele alınır:

```
m_toplam = Σ m_i
c = ( Σ m_i · c_i ) / m_toplam
```

## 25.4 Atalet momenti

Ağırlık merkezinden geçen eksen etrafında, uzunluğu `L`, kütlesi `m` olan ince
çubuk için:

```
I_c = m·L² / 12
```

**Paralel eksen teoremi** ile başka bir noktaya taşınır:

```
I_P = I_c + m·d²
```

`d`, ağırlık merkezi ile yeni eksen arasındaki mesafedir.

Bir üçlü uzuv için toplam:

```
I_c,gövde = Σ ( I_c,i + m_i · |c_i − c_gövde|² )
```

## 25.5 Birimler

Kinematik milimetre ile, dinamik SI ile çalışır. Karışım en sık hata
kaynağıdır:

| Büyüklük | Kinematik | Dinamik |
|---|---|---|
| Uzunluk | mm | m (`×1e−3`) |
| Kütle | — | kg |
| Atalet | — | kg·m² |
| Kuvvet | — | N |
| Moment | — | N·m |
| Hız | mm/s | m/s |
| İvme | mm/s² | m/s² |

`I = m·L²/12` formülünde `L` milimetre girilirse sonuç `1e6` kat büyük çıkar.
Tek dönüşüm noktasından geçmek (KREAMET’te `utils/units.ts`) bu hata sınıfını
tamamen ortadan kaldırır.

## 25.6 Efektif (indirgenmiş) atalet

Tek serbestlikli bir mekanizmada tüm hareket, giriş açısı `θ` ile
parametrelenir. Sistemin toplam kinetik enerjisi:

```
T = ½ Σ ( m_i · |v_i|² + I_i · ω_i² )
```

Her hız `θ̇` ile orantılı olduğundan (`v_i = (∂p_i/∂θ)·θ̇`):

```
T = ½ · M(θ) · θ̇²
M(θ) = Σ ( m_i · |∂p_i/∂θ|² + I_i · (∂φ_i/∂θ)² )
```

`M(θ)` **indirgenmiş atalettir**: mekanizmanın tamamının, motor milinde
görülen eşdeğer atalet momenti. Konuma bağlıdır ve bu, tek serbestlikli
mekanizma dinamiğinin en önemli kavramıdır.

## 25.7 İndirgenmiş ataletin hesabı

`∂p_i/∂θ` türevleri, sonlu farkla alınabilir:

```
∂p/∂θ ≈ (p(θ+h) − p(θ−h)) / (2h)
```

Yine dal tohumlaması şarttır. KREAMET bunu yapar ve `M(θ)`’yi her karede
hesaplayarak ekranda gösterir.

`M(θ)` değişimi tasarım hakkında bilgi verir: çok değişkense, motor sabit hızda
dönmek için değişken moment uygulamak zorundadır ve bu titreşim üretir.

---

# 26. Statik kuvvet analizi

## 26.1 Serbest cisim diyagramı

Her uzuv için kuvvet ve moment dengesi:

```
Σ F = 0
Σ M = 0
```

Düzlemde uzuv başına üç denklem. `n−1` hareketli uzuv için `3(n−1)` denklem.
Bilinmeyenler mafsal reaksiyonlarıdır (mafsal başına iki bileşen) artı giriş
momenti:

```
bilinmeyen = 2j + 1
denklem    = 3(n−1)
```

`M = 1` mekanizmada `3(n−1) = 2j + 1` olduğundan sistem tam belirlidir. Bu,
mobilite formülünün statikteki karşılığıdır ve hoş bir tutarlılık kontrolüdür.

## 26.2 İki kuvvet uzvu

Yalnızca iki mafsalı olan ve üzerinde dış kuvvet bulunmayan bir uzuvda,
kuvvetler mafsalları birleştiren doğru boyunca olmalıdır (aksi hâlde moment
dengesi sağlanmaz). Bu, analizi büyük ölçüde basitleştirir: kuvvetin
**doğrultusu** bilinir, yalnızca büyüklüğü aranır.

Dört çubukta kavrayıcı genellikle iki kuvvet uzvudur.

## 26.3 Virtüel iş yöntemi

Mafsal reaksiyonlarını bulmadan doğrudan giriş momentini veren güçlü yöntem:

```
Σ F_i · δp_i + Σ M_i · δφ_i = 0
```

Tek serbestlikli mekanizmada tüm virtüel yer değiştirmeler `δθ` ile
orantılıdır, dolayısıyla:

```
T_giriş = − Σ ( F_i · ∂p_i/∂θ + M_i · ∂φ_i/∂θ )
```

Mafsal kuvvetleri hiç hesaplanmaz. Motor seçimi için gereken tek şey budur.

## 26.4 Yerçekimi momenti

Yerçekimi bir dış kuvvettir: `F_i = m_i · g`, `g = (0, −9.80665)` m/s².
Potansiyel enerji:

```
U(θ) = Σ m_i · g · h_i(θ)
```

Virtüel iş:

```
T_yerçekimi = dU/dθ
```

Bu, mekanizmayı yerçekimine karşı tutmak için gereken momenttir.

## 26.5 Kapalı çevrimde integral sıfırdır

`U(θ)`, kapalı bir yolda tek değerli bir fonksiyondur, dolayısıyla:

```
∮ (dU/dθ) dθ = U(2π) − U(0) = 0
```

Yani **yerçekimi momenti bir tam tur boyunca sıfır net iş yapar.** Bu, çok
kullanışlı bir doğrulamadır: `dU/dθ` hesabınız yanlışsa integral sıfır çıkmaz.

KREAMET’in test paketinde bu kontrol vardır ve `|∫| < 1e−3` şartını arar.

## 26.6 Sonlu fark doğrulaması

`dU/dθ`’nin ikinci bağımsız kontrolü, `U`’nun doğrudan sonlu farkıdır:

```
dU/dθ ≈ (U(θ+h) − U(θ−h)) / (2h)
```

Analitik (virtüel iş) sonucu ile bu sayısal sonuç `1e−6` mertebesinde
uyuşmalıdır. Uyuşmuyorsa ya türev formülü ya da kütle modeli hatalıdır.

Bu iki testin birlikte geçmesi, dinamik katmanının doğruluğu için güçlü bir
kanıttır.

## 26.7 Mafsal reaksiyonları

Yatak seçimi için reaksiyon kuvvetleri gerekir. Yöntem: uzuv uzuv geriye doğru
çözmek (çıkıştan girişe). Her uzuvda üç denklem, iki bilinmeyen mafsal kuvveti
bileşeni (bir mafsal zaten önceki adımdan biliniyor).

Maksimum reaksiyon genellikle **iletim açısının en kötü olduğu** konumda
gerçekleşir — tekillik yakınında kuvvetler patlar. Bu, `μ` alt sınırının
yatak ömrüyle doğrudan ilişkisidir.

---

# 27. Dinamik: Newton–Euler yöntemi

## 27.1 Denklemler

Her uzuv için:

```
Σ F = m · a_c
Σ M_c = I_c · α
```

`a_c` ağırlık merkezinin ivmesi, `α` açısal ivme, `I_c` ağırlık merkezinden
geçen eksen etrafında atalet momenti.

## 27.2 Çözüm sırası

1. **Kinematik.** Tüm konum, hız ve ivmeleri çöz (Bölüm 8, 11, 13).
2. **Atalet kuvvetleri.** Her uzuv için `m·a_c` ve `I_c·α` hesapla.
3. **Denge.** Uzuv uzuv, çıkıştan girişe doğru mafsal kuvvetlerini çöz.
4. **Giriş momenti.** Son uzuvda kalan moment, motorun sağlaması gereken
   momenttir.

## 27.3 d’Alembert ilkesi

Atalet terimleri, ters işaretli “atalet kuvveti” olarak dış kuvvetlere
katılırsa, dinamik problem statik probleme dönüşür:

```
F_atalet = −m · a_c
M_atalet = −I_c · α
```

Bu, statik yöntemlerin (serbest cisim, virtüel iş) doğrudan kullanılmasını
sağlar ve elle hesapta çok pratiktir.

## 27.4 Avantaj ve dezavantaj

**Avantaj:** tüm mafsal reaksiyonlarını verir. Yatak, pim ve gövde
boyutlandırması için gereklidir.

**Dezavantaj:** çok sayıda denklem; kapalı çevrimlerde sistem kurulup
çözülmelidir. Yalnızca motor momenti gerekiyorsa Lagrange yöntemi çok daha
kısadır.

---

# 28. Dinamik: Lagrange yöntemi ve indirgenmiş atalet

## 28.1 Tek serbestlikli formülasyon

Genelleştirilmiş koordinat `θ` (motor açısı). Lagrangian:

```
L = T − U
T = ½ · M(θ) · θ̇²
U = U(θ)
```

Lagrange denklemi:

```
d/dt (∂L/∂θ̇) − ∂L/∂θ = Q
```

Açarsak:

```
Q = M(θ)·θ̈ + ½·M'(θ)·θ̇² + U'(θ)
```

Üç terim, üç fiziksel etki:

| Terim | Ad | Ne zaman baskın |
|---|---|---|
| `M(θ)·θ̈` | Atalet momenti | Hızlanma/yavaşlama sırasında |
| `½·M'(θ)·θ̇²` | Merkezcil/Coriolis benzeri | Yüksek sabit hızda |
| `U'(θ)` | Yerçekimi momenti | Düşük hızda, ağır gövdelerde |

## 28.2 İkinci terimin önemi

`½·M'(θ)·θ̇²` sıklıkla atlanır ve bu, sabit hızda dönen mekanizmalarda büyük
hata verir. Sabit hızda `θ̈ = 0`’dır, dolayısıyla ilk terim yok olur — ama
motor hâlâ moment uygulamalıdır çünkü indirgenmiş atalet değişmektedir.

Fiziksel yorum: mekanizma “açılırken” atalet artar; sabit hızda tutmak için
enerji verilmelidir. “Kapanırken” atalet azalır ve enerji geri gelir.

## 28.3 Hesaplama

```
M(θ)   → Bölüm 25.6
M'(θ)  ≈ (M(θ+h) − M(θ−h)) / (2h)
U'(θ)  → Bölüm 26.4
```

KREAMET bu üç bileşeni ayrı ayrı hesaplar ve ekranda ayrı gösterir. Bir
tasarımın motoru neden zorladığını anlamak için toplamı görmek yetmez;
hangi terimin baskın olduğu, çözümün ne olacağını belirler (volan mı, denge
kütlesi mi, daha hafif gövde mi).

## 28.4 Volan boyutlandırma

Motor momenti bir tur boyunca dalgalanır. Volan, fazla enerjiyi depolayıp
eksik olduğunda geri vererek hız dalgalanmasını sınırlar.

Gerekli volan ataleti:

```
I_volan = ΔE_max / (C_s · ω_ort²)
```

`ΔE_max`: bir tur içindeki maksimum enerji fazlası (moment–açı eğrisinin
ortalamadan sapmasının integrali).
`C_s`: kabul edilen hız dalgalanma katsayısı (`(ω_max − ω_min)/ω_ort`),
tipik `0.02–0.05`.

## 28.5 Motor seçimi

Motorun sağlaması gereken:

- **Tepe moment:** `max|Q(θ)|`.
- **RMS moment:** `sqrt( (1/2π)·∫ Q² dθ )` — ısınma bunu belirler.
- **Tepe güç:** `max|Q·ω|`.

Redüktör kullanılıyorsa, motor tarafındaki indirgenmiş atalet `i²` ile bölünür
(`i` çevrim oranı) ve moment `i` ile bölünür. Optimal oran, motor ataleti ile
yük ataletinin eşleştiği yerdedir:

```
i_opt ≈ sqrt( M_yük / I_motor )
```

---

# 29. Yerçekimi momenti ve denge

## 29.1 Statik denge

Bir mekanizma, ağırlık merkezinin toplam yüksekliği hareket boyunca sabitse
**statik olarak dengelidir**:

```
U(θ) = sabit  ⇒  dU/dθ = 0  ∀θ
```

Bu durumda mekanizma her konumda kendi ağırlığıyla dengede kalır; motor
yalnızca ataleti ve sürtünmeyi yenmek zorundadır.

## 29.2 Dengeleme yöntemleri

**(a) Karşı ağırlık (counterweight).** Uzuvlara ek kütle ekleyerek toplam
ağırlık merkezini sabitlemek. Basit ama toplam kütleyi ve dolayısıyla ataleti
artırır — dinamik yükleri kötüleştirir.

**(b) Yay dengeleme.** Bir yayın potansiyel enerjisi, yerçekimi potansiyelini
telafi edecek şekilde seçilir. **Sıfır boy yayı** (zero-free-length spring) ile
tam denge mümkündür:

```
U_yay = ½·k·|r|²   (sıfır boy yayı için)
```

Uygun bağlantı noktalarıyla `U_toplam = sabit` sağlanabilir. Kütle eklemez;
bu yüzden robotik ve rehabilitasyon cihazlarında tercih edilir.

**(c) Paralelkenar.** Paralelkenar mekanizması, uzvun yönelimini sabit tutar ve
karşı ağırlığı uzağa yerleştirmeye izin verir.

## 29.3 Kısmi denge

Tam denge her zaman gerekmez veya mümkün değildir. Kısmi dengede amaç, tepe
momenti azaltmaktır:

```
min_over(karşı ağırlıklar)  max_θ |dU/dθ|
```

Bu, küçük bir optimizasyon problemidir ve genellikle kütlenin %10–20’si
eklenerek tepe momentin %60–80’i kazanılır.

## 29.4 KREAMET’teki ölçü

Uygulama, tur boyunca `|dU/dθ|` tepesini ölçer ve `w₇` ağırlığıyla amaç
fonksiyonuna katar. Ağırlık kasten küçüktür (`0.05`): yerçekimi momenti bu
ölçekte (150–250 mm, birkaç yüz gram) küçük bir etkidir ve tasarımı domine
etmesi yanlış olur. Ölçülmesinin sebebi, iki tasarım kinematik olarak eşitse
daha az moment isteyeni tercih etmektir.

Ölçülen tipik değer: `0.24 N·m` tepe. Yerçekimi kapalıyken sıfırdır ve
uygulama bunu ayrı gösterir.

---

# 30. Kütle dengeleme (shaking force ve moment)

## 30.1 Problem

Hareket eden kütleler, şaseye titreşimli kuvvet ve moment aktarır:

```
F_sarsıntı = Σ m_i · a_ci
M_sarsıntı = Σ ( I_i·α_i + r_i × m_i·a_ci )
```

Bu kuvvetler makineyi titretir, gürültü üretir, cıvataları gevşetir ve komşu
ekipmanı etkiler.

## 30.2 Tam kuvvet dengesi

Toplam ağırlık merkezi hareketsizse sarsıntı kuvveti sıfırdır:

```
Σ m_i · c_i(θ) = sabit  ∀θ
```

Bu, karşı ağırlıklarla sağlanabilir. **Berkof–Lowen yöntemi**, dört çubuk için
kapalı formda karşı ağırlık kütle ve konumlarını verir.

Bedeli ağırdır: eklenen kütle genellikle orijinalin 2–4 katıdır. Toplam atalet
artar, motor momenti büyür, gövdeler ağırlaşır.

## 30.3 Moment dengesi

Kuvvet dengelendikten sonra bile sarsıntı **momenti** kalır. Dengelemek için:

- Karşı dönen bir eylemsizlik diski.
- İkinci, ayna simetrik bir mekanizma (en temiz çözüm; iki mekanizma birbirinin
  momentini iptal eder).
- Dişli tahrikli dengeleyici mil.

## 30.4 Pratik yaklaşım

Sanayide tam denge nadiren yapılır. Tipik yol:

1. Sarsıntı kuvvetini `%70–80` azaltacak kısmi denge.
2. Kalan titreşimi izolatörlerle (kauçuk takoz) yalıtmak.
3. Kritik hızlardan uzak durmak.

Tam dengenin maliyeti (kütle, atalet, karmaşıklık) genellikle faydasını aşar.

## 30.5 Harmonik analiz

Sarsıntı kuvveti periyodiktir; Fourier bileşenlerine ayrılır:

```
F(θ) = Σ_k ( A_k·cos(kθ) + B_k·sin(kθ) )
```

Birinci harmonik (`k=1`) genellikle en büyüktür ve tek bir karşı ağırlıkla
dengelenebilir. İkinci harmonik (`k=2`) için iki katı hızda dönen bir
dengeleyici gerekir — içten yanmalı motorlarda kullanılan yöntem budur.

---

# 31. Sürtünme, verim ve yataklar

## 31.1 Mafsal sürtünmesi

Bir döner mafsalda sürtünme momenti:

```
M_s = μ_s · R_yatak · F_reaksiyon
```

`μ_s` sürtünme katsayısı, `R_yatak` pim yarıçapı, `F_reaksiyon` mafsal
kuvveti.

Tipik değerler:

| Yatak tipi | `μ_s` |
|---|---|
| Kuru plastik–çelik | 0.15–0.30 |
| Yağlı bronz burç | 0.05–0.12 |
| Bilyalı rulman | 0.001–0.005 |
| İğneli rulman | 0.002–0.006 |

## 31.2 Mekanizma verimi

```
η = P_çıkış / P_giriş = 1 − ΣM_s·ω_bağıl / P_giriş
```

Döner mafsallı mekanizmalarda verim yüksektir (%90–98). Kayar mafsallı
mekanizmalarda düşer (%70–90). Vidalı mekanizmalarda çok düşük olabilir
(%20–50) ve kendini kilitleme gerçekleşir.

## 31.3 Sürtünmenin iletim açısıyla ilişkisi

Mafsal kuvveti `1/sin(μ)` ile büyüdüğünden, sürtünme momenti de aynı şekilde
büyür:

```
M_s ∝ 1 / sin(μ)
```

`μ = 45°` iken `μ = 90°`’ye göre `1.41×`; `μ = 20°` iken `2.9×`. Bu,
iletim açısı sınırının **verim** açısından da gerekçesidir.

## 31.4 Yatak boyutlandırma

Rulman ömrü:

```
L₁₀ = (C / P)³ · 10⁶  devir       (bilyalı)
L₁₀ = (C / P)^(10/3) · 10⁶ devir  (makaralı)
```

`C` dinamik yük kapasitesi, `P` eşdeğer yük. Mekanizmalarda `P`, tur boyunca
değişir; kübik ortalama kullanılır:

```
P_eş = ( (1/2π)·∫ P(θ)³ dθ )^(1/3)
```

## 31.5 Boşluk ve ön yükleme

Rulman boşluğu, mekanizma hassasiyetini doğrudan etkiler. Ön yükleme (preload)
boşluğu kaldırır ama sürtünmeyi ve ısınmayı artırır.

3B baskı prototiplerde pim–delik geçmesi tipik olarak `0.1–0.3 mm` boşluk
taşır; hassas uygulamalarda rulman veya sıkı geçme burç şarttır.

---

# 32. Kam mekanizmaları

## 32.1 Ne zaman kam

Bağlantı kolları analitik hareket üretir; istediğiniz **her** hareket kanununu
veremezler. Kam, profili doğrudan kanuna göre kesildiği için tam serbestlik
verir:

- Kesin duraklama (dwell) süreleri.
- Asimetrik hızlanma profilleri.
- Keyfi konum–zaman ilişkisi.

Bedeli: üst çift teması, yüksek Hertz gerilmesi, aşınma, tek yönlü kuvvet
(geri dönüş için yay veya oluklu kam gerekir).

## 32.2 Terminoloji

- **Temel çember (base circle):** kam profilinin en küçük yarıçapı.
- **Ana çember (prime circle):** temel çember + izleyici makara yarıçapı.
- **Basma açısı (pressure angle):** izleyici hareket doğrultusu ile temas
  normali arasındaki açı. İletim açısının kam karşılığıdır.
- **Strok (lift):** izleyicinin toplam yer değiştirmesi.

## 32.3 Hareket kanunları

İzleyici yer değiştirmesi `s(θ)` seçilir. Karşılaştırma:

| Kanun | `a_max` | `j` | Not |
|---|---|---|---|
| Sabit hız | ∞ | ∞ | Uçlarda darbe; kullanılmaz |
| Parabolik | `4h/β²` | ∞ | Jerk süreksiz |
| Basit harmonik | `π²h/(2β²)` | ∞ | Duraklamaya bağlanınca jerk sıçrar |
| Sikloidal | `2πh/β²` | Sürekli | En yaygın; jerk sonlu |
| Değiştirilmiş yamuk | `4.89h/β²` | Sürekli | En düşük ivme tepesi |
| Polinom 3-4-5 | `5.77h/β²` | Sürekli | Sınır koşulları tam kontrol |

Sikloidal:

```
s(θ) = h·( θ/β − sin(2πθ/β)/(2π) )
```

Polinom 3-4-5 (`x = θ/β`):

```
s(x) = h·(10x³ − 15x⁴ + 6x⁵)
```

## 32.4 Temel kural

**Duraklamadan harekete geçişte ivme sürekli olmalıdır.** Aksi hâlde sonsuz
jerk oluşur ve mekanizma titreşir. Parabolik ve basit harmonik kanunlar bu
şartı sağlamaz; sikloidal ve polinom kanunlar sağlar.

Bu, kam tasarımının en sık ihlal edilen kuralıdır ve gürültülü makinelerin
başlıca sebebidir.

## 32.5 Basma açısı

```
tan(α) = (ds/dθ) / (r_prime + s)
```

`α ≤ 30°` tavsiye edilir (öteleyen izleyici için). Aşılırsa yan kuvvet artar,
izleyici kılavuzunda sıkışma riski doğar.

Küçültme yolu: temel çemberi büyütmek. Bedeli daha büyük kam ve daha yüksek
çevresel hız.

## 32.6 Eğrilik ve alt kesme

Kam profilinin eğrilik yarıçapı, izleyici makara yarıçapından küçük olamaz:

```
ρ_min > r_makara
```

Aksi hâlde **alt kesme (undercutting)** oluşur; profil kendini keser ve
izleyici istenen hareketi izleyemez. Kontrol edilmesi zorunludur.

## 32.7 Kam mı bağlantı mı

| Ölçüt | Kam | Bağlantı kolu |
|---|---|---|
| Hareket serbestliği | Tam | Sınırlı (analitik eğriler) |
| Kesin duraklama | Kolay | Yaklaşık (altı çubuk) |
| Aşınma | Yüksek | Düşük |
| Hız kapasitesi | Orta | Yüksek |
| İmalat | CNC gerekli | Delik + pim yeterli |
| Yük kapasitesi | Sınırlı (Hertz) | Yüksek |
| Yağlama | Kritik | Basit |

KREAMET’in problemi **kamsız** olarak tanımlanmıştır; bu, aşınma ve yüksek hız
kapasitesi lehine bilinçli bir seçimdir ve tasarımı zorlaştıran ana kısıttır.

---

# 33. Dişli çarklar ve dişli trenleri

## 33.1 Temel yasa

İki dişlinin sabit hız oranıyla çalışması için, temas noktasındaki ortak
normal her zaman aynı noktadan (**kutup noktası**) geçmelidir. Bunu sağlayan
profil ailesi **evolvent**tir.

Evolvent profil, bir çember üzerine sarılı gergin ipin ucunun çizdiği eğridir:

```
x = r_b·(cos t + t·sin t)
y = r_b·(sin t − t·cos t)
```

`r_b` temel çember yarıçapıdır.

## 33.2 Evolvent avantajları

- **Merkez mesafesi toleransı:** merkezler biraz kaysa bile hız oranı değişmez.
  Bu, evolventi diğer profillere üstün kılan tek özelliktir.
- İmalatı kolaydır (kremayer takım ile).
- Standart takımla farklı diş sayıları kesilebilir.

## 33.3 Temel büyüklükler

```
m  = d / z            modül (mm)
p  = π·m              adım
d_b = d·cos(α)        temel çember çapı
d_a = d + 2m          baş çemberi
d_f = d − 2.5m        ayak çemberi
```

`α` kavrama açısı, standart `20°` (bazı uygulamalarda `14.5°` veya `25°`).

## 33.4 Kavrama oranı

```
ε = (kavrama uzunluğu) / (temel adım)
```

`ε > 1` olmalıdır; aksi hâlde bir diş çifti temastan çıkmadan diğeri girmez ve
hareket kesintiye uğrar. Pratikte `ε ≥ 1.4` hedeflenir. `ε` büyükse yük daha
çok dişe paylaştırılır, gürültü azalır.

## 33.5 Alt kesme ve minimum diş sayısı

Diş sayısı çok azsa, kesme takımı diş dibini oyar (alt kesme) ve diş zayıflar.
`20°` kavrama açısı için minimum:

```
z_min = 2 / sin²(α) = 17
```

Profil kaydırma (`x` faktörü) ile daha az dişli çarklar kesilebilir.

## 33.6 Dişli trenleri

**Basit tren:** her mil üzerinde bir dişli.

```
i = ω_giriş / ω_çıkış = z_çıkış / z_giriş
```

Ara dişliler oranı etkilemez, yalnızca dönme yönünü değiştirir.

**Bileşik tren:** bir mil üzerinde iki dişli.

```
i = (z₂·z₄) / (z₁·z₃)
```

Yüksek oranlar için gereklidir; basit trenle `i > 10` pratik değildir.

**Planet (epicyclic) tren:** taşıyıcı (carrier) döner. Willis denklemi:

```
(ω_güneş − ω_taşıyıcı) / (ω_çember − ω_taşıyıcı) = − z_çember / z_güneş
```

Aynı hacimde çok yüksek oran, koaksiyel giriş-çıkış ve yüksek tork yoğunluğu
verir.

## 33.7 Mekanizma tasarımında dişli

Dişliler mekanizma tasarımında üç yerde kullanılır:

1. **Redüksiyon:** motor hızını mekanizma hızına indirmek.
2. **Faz ilişkisi:** iki mekanizmayı sabit oranla senkronize etmek.
3. **Dişli-bağlantı kombinasyonu:** dişli tahrikli beş çubuk mekanizmaları,
   dört çubuğun ulaşamadığı eğrileri üretir.

Üçüncüsü güçlüdür: beş çubuk `M = 2`’dir ama iki girişi bir dişli çiftiyle
sabit oranda bağlarsanız `M = 1` olur ve eğri ailesi dört çubuktan çok daha
zengindir.

---

# 34. Uzaysal ve küresel mekanizmalar

## 34.1 Neden uzaysal

Düzlemsel mekanizmalar tüm hareketi tek bir düzlemde tutar. Gerçek problemler
her zaman böyle değildir: bir aracın süspansiyonu, bir robotun bilek eklemi,
bir uçak kanadının flap mekanizması üç boyutlu hareket ister.

Uzaysal mekanizmaların bedeli: analiz zorluğu, imalat hassasiyeti ve montaj
toleransına duyarlılık.

## 34.2 Küresel mekanizmalar

Tüm mafsal eksenleri **tek bir noktada kesişiyorsa**, her noktanın hareketi o
nokta merkezli bir küre üzerindedir. Bu, düzlemsel mekanizmaların küre
üzerindeki karşılığıdır ve düzlemsel teorinin çoğu doğrudan aktarılır.

**Küresel dört çubuk:** dört R mafsalı, eksenleri bir noktada kesişir. Uzuv
“uzunlukları” artık açıdır (eksenler arası açı). Grashof koşulunun küresel
karşılığı vardır:

```
s + l ≤ p + q     (açı cinsinden, hepsi < 180°)
```

**Kardan (Hooke) mafsalı** özel bir küresel dört çubuktur. Giriş–çıkış hız
oranı sabit değildir:

```
ω₂/ω₁ = cos β / (1 − sin²β·cos²θ₁)
```

`β` mil eksenleri arasındaki açıdır. Dalgalanma `β` ile hızla büyür: `β = 15°`
için `±3.5%`, `β = 30°` için `±15%`.

**Sabit hız mafsalı (CV joint)** bu dalgalanmayı iki kardan mafsalını uygun
faz ile bağlayarak veya Rzeppa tipi bilyalı düzenle ortadan kaldırır.

## 34.3 RSSR mekanizması

Uzaysal dört çubuğun en yaygın hâli: iki R (giriş ve çıkış), iki S (bağlantı
çubuğunun uçları).

- Mobilite formülü `M = 2` verir; biri pasif (çubuğun kendi ekseni etrafındaki
  dönmesi).
- Montaj toleransına karşı çok toleranslıdır — S mafsalları eksen hizalama
  hatalarını yutar.
- Giriş ve çıkış eksenleri paralel olmak zorunda değildir; bu, düzlemsel
  mekanizmaların yapamadığı şeydir.

Konum analizi: çıkış uzvunun ucu, giriş ucundan `L` (çubuk boyu) uzaklıkta ve
kendi dönme çemberi üzerinde olmalıdır. Küre–çember kesişimi verir; genellikle
iki çözüm.

## 34.4 Denavit–Hartenberg gösterimi

Uzaysal zincirlerde uzuv geometrisini standartlaştıran parametre takımı:

| Parametre | Anlam |
|---|---|
| `a_i` | Uzuv uzunluğu: `z_{i−1}` ve `z_i` eksenleri arası ortak dikme |
| `α_i` | Uzuv burulması: iki eksen arasındaki açı |
| `d_i` | Uzuv ofseti: ortak dikmeler arası mesafe |
| `θ_i` | Mafsal açısı |

Dönüşüm matrisi:

```
T_i = Rot_z(θ_i) · Trans_z(d_i) · Trans_x(a_i) · Rot_x(α_i)
```

Zincirin uç konumu, matrislerin çarpımıdır. Bu gösterim robotik için
standarttır ama kapalı çevrimli mekanizmalarda çevrim kapanma denklemi
`T₁T₂...T_n = I` biçiminde yazılır ve çözümü zordur.

## 34.5 Vida teorisi (screw theory)

Uzaysal kinematiğin daha zarif dili. Her anlık hareket bir **vida** ile
tanımlanır: bir eksen etrafında dönme + o eksen boyunca öteleme.

- **Twist:** anlık hız vidası (6 bileşen).
- **Wrench:** kuvvet-moment vidası (6 bileşen).
- **Karşılıklılık (reciprocity):** bir wrench, bir twist üzerinde iş yapmıyorsa
  karşılıklıdır. Kısıt analizi bu kavram üzerine kurulur.

Vida teorisi, uzaysal mekanizmaların mobilitesini ve tekilliklerini
Grübler formülünden çok daha güvenilir belirler — özellikle aşırı kısıtlı
mekanizmalarda.

## 34.6 Bennett mekanizması

Dört R mafsallı uzaysal zincir. Grübler `M = −2` der ama şu koşullar altında
tek serbestlikle hareket eder:

```
a₁ = a₃,  a₂ = a₄
a₁/sin α₁ = a₂/sin α₂
d_i = 0  (tüm ofsetler sıfır)
```

Bennett mekanizması, katlanabilir yapıların ve dağıtılabilir uzay
yapılarının temel yapı taşıdır. Tolerans hassasiyeti çok yüksektir.

## 34.7 Uzaysal mekanizma tasarım tavsiyeleri

- Mümkünse S mafsalı kullanın: pasif serbestlik montajı kurtarır.
- Aşırı kısıtlı mekanizmalardan kaçının; kaçınamıyorsanız tolerans zincirini
  hesaplayın.
- Küresel mekanizmalar, tam uzaysal olanlardan çok daha kolay analiz edilir;
  problem küresel çözülebiliyorsa öyle çözün.
- Simülasyonda montaj toleransını dahil edin; nominal geometride çalışan bir
  uzaysal mekanizma, gerçekte sıkışabilir.

---

# 35. Paralel mekanizmalar

## 35.1 Seri ve paralel

**Seri:** uç efektör tek bir zincirle tabana bağlanır. Robot kolları.

- Büyük çalışma hacmi, basit ters kinematik yok — düz kinematik kolay.
- Her eklem bir öncekinin ağırlığını taşır: düşük rijitlik, düşük yük/ağırlık.

**Paralel:** uç efektör birden çok bağımsız zincirle tabana bağlanır.

- Yüksek rijitlik, yüksek yük kapasitesi, düşük hareketli kütle.
- Küçük çalışma hacmi, karmaşık tekillik yapısı.
- **Düz kinematik zordur, ters kinematik kolaydır** — seri robotların tam
  tersi.

## 35.2 Stewart–Gough platformu

Altı bacaklı, her bacak uzunluğu değişken (6-UPS veya 6-SPS). Altı serbestlik.

- Uçuş simülatörleri, hassas konumlandırma, makine takımları.
- Ters kinematik trivial: her bacak boyu, platform pozundan doğrudan hesaplanır.
- Düz kinematik: 40 dereceden polinom; genel çözümü sayısaldır.

## 35.3 Delta robot

Üç kol, her biri paralelkenar ile bağlı. Uç efektör **daima aynı yönelimde**
kalır (üç öteleme serbestliği).

- Çok hızlı: hareketli kütle çok düşük (motorlar sabit tabanda).
- Paketleme ve toplama uygulamalarında standart.
- Çalışma hacmi konik ve sınırlıdır.

## 35.4 Düzlemsel paralel mekanizmalar

**5-çubuk (pantograf tipi):** iki krank, ortak bir uç noktayı sürer. `M = 2`,
iki motor. Düzlemde herhangi bir yörüngeyi çizebilir.

Bu, KREAMET’in probleminin “kolay” alternatifidir ve neden reddedildiğini
açıklar: iki motorla herhangi bir eğri çizilebilir, sentez problemi ortadan
kalkar — ve senkronizasyon problemi başlar. Tek motorlu çözüm, hareketi
geometriye gömmesi bakımından niteliksel olarak farklıdır.

**3-RRR:** üç bacak, düzlemde üç serbestlik (x, y, φ).

## 35.5 Paralel mekanizmalarda tekillik

Üç tür vardır (Gosselin–Angeles sınıflandırması):

**Tip 1 (ters kinematik tekilliği):** çalışma alanı sınırında; bacaklar tam
açık veya tam katlı. Uç efektör bazı yönlerde hareket edemez.

**Tip 2 (düz kinematik tekilliği):** çalışma alanının **içinde**. Aktüatörler
kilitli olsa bile uç efektör hareket edebilir. **Tehlikelidir**: yapı
kontrolünü kaybeder, kuvvetler patlar.

**Tip 3:** mimariye özgü, özel geometrilerde.

Tip 2 tekillik, paralel mekanizmaları seri olanlardan ayıran ana risktir ve
çalışma alanı tanımlanırken mutlaka haritalanmalıdır.

## 35.6 Kısıt analizi

Paralel mekanizmalarda her bacak, uç efektöre bir **kısıt wrench** uygular.
Kısıtların birlikte hangi serbestlikleri kaldırdığı, wrench uzayının
boyutuyla belirlenir.

Bu analiz, Grübler formülünün yanıltıcı olduğu durumlarda (aşırı kısıtlı
paralel mekanizmalar) doğru mobiliteyi verir.

---

# 36. Girişim, montaj katmanları ve imalat

## 36.1 Problem

Kinematik analiz uzuvları çizgi kabul eder. Gerçek uzuvların genişliği ve
kalınlığı vardır ve birbirlerine çarpabilirler.

Çarpışma iki türlüdür:

- **Düzlem içi (coplanar):** aynı düzlemdeki iki çubuk kesişiyor.
- **Düzlem dışı:** farklı katmanlardaki parçalar, pim veya cıvata ile
  çakışıyor.

## 36.2 Çubuk–çubuk mesafe testi

İki çubuk, kalınlığı `w` olan kapsüller (segment + yarıçap) olarak modellenir.
Çarpışma testi, iki doğru parçası arasındaki en kısa mesafedir:

```
d = segmentDistance(A₁B₁, A₂B₂)
çarpışma  ⟺  d < w
```

Segment–segment mesafesi, iki parametreli bir minimizasyon problemidir ve
kapalı formda çözülür (parametre uzayında `[0,1]×[0,1]` karesine kırpma ile).

## 36.3 Muafiyetler

İki uzuv aynı mafsalda birleşiyorsa, mafsal yakınında zorunlu olarak
“çarpışırlar”. Bu meşrudur ve testten muaf tutulmalıdır:

```
if (uzuvlar bir mafsalı paylaşıyor) çarpışma sayma
```

Aynı gövdenin farklı elemanları da muaftır.

## 36.4 Ölçülen gerçek: düzlem içi çözüm yok

KREAMET geliştirilirken 454 **geçerli** mekanizma (tam tur, tüm elemanlar
bantta) üzerinde düzlem içi girişim ölçüldü.

**Sonuç: hiçbiri düzlem içi girişimsiz değildi.** Oran sıfır.

Sebep yapısaldır: üç kapalı çevrim ve 12 mm genişlikte on beş çubuk, tek bir
düzlemde birbirinin üzerinden geçmek zorundadır. Girişimi ölümcül kabul eden
bir ölçüt (şartnamenin ilk hâli) **her** mekanizmayı reddederdi, sağlam
olanlar dahil.

## 36.5 Katmanlı montaj modeli

Gerçek çok çevrimli mekanizmalar — özellikle 3B baskı ve lazer kesim
olanlar — **paralel düzlemlerde katmanlı** monte edilir. Çözüm bu gerçeği
modellemektir.

Yöntem:

1. Tur boyunca hangi çubuk çiftlerinin girişim yaptığını belirle.
2. Bunları bir **girişim grafı** olarak kur: düğüm = gövde, kenar = girişim.
3. Grafı renklendir. Aynı renk = aynı katman.
4. Renk sayısı = gereken paralel düzlem sayısı.

## 36.6 Graf renklendirme: Welsh–Powell

Optimal renklendirme NP-zordur; Welsh–Powell açgözlü sezgiseli pratikte iyi
sonuç verir:

1. Düğümleri derecelerine göre azalan sırala.
2. İlk düğüme 1. rengi ver.
3. Sırayla ilerle; her düğüme, komşularında kullanılmayan en küçük rengi ver.

Sonuç, kromatik sayının üst sınırıdır ve mekanizma boyutunda (8–14 düğüm)
genellikle optimaldir.

## 36.7 Katman maliyeti

Katman sayısı arttıkça:

- **Pim uzunluğu artar.** Bir mafsal, `k` katman arasında köprü kuruyorsa pim
  boyu `k × katman_kalınlığı` olur. Uzun pim eğilir; eğilme, mafsal açısında
  hata üretir.
- **Yığın kalınlığı artar.** Mekanizma düzlemsel olmaktan uzaklaşır ve
  düzlem dışı momentler doğar.
- **Montaj zorlaşır.**

Bu yüzden ölçülmesi gereken üç şeydir: **katman sayısı**, **maksimum pim
açıklığı** ve **toplam yığın kalınlığı**. KREAMET üçünü de raporlar ve amaç
fonksiyonuna katar.

Uygulamayla gelen tüm mekanizmalar yalnızca **2 katman** gerektirir.

## 36.8 İmalat yöntemleri

| Yöntem | Tolerans | Uygun katman | Not |
|---|---|---|---|
| FDM 3B baskı | ±0.2 mm | Kolay (ayrı parça) | Burç veya rulman şart |
| SLA/reçine | ±0.05 mm | Kolay | Kırılgan; ince kesitten kaçının |
| Lazer kesim (akrilik) | ±0.1 mm | Doğal (levha) | Çok katmanlı için ideal |
| Su jeti (metal) | ±0.15 mm | Doğal | Ağır; yüksek yük için |
| CNC frezeleme | ±0.02 mm | Zor | Pahalı; hassas prototip |

Katmanlı mekanizmalar için **lazer kesim levha** en doğal yöntemdir: her katman
bir levha, aralarına pul (spacer), pimler geçer.

## 36.9 Tasarım kuralları

- Mafsal deliği ile kenar arası mesafe ≥ `1.5 × delik çapı` (yırtılma).
- Çubuk genişliği ≥ `2 × delik çapı` (mukavemet).
- 3B baskıda katman yönü, yük yönüne dik olmasın (delaminasyon).
- Pim boyu ≥ `2 × malzeme kalınlığı`, aksi hâlde açısal boşluk büyür.
- Hareketli parçalar arası boşluk ≥ `0.3 mm` (baskı toleransı).

---

# 37. Toleranslar, boşluk ve hata analizi

## 37.1 Hata kaynakları

| Kaynak | Tipik büyüklük | Etkisi |
|---|---|---|
| Uzuv uzunluğu toleransı | ±0.05–0.2 mm | Sistematik yörünge sapması |
| Mafsal boşluğu | 0.05–0.3 mm | Rastgele konum belirsizliği |
| Yatak boşluğu | 0.01–0.05 mm | Rastgele |
| Elastik şekil değiştirme | Yüke bağlı | Yükle değişen sapma |
| Termal genleşme | `α·ΔT·L` | Yavaş sürüklenme |
| Montaj hatası | ±0.1–0.5 mm | Sistematik |

## 37.2 Duyarlılık analizi

Yörünge hatasının parametre hatasına duyarlılığı:

```
S_i = ∂P / ∂x_i
```

Sonlu farkla:

```
S_i ≈ (P(x + δ·e_i) − P(x − δ·e_i)) / (2δ)
```

Toplam hata (lineer yaklaşım):

```
ΔP ≈ Σ S_i · Δx_i          (en kötü hâl)
ΔP ≈ sqrt( Σ (S_i·Δx_i)² ) (istatistiksel, RSS)
```

## 37.3 Duyarlılığın tasarım anlamı

İki mekanizma aynı nominal yörüngeyi çizebilir ama duyarlılıkları çok farklı
olabilir. Tekilliğe yakın çalışan bir mekanizma, küçük bir uzunluk hatasını
büyütür — `∂P/∂x` terimleri `1/σ_min` ile ölçeklenir.

Bu, iletim açısı sınırının **üçüncü** gerekçesidir: verim ve işlevsellik
yanında **hassasiyet**.

Pratik sonuç: eğri hatası biraz daha büyük ama iletim açısı çok daha iyi bir
tasarım, gerçek imalatta genellikle daha iyi sonuç verir. Nominal RMS’i son
kırıntısına kadar kovalamak yanıltıcıdır.

## 37.4 Monte Carlo analizi

Lineer yaklaşım büyük toleranslarda yetersizdir. Monte Carlo:

1. Her parametre için tolerans dağılımı tanımla (normal, düzgün).
2. `N` (tipik `10⁴`) örnek çek.
3. Her örnek için yörüngeyi hesapla.
4. Hata dağılımını çıkar: ortalama, standart sapma, %95 aralığı.

Maliyet: `N × tur maliyeti`. Kapalı form çözümle bu makuldür.

## 37.5 Boşluk (backlash) modeli

Mafsal boşluğu, yönü yük yönüne bağlı bir belirsizliktir. Basit model:
mafsal noktası, `δ/2` yarıçaplı bir dairenin içinde herhangi bir yerde
olabilir.

Yön değiştirmede (yük yönü tersine döndüğünde) mekanizma bu boşluğu “geçer” ve
çıkışta ölü bant oluşur. Tekrarlanabilirlik için kritiktir.

Azaltma yolları:

- Ön yüklü rulman.
- Yay ile tek yöne bastırma (boşluğu tek tarafa toplar).
- Esnek mafsal (boşluksuz, bkz. Bölüm 38).
- Mafsal sayısını azaltmak.

## 37.6 Tolerans zinciri ve maliyet

Tolerans daraldıkça maliyet üstel artar. Doğru yaklaşım:

1. Duyarlılık analizi yap.
2. Yalnızca **yüksek duyarlılıklı** parametrelere sıkı tolerans ver.
3. Diğerlerini serbest bırak.

Bir mekanizmada genellikle 2–3 parametre toplam hatanın %80’ini üretir. Hepsine
aynı toleransı vermek, hem pahalı hem gereksizdir.

## 37.7 Kalibrasyon

Ölçülen hata sistematikse (montaj veya uzunluk hatasından), yazılımda telafi
edilebilir:

1. Gerçek mekanizmanın birkaç konumunu ölç.
2. Parametreleri ölçümlere uydur (parametre kestirimi).
3. Kestirilen gerçek parametreleri kullan.

Bu, robotik kalibrasyonun mekanizmalara uygulanmasıdır ve tolerans sıkmadan
doğruluk kazandırır.

---

# 38. Esnek (compliant) mekanizmalar

## 38.1 Tanım

Hareketi, mafsallar yerine **malzemenin elastik şekil değiştirmesiyle** üreten
mekanizmalardır.

Avantajlar:

- Boşluk yok, sürtünme yok, yağlama yok.
- Tek parça imalat (monolitik) — montaj yok.
- Yüksek tekrarlanabilirlik.
- Ölçek küçüldükçe daha avantajlı (MEMS’te hakim yaklaşım).

Dezavantajlar:

- Sınırlı hareket menzili.
- Enerji depolar (geri dönüş kuvveti).
- Yorulma ömrü sınırlı.
- Analiz zor (doğrusal olmayan büyük deformasyon).

## 38.2 Türler

**Yoğunlaşmış esneklik (lumped):** ince “canlı menteşe” bölgeleri, rijit
gövdeler. Rijit mekanizma teorisine yakın davranır.

**Dağıtılmış esneklik (distributed):** tüm gövde eğilir. Daha uzun ömür (gerilme
yayılır) ama analiz daha zor.

## 38.3 Sözde-rijit gövde modeli (PRBM)

Esnek bir kirişi, bir döner mafsal + burulma yayı ile modellemek:

```
θ ≈ Θ · (moment ilişkisi)
K_burulma = γ·K_Θ·E·I / L
```

`γ ≈ 0.85` karakteristik yarıçap oranı, `K_Θ ≈ 2.65` yay katsayısı (uç yüklü
ankastre kiriş için).

Bu model, rijit mekanizma sentez araçlarının esnek mekanizmalara
uygulanmasını sağlar: önce PRBM ile rijit tasarım yapılır, sonra esnek karşılığı
boyutlandırılır.

## 38.4 Gerilme sınırı

Esnek elemanda maksimum gerilme:

```
σ_max = E·c / ρ_min
```

`c` yarı kalınlık, `ρ_min` minimum eğrilik yarıçapı. Yorulma için:

```
σ_max ≤ σ_yorulma / n
```

`n` güvenlik katsayısı (2–3). Bu, hareket menzilini doğrudan sınırlar: daha
büyük hareket = daha küçük eğrilik yarıçapı = daha yüksek gerilme.

Malzeme seçimi kritiktir: yüksek `σ_akma/E` oranı istenir. Titanyum, yaylık
çelik, polipropilen ve naylon iyi adaylardır.

## 38.5 Bistabil mekanizmalar

Esnek mekanizmalar iki kararlı konum arasında geçiş yapacak şekilde
tasarlanabilir. Enerji eğrisinde iki minimum vardır ve aradaki tepe geçiş
kuvvetini belirler.

Uygulama: anahtarlar, mandallar, dağıtılabilir yapılar, enerji hasat cihazları.

## 38.6 Ne zaman esnek

| Ölçüt | Rijit | Esnek |
|---|---|---|
| Büyük hareket | ✓ | ✗ |
| Boşluksuzluk | ✗ | ✓ |
| Yüksek çevrim ömrü | ✓ | Sınırlı (yorulma) |
| Mikro ölçek | ✗ | ✓ |
| Montaj maliyeti | Yüksek | Yok |
| Sabit çıkış kuvveti | ✓ | ✗ (yay etkisi) |

KREAMET rijit mekanizmalar üretir çünkü hedef 250 mm ölçeğinde tam tur dönen
bir harekettir — esnek mekanizmaların menzil ve yorulma sınırlarının çok
ötesinde.

---

# 39. KREAMET’te kullanılan yöntemler

Bu bölüm, yukarıdaki teorinin uygulamada hangi somut kararlara dönüştüğünü
toplar. Her madde, belgede geçen bir prensibin uygulanışıdır.

## 39.1 Topoloji ailesi

**Bir krank + N adet RRR Assur diyadı, seri çözüm.**

```
n = 2 + 2N,  j = 1 + 3N,  M = 3(n−1) − 2j = 1   (∀N)
```

`N = 1..6` sunulur; `N = 3` orijinal sekiz kollu mekanizmadır.

Gerekçe (Bölüm 6): Assur grubu sıfır mobiliteli olduğundan her boyut yapısı
gereği tek serbestliklidir; “deneyip görme” gerekmez. Ayrıca her diyad kapalı
formda çözüldüğünden çözücü her boyutta iteratif değildir.

Doğrulama: uygulama mobiliteyi **kurulan graftan** yeniden hesaplar ve formülle
karşılaştırır; uyuşmazsa hata fırlatır.

## 39.2 Parametreleme

- Kol uzunlukları doğrudan değişken.
- Üçlü gövdelerdeki üçüncü noktalar `(r, α)` kutupsal koordinatla.
- Şase pivotları: `G0` orijinde, `G1` `+x` ekseninde sabit `O2O4` mesafesinde,
  sonrakiler sabit mesafe ve **değişken açı** ile.

Gerekçe (Bölüm 2.1, 19.6): `(r, α)` parametrelemesi rijitliği yapısı gereği
sağlar; üç kenar uzunluğu bağımsız olsaydı üçgen eşitsizliği ayrıca
zorlanmalıydı ve arama uzayının büyük kısmı geçersiz olurdu.

Bağımlı kenar kosinüs teoreminden çıkar ve o da `[Lmin, Lmax]` bandında
kontrol edilir — “basılan her eleman” dahil.

## 39.3 Konum çözümü

Diyad diyad, çember–çember kesişimi. Newton iterasyonu yok.

Sonuç: çevrim kapanma kalıntısı **bağımsız bir doğrulamadır**, çözücü
toleransı değil. Ölçülen: `1.3 × 10⁻¹³ mm` (tolerans `0.05 mm`).

## 39.4 Dal sürekliliği

Her karede, çember kesişiminin **bir önceki kareye en yakın kökü** seçilir.
Raporlanan turdan önce bir **ısınma turu** çözülür.

Sonuç: yörünge kapanması `1.4 × 10⁻¹⁴ mm` (tolerans `0.1 mm`), montaj modu
sıçraması `0`.

## 39.5 Tekillik ölçümü

İki bağımsız ölçü:

1. **`σ_min(∂F/∂q)`** — `JᵀJ`’nin en küçük özdeğerinin karekökü, Jacobi
   döndürmeleriyle.
2. **İletim açısı `μ`** — her diyad için kosinüs teoreminden; `det(J_diyad) ∝
   sin μ` olduğundan **tam ve bedava** bir vekildir.

Amaç fonksiyonunda `μ` kullanılır (maliyet sıfır), ekranda ikisi birden
gösterilir.

## 39.6 İletim açısı referansı

Ceza `45°`’ye referanslıdır, `60°`’ye değil.

Gerekçe (Bölüm 15.5): `d = 120 mm`, `a = 50 mm` ile giriş diyadının analitik
tavanı `44.75°`’dir. `60°` hedefi ulaşılamaz olduğundan sürekli ceza üretir ve
optimizasyonu eğri uyumundan uzaklaştırır.

Sert reddetme eşiği ayrıca ayarlanabilir bir kısıt olarak sunulur.

## 39.7 Amaç fonksiyonu

```
J = w₁·(E_eğri/S_eğri) + w₂·E_boyut + w₃·E_kapanma
  + w₄·E_tekillik + w₅·E_montaj + w₆·E_oran + w₇·E_yerçekimi
```

Ölçekleme zorunludur (Bölüm 19.5): ham milimetre eğri terimi, fiziksel
kısıtları iki mertebe ezer ve `1°` iletim açılı mekanizmalar üretir.

Bant ayrımı:

```
Uzunluk ihlali        → BAND_UZUNLUK (1e6) + ihlal
Tam tur başarısız     → BAND_MONTAJ (1e4) × (1 + başarısız oran) + boşluk
Montaj modu sıçraması → BAND_MONTAJ × 0.9 + sıçrama sayısı
Ağır tekillik         → J += BAND_MONTAJ × 0.5 + (eşik − μ)
```

Terimlerin ayrıştırması ekranda gösterilir; skor kara kutu değildir.

## 39.8 Eğri karşılaştırma

- **Katı Procrustes hizalama** — yalnızca dönme ve öteleme, **asla ölçekleme**.
- Optimal kayma, yön, dönme ve öteleme **dairesel çapraz korelasyonla tam
  olarak** bulunur; iterasyon yok.
- **Simetrik Chamfer**, nokta–**doğru parçası** mesafesiyle, düzgün ızgara
  uzamsal indeksi üzerinden.

Gerekçe (Bölüm 24.3): tek yönlü Chamfer, hedefin küçük bir bölümünü izleyen
mekanizmalara mükemmel skor verir. Simetrik biçim kapsama eksikliğini
cezalandırır.

## 39.9 Hedef eğri

Yerleşik kalp **analitik** olarak çözülür; 64 kontrol noktasından geçen
spline **kullanılmaz**.

Gerekçe: spline gerçek eğriden `≈0.13 mm` RMS sapar ve alttaki sivri ucu
yuvarlar — yani raporlanan hatayı ölçülebilir biçimde iyi gösterir. Kontrol
noktaları eğriyi düzenlenebilir kılmak için vardır; bir nokta oynatıldığı an
eğri `custom` olur ve spline devreye girer. Bu açık bir kullanıcı eylemidir,
gizli bir yaklaşım değil.

## 39.10 Girişim ve montaj

Düzlem içi girişim **raporlanan bir ölçü** olarak korunur; amaç fonksiyonunu
**montaj katmanı** modeli sürer.

Gerekçe (Bölüm 36.4): 454 geçerli mekanizmanın hiçbiri 12 mm kol genişliğinde
düzlem içi girişimsiz değildi. Girişimi ölümcül saymak her mekanizmayı
reddederdi.

Ölçülen: uygulamayla gelen tüm tasarımlar **2 katman** gerektirir.

## 39.11 Örnekleme

```
180 → 360 → 720 kare / tur
```

Son sıralama ve raporlama **her zaman 720 karede** yapılır; aksi hâlde
raporlanan sayı, optimizasyonun küçülttüğü sayı olmazdı.

## 39.12 Optimizasyon

- **Diferansiyel Evrim**: `rand/1` ve `current-to-best/1` karışımı.
- **Yapıcı uygulanabilir başlangıç popülasyonu** (Bölüm 23.5): kısmi
  mekanizma süpürülerek gerçek ankraj bandı ölçülür, partner kol uzunluğu
  kapalı-form uygun aralıktan seçilir.
- **Sınırlı Nelder–Mead** yerel iyileştirme.
- **Lamarck onarımı yalnızca kurtarma olarak**: her yavruyu onarmak aramayı
  durdurmuştu (`J` platosu `4.85`); yalnızca montaj olamayanları onarmak
  `2.64`’e indirdi.
- En iyi 20 farklı çözüm saklanır.

Web Worker içinde çalışır; tuval 60 FPS’te kalır. Spec, hedef eğri ve kısıt
anlık görüntüsü isteğe eklenir — worker ayrı bir modül örneğidir ve aksi hâlde
varsayılanlarla optimize ederdi.

## 39.13 Dinamik

- Çizgisel yoğunluk kütle modeli (sentez aşamasında gövde geometrisi yok).
- İndirgenmiş atalet `M(θ)`, sonlu farkla, **dal tohumlamalı**.
- Lagrange momenti: `τ = M(θ)·θ̈ + ½·M'(θ)·θ̇² + U'(θ)`, üç terim ayrı gösterilir.
- Yerçekimi momenti iki bağımsız testle doğrulanır: kapalı çevrim integrali
  sıfır, ve `U`’nun doğrudan sonlu farkıyla `1e−6` uyum.

## 39.14 Ölçülen sonuçlar

Uygulamayla gelen en iyi tasarım (720 kare, ince değerlendirme):

| Ölçü | Değer | Hedef |
|---|---|---|
| Amaç `J` | 1.1807 | — |
| Chamfer RMS | 11.41 mm | < 10 mm (“iyi”) |
| Maksimum hata | 21.0 mm | — |
| Sınır kutusu | 240.0 × 249.2 mm | 250 × 250 mm |
| Çözülen kare | 720 / 720 | 720/720 |
| Montaj modu sıçraması | 0 | 0 |
| Çevrim kapanma | 1.3 × 10⁻¹³ mm | < 0.05 mm |
| Yörünge kapanma | 0.0 mm | < 0.1 mm |
| Etkin iletim açısı | 44.70° | > 40° (tavan 44.75°) |
| Tekillik payı `σ_min` | 0.228 | — |
| Montaj katmanı | 2 | — |
| Tepe yerçekimi momenti | 0.236 N·m | — |

**Dürüst değerlendirme:** zorunlu ölçütlerin tamamı sağlanır. `11.41 mm` RMS,
`< 10 mm` “iyi” eşiğinin **hemen üzerindedir** ve `2.5 mm` “çok iyi”
eşiğinden uzaktır. Saklanan 20 farklı mekanizma `11.4–12.6 mm` bandında
kümelenir; bu, sınırlayıcının optimizasyon değil, **topoloji ve 50–200 mm
uzunluk bandı** olduğunu düşündürür.

Açık iyileştirme yolları: krank uzunluğunu serbest bırakmak, dördüncü bir şase
pivotu eklemek, uzunluk bandını genişletmek, veya çok daha uzun bir global
arama.

Karşılaştırma için, aynı yöntemle **altı kollu** (2 diyad) bir arama
çalıştırıldığında en iyi sonuç `J = 5.63`, RMS `55.0 mm` oldu — sekiz kollunun
belirgin biçimde altında. Kalp yörüngesi için sekiz kol gerçekten gerekli
görünüyor.

---

# 40. Çalışılmış örnekler

## 40.1 Örnek: Grashof sınıflandırması

**Verilen:** `a = 40`, `b = 120`, `c = 80`, `d = 100` mm. Şase `d`, giriş `a`.

**Çözüm:**

```
s = 40 (a),  l = 120 (b),  p = 80,  q = 100
s + l = 160
p + q = 180
160 < 180  ⇒ Grashof sağlanır
```

En kısa uzuv `a`’dır ve şaseye komşudur ⇒ **krank-sarkaç**. Giriş tam tur
döner. Motor tahriki uygundur.

**Kontrol:** `a` şase yapılsaydı çift krank, `b` şase yapılsaydı çift sarkaç
olurdu.

## 40.2 Örnek: iletim açısı uç değerleri

Aynı mekanizma. `μ`’nün uç değerleri, giriş uzvu şase doğrultusuyla hizalı
olduğunda oluşur.

**En uzak konum (`θ₂ = 0°`, krank şaseden uzağa):**

```
d' = d + a = 140
cos μ = (b² + c² − d'²) / (2bc)
      = (14400 + 6400 − 19600) / (2·120·80)
      = 1200 / 19200 = 0.0625
μ = 86.4°
```

**En yakın konum (`θ₂ = 180°`):**

```
d' = d − a = 60
cos μ = (14400 + 6400 − 3600) / 19200 = 17200/19200 = 0.8958
μ = 26.4°
```

**Sonuç:** `μ_etkin` en kötü `26.4°`, tavsiye edilen `40°` sınırının altında.
Bu mekanizma tam tur döner ama en yakın konumda kuvvet iletimi zayıftır ve
yatak yükü yüksektir.

**Düzeltme:** `c`’yi `80`’den `95`’e çıkaralım:

```
en yakın: cos μ = (14400 + 9025 − 3600)/(2·120·95) = 19825/22800 = 0.8695 → 29.6°
```

Hâlâ yetersiz. Asıl sorun `a/d` oranının küçük olmasıdır. `a = 55`, `d = 100`
denenirse `d' = 45`:

```
cos μ = (14400 + 6400 − 2025)/19200 = 0.9779 → 12°
```

Daha da kötü. **Doğru yön:** `b` ve `c`’yi birbirine yaklaştırmak ve ikisini de
`d'` bandının ortasına oturtmak — Bölüm 15.5’teki analitik sonucun aynısı.
`b = c = 100` ile:

```
en yakın (d'=60): cos μ = (10000+10000−3600)/20000 = 0.82 → 34.9°
en uzak (d'=140): cos μ = (20000−19600)/20000 = 0.02 → 88.9°
```

`μ_etkin` en kötü `34.9°`. Belirgin iyileşme; `a`’yı `30`’a düşürürsek band
daralır ve `μ_min` daha da yükselir.

## 40.3 Örnek: mobilite sayımı

**Verilen:** Aşağıdaki mekanizma — şase, krank, iki üçlü uzuv, dört ikili uzuv,
toplam 8 uzuv. Bir pimde üç uzuv buluşuyor.

**Yanlış sayım:** “10 pim var, `j = 10`.”

**Doğru sayım:** üç uzvun buluştuğu pim **iki** döner çifttir.

```
görünen pim sayısı = 10
üç uzuvlu pim      = 1  ⇒ +1 ek çift
j = 11
M = 3(8−1) − 2·11 = 21 − 22 = −1
```

Sonuç: bu zincir aşırı kısıtlıdır, hareket etmez (özel geometri yoksa).
Tasarımı düzeltmek için bir uzuv eklenmeli veya bir mafsal kaldırılmalıdır.

Bu, Bölüm 5.2(b)’de anlatılan hatanın sayısal örneğidir ve KREAMET’in
`pointId`/`jointId` ayrımının sebebidir.

## 40.4 Örnek: diyad montaj kontrolü

**Verilen:** `r₁ = 90`, `r₂ = 110` mm. Ankraj ayrımı `d` bir turda
`[70, 170] mm` bandını tarıyor.

**Montaj koşulu:**

```
|r₁ − r₂| ≤ d ≤ r₁ + r₂
|90 − 110| = 20 ≤ d ≤ 200
```

`d ∈ [70, 170]` bu aralığın içindedir ⇒ **her konumda montaj olur.** ✓

**İletim açısı kontrolü:**

```
d = 170: cos μ = (8100 + 12100 − 28900)/(2·90·110) = −8700/19800 = −0.439 → μ = 116.1°
         μ_etkin = 180 − 116.1 = 63.9°
d = 70:  cos μ = (8100 + 12100 − 4900)/19800 = 15300/19800 = 0.773 → μ = 39.4°
         μ_etkin = 39.4°
```

En kötü `39.4°` — sınırda. `r₁ = r₂ = 100` denersek:

```
d = 170: cos μ = (10000+10000−28900)/20000 = −0.445 → 116.4° → etkin 63.6°
d = 70:  cos μ = (20000−4900)/20000 = 0.755 → 40.98° → etkin 41.0°
```

Eşit kollar biraz daha iyi. Bölüm 15.5’in tahmini: bu band için tavan
`μ ≤ 44.75°` ve optimum `r₁ = r₂ = 91.9`. Deneyelim:

```
d = 70: cos μ = (8446+8446−4900)/(2·8446) = 11992/16892 = 0.710 → 44.75° ✓
d = 170: cos μ = (16892−28900)/16892 = −0.711 → 135.3° → etkin 44.7° ✓
```

Tam tavanda ve her iki uçta dengeli. Analitik sonuç doğrulandı.

## 40.5 Örnek: yerçekimi momenti

**Verilen:** Yatay konumdaki bir krank, `L = 150 mm`, çizgisel yoğunluk
`ρ = 0.00035 kg/mm`.

```
m = ρ·L = 0.00035 × 150 = 0.0525 kg
c = L/2 = 75 mm = 0.075 m
U(θ) = m·g·(L/2)·sin θ = 0.0525 × 9.80665 × 0.075 × sin θ
     = 0.03861·sin θ   [J]
τ = dU/dθ = 0.03861·cos θ   [N·m]
```

Tepe moment `θ = 0` (yatay) konumunda `0.0386 N·m`. Dikey konumda sıfır —
sezgiyle uyumlu.

**Bir tur integrali:**

```
∫₀^{2π} 0.03861·cos θ dθ = 0.03861·[sin θ]₀^{2π} = 0  ✓
```

Bölüm 26.5’teki doğrulama sağlanır.

## 40.6 Örnek: indirgenmiş atalet

Aynı krank, `O₂` etrafında dönüyor:

```
I_O2 = m·L²/3 = 0.0525 × (0.150)² / 3 = 3.94e−4 kg·m²
```

(Uçtan dönen ince çubuk için `mL²/3`.)

Krank ucuna `0.02 kg` nokta kütle eklenirse:

```
I_ek = 0.02 × 0.150² = 4.5e−4 kg·m²
I_toplam = 8.44e−4 kg·m²
```

Ucundaki küçük kütle, çubuğun kendisinden **daha fazla** atalet katkısı yapar.
`r²` bağımlılığı budur ve mekanizma tasarımında ağır parçaları merkeze yakın
tutmanın sebebidir.

## 40.7 Örnek: motor momenti bileşenleri

`M(θ) = 8e−4 + 3e−4·cos(2θ)` kg·m², `ω = 6.28 rad/s` (60 rpm) sabit,
`U'(θ) = 0.15·cos θ` N·m olsun.

```
M'(θ) = −6e−4·sin(2θ)
τ = M·θ̈ + ½·M'·θ̇² + U'
  = 0                       (sabit hız)
  + ½·(−6e−4·sin 2θ)·39.4
  + 0.15·cos θ
  = −0.0118·sin(2θ) + 0.15·cos θ
```

Tepe: `θ = 0` civarında yaklaşık `0.15 N·m`. Yerçekimi terimi baskındır.

Hız `600 rpm`’e çıkarsa `θ̇² = 3944` olur:

```
½·M'·θ̇² tepesi = 0.5 × 6e−4 × 3944 = 1.18 N·m
```

Şimdi atalet terimi yerçekimini **sekiz kat** aşar. Bu, “yerçekimini ihmal
edelim” veya “ataleti ihmal edelim” kararlarının hıza bağlı olduğunu gösterir.

## 40.8 Örnek: tolerans duyarlılığı

Bir dört çubukta kavrayıcı noktası yörüngesinin, `b` uzunluğuna duyarlılığı
sonlu farkla ölçüldü:

```
∂P/∂b ≈ 1.8 (birimsiz, mm/mm)
```

`b` toleransı `±0.1 mm` ise yörünge sapması `±0.18 mm`.

Aynı mekanizma tekilliğe yakın çalıştırılırsa (`μ_min = 12°`) aynı ölçüm:

```
∂P/∂b ≈ 8.6
```

Sapma `±0.86 mm` — beş kat kötü. Nominal yörünge aynı, gerçek performans
tamamen farklı. Bölüm 37.3’ün somut karşılığıdır.

---

# 41. Sık yapılan hatalar

## 41.1 Sayım ve topoloji

- **Şaseyi `n`’e katmamak.** `M` hep negatif çıkar.
- **Çok uzuvlu pimi tek mafsal saymak.** `M` fazla çıkar, mekanizma gerçekte
  hareket etmez.
- **Kaynaklı birleşimi mafsal saymak.** İki uzuv aslında tek uzuvdur.
- **Grübler’i mutlak doğru sanmak.** Aşırı kısıtlı ve pasif serbestlikli
  mekanizmalarda formül yanılır; vida teorisi veya doğrudan kısıt analizi
  gerekir.

## 41.2 Analiz

- **Dal sürekliliğini ihmal etmek.** Kök seçimini işaretle sabitlemek, tekillik
  geçişinde süreksizlik üretir.
- **Sonlu farkı tohumlamadan almak.** `θ±h` farklı kollara düşerse türev
  anlamsızdır. Sessizce yanlış hız ve ivme verir.
- **Isınma turu yapmamak.** `θ=0` ile `θ=2π` farklı kollarda kalır, yörünge
  kapanmaz ve bu gerçek bir kusur sanılır.
- **Newton kalıntısını doğrulama sanmak.** İteratif çözümde kalıntı durma
  ölçütüdür; hiçbir şeyi kanıtlamaz.
- **Tekilliği yalnızca `det(J)` ile ölçmek.** Ölçeğe ve birime bağlıdır;
  `σ_min` veya koşullanma sayısı kullanın.

## 41.3 Sentez

- **Amaç fonksiyonu terimlerini ölçeklememek.** Milimetre eğri hatası,
  boyutsuz kısıtları ezer; sonuç `1°` iletim açılı mekanizmalar.
- **Ölçekli (benzerlik) Procrustes kullanmak.** `25 mm` çizen bir mekanizma
  `250 mm` hedefe mükemmel uyum raporlar.
- **Tek yönlü Chamfer kullanmak.** Hedefin küçük bir bölümünü izleyen
  mekanizma mükemmel skor alır.
- **Ulaşılamaz referans seçmek.** `60°` iletim açısı hedefi, tavanı `44.75°`
  olan bir problemde sürekli ceza üretir.
- **Kaba örneklemede sıralamak.** Raporlanan sayı, optimize edilen sayı olmaz.
- **Her yavruyu onarmak.** Onarım koordinatları sınırlara yapıştırır ve aramayı
  durdurur; yalnızca kurtarma olarak kullanın.
- **Kinematik geçerliliği sonradan kontrol etmek.** Sentez, geçerlilik
  ölçütlerini amaç fonksiyonunda taşımalıdır; sonradan eleme, arama
  bütçesini boşa harcar.

## 41.4 İmalat ve doğrulama

- **Uzuvları çizgi kabul edip girişimi kontrol etmemek.** Çok çevrimli
  mekanizmalarda düzlem içi girişim neredeyse kaçınılmazdır.
- **Girişimi ölümcül saymak.** Katmanlı montaj gerçek bir çözümdür; ölçülmesi
  gereken katman sayısıdır.
- **Yalnızca nominal geometriyi doğrulamak.** Tolerans ve boşluk, tekilliğe
  yakın tasarımlarda hatayı katlar.
- **Bağımlı elemanları bant kontrolünden muaf tutmak.** Üçlü gövdenin kosinüs
  teoreminden çıkan kenarı da basılan bir elemandır.
- **Birim karıştırmak.** `I = mL²/12` formülüne mm girmek sonucu `10⁶` kat
  bozar. Tek dönüşüm noktası kullanın.

## 41.5 Raporlama

- **Optimize edilmemiş sayıyı “sonuç” diye vermek.** Başlangıç tahmini ile
  optimizasyon çıktısı açıkça ayrılmalıdır.
- **Ortalama vermek, en kötüyü vermemek.** İletim açısı, tekillik ve girişim
  için anlamlı olan **en kötü** değerdir.
- **Kısmi başarıyı başarı gibi sunmak.** `335/720` kare çözülen bir mekanizma
  “biraz iyi” değildir; motorla döndürülemez.

---

# 42. Tasarım kontrol listesi

Bir mekanizma tasarımını teslim etmeden önce, aşağıdaki maddelerin hepsi
ölçülmüş ve kayıtlı olmalıdır.

## 42.1 Topoloji

- [ ] Uzuv sayısı `n` (şase dahil) ve mafsal sayısı `j` sayıldı.
- [ ] Çok uzuvlu pimler doğru çift sayısıyla sayıldı.
- [ ] `M = 3(n−1) − 2j₁ − j₂` hesaplandı ve `= 1`.
- [ ] Mobilite, **kurulan graftan** bağımsız olarak doğrulandı.
- [ ] İnsidans tutarlı: `Σ deg = 2j`.
- [ ] Serbest yüzen gövde yok (bağlantılılık kontrolü).
- [ ] Bağımsız çevrim sayısı `L = j − n + 1` hesaplandı.

## 42.2 Kinematik

- [ ] Tam tur boyunca her karede çözüm var (`720/720`).
- [ ] Montaj modu sıçraması sayısı `0`.
- [ ] Çevrim kapanma kalıntısı `< 0.05 mm` (kapalı formda `~1e−13`).
- [ ] Yörünge kapanması `|P(0) − P(2π)| < 0.1 mm`.
- [ ] Isınma turu yapıldı.
- [ ] Giriş uzvu tam tur dönebiliyor (Grashof veya doğrudan test).

## 42.3 Kuvvet iletimi

- [ ] Her diyadın `μ` değeri tur boyunca hesaplandı.
- [ ] `μ_etkin` en kötü değeri raporlandı.
- [ ] `μ_etkin ≥ 40°` (veya proje sınırı).
- [ ] Analitik tavan hesaplandı; hedef ulaşılabilir bir değere referanslandı.
- [ ] `σ_min(J)` tur boyunca izlendi.
- [ ] Ölü noktalar çalışma aralığının dışında.

## 42.4 Geometri ve imalat

- [ ] **Her basılan eleman** (bağımlı kenarlar dahil) uzunluk bandında.
- [ ] Uzuv oranları makul (`L_max/L_min` aşırı değil).
- [ ] Düzlem içi girişim ölçüldü ve raporlandı.
- [ ] Montaj katmanı sayısı hesaplandı.
- [ ] Maksimum pim açıklığı hesaplandı.
- [ ] Toplam yığın kalınlığı kabul edilebilir.
- [ ] Mafsal deliği–kenar mesafesi kuralları sağlandı.

## 42.5 Dinamik

- [ ] Kütle modeli tanımlandı ve belgelendi.
- [ ] İndirgenmiş atalet `M(θ)` hesaplandı.
- [ ] Yerçekimi momenti tepesi ölçüldü.
- [ ] Kapalı çevrim integrali sıfır doğrulaması geçti.
- [ ] Sonlu fark doğrulaması geçti.
- [ ] Motor tepe ve RMS momenti hesaplandı.
- [ ] Gerekirse volan boyutlandırıldı.

## 42.6 Hassasiyet

- [ ] Kritik parametreler için duyarlılık `∂P/∂x` hesaplandı.
- [ ] Tolerans bütçesi dağıtıldı.
- [ ] Mafsal boşluğu etkisi tahmin edildi.
- [ ] Gerekirse Monte Carlo çalıştırıldı.

## 42.7 Raporlama

- [ ] Başlangıç tahmini ile optimize sonuç açıkça ayrıldı.
- [ ] Her sayının hangi kodla üretildiği belirtildi.
- [ ] En kötü değerler (ortalama değil) verildi.
- [ ] Sağlanamayan hedefler açıkça yazıldı.
- [ ] Tasarım dosyası (topoloji + parametreler + kısıtlar) dışa aktarıldı.

---

# 43. Altı çubuk mekanizmalar

## 43.1 Neden altı çubuk

Dört çubuk, kavrayıcı eğrisi zenginliğine rağmen üç sınırla karşılaşır:

- Kesin **duraklama** üretemez, yalnızca yaklaşık.
- Çıkış salınım açısı ile iletim açısı arasında sıkı bir ödünleşim vardır.
- Beş konumdan fazlası için hareket sentezi çözümü yoktur.

Altı çubuk (`n = 6`, `j = 7`, `M = 1`) bu sınırların üçünü de aşar. Uzuv
dağılımı zorunlu olarak iki üçlü ve dört ikili uzuvdur (Bölüm 4.2).

## 43.2 Watt zinciri

İki üçlü uzuv **birbirine komşudur** (ortak mafsalları vardır).

- **Watt I:** iki üçlü uzuv da hareketli.
- **Watt II:** bir üçlü uzuv şasedir.

**Watt II**, iki dört çubuğun seri bağlanmasıdır: birinci dört çubuğun çıkışı,
ikincinin girişidir. Bu, analizi çok kolaylaştırır — iki bağımsız dört çubuk
çözümü, sırayla.

Kullanımı: hareket aralığını genişletmek, iki farklı hız kanununu ardışık
uygulamak, ve dört çubuğun ulaşamadığı çıkış açısı aralıklarına ulaşmak.

## 43.3 Stephenson zinciri

İki üçlü uzuv **ayrıktır** (ortak mafsalları yoktur).

- **Stephenson I, II, III:** hangi uzvun şase olduğuna göre.

**Stephenson III** en yaygınıdır: giriş dört çubuğa bağlı, kavrayıcı üzerindeki
bir nokta ikinci bir diyadı sürer. Bu, iki dört çubuğun seri bağlanması
**değildir**; çevrimler iç içedir ve çözüm sırası daha dikkatli kurulmalıdır.

KREAMET’in ailesindeki `N = 2` durumu (altı kol) Stephenson tipi bir yapıdır:
birinci diyad krank ve ikinci şase pivotu arasında, ikinci diyad ise birinci
diyadın kolundaki rijit nokta ile üçüncü şase pivotu arasındadır.

## 43.4 Duraklama mekanizmaları

Altı çubuğun en değerli kullanımı **kesin olmayan ama çok iyi** duraklama
üretmektir. Yöntem (Bölüm 17.4):

1. Bir dört çubuk seç; kavrayıcı eğrisinde çembersel yaya çok yakın bir bölge
   bul.
2. O yayın merkezine ikinci bir diyadı bağla; kol uzunluğu = yay yarıçapı.
3. Nokta o bölgede ilerlerken ikinci diyadın çıkışı neredeyse hiç dönmez.

Duraklama kalitesi, yayın “ne kadar çembersel” olduğuna bağlıdır. Sentezde
ölçü: eğrinin o bölümü ile en iyi uydurulan çemberin arasındaki maksimum
sapma.

**Avantajı kam’a karşı:** üst çift teması yok, aşınma yok, yüksek hızda güvenli.
**Dezavantajı:** duraklama kesin değildir; tipik olarak `±1–2°` kalıntı hareket
kalır.

## 43.5 Hızlı geri dönüş

Altı çubuk, dört çubuğun sağlayabileceğinden çok daha büyük zaman oranı verir.
Klasik **çekiçli (whitworth) mekanizma** bir altı çubuktur ve `Q = 2` üzeri
oranlara ulaşır.

Kullanımı: planya, testere, pres besleyicisi — iş stroğu yavaş ve güçlü, dönüş
stroğu hızlı.

## 43.6 Yürüyen mekanizmalar

Ayaklı robotlarda, ayak ucunun yörüngesi şu şartları sağlamalıdır:

- Zeminle temas hâlindeyken **düz** ve **sabit hızlı** (gövde düzgün ilerlesin).
- Havadayken yeterince yükselen bir kavis.
- Kapalı ve tek çevrimli.

**Chebyshev** ve **Klann** mekanizmaları bu iş için klasiktir. **Theo Jansen**
mekanizması sekiz kollu bir zincirdir ve Jansen’in “kutsal sayılar” dediği
uzunluk oranları, tam olarak bu üç şartı optimize eden bir aramanın sonucudur.

Jansen mekanizması, KREAMET’in yaptığı işin — çok kollu bir zincirde kavrayıcı
noktasının belirli bir yörüngeyi izlemesi için boyut araması — bilinen en ünlü
örneğidir.

## 43.7 Altı çubukta analiz sırası

Watt II gibi seri yapılarda:

```
dört çubuk 1 çöz → çıkış açısı → dört çubuk 2 gir → çöz
```

Stephenson III gibi iç içe yapılarda Assur ayrıştırması gerekir:

```
krank → diyad 1 (RRR) → diyad 1’in kolundaki rijit nokta → diyad 2 (RRR)
```

İkisi de kapalı formdur. Bu, altı çubuğun analitik olarak dört çubuktan zor
olmadığı anlamına gelir — yalnızca daha fazla adım vardır.

---

# 44. Klasik mekanizma kataloğu

Bu bölüm, tasarımda sık başvurulan mekanizmaları tek yerde toplar. Her biri
için: ne yapar, nasıl kurulur, sınırı nedir.

## 44.1 Yaklaşık doğru mekanizmaları

**Watt (1784).** İki eşit uzuv, aralarında kavrayıcı. Kavrayıcı ortası uzun,
ince bir sekiz çizer; sekizin ortası çok düz.

```
a = c,  kavrayıcı noktası b’nin ortası
düzlük bölgesi ≈ 0.4·b uzunluğunda
```

**Chebyshev.** Simetrik dört çubuk:

```
d : a : b = 2 : 1 : 2.5,   c = b
kavrayıcı noktası b’nin ortası
```

Orta bölgede sapma, strogun `%0.1`’i mertebesindedir.

**Hoeken.** Chebyshev’in inversiyonu. Düz bölümde **yaklaşık sabit hız** verir:

```
a = 1,  b = c = 2.5,  d = 2
kavrayıcı noktası: AB doğrusunun uzantısında, A’dan 2.5 birim
```

Yürüyen makineler ve konveyörlerde en çok kullanılan yaklaşık doğru
mekanizmasıdır.

**Roberts.** Üçgen kavrayıcı, simetrik:

```
a = c,  kavrayıcı ikizkenar üçgen
düz bölüm uzun ama sapma Chebyshev’den büyük
```

**Peaucellier–Lipkin (1864).** Sekiz uzuv, **tam** doğru üretir (yaklaşık
değil). Ters çevirme (inversion) geometrisine dayanır:

```
|OP| · |OQ| = sabit
```

Tarihî önemi büyüktür (doğrusal hareketin bağlantı kollarıyla tam üretilebildiği
ilk kanıt) ama uzuv sayısı ve boşluk birikimi nedeniyle pratikte nadiren
kullanılır.

## 44.2 Doğrusal hareket üreten diğer mekanizmalar

**Scott–Russell.** Bir kayar mafsal ve iki uzuvla tam doğru:

```
|AB| = |BC| = |BP|
```

`P` noktası tam bir doğru üzerinde hareket eder.

**Kardan (hipocycloid) düzeneği.** Bir dişli, çapı iki katı olan iç dişli
içinde yuvarlanırsa, küçük dişlinin çevresindeki bir nokta **tam doğru**
çizer. Dişli tabanlı doğrusal hareketin en zarif örneği.

## 44.3 Duraklama mekanizmaları

**Cebri hareket (Geneva) mekanizması.** Sürekli dönen giriş, kesintili
(indeksli) çıkış. `n` yuvalı bir Geneva çarkı, her turda `1/n` tur çıkış verir
ve arada tam durur.

```
hareket süresi oranı = (n − 2) / (2n)
```

Dört yuvalı için `%25` hareket, `%75` duraklama. Film projektörlerinin ve
indeksleme tablalarının klasik çözümüdür.

Sınırı: giriş–çıkış geçişinde ivme sıçraması vardır; yüksek hızda gürültülü.

**Altı çubuk duraklama.** Bölüm 43.4. Daha yumuşak ama duraklama kesin değil.

**Kam.** Kesin duraklama, tam kontrol; aşınma bedeliyle.

## 44.4 Hızlı geri dönüş

**Kayar kollu (crank-shaper).** Krank, uzun bir kolu bir kayar mafsal
üzerinden sürer:

```
Q = (180° + β) / (180° − β),  β = 2·arcsin(a/d)
```

`a/d = 0.5` için `β = 60°`, `Q = 2.0`.

**Whitworth.** Aynı prensip, krank sabit mafsala daha yakın; `Q > 2` mümkün.

## 44.5 Kavrama ve tutma

**Diz eklemi (toggle) mekanizması.** İki uzuv düz hizaya yaklaştığında mekanik
avantaj sonsuza gider:

```
F_çıkış / F_giriş = 1 / (2·tan θ)
```

`θ → 0` iken oran patlar. Preslerde, kalıp kapama düzeneklerinde ve hızlı
bağlama kelepçelerinde kullanılır.

Ödünleşim: yüksek kuvvet noktasında hız sıfırdır; kuvvet ve hız aynı anda
elde edilemez.

**Pantograf.** Paralelkenar tabanlı; bir noktanın hareketini sabit oranla
büyütür veya küçültür. Kopya frezelerde ve çizim aletlerinde.

## 44.6 Yönelim koruyan mekanizmalar

**Paralelkenar (parallel-motion) mekanizması.** Kavrayıcı uzuv, dönmeden
öteleme yapar. Masa lambası kolları, tartı mekanizmaları, delta robot bacakları.

Dikkat: paralelkenar, uzuvlar hizalandığında **çelişkili paralelkenara**
(anti-parallelogram) atlayabilir. Bunu önlemek için ek bir uzuv veya faz
farklı ikinci bir paralelkenar kullanılır.

**Sarrus mekanizması.** İki üçlü RRR zinciri, birbirine dik düzlemlerde. Saf
doğrusal öteleme üretir — kayar mafsal olmadan.

## 44.7 Çevirme ve tersleme

**Ters çevirme (inversor).** Peaucellier ve Hart mekanizmaları, bir noktanın
hareketini geometrik ters çevirme ile dönüştürür.

**Küresel dört çubuk.** Bir eksendeki dönmeyi başka bir eksene aktarır;
eksenler kesişmek zorundadır.

**Kardan mafsalı.** Kesişen eksenler arasında dönme aktarır; hız oranı
dalgalanır (Bölüm 34.2).

## 44.8 Seçim tablosu

| İhtiyaç | Önerilen |
|---|---|
| Yaklaşık doğru, sabit hız | Hoeken |
| Yaklaşık doğru, en düz | Chebyshev veya Watt |
| Tam doğru | Peaucellier veya Scott–Russell |
| Kesin duraklama, indeksleme | Geneva |
| Yumuşak duraklama | Altı çubuk (Watt II veya Stephenson III) |
| Hızlı geri dönüş | Whitworth veya kayar kollu |
| Yüksek kuvvet, kısa strok | Diz eklemi (toggle) |
| Yönelim koruma | Paralelkenar |
| Ölçek büyütme | Pantograf |
| Kesişen eksenler arası aktarım | Kardan veya küresel dört çubuk |
| Serbest yörünge | Çok kollu zincir + boyut sentezi |

---

# 45. Simülasyon ve doğrulama pratiği

## 45.1 Simülasyonun sınırı

Bir simülasyon, modellediği kadarını doğrular. Rijit cisim kinematiği şu
varsayımları yapar ve hepsi ihlal edilebilir:

- Uzuvlar şekil değiştirmez.
- Mafsallarda boşluk yoktur.
- Sürtünme ihmal edilir (veya basit modellenir).
- Geometri nominal değerdedir.
- Malzeme özellikleri sabittir (sıcaklık, nem etkisi yok).

Simülasyonda mükemmel çalışan bir mekanizma, bu varsayımlardan biri yeterince
ihlal edilirse gerçekte çalışmaz. Bu yüzden simülasyon **tasarım aracıdır**,
kabul belgesi değildir.

## 45.2 Doğrulama katmanları

Güvenilir bir mekanizma yazılımında doğrulama katmanlıdır:

**(1) Değişmezler (invariants).** Fizik gereği doğru olması gereken şeyler:

- Krank ucu, krank uzunluğu yarıçaplı çemberde kalmalı.
- Şase pivotları arası mesafeler sabit kalmalı.
- Çevrim kapanma kalıntısı makine hassasiyetinde olmalı.
- Rijit gövde üzerindeki iki nokta arası mesafe değişmemeli.

**(2) Analitik karşılaştırma.** Kapalı formda bilinen bir sonuçla:

- Dört çubuk çözümü, Freudenstein denklemiyle uyuşmalı.
- Yerçekimi momenti, `U`’nun sonlu farkıyla uyuşmalı.
- Kapalı çevrimde `∮ dU/dθ · dθ = 0`.

**(3) Simetri ve korunum.** Fizik yasalarının sonucu:

- Kütle, çizgisel yoğunlukla doğrusal ölçeklenmeli.
- Potansiyel enerji, yükseltmeyle `m·g·Δh` kadar artmalı.
- Tur boyunca net iş sıfır olmalı.

**(4) Regresyon.** Bir kez doğrulanmış sonuçların değişmemesi:

- Saklanan optimize tasarımlar, aynı çözücüyle yeniden değerlendirildiğinde
  kayıtlı metriklerini üretmeli.

**(5) Uçtan uca (smoke).** Gerçek tarayıcıda, gerçek etkileşimle:

- Krank sürüklendiğinde motor açısı beklenen değere gitmeli.
- Ekran↔dünya dönüşümü gidiş-dönüşte özdeş olmalı.
- Oynatma açıyı ilerletmeli.

## 45.3 Neyin test edilmeyeceği

Aşırı test, testin kendisini bakım yüküne çevirir. Test etmeyin:

- Kütüphanenin kendi davranışını (Three.js’in matris çarpımı).
- Rastgele üretilmiş verinin tam değerlerini (yalnızca özelliklerini test edin).
- Arayüz metinlerini (i18n anahtar eşleşmesi yeterlidir).
- Kayan nokta sonuçlarını tam eşitlikle.

## 45.4 Toleransların seçimi

| Test | Tolerans | Gerekçe |
|---|---|---|
| Çevrim kapanma | `1e−9 mm` | Kapalı formda `1e−13` bekleniyor; marj bol |
| Yörünge kapanma | `0.1 mm` | Şartname değeri |
| Krank yarıçapı | `1e−9 mm` | Doğrudan hesap; hata olmamalı |
| Kütle ölçeklenmesi | `1e−9` bağıl | Doğrusal ilişki, tam olmalı |
| Yerçekimi momenti / FD | `1e−6` | Sonlu fark hatası bu mertebede |
| `∮ dU/dθ` | `1e−3` | Sayısal integral hatası |

Tolerans, **beklenen hata mertebesinin bir kaç katı** olmalıdır. Çok sıkıysa
test kırılgandır; çok gevşekse gerçek hataları kaçırır.

## 45.5 Sayı üretimi ve dürüstlük

Bir mühendislik aracının en önemli özelliği, raporladığı sayının nereden
geldiğinin bilinmesidir. İki kural:

**(1) Elle yazılmış sayı olmaz.** Optimizasyon sonucu diye sunulan her değer,
gerçek bir çözücü koşusundan gelmelidir. Makul görünen bir sayı uydurmak, en
zararlı hata türüdür: yanlış olduğu fark edilmez.

**(2) Başlangıç ile sonuç ayrılır.** “Başlangıç tahmini” ve “optimize sonuç”
farklı etiketlerle sunulmalıdır. Başlangıç tahmininin kötü olması normaldir ve
optimizasyonun ne kadar iyileştirdiğini gösterir.

KREAMET bu iki kuralı mimariye gömer: saklanan sonuçlar bir çözücü koşusunun
çıktısıdır, testler onları yeniden üretir, ve arayüz hangi tasarımın hangi
kaynaktan geldiğini rozetle gösterir.

## 45.6 Puanlama tanımı değişirse

Bir amaç terimi yeniden tanımlandığında, saklanan sonuçların kayıtlı `J`
değerleri **eskir**. Eski bir `J`, yeni bir `J` değil ama öyle görünür.

Doğru işlem: tasarım vektörlerine dokunmadan metrikleri güncel çözücüyle
yeniden ölçmek ve koşuların kaynak bilgisini korumak. KREAMET’te bu iş için
ayrı bir betik vardır ve en son uygulandığında kayıtlı amaç değeri en fazla
`2.0 × 10⁻³` kaydı.

## 45.7 Performans ölçümü

Sentez, çözücü hızına doğrudan bağlıdır. Ölçülen (bu uygulamada, tipik bir
tarayıcı/Node ortamında):

| İşlem | Süre |
|---|---|
| Tek karede konum çözümü (3 diyad) | ~5 µs |
| 720 kare tam tur | ~4 ms |
| Bir amaç değerlendirmesi (kaba, 180 kare) | ~8 ms |
| Bir amaç değerlendirmesi (ince, 720 kare) | ~30 ms |
| Yapıcı örnekleme (bir uygulanabilir birey, N=3) | ~1.6 ms |

`50 × 120 = 6000` değerlendirmelik bir DE koşusu, kaba örneklemede yaklaşık
`50 s` sürer. Yerel iyileştirme ince örneklemede çalıştığı için maliyeti
buna yakındır.

Bu sayılar, kapalı form çözümün neden mimari bir karar olduğunu gösterir:
Newton iterasyonu kullanan bir çözücü kare başına 5–20 kat daha yavaş olur ve
aynı arama günlerce sürerdi.

---

# 46. Sıkça sorulan sorular

## 46.1 “Mekanizmam simülasyonda çalışıyor ama gerçekte sıkışıyor.”

Sıklık sırasıyla sebepler:

1. **İletim açısı çok küçük.** Simülasyon sürtünmesizdir; gerçekte
   `tan(μ_etkin) < f` olduğunda mekanizma kendini kilitler. `μ_etkin`’in tur
   boyunca en küçük değerini kontrol edin.
2. **Aşırı kısıtlı montaj.** Formül `M = 1` verse bile, düzlem dışı hizalama
   hataları mekanizmayı sıkıştırır. Bir mafsalı S (küresel) yapmak veya bir
   boyunca boşluk bırakmak çözer.
3. **Katman çakışması.** İki gövde aynı düzlemde ve tur boyunca kesişiyor.
   Girişim analizini yapın; katman ataması gerekiyorsa uygulayın.
4. **Pim eğilmesi.** Uzun pimler yük altında eğilir ve delikte sıkışır.
   Pim çapını artırın veya açıklığı azaltın.

## 46.2 “Optimizasyon iyi bir eğri buluyor ama mekanizma tuhaf görünüyor.”

Amaç fonksiyonu, sizin umursadığınız her şeyi ölçmüyordur. Kontrol edin:

- Uzuv oranları ceza altında mı? (Çok uzun–çok kısa karışımı)
- Girişim ölçülüyor mu?
- İletim açısı yeterince ağırlıklı mı?
- Sınır kutusu (boyut) terimi var mı?

“Tuhaf görünmek” genellikle ölçülmeyen bir kısıtın ihlalidir.

## 46.3 “Optimizasyon takılıyor, `J` iyileşmiyor.”

- **Başlangıç popülasyonu geçersiz olabilir.** Rastgele örnekleme, çok kollu
  zincirlerde neredeyse hiç uygulanabilir birey vermez. Yapıcı örnekleme
  kullanın.
- **Ceza bandı düz olabilir.** Geçersiz bölgede sabit ceza varsa arama eğim
  göremez; ihlal miktarını cezaya ekleyin.
- **Onarım aşırı uygulanıyor olabilir.** Her bireyi onarmak çeşitliliği yok
  eder; yalnızca kurtarma olarak kullanın.
- **Ulaşılamaz referans.** Bir terim asla sıfırlanamıyorsa arama sürekli o
  terimi kovalar. Fiziksel tavanı hesaplayın.

## 46.4 “Kaç kol kullanmalıyım?”

Daha çok kol her zaman daha iyi değildir:

| Etki | Daha az kol | Daha çok kol |
|---|---|---|
| Eğri zenginliği | Sınırlı | Yüksek |
| Boşluk birikimi | Az | Çok |
| Sürtünme kaybı | Az | Çok |
| Montaj katmanı | Az | Çok |
| Maliyet | Düşük | Yüksek |
| Arama uzayı boyutu | Küçük (kolay) | Büyük (zor) |

Kural: hedef eğriyi kabul edilebilir hatayla çizen **en az** kol sayısını
kullanın. KREAMET’te ölçülen örnek: kalp yörüngesi için altı kol `55 mm` RMS
verirken sekiz kol `11.4 mm` verdi — sekiz gerekliydi. On kola çıkmak, arama
uzayını `15`’ten `19` boyuta taşır ve kazanç garanti değildir.

## 46.5 “Yörünge kapanmıyor.”

`|P(0) − P(2π)|` büyükse:

1. **Isınma turu yapıldı mı?** `θ=0`’ın süreklilik geçmişi yoksa farklı kolda
   çözülür.
2. **Tur ortasında dal değişti mi?** `assemblyJumps` sayacını kontrol edin.
3. **Bir kare çözülemedi mi?** Kısmi tur, kapanma hesabını anlamsız kılar.

Kapalı form çözümde ve doğru dal takibiyle bu değer `1e−14` mertebesinde
olmalıdır.

## 46.6 “Motorum yetmiyor.”

Momenti üç bileşene ayırın (Bölüm 28.1) ve hangisinin baskın olduğuna bakın:

- **Yerçekimi baskınsa:** karşı ağırlık veya yay dengeleme.
- **Atalet baskınsa (`M·θ̈`):** volan veya daha yumuşak hız profili.
- **`½M'θ̇²` baskınsa:** indirgenmiş atalet çok değişiyor; geometriyi
  düzeltmek veya hızı düşürmek gerekir. Volan bu terimi **azaltmaz**, yalnızca
  hız dalgalanmasını sınırlar.

## 46.7 “Hangi hata ölçüsünü kullanmalıyım?”

- Zamanlama önemliyse (belirli açıda belirli konum): **nokta-nokta**.
- Yalnızca şekil önemliyse: **simetrik Chamfer**.
- En kötü sapma kritikse: **Hausdorff** (raporlama için).
- Hızlı ön eleme gerekiyorsa: **Fourier tanımlayıcıları**.

Asla **tek yönlü Chamfer** kullanmayın: hedefin küçük bir bölümünü izleyen
mekanizmaya mükemmel skor verir.

## 46.8 “Grashof sağlanıyor ama krank dönmüyor.”

Grashof koşulu **bir** uzvun tam tur dönebileceğini söyler; **hangisinin**
döneceğini inversiyon belirler. En kısa uzuv şaseye komşu değilse, tam tur
dönen uzuv sizin girişiniz olmayabilir.

Kontrol: en kısa uzvu bulun, sabitlenen uzva göre tipi belirleyin (Bölüm 7.3).

## 46.9 “Kaç hassas nokta kullanabilirim?”

Serbest parametre sayısına bağlıdır. Dört çubuk yörünge sentezinde 9 parametre
vardır, dolayısıyla teorik sınır 9 noktadır; pratikte denklemler 5’ten sonra
çözülemeyecek kadar karmaşıklaşır.

Daha fazlası için optimizasyon tabanlı sentez kullanın; hassas nokta sınırı
ortadan kalkar.

## 46.10 “Simülasyon sonucuna ne kadar güvenebilirim?”

Doğrulama katmanlarının kaçının geçtiğine bağlı (Bölüm 45.2). Asgari olarak
şunlar ölçülmüş olmalıdır: tam tur, dal sürekliliği, çevrim kapanma, iletim
açısı, girişim, uzunluk bandı.

Bunlar geçse bile simülasyon; boşluk, esneklik, sürtünme ve tolerans
etkilerini içermez. Kritik uygulamalarda prototip zorunludur.

## 46.11 “Aynı eğriyi çizen birden çok mekanizma buldum, hangisi?”

Muhtemelen cognate’lerdir (Bölüm 18). Seçim ölçütleri:

- Şase pivotları montaj alanınıza sığıyor mu?
- Uzuv uzunlukları imalat bandında mı?
- İletim açısı hangisinde daha iyi?
- Girişim ve katman sayısı hangisinde daha az?
- Hangisi tolerans hatalarına daha az duyarlı?

Kinematik eşdeğerlik, pratik eşdeğerlik demek değildir.

## 46.12 “Kam mı, bağlantı kolu mu?”

Kesin duraklama veya keyfi hareket kanunu gerekiyorsa kam. Yüksek hız, uzun
ömür ve düşük imalat maliyeti gerekiyorsa bağlantı kolu. Bölüm 32.7’deki
tabloya bakın.

Ara çözüm: bağlantı kolu ile yaklaşık duraklama (altı çubuk), kam’ın aşınma
bedeli olmadan.

---

# 47. Sözlük

**Aktüatör** — Mekanizmaya hareket veren eleman; motor, silindir, servo.

**Ani dönme merkezi** — İki cismin göreli hareketinin o an saf dönme olarak
görüldüğü nokta. `I_ij`.

**Assur grubu** — Şaseye bağlandığında serbestlik derecesi sıfır olan, daha
küçüğe ayrılamayan zincir parçası. En küçüğü diyaddır.

**Basma açısı** — Kam mekanizmalarında, izleyici hareket doğrultusu ile temas
normali arasındaki açı. İletim açısının kam karşılığı.

**Bağımsız çevrim** — `L = j − n + 1`. Yazılması gereken bağımsız kapalılık
denklemi sayısı.

**Bistabil** — İki kararlı denge konumu olan mekanizma.

**Boşluk (backlash)** — Mafsalda pim ile delik arasındaki serbest hareket
miktarı. Konum belirsizliği üretir.

**Burmester eğrileri** — Dört konum sentezinde, eş çembersel noktaların
(çember noktası eğrisi) ve karşılık gelen merkezlerin (merkez noktası eğrisi)
yer eğrileri. Üçüncü dereceden.

**Chamfer mesafesi** — Bir eğrinin her noktasından diğer eğriye olan en kısa
mesafelerin karekök-ortalama-karesi. Simetrik biçimi iki yönde de ölçer.

**Cognate** — Aynı kavrayıcı eğrisini çizen farklı mekanizma. Roberts–Chebyshev
teoremine göre her dört çubuğun iki cognate’i vardır.

**Çevrim kapanma kalıntısı** — Kapalılık denklemlerinin sağlanmama miktarı.
Kapalı form çözümde bağımsız bir doğrulamadır.

**Dal (branch)** — Bir devre içinde, tekillik geçmeden ulaşılabilen
konfigürasyon bölgesi.

**Devre (circuit)** — Mekanizmayı sökmeden ulaşılabilen konfigürasyonlar
kümesi.

**Diyad** — İki uzuvlu, üç mafsallı Assur grubu. RRR, RRP, RPR, PRP, RPP.

**Duraklama (dwell)** — Giriş hareket ederken çıkışın sabit kaldığı aralık.

**Esnek mekanizma** — Hareketi malzemenin elastik şekil değiştirmesiyle üreten
mekanizma.

**Evolvent** — Bir çember üzerine sarılı gergin ipin ucunun çizdiği eğri.
Standart dişli profili.

**Freudenstein denklemi** — Dört çubuğun açı cinsinden kapalılık denklemi;
`K₁, K₂, K₃` katsayıları cinsinden lineerdir.

**Grashof koşulu** — `s + l ≤ p + q`. En az bir uzvun tam tur dönebilmesi
koşulu.

**Hassas nokta** — Sentezde mekanizmanın tam olarak geçmesi istenen nokta.

**Hausdorff mesafesi** — İki küme arasındaki en büyük en-yakın-nokta mesafesi.
En kötü durum ölçüsü.

**İletim açısı (`μ`)** — Kavrayıcı ile çıkış uzvu arasındaki açı. Kuvvet
iletim verimini ölçer. `90°` ideal.

**İndirgenmiş atalet (`M(θ)`)** — Mekanizmanın tamamının motor milinde görülen
eşdeğer atalet momenti. Konuma bağlıdır.

**İnversiyon** — Aynı kinematik zincirin farklı bir uzvunu şase yapmak.

**İzomorfizm** — İki zincirin etiketleme dışında aynı olması.

**Jakobiyen** — Kısıt denklemlerinin bilinmeyenlere göre kısmi türev matrisi
`∂F/∂q`. Tekillikler determinantının sıfırlandığı yerlerdir.

**Kavrayıcı (coupler)** — İki hareketli uzvu bağlayan, genel düzlemsel hareket
yapan uzuv.

**Kavrayıcı eğrisi** — Kavrayıcı üzerindeki bir noktanın çizdiği yörünge.
Dört çubukta genel olarak altıncı dereceden.

**Kennedy teoremi** — Üç cismin üç ani dönme merkezi eş doğrusaldır.

**Kinematik çift** — İki uzvu bağlayan ve göreli hareketi kısıtlayan eleman.

**Kutup (pole)** — İki düzlem konumu arasındaki geçişin saf dönme merkezi.

**Mekanik avantaj** — Çıkış kuvvetinin giriş kuvvetine oranı. Konuma bağlıdır.

**Mobilite / serbestlik derecesi (`M`)** — Konumu tam belirlemek için gereken
bağımsız değişken sayısı.

**Montaj modu** — Aynı uzunluklarla mümkün farklı geometrik konfigürasyon.

**Ölü nokta** — Girişin çıkışa hareket iletemediği konum. `μ = 0°` veya `180°`.

**Pasif serbestlik** — Çıkışı etkilemeyen göreli hareket. Örneğin RSSR’de
bağlantı çubuğunun kendi ekseni etrafındaki dönmesi.

**Procrustes hizalama** — İki nokta kümesini en iyi örtüştüren dönüşüm.
**Katı** biçim yalnızca dönme ve öteleme içerir; ölçekleme içermez.

**Sarsıntı kuvveti (shaking force)** — Hareketli kütlelerin şaseye aktardığı
net atalet kuvveti.

**Sızdırma / kendini kilitleme** — Sürtünmenin, uygulanan kuvvete rağmen
hareketi engellemesi.

**Tekillik** — `det(J) = 0` olan konfigürasyon. Mekanizma anlık olarak
serbestlik kazanır veya kaybeder.

**Tekil değer (`σ`)** — `JᵀJ` matrisinin özdeğerlerinin karekökü. `σ_min`
tekilliğe yakınlığı ölçer.

**Üst çift** — Çizgi veya nokta temaslı kinematik çift. Kam, dişli.

**Vida teorisi** — Uzaysal kinematiğin, anlık hareketi dönme+öteleme
vidalarıyla tanımlayan dili.

**Virtüel iş** — Sanal yer değiştirmelerde yapılan iş. Mafsal kuvvetlerini
hesaplamadan giriş momentini verir.

**Yapıcı örnekleme** — Mekanizmayı diyad diyad, her adımda uygunluğu koruyarak
kurmak.

**Yapısal hata** — Hassas noktalar arasında kalan sapma.

**Zaman oranı (`Q`)** — İleri ve geri strok sürelerinin oranı. `Q > 1` hızlı
geri dönüş.

**Alt çift** — Yüzey temaslı kinematik çift. R, P, H, C, S, F.

**Ankastre** — Bir ucu tam sabitlenmiş kiriş; esnek mekanizma modellemesinde
temel eleman.

**Atlas** — Uzuv oranları taranarak üretilmiş kavrayıcı eğrisi kataloğu.

**Değişmez (invariant)** — Fizik gereği her karede doğru olması gereken ilişki;
doğrulamanın en güvenilir biçimi.

**Diz eklemi (toggle)** — İki uzvun hizaya yaklaştığı, mekanik avantajın
patladığı konum.

**Homotopi** — Kolay bir denklem sisteminden zor olana sürekli deformasyonla
geçerek tüm çözümleri bulan sayısal yöntem.

**Jerk** — İvmenin zamana göre türevi. Kam tasarımında süreksizliği titreşim
üretir.

**Kademeli örnekleme** — Optimizasyon ilerledikçe örnek yoğunluğunu artırma.

**Kavrama oranı (`ε`)** — Dişlide aynı anda temasta olan diş çifti sayısının
ortalaması. `ε > 1` zorunlu.

**Kromatik sayı** — Bir grafın uygun renklendirilmesi için gereken en az renk
sayısı. Montaj katmanı sayısına karşılık gelir.

**Lamarck onarımı** — Evrimsel algoritmada, geçersiz bireyi uygun bölgeye
projekte etme. Kurtarma olarak kullanılmalıdır.

**Minimax** — En büyük hatayı en aza indiren yaklaşım. Chebyshev nokta
dağılımının hedefi.

**Modül (`m`)** — Dişlide bölüm dairesi çapının diş sayısına oranı; `mm`.

**Pareto cephesi** — Çok amaçlı optimizasyonda, bir amacı iyileştirmeden
diğerini kötüleştirmeyen çözümler kümesi.

**PRBM** — Sözde-rijit gövde modeli. Esnek elemanı döner mafsal + burulma yayı
ile temsil eder.

**Sextic** — Altıncı dereceden cebirsel eğri. Dört çubuk kavrayıcı eğrisinin
genel derecesi.

**Sıfır boy yayı** — Uzamamış boyu sıfır olan (ideal) yay. Tam yerçekimi
dengelemesini mümkün kılar.

**Twist / Wrench** — Vida teorisinde anlık hız ve kuvvet-moment vidaları.

**Uzamsal indeks** — Nokta sorgularını hızlandıran veri yapısı; ızgara veya
KD-ağacı.

**Yapıcı örnekleme** — Bkz. yukarıda; mekanizmayı adım adım uygun kalarak
kurma.

**Yığın kalınlığı** — Katmanlı montajda toplam düzlem dışı kalınlık.

**Yorulma** — Tekrarlı yükleme altında malzemenin, akma sınırının altında
kırılması. Esnek mekanizmaların ömür sınırı.

## 47.2 Kısaltmalar

| Kısaltma | Açılım |
|---|---|
| CV | Constant Velocity (sabit hız mafsalı) |
| CMA-ES | Covariance Matrix Adaptation Evolution Strategy |
| DE | Differential Evolution (Diferansiyel Evrim) |
| DH | Denavit–Hartenberg |
| DOF | Degrees of Freedom (serbestlik derecesi) |
| FDM | Fused Deposition Modeling (eriyik yığma 3B baskı) |
| MEMS | Micro-Electro-Mechanical Systems |
| PRBM | Pseudo-Rigid-Body Model |
| RMS | Root Mean Square (karekök ortalama kare) |
| RSS | Root Sum Square (istatistiksel tolerans toplamı) |
| SLA | Stereolithography (reçine 3B baskı) |

---

# 48. Semboller ve birimler

## 48.1 Geometri

| Sembol | Anlam | Birim |
|---|---|---|
| `a, b, c, d` | Dört çubuk uzuv uzunlukları | mm |
| `n` | Uzuv sayısı (şase dahil) | — |
| `j`, `j₁`, `j₂` | Mafsal sayısı; 1 ve 2 serbestlikli | — |
| `L` | Bağımsız çevrim sayısı | — |
| `M` | Serbestlik derecesi (mobilite) | — |
| `N` | Diyad sayısı | — |
| `r, α` | Üçlü gövdedeki üçüncü noktanın kutupsal koordinatı | mm, ° |
| `s, l, p, q` | En kısa, en uzun, diğer iki uzuv | mm |
| `w` | Kol genişliği (girişim testi) | mm |

## 48.2 Kinematik

| Sembol | Anlam | Birim |
|---|---|---|
| `θ`, `θ₂` | Giriş (motor) açısı | rad veya ° |
| `θ₃, θ₄` | Kavrayıcı ve çıkış açıları | rad |
| `φ` | Gövde yönelim açısı | rad |
| `ω` | Açısal hız | rad/s |
| `α` | Açısal ivme | rad/s² |
| `v` | Doğrusal hız | mm/s veya m/s |
| `a_c` | Ağırlık merkezi ivmesi | m/s² |
| `μ` | İletim açısı | ° |
| `I_ij` | Ani dönme merkezi | — |
| `J` | Kısıt Jakobiyeni `∂F/∂q` | — |
| `σ_min` | En küçük tekil değer | — |
| `κ` | Koşullanma sayısı `σ_max/σ_min` | — |

## 48.3 Dinamik

| Sembol | Anlam | Birim |
|---|---|---|
| `m` | Kütle | kg |
| `ρ_çizgi` | Çizgisel yoğunluk | kg/mm |
| `I_c` | Ağırlık merkezi etrafında atalet momenti | kg·m² |
| `M(θ)` | İndirgenmiş (efektif) atalet | kg·m² |
| `U` | Potansiyel enerji | J |
| `T` | Kinetik enerji | J |
| `τ`, `Q` | Moment / genelleştirilmiş kuvvet | N·m |
| `g` | Yerçekimi ivmesi, `(0, −9.80665)` | m/s² |
| `C_s` | Hız dalgalanma katsayısı | — |
| `η` | Verim | — |
| `μ_s` | Sürtünme katsayısı | — |

## 48.4 Sentez

| Sembol | Anlam | Birim |
|---|---|---|
| `J` | Amaç fonksiyonu değeri | — |
| `w₁…w₇` | Amaç terim ağırlıkları | — |
| `E_eğri` | Chamfer RMS hatası | mm |
| `E_boyut` | Bağıl sınır kutusu hatası | — |
| `P, Q` | Karşılaştırılan eğrilerin nokta kümeleri | mm |
| `F` | DE ölçek faktörü | — |
| `CR` | DE çaprazlama oranı | — |
| `K₁, K₂, K₃` | Freudenstein katsayıları | — |

## 48.5 Birim dönüşümleri

```
1 mm       = 1e−3 m
1 mm/s     = 1e−3 m/s
1 g        = 1e−3 kg
1 rpm      = 2π/60 = 0.10472 rad/s
1 N·mm     = 1e−3 N·m
1 kg·mm²   = 1e−6 kg·m²
1 derece   = π/180 = 0.017453 rad
```

**Kural:** geometri ve arayüz milimetre; dinamik hesapların tamamı SI. Dönüşüm
tek bir modülden geçmelidir.

---

# 49. Kaynakça ve ileri okuma

## 49.1 Temel ders kitapları

- **Norton, R. L.** — *Design of Machinery.* Uygulamaya dönük, bol örnekli;
  dört çubuk, kam ve dişli için ilk başvuru.
- **Uicker, Pennock, Shigley** — *Theory of Machines and Mechanisms.* Klasik;
  ani merkez, hız/ivme analizi ve dinamik için ayrıntılı.
- **Erdman, Sandor, Kota** — *Mechanism Design: Analysis and Synthesis.*
  Sentez ağırlıklı; Burmester teorisi ve hassas nokta yöntemleri.
- **Hartenberg & Denavit** — *Kinematic Synthesis of Linkages.* Tarihî ve
  kuramsal derinlik; DH gösteriminin kaynağı.
- **Söylemez, E.** — *Mekanizma Tekniği.* Türkçe temel kaynak; ODTÜ.

## 49.2 İleri konular

- **McCarthy & Soh** — *Geometric Design of Linkages.* Modern cebirsel sentez.
- **Angeles** — *Fundamentals of Robotic Mechanical Systems.* Jakobiyen,
  tekillik ve paralel mekanizmalar.
- **Merlet** — *Parallel Robots.* Paralel mekanizmaların standart referansı.
- **Howell** — *Compliant Mechanisms.* PRBM yönteminin kaynağı.
- **Davidson & Hunt** — *Robots and Screw Theory.* Vida teorisi.
- **Tsai** — *Mechanism Design: Enumeration of Kinematic Structures.* Yapısal
  sentez ve izomorfizm.

## 49.3 Atlas ve katalog

- **Hrones & Nelson** — *Analysis of the Four-Bar Linkage* (1951). Yaklaşık
  7000 kavrayıcı eğrisi.
- **Artobolevsky** — *Mechanisms in Modern Engineering Design*, 5 cilt.
  Binlerce mekanizma şeması.

## 49.4 Sayısal yöntemler

- **Storn & Price** — *Differential Evolution* (1997). DE’nin özgün makalesi.
- **Hansen** — *The CMA Evolution Strategy: A Tutorial.*
- **Nocedal & Wright** — *Numerical Optimization.* Nelder–Mead, BFGS,
  kısıt işleme.
- **Golub & Van Loan** — *Matrix Computations.* Tekil değer ayrışımı, Jacobi
  yöntemi.
- **Sommese & Wampler** — *The Numerical Solution of Systems of Polynomials.*
  Homotopi süreklilik yöntemleri.

## 49.5 Eğri karşılaştırma

- **Umeyama, S.** — *Least-Squares Estimation of Transformation Parameters.*
  Procrustes probleminin kapalı form çözümü.
- **Borgefors, G.** — *Hierarchical Chamfer Matching.* Chamfer mesafesinin
  kaynağı.
- **Ullah & Kota** — *Optimal Synthesis of Mechanisms for Path Generation Using
  Fourier Descriptors.* Fourier tabanlı eğri eşleştirme.

## 49.6 Bu belgenin sınırları

Burada verilenler mühendislik uygulaması içindir ve şu alanlar kapsam dışıdır:

- Sonlu elemanlar ile gerilme analizi.
- Yağlama teorisi ve triboloji ayrıntısı.
- Kontrol teorisi (servo tahrikli mekanizmalar).
- Malzeme bilimi ve yorulma ömrü hesabı ayrıntısı.
- Uzaysal mekanizmaların tam cebirsel sentezi.

Kritik uygulamalarda, bu belgedeki yöntemlerle üretilen bir tasarım mutlaka
detay mühendislik doğrulamasından geçmelidir. Bir mekanizmanın kinematik olarak
geçerli olması, imal edilebilir ve dayanıklı olduğunu göstermez.

---

*Bu referans KREAMET ile birlikte gelir ve uygulamanın kullandığı yöntemlerin
tamamının kuramsal dayanağını verir. Uygulamada raporlanan her sayı, bu
belgede tanımlanan ölçütlere göre hesaplanır.*
