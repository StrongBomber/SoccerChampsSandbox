# BitLife APK hattı — Drive → GitHub → modlanmış APK

Bu belge, `/home/user/SoccerChampsSandbox` deposundaki `.github/workflows/bitlife-apk.yml`
hattının ne yaptığını, gerçek BitLife APK'sında ne bulduğunu ve yayınlanan APK'nın
tam olarak neyi değiştirdiğini anlatır. Hepsi gerçek dosyalarla, gerçek runner'da
çalıştırıldı; sayılar `apk-analiz/` altındaki raporlardan alınmıştır.

## 1. Hat ne yapıyor?

| # | Adım | Sonuç |
|---|---|---|
| 1 | Araçlar | apktool (apt, yoksa GitHub jar), build-tools PATH'e eklenir |
| 2 | Drive'dan indir | 141.483.685 bayt, `PK` imzası doğrulanır, sha256 alınır |
| 3 | XAPK/APKS ayrımı | Dosya tek parça APK çıktı, base = kendisi |
| 4 | Unity + içerik + literal sondaları | `UNITY.md`, `CONTENT-PROBE.md`, `META-MAP.md` üretilir |
| 5 | apktool d | 85.591 smali, 1.873 xml, 151 asset |
| 6 | İçerik modeli | `ANALIZ.md`, `model.json`, `strings.txt` |
| 7 | Metin yaması | 23 çift, hepsi birebir aynı bayt uzunluğunda → `METIN-YAMASI.md` |
| 8 | Yeniden paketleme | apktool `b` DEĞİL: orijinal zip üzerine yalnızca değişen girdi |
| 9 | İmzalama | sabit anahtar (release asset `mod-signing.jks`), zipalign + apksigner v3 |
| 10 | Yayın öncesi doğrulama | imzalı APK yeniden açılır, 23/23 yama içinde doğrulanır |
| 11 | Release | `bitlife-theboys` etiketine APK + sha256 + anahtar |

## 2. Gerçek APK'da ne bulundu?

- Paket: `com.candywriter.bitlife`, minSdk 25, Unity 3D + **IL2CPP**.
- 141 MB'ın dağılımı: `classes*.dex` 11 adet, `assets/bin/Data/` Unity paketi,
  `libil2cpp.so`, `global-metadata.dat` (18,4 MB).
- **SQLite içerik tablosu yok.** Oyunun içeriği veritabanında değil.
- Unity paketinde TextAsset yok (0). 13.312 nesne var: 8.342 MonoScript,
  1.726 MonoBehaviour, 420 AudioClip, 154 Texture2D.
- Metinler `global-metadata.dat` içindeki **string literal havuzunda** düz UTF-8
  olarak duruyor (ör. ofset 295.674: "You went to the witch doctor…").
- Meslekler **derlenmiş C# sınıfları** olarak duruyor: `AstronautJobPack`,
  `Astronaut Special Career`, `SimSpecialJobPolitician`, `DataModelCareerProgression`…
  Yani "yeni meslek ekle" işlemi veri eklemek değil, **yeniden derleme** işidir.
- Oyunun içinde tek bir LLM istem şablonu var: Gemma sohbet şablonuyla
  "You are a strict JSON translation engine…" (çeviri için). Rastgele içerik
  üreten bir istem yok.

## 3. Yayınlanan APK neyi değiştiriyor?

`theboys-signed.apk` (141.709.099 bayt, imzalı) şunları yapar:

- 23 oyun metnini The Boys evrenine çevirir. Örnekler:
  - "I accepted the job offer." → "I joined the Vought team."
  - "You were sent to the principal's office!" → "You were sent to Homelander's office!"
  - "My contractors came in over-budget by " → "My Vought team came in over-budget by "
  - "I began training to be an astronaut at the " → "I began training to be a Supe at the "
  - "I have been promoted to {0} with a salary of {1}." → "…at Vought for {1}."
- Yöntem: her yama **aynı bayt uzunluğunda**. Literal tablosu `(başlangıç, bitiş)`
  çiftlerinden oluşur ve ofsetler değişmediği için tablo, dosya boyutu ve tüm
  diğer bölümler aynen kalır. Bu yüzden dosya yapısı bozulmaz.

Yapmadığı şey (dürüstçe): yeni meslek/bölüm **sınıfı** eklemez. Bu, oyunun
derlenmiş kodunu değiştirmeyi gerektirir; APK içindeki veri dosyalarıyla mümkün değil.

## 4. Neden apktool ile yeniden derlenmiyor?

`apktool b` bu APK'da kaynak derleme hatasına düşüyor (34 MB `res/` + 85 bin smali
+ Unity varlıkları). Hattın yaptığı şu: orijinal APK'nın **zip'i birebir kopyalanır**,
yalnızca değiştirilen girdiler (`global-metadata.dat`, varsa `.bak` bırakılmış veri
dosyaları) yenisiyle değiştirilir, sonra imzalanır. dex/arsc/kaynaklar hiç ellenmez.

## 5. Tekrar çalıştırma

```bash
# tetikleme (dal üzerinde)
date -u +%FT%TZ > trigger/bitlife/run.txt
git commit -am "trigger" && git push

# yerel araçlar
bash tools/drive-fetch.sh <drive-id> bitlife.apk
python3 tools/unity-inspect.py bitlife.apk apk-analiz
python3 tools/content-probe.py bitlife.apk apk-analiz
python3 tools/apk-text-patch.py bitlife.apk tools/theboys-text-patch.json patched.apk apk-analiz
python3 tools/apk-verify-patch.py patched.apk tools/theboys-text-patch.json apk-analiz
```

## 6. Çıktılar

- `apk-analiz/ANALIZ.md` — APK içerik analizi
- `apk-analiz/UNITY.md`, `CONTENT-PROBE.md`, `META-MAP.md` — içerik nerede?
- `apk-analiz/METIN-YAMASI.md` — uygulanan 23 yama ve doğrulaması
- `apk-analiz/DOGRULAMA.md` — imzalı APK içinde yamanın kanıtı
- Release `bitlife-theboys` — APK, sha256, imza anahtarı
