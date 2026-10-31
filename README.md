# BitLife — The Boys Evreni modu

BitLife (`com.candywriter.bitlife`) için **oyun içinde çalışan** mod. Ayrı uygulama yok:
mod, oyunun kendi penceresine `◢ THE BOYS` düğmesi ekler.

**İndir:** https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/theboys-mod/theboys-mod-magisk.zip
(Magisk/KernelSU · frida-server + ajan + içerik paketi · oyun kodunun tek baytı yok)

```bash
tools/theboys.sh --check           # cihaz / root / paket raporu
tools/theboys.sh --attach          # oyun açıksa sürece enjekte et
tools/theboys.sh --server /yol/frida-server-arm   # sunucuyu at + oyunu menüyle aç
```

## Menü — 5 sekme

| Sekme | İçerik |
|---|---|
| **Tara** | int32/int64/float/double tarama · *İlk Ara → Değişti/Aynı/Arttı/Azaldı* · Seçilene Yaz · Tümüne Yaz · Dondur |
| **Enjekte** | **Oyunun kendi verisine yazma.** SQLite tablolarını ve JSON içerik dosyalarını tarar, içerik tablolarını puanlar, seçtiğine The Boys satırları ekler (12 meslek / 30 bölüm / 10 karakter). Yedek alır, satır satır geri alır. **THE BOYS'U EKLE** ile hepsine birden |
| **Evren** | **The Boys Evreni**: 10 karakter × 12 meslek × 30 bölüm. Karakteri seç, mesleğe gir, bölümleri oyna; seçimlerin sonucu oyunun canlı istatistiklerine yazılır (para/şöhret/sağlık/karma…). Terfi, bayrak (Vought içi, supe, aranan…), final ve kayıt/yükleme var |
| **The Boys** | 10 karakter paketi (Homelander 100 · Black Noir 100 · Butcher 95 · Starlight 92 · A-Train 90 · Soldier Boy 88 · Kimiko 85 · Frenchie 78 · Hughie 70 · The Deep 60) + **Vought parası** + **Vought Modu** + **Compound V** + **Sıralamam** |
| **İstatistik** | Para · Yaş · Görünüm · Zeka · Sağlık · Mutluluk · Şöhret · Karma şablonları |
| **Kayıt** | Oyunun kendi `files/` dizini: listele, oku, **yedekle**, düzenle, geri yaz · JSON'da **Bayrakları bul** (0/1) |

### The Boys Evreni içeriği

- **10 karakter:** Homelander · Billy Butcher · Starlight · A-Train · Black Noir · Soldier Boy · Kimiko · Frenchie · Hughie · The Deep
- **12 meslek:** The Seven Üyesi · Supe Avcısı · Compound V Kimyageri · Vought Avukatı · Vought PR Uzmanı · Sosyal Medya · Deniz Biyoloğu · Güvenlik Şefi · Araştırmacı Muhabir · TEMP-V Koordinatörü · Starlight'ın Menajeri · Yedi Ayakçısı
- **30 bölüm:** her mesleğin 2 bölümü + 6 sezon finali (Herrick, Kilise, Kongre, Soldier Boy, Herogasm, Vought'un Yeni Yüzü)
- **Meslek kilitleri:** Seven için Compound V (`supe`), The Boys için Vought'tan kopmuş olmak gerekir
- **4 kademeli terfi**, 20+ hikâye bayrağı, karma'ya göre 5 farklı final

## Testler (cihaz gerekmez)

```bash
node tests/theboys-test.mjs      # 103 iddia — içerik paketi + hikâye motoru + tarayıcı
node tests/theboys-ui-test.mjs   # 91 iddia — arayüz (Android çerçeve taklidi)
node tests/rea-scan-test.mjs     # 15 iddia — REA içerik tarayıcısı
```

## REA ile analiz

[REA](https://github.com/morluto/rea) hattı hazır: `tools/rea-analyze.sh BitLife.apk rea-out`
→ imza, içerik grafiği, manifest, kaynaklar, IL2CPP metadata ve **içerik avı**
(`ICERIK-HARITASI.md`). Bu hattı BitLife üzerinde çalıştıramadım — dosya 141 MB, bu
ortama aktarılabilen sınır 100 MiB. Ayrıntı: [`docs/REA-ANALIZ.md`](docs/REA-ANALIZ.md)

## Kurulum — hangi yol çalışıyor?

| Yol | Durum | Not |
|---|---|---|
| **Magisk/Frida modu** (`theboys-mod`) | ✅ **çalışıyor** | Kurulu BitLife üzerinde çalışır; imza sorunu yok |
| **Tek APK** (`theboys-signed.apk`) | ❌ **kurulamıyor** | Drive'daki dosya Play App Bundle'ının yalnızca *base split*'i: içinde `lib/` yok, manifest `requiredSplitTypes="base__abi"` diyor → `INSTALL_FAILED_MISSING_SPLIT` |
| **XAPK** (base + split'ler) | ⏳ hat hazır, paket bekleniyor | `bitlife-xapk.yml` tüm parçaları aynı anahtarla imzalayıp SAI/APKPure'un kurduğu tek dosyayı üretir |

Ölçüm ve kanıt: [`apk-analiz/TANI-APK.md`](apk-analiz/TANI-APK.md) ·
Ayrıntı: [`docs/APK-HATTI.md`](docs/APK-HATTI.md)

141 MB'lık `BitLife.apk` bu çalışma alanına aktarılamıyor (100 MiB sınırı) ama
GitHub runner'ı Drive'dan doğrudan indirebiliyor — hat bu yüzden GitHub Actions'ta
çalışır. Oyunun kopyası depoda tutulmaz.

## Klasörler

| Yol | Ne var |
|---|---|
| `bitlife/theboys-mod.js` | Frida ajanı — menü, tarayıcı, karakter paketleri, evren motoru |
| `bitlife/universe.js` | **İçerik paketi** — 10 karakter, 12 meslek, 30 bölüm (ajan bu dosyayı okur) |
| `tools/theboys.sh` | Tek komut başlatıcı (iki dosyayı da yükler) |
| `tools/build-mod-zip.sh` | Magisk/KernelSU paketi üretir |
| `tools/rea-analyze.sh` · `tools/rea-content-scan.mjs` | REA analiz hattı + içerik avı |
| `tests/` | `theboys-test` (103) · `theboys-ui-test` (91) · `rea-scan-test` (15) · `sqlite-mock` · `frida-mock` · `android-mock` |
| `docs/` | `BITLIFE-MOD.md` · `ENJEKSIYON.md` · `REA-ANALIZ.md` |
| `.github/workflows/build-mod.yml` | Testler → paket → doğrulama → release |

| `tools/apk-text-patch.py` | Gerçek APK'nın metin havuzunu birebir uzunlukta The Boys metnine çevirir |
## Not

- Karakter adları yalnızca kişisel kullanım için şablon etiketidir; hiçbir görsel/ses/oyun
  varlığı kopyalanmadı. Evren modu **kendi hikâyesini** oynatır, oyunun dosyalarını değiştirmez.
- Yalnızca kendi cihazın ve kendi kopyan için.
