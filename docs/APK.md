# Android APK — WSC In-Game Editor

Editörün telefonda kurulabilir sürümü. Tamamen çevrimdışı, oyun dosyalarına dokunmaz.

## İndir

**https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/editor-apk/wsc-editor.apk**

| | |
|---|---|
| Sürüm | 1.3 (versionCode 4) |
| Boyut | 87.446 bayt (~85 KB) |
| SHA-256 | `e3f147c672d52e960be7fd540a0ebf3ce100604e9e250a9a73dd10b85201d33a` |
| Paket | `com.wsc.editor` |
| minSdk / targetSdk | 24 (Android 7+) / 34 |
| İmza | APK Signature Scheme v3, `CN=WSC In-Game Editor` |
| İkon | 5 yoğunluk (mdpi→xxxhdpi) |
| İçerik | `classes.dex`, `assets/{index.html,app.js,detect.js,data.js,styles.css,demo-save.json,demo-save.js}` |
| Doğrulama | `apk/APK-VERIFY.txt` — paket, launcher, SDK, dex, 7 varlık, imza, hizalama: **hepsi ✓** |

## Kurulum

1. APK'yı telefona indir.
2. Ayarlar → Güvenlik → **Bilinmeyen kaynaklara izin ver** (dosya yöneticisi/tarayıcı için).
3. APK'ya dokun → Kur → Aç.
4. Play Protect "bilinmeyen geliştirici" uyarısı verirse **Yine de kur**.

> İmza kendi anahtarımızla (build sırasında üretilen `apk/keystore.jks`) yapılır.
> Play Store sürümü olmadığı için Play Protect uyarısı normaldir.

## APK'yı nasıl çalışıyor?

```
MainActivity (WebView)
   └── http://127.0.0.1:<rastgele port>/  ← MiniServer (APK içindeki assets'i servis eder)
         └── index.html → app.js → data.js   (In-Game Editor arayüzü)
   └── WSCAndroid köprüsü (JavascriptInterface)
         ├── exportFile(name, json) → ACTION_CREATE_DOCUMENT (sistem dosya seçici)
         └── importFile()          → ACTION_OPEN_DOCUMENT → WSC_IMPORT_JSON(...)
```

**Neden yerel HTTP sunucusu?** WebView'de `file://` origin'i `fetch()` ve `localStorage`'ı kısıtlar.
`127.0.0.1` üzerinden servis edince editör normal bir web uygulaması gibi çalışır (kayıtlar
`localStorage`'da kalır, `demo-save.json` sorunsuz yüklenir). Sunucu yalnızca loopback'e bağlanır,
ağ izni istemez.

**Çift yedek:** `demo-save.js` dosyası demo kaydını `window.__DEMO_SAVE__` olarak gömer; sunucu
açılamazsa (çok nadir) `file://` moduna düşer ve editör yine açılır.

## Kayıt dosyası aktarımı

- **Dışa Aktar** → Android dosya seçici açılır → `İndirilenler` klasörüne `.json` yazar.
- **İçe Al** → dosya seçici → JSON okunur, `WSC_IMPORT_JSON()` ile arayüze aktarılır.

Bu JSON daha sonra `tools/wsc-save.sh push` ile (root/emülatör) cihazdaki oyuna geri yazılabilir.

### Maç kuralları ve maaş sistemi (v1.3)

| Sekme | Ne yapar |
|---|---|
| **Maç Kuralları** | ofsayt (tolerans, bölge, VAR, yarı otomatik, pasif), penaltı (9–13 m, VAR, kaleci erken çıkışı, tekrar), taç (süre, kaydırma, otomatik), korner (yay, organizasyon, kısa korner, kale çizgisi VAR), faul (temas sertliği, eşik, sarı limiti, doğrudan kırmızı, avantaj, simülasyon) + 4 hazır profil + **maç motoru** tahmini |
| **Maaşlar** | haftalık/yıllık yük, prim yükü, vergi, bütçe kullanımı, **adil ücret** hesabı, 25 satırlık ücret tablosu, fark %, durum rozeti, toplu işlemler (piyasa ücretine çek / bütçeye sığdır / ±%10 / prim / yenile) |

Oyunun kaydına `rules.*` ve `salary.*` blokları eklenir; eski kayıtlarda otomatik tamamlanır.

### Şema algılama (v1.2)

İçe alınan **her** JSON önce `assets/detect.js` ile taranır: oyuncu/staff/finans/kulüp dizileri ve
alan adları FM şemasına göre tahmin edilir, her bölüm için **güven yüzdesi** hesaplanır. Sonuç bir
**İçe Alma Raporu** penceresinde gösterilir:

| Durum | Davranış |
|---|---|
| FM şeması (`players[]` bulundu) | Tüm sekmeler açık; CA/PA, 47 nitelik, doğrulama ve sandbox çalışır |
| Yabancı şema | Yalnızca **Serbest JSON** ağaç editörü; üst veri sekmeleri kilitli, doğrulama atlanır (yanlış alarm üretmez) |

Rapor, tanınmayan üst düzey anahtarları da listeler; böylece kayıt dosyasının yapısı hakkında
tahmin yürütmeden gerçek alan adlarıyla çalışılır. `Üst veri sekmeleri kapalı · Serbest JSON`
satırındaki bağlantı ağacı arar ve ilgili diziye odaklanır.

## Derleme

Yerelde:

```bash
export ANDROID_SDK_ROOT=/yol/android-sdk
bash apk/build.sh          # → apk/out/wsc-editor.apk (+ .sha256)
```

Gereksinimler: JDK 17, Android SDK (build-tools + platforms/android-34). Gradle **kullanılmaz**;
`javac → d8 → aapt2 → zipalign → apksigner` zinciri doğrudan çalışır (~10 saniye).

CI: `.github/workflows/build-apk.yml` her `apk/**` veya `sandbox-editor/**` değişikliğinde derler,
imzalar, artifact + release asset olarak yayınlar ve `apk/APK-MANIFEST.txt` dosyasını commit eder.

## Otomatik kurulabilirlik doğrulaması

`apk/verify-apk.sh` her derlemeden sonra çalışır ve `apk/APK-VERIFY.txt` dosyasını üretir:

| Kontrol | Araç |
|---|---|
| Paket kimliği, launcher activity, minSdk/targetSdk, etiket, ikon | `aapt2 dump badging` |
| `MainActivity`, `MiniServer`, `MainActivity$Bridge` sınıfları | `dexdump` |
| 7 gömülü varlık + `classes.dex` (detect.js dahil) | `unzip -l` |
| Sertifika ve imza | `apksigner verify --print-certs` |
| 4 bayt hizalama | `zipalign -c -p 4` |
| Native kod yok (tüm ABİ'lerde çalışır) | badging `native-code` yok |

Son koşu: **"SONUÇ: APK kurulabilir görünüyor (tüm kontroller geçti)"**

## Kalite kapısı

CI her derlemede önce iki test paketi çalıştırır; geçmeden APK yayınlanmaz:

| Paket | İddia | Kapsam |
|---|---|---|
| `tests/detect-test.mjs` | **19** | şema algılama: oyuncu/staff/finans/kulüp tanıma, güven yüzdeleri, yabancı şema, tanınmayan anahtarlar |
| `tests/editor-smoke.mjs` | **89** (jsdom) | tüm sekmeler, 7 oyuncu alt sekmesi, kontrol yolu geçerliliği, sahneleme→inceleme→geri al→kaydet, toplu işlemler, serbest JSON ağacı, komut paleti, gelişmiş filtre, doğrulama, mobil çubuk, içe alma raporu, **maç kuralları + maç motoru**, **maaş tablosu + toplu maaş işlemleri** |

## Bilinen sınırlar

- **Fiziksel cihazda açılış testi yapılmadı** (bu ortamda Android cihaz/emülatör yok).
  Ancak kurulabilirlik statik olarak kanıtlandı (`APK-VERIFY.txt`): paket, launcher, dex sınıfları,
  varlıklar, imza ve hizalama tam. İlk açılışta sorun olursa Logcat çıktısı ile bildir.
- APK, **oyunun kendisini içermez**: ayrı bir uygulamadır, oyunun belleğine erişemez (root'suz
  Android'de başka uygulamanın belleğine erişim mümkün değildir).
- Oyun içi (overlay) mod menü için root + Frida gerekir → [`../modmenu/README.md`](../modmenu/README.md)
