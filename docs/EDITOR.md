# In-Game Editor — kullanım ve alan eşlemesi

Football Manager'ın **In-Game Editor** ekranlarının World Soccer Champs verisiyle çalışan muadili.
Bağımlılık yok: `index.html`, `data.js`, `app.js`, `detect.js`, `styles.css`, `demo-save.json`.

```bash
cd sandbox-editor && python3 -m http.server 8080     # → http://localhost:8080
```

## Ekranlar

| Sekme | FM karşılığı | Düzenlenebilen alanlar |
|---|---|---|
| Genel Bakış | Club Overview | doğrulama uyarıları, son düzenlemeler |
| Kulüp | Edit Club | ad/statü, **itibar 1–10.000**, stadyum/kapasite, **tesisler 1–20**, finans, bağlantılı kulüpler, rakipler, efsaneler |
| Oyuncular | Edit Player | 7 alt sekme (aşağıda) |
| Personel | Edit Staff | CA/PA, itibar, 7 nitelik, diziliş/tarz, sorumluluklar |
| Finans | Edit Club Finances | bütçeler, maaş yükü, sezon projeksiyonu |
| Müsabakalar | Edit Competition | seviye, itibar, takım sayısı, ödül havuzu, tur ödülü |
| **Maç Kuralları** | Match Rules | **ofsayt, penaltı, taç, korner, faul** + 4 hazır kural profili + maç motoru tahmini |
| **Maaşlar** | Contract / Finances | **adil ücret, primler, vergi, bütçe kullanımı**, 25 satırlık ücret tablosu |
| Sandbox | — | 8 toplu işlem |
| Tercihler | Preferences | renk, otomatik kayıt, içe/dışa aktarma, kısayollar |
| **Serbest JSON** | — | **Gerçek kayıt dosyası için ağaç editörü**: her düğümü aç/kapat, değer düzenle, diziye öğe ekle/sil, alan/değer ara |

### Oyuncu alt sekmeleri

| Alt sekme | İçerik |
|---|---|
| **Profil** | kimlik, **CA / PA (1–200)**, itibar (mevcut/ülke/dünya), **12 pozisyon × 0–20**, kayıt durumu, forma no, yetişme durumu |
| **Nitelikler** | **47 nitelik, 1–20** (Teknik 14 · Zihinsel 14 · Fiziksel 8 · Kaleci 11), FM renk skalası, grup başına **maks / ortala** |
| **Sözleşme** | tür, bitiş, haftalık ücret, imza bonusu, serbest kalma maddesi, transfer durumu, **+3 yıl uzat** |
| **Kişisel** | moral, kondisyon, yorgunluk, keskinlik, kişilik, medya |
| **Özellikler** | 24 FM "Player Trait" (PPM) — çoklu seçim |
| **Disiplin** | sarı/kırmızı kart, maç cezası, para cezası, sakatlık türü/süresi, **sakatlığı bitir** |
| **İlişkiler** | sevdiği/sevmediği kulüpler, sevdiği kişiler (ekle/kaldır) |

## Maç kuralları

Beş kural ailesi, her biri açma/kapama anahtarıyla birlikte düzenlenebilir. Tüm alanlar
`rules.*` altında saklanır ve oyun kaydına dışa aktarılır.

| Kural | Alanlar |
|---|---|
| **Ofsayt** | tolerans (cm), geçerli bölge (tüm saha / hücum yarısı / ceza sahası), VAR incelemesi, yarı otomatik ofsayt, pasif ofsayt |
| **Penaltı** | mesafe (9–13 m), VAR incelemesi, kalecinin erken çıkışına izin, ihlalde tekrar, uzatmada seri penaltı |
| **Taç** | kullanma süresi (1–15 sn), taç noktası kaydırma, otomatik karar, uzun taç asisti |
| **Korner** | yay mesafesi (25–200 cm), organizasyon (karışık/ön direk/arka direk/kısa/yay), kısa korner, kale çizgisi VAR |
| **Faul** | temas sertliği (yumuşak/normal/sert), faul eşiği, sarı limiti, doğrudan kırmızı, avantaj, simülasyon cezası |

### Maç motoru

Kurallar **tahmini maç olaylarını** üretir (bizim takım, maç başına): gol, penaltıdan gol,
penaltı kararı, ofsayt, korner, taç, faul, sarı ve kırmızı kart. Hesap kadronun ortalama
niteliklerine dayanır — agresiflik ve temas sertliği faulü, karar verme sarı kartı, hız/pas
ofsaytı, teknik korneri, bitiricilik ve CA gol beklentisini belirler. Penaltı mesafesi
dönüşüm yüzdesini değiştirir (`%78 − (mesafe − 11) × 4.2`).

### Hazır profiller

`FIFA Standart` · `VAR Sıkı` · `Ofsaytsız (Sokak)` · `Sert Lig` — her biri tek bir toplu
düzenleme olarak uygulanır, inceleme çekmecesinden tek tıkla geri alınır.

## Maaş sistemi

| Bölüm | İçerik |
|---|---|
| Üst kartlar | haftalık maaş (bütçe yüzdesi), yıllık maaş, prim yükü, vergi, ortalama ücret |
| Maaş ayarları | gelir vergisi %0–60, maç başı / gol / gol yememe / sadakat prim oranları, asgari–azami ücret, yıllık zam, yenileme yılı |
| Toplu işlemler | **piyasa ücretine çek**, **bütçeye sığdır**, primleri yeniden hesapla, ±%10, asgariye tamamla, sözleşme yenile |
| Ücret tablosu | oyuncu, pozisyon, yaş, CA, haftalık ücret (stepper), **adil ücret**, fark %, durum rozeti, prim, yıllık maliyet, pay % |

**Adil ücret** = piyasa değeri ÷ 474 × CA düzeltmesi (`0,82 + CA/200 × 0,36`) × yaş düzeltmesi
(≤21 yaş +%5, 31–32 yaş −%7, 33+ −%12). Durum rozetleri: **Uygun** (±%15), **Yüksek** (>%15),
**Çok yüksek** (>%100), **Düşük** (<−%15).

Prim yükü beklentiden hesaplanır: 26 maç × maç başı prim + pozisyona göre gol beklentisi × gol
primi + kaleci/stoperler için 10 maç gol yememe primi. Vergi, işveren maliyetine eklenir ve
`vergi oranı` değiştiğinde yıllık maliyet anında güncellenir.

## Düzenleme modeli (FM davranışı)

1. Her alan değişikliği yol tabanlı bir **patch** olarak sahnelenir (`players.12.attributes.Bitiricilik`).
2. Sağ üstteki sayaç / `Ctrl+R` **inceleme çekmecesini** açar: her patch eski → yeni değeriyle listelenir.
3. Patch'ler tek tek ya da **Tümünü Geri Al** ile geri alınır (`Ctrl+Z` son patch).
4. **Değişiklikleri Kaydet** (`Ctrl+S`) baseline'ı günceller; kaydedilmemişken sekme kapatılırsa uyarı çıkar.
5. Toplu işlemler tek bir "structural" kayıt olarak sahnelenir; geri alındığında anlık görüntü geri yüklenir.
   (Bu yüzden bir toplu işlem varken ondan **önceki** tekil patch'ler kilitlenir — önce toplu işlemi geri al.)

## Doğrulama

Genel Bakış ve durum çubuğunda sürekli çalışır:

- `CA > PA` → **hata**
- sözleşme bitişi oyun tarihinden önce → uyarı
- maaş yükü > maaş bütçesi → uyarı
- negatif bakiye, kalecisiz kadro, yinelenen forma numarası, düşük kondisyon → uyarı/bilgi
- **kural tutarlılığı**: penaltı mesafesi 9–13 m dışında → hata; faul kapalıyken penaltı açık → uyarı;
  ofsayt kapalı / geniş tolerans / düşük sarı limiti → bilgi
- **maaş**: bütçe aşımı → hata, %85 üzeri → uyarı, asgari ücret altı oyuncular → uyarı,
  adil ücretin 2 katından fazla kazanan → bilgi

Her uyarının yanındaki **Git** düğmesi ilgili oyuncuya/ekrana atlar.

## Komut paleti

Üstteki arama kutusuna yaz: oyuncu/personel/müsabaka adı veya bölüm adı. `↑/↓` ile gez, `Enter` ile git.
Boşken hızlı komutlar (Kaydet, Bekleyen değişiklikler, **maaşları piyasa ücretine çek**,
**bütçeye sığdır**, **kural profili: VAR Sıkı**, bölümler) listelenir.

## Serbest JSON (gerçek kayıtlar)

Gerçek oyun kaydı içe alındığında alan adları tanınmasa bile **Serbest JSON** sekmesinden her değer
düzenlenebilir. Bu ağaç görünümü, REA analizinden çıkan alan adları doğrulanana kadar köprü görevi görür:

- dal aç/kapat, **Tümünü aç / Kapat**
- alan veya değer araması (örn. `wage`, `0.5`)
- sayı/metin/boolean düzenleme, **diziye öğe ekle**, **öğe sil**
- tüm değişiklikler aynı inceleme çekmecesinde ve aynı geri al yığınında

## Şema algılama + İçe Alma Raporu

`detect.js` (`window.WSC_DETECT.detect(json)`) her içe alınan dosyayı FM şemasına göre tarar:

1. **Aday toplama** — diziler ve nesneler 8 seviye derinliğe kadar gezilir.
2. **Alan eşleme** — `ALIASES` tablosu (`name`/`age`/`position`/`ability`/`potential`/`value`/`wage`
   ve `finance`/`clubMeta` varyantları) üzerinden her adayın kaç FM alanı tanıdığı sayılır.
3. **Güven yüzdesi** — tanınan alan oranı + kayıt sayısı; `players`, `staff`, `finances`, `club`
   bölümleri ayrı ayrı raporlanır (`yüksek ≥ %70`, `orta ≥ %40`, `düşük < %40`).
4. **Rapor** — modal: bölüm kartları, alan çipleri, tanınmayan üst düzey anahtarlar, "Ham JSON'u Aç".

Rapor kapandığında:

| Durum | Sonuç |
|---|---|
| FM şeması (`players[]` var) | Tüm sekmeler normal çalışır |
| **Yabancı şema** | `S.foreign = true` → yalnızca **Serbest JSON**; diğer sekmelerde bilgi kartı, doğrulama atlanır |

`window.WSC_IMPORT_JSON(json)` APK'daki dosya seçicisinden gelen veriyi aynı yoldan geçirir.

## Gelişmiş arama

Oyuncular listesinde ⚙ düğmesi: yaş, CA, PA aralıkları, ayak, yetişme durumu, sözleşme bitiş yılı.
`↑ / ↓` ile listede gezinilir, `Ctrl+F` aramaya odaklanır.

## Mobil (APK)

`720px` altında bölüm sekmeleri yatay kaydırılır, altta **Geri Al / Bekleyen / Kaydet** aksiyon çubuğu
görünür, stepper düğmeleri 30×30'a büyür. Uygulama olarak: [`APK.md`](APK.md)

## Gerçek veriyle kullanım

Editör demo kayıtla açılır. Gerçek kaydı yüklemek için:
**Tercihler → JSON İçe Al** → kayıt dosyasını seç.

- **FM şeması tanınırsa** (rapor "Oyuncular · yüksek" derse) tüm sekmeler doğrudan çalışır.
- **Şema farklıysa** rapor hangi dizide ne bulduğunu gösterir; editör yabancı moda geçip yalnızca
  Serbest JSON'u açar. Alan adlarını kalıcı eşlemek için `detect.js` içindeki `ALIASES` tablosuna
  ekleme yapılabilir (alan adları REA analizinden geliyor: `docs/REA-ANALYSIS.md` §4).

Dışa aktarılan JSON `tools/wsc-save.sh push` ile cihaza geri yazılabilir (root/emülatör).
