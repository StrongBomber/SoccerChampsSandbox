# BitLife — The Boys Mod

BitLife (`com.candywriter.bitlife`) için **oyun içinde çalışan** mod. Ayrı uygulama yok:
mod, oyunun kendi penceresine `◢ THE BOYS` düğmesi ekler.

**İndir:** https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/theboys-mod/theboys-mod-magisk.zip
(Magisk/KernelSU · frida-server + ajan · oyun kodunun tek baytı yok)

```bash
tools/theboys.sh --check           # cihaz / root / paket raporu
tools/theboys.sh --attach          # oyun açıksa sürece enjekte et
tools/theboys.sh --server /yol/frida-server-arm   # sunucuyu at + oyunu menüyle aç
```

## Menü

| Sekme | İçerik |
|---|---|
| **Tara** | int32/int64/float/double tarama · *İlk Ara → Değişti/Aynı/Arttı/Azaldı* · Seçilene Yaz · Tümüne Yaz · Dondur |
| **The Boys** | 10 karakter paketi (Homelander 100 · Black Noir 100 · Butcher 95 · Starlight 92 · A-Train 90 · Soldier Boy 88 · Kimiko 85 · Frenchie 78 · Hughie 70 · The Deep 60) + **Vought parası** + **Vought Modu** (kilitle) + **Compound V** (doz başına +5, 100'de durur) + **Sıralamam** (canlı değerlerden The Boys sıralaması) |
| **İstatistik** | Para · Yaş · Görünüm · Zeka · Sağlık · Mutluluk · Şöhret · Karma şablonları |
| **Kayıt** | Oyunun kendi `files/` dizini: listele, oku, **yedekle**, düzenle, geri yaz |

## Testler (cihaz gerekmez)

```bash
node tests/theboys-test.mjs      # 42 iddia — ajan mantığı
node tests/theboys-ui-test.mjs   # 36 iddia — arayüz (Android çerçeve taklidi)
```

## Neden modlanmış APK yok?

1. **Teknik:** Drive'daki `BitLife.apk` 141 MB — sandbox ağı Drive'a çıkmıyor, GitHub tek dosyada
   100 MB kabul ediyor, Drive bağlayıcısı 100 MB üstünü satır içi vermiyor.
2. **Hukuki:** BitLife ticari bir oyun; modlanmış APK yayınlamak oyunun kopyasını dağıtmak olur.

Bu yüzden mod çalışma anında uygulanır ve paket oyun kodunu içermez.
Ayrıntı ve dürüst sınırlar: [`docs/BITLIFE-MOD.md`](docs/BITLIFE-MOD.md)

## Klasörler

| Yol | Ne var |
|---|---|
| `bitlife/theboys-mod.js` | Frida ajanı — menü, tarayıcı, karakter paketleri, kayıt dosyaları |
| `tools/theboys.sh` | Tek komut başlatıcı (`--check` · `--emulator` · `--server` · `--attach`) |
| `tools/build-mod-zip.sh` | Magisk/KernelSU paketi üretir |
| `tests/` | `theboys-test.mjs` (42) · `theboys-ui-test.mjs` (36) · `frida-mock.mjs` · `android-mock.mjs` |
| `.github/workflows/build-mod.yml` | Testler → paket → release |

## Not

- Karakter adları yalnızca kişisel kullanım için şablon etiketidir; hiçbir görsel/ses/oyun
  varlığı kopyalanmadı. Bu mod **yeni oyun içeriği eklemez**, değerleri değiştirir.
- Yalnızca kendi cihazın ve kendi kopyan için.
