# Android APK — WSC In-Game Editor

Editörün telefonda kurulabilir sürümü. Tamamen çevrimdışı, oyun dosyalarına dokunmaz.

## İndir

**https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/editor-apk/wsc-editor.apk**

| | |
|---|---|
| Boyut | 66.474 bayt (65 KB) |
| SHA-256 | `ab374eff2990dca29e58f70f86b5a0cc9efe03fe4bde1e36a3c928f6acd45d3d` |
| Paket | `com.wsc.editor` |
| minSdk / targetSdk | 24 (Android 7+) / 34 |
| İmza | APK Signature Scheme v3, `CN=WSC In-Game Editor` |
| İçerik | `classes.dex`, `assets/{index.html,app.js,data.js,styles.css,demo-save.json,demo-save.js}` |

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

## Bilinen sınırlar

- **Cihazda kurulum testi yapılmadı** (bu ortamda Android cihaz/emülatör yok). Derleme, imza ve
  paket içeriği doğrulandı; ilk açılışta sorun olursa `apk/last-build.log` + ekran görüntüsü ile bildir.
- APK, **oyunun kendisini içermez**: ayrı bir uygulamadır, oyunun belleğine erişemez (root'suz
  Android'de başka uygulamanın belleğine erişim mümkün değildir).
- Oyun içi (overlay) mod menü için root + Frida gerekir → [`../modmenu/README.md`](../modmenu/README.md)
