# REA ile analiz — The Boys Evreni'ni oyunun veri modeline bağlamak

[REA](https://github.com/morluto/rea) (`npx rea-agents`) tek bir CLI'da toplanmış tersine
mühendislik araç seti: APK imzası, manifest, kaynaklar, IL2CPP metadata, native ELF.

Bu klasördeki hedef: BitLife'ın **kendi veri modelini** görmek, böylece
`bitlife/universe.js` içindeki 10 karakter / 12 meslek / 30 bölümü oyunun gerçek
meslek–olay yapısına birebir oturtmak.

---

## 1. Bu ortamda ne çalıştı, ne çalışmadı

Aşağıdakiler **gerçekten çalıştırıldı**, çıktılar `/tmp/rea-run/` altında Evidence JSON olarak üretildi.

| Adım | Komut | Durum | Kanıt |
|---|---|---|---|
| Ortam | `rea doctor` | ✅ çalıştı (Node 22.22.3 sürüm uyarısı) | `01-doctor.json` |
| İmza | `rea inspect-apk-signature <apk>` | ✅ çalıştı | `02-imza.json` — v1+v2, imzalayan `CN=Jeroen Willemsen`, `self_consistent: true`, sha256 `1da8bf57…` |
| İçerik grafiği | `rea inspect-artifact <apk>` | ✅ çalıştı | `03-artifact.json` (20 KB, alt adımlar + bütünlük) |
| XAPK çözme | `tools/rea-analyze.sh` | ✅ (mantık test edildi) | base APK'yı `manifest.json` üzerinden bulur |
| İçerik avı | `tools/rea-content-scan.mjs` | ✅ çalıştı | `ICERIK-HARITASI.md` + `icerik-ham.json` |
| Manifest / sınıflar | `rea inspect-android-package` | ❌ atlandı | JADX köprüsü JAR'ı gerekiyor (`REA_JADX_MCP_JAR`) |
| Kaynaklar | `rea decode-android-resources` | ❌ atlandı | apktool launcher yok (aşağıya bak) |
| IL2CPP | `rea inspect-il2cpp-metadata` | ⏸ denendi | doğrulama dosyası bu ortamda geçersiz geldi (132 bayt) |

Doğrulama için herkese açık bir test APK'sı kullanıldı:
`OWASP/owasp-mstg` → `Crackmes/Android/Level_01/UnCrackable-Level1.apk` (66.651 bayt).

### Neden BitLife'ın kendisi analiz edilemedi

1. **Dosya buraya sığmıyor.** Drive'daki `BitLife.apk` **141.483.685 bayt**; bu çalışma
   alanına aktarılabilen dosya sınırı **100 MiB**. Araç açıkça reddetti:
   *"more than the 100 MiB (104857600 byte) workspace file limit"*.
2. **Java/JADX:** Java'yı `pip install jdk4py` ile kurdum (Temurin 25 çalışıyor), ama REA'nın
   Android ailesi **çağıranın verdiği** JADX köprüsünü istiyor; bu ortamda derlenemiyor.
3. **apktool:** REA apktool'u kendisi kurmuyor; `apktool.jar` GitHub **release asset**'inden
   gelir, bu ortamın ağ kuralı release asset host'una çıkmıyor (`SSL_ERROR_SYSCALL`).

Yani eksik olan araç değil, **APK'nın kendisi**. Dosyayı sen getirirsen aşağıdaki hat
uçtan uca çalışır.

---

## 2. Kendi makinende çalıştırma

```bash
# 1) REA (tek seferlik)
npx rea-agents@6.8.0 doctor

# 2) Hazır hat: imza + içerik grafiği + manifest + kaynaklar + IL2CPP + içerik avı
tools/rea-analyze.sh BitLife.apk rea-out
#   XAPK ise:  tools/rea-analyze.sh BitLife.xapk rea-out

# 3) Sonuç
cat rea-out/ICERIK-HARITASI.md
```

`rea-analyze.sh` şunları sırayla dener ve **başarısız olanı atlar**, durmaz:

| # | Komut | Ne verir |
|---|---|---|
| 01 | `rea doctor` | ortam raporu (Java, JADX, apktool) |
| 02 | `rea inspect-apk-signature` | v1/v2/v3, imzalayan sertifika, digest |
| 03 | `rea inspect-artifact` | APK içerik grafiği + bütünlük |
| 04 | `rea inspect-android-package` | manifest, aktiviteler, izinler, sınıf sayısı |
| 05 | `rea decode-android-resources` | kaynak tablosu, metinler |
| 06 | `rea inspect-il2cpp-metadata` | Unity ise **sınıf + metot + string** envanteri |
| 07 | `tools/rea-content-scan.mjs` | meslek/olay/karakter anahtar sözcükleri |

### JADX köprüsünü hazırlama (04 için)

```bash
git clone https://github.com/morluto/rea
# rea'nın docs/android-analysis.md dosyası hangi JADX MCP sürümünü pinlediğini yazar
export REA_JADX_MCP_JAR=/tam/yol/jadx-mcp.jar
export JAVA_HOME=/tam/yol/jdk
```

### apktool (05 için)

```bash
# https://github.com/iBotPeaches/Apktool/releases → apktool_X.jar
printf '#!/bin/sh\nexec java -jar /tam/yol/apktool.jar "$@"\n' > /usr/local/bin/apktool
chmod +x /usr/local/bin/apktool
export REA_APKTOOL_COMMAND=/usr/local/bin/apktool
```

---

## 3. Çıktıyı içerik paketine çevirme

`ICERIK-HARITASI.md` sana şunu söyler: hangi dosyada hangi anahtar sözcük kaç kez geçiyor.

- **`assets/…json|csv|xml` içinde `career`/`event` geçiyorsa** → oyunun içerik tablosu
  orada. Şema `bitlife/universe.js` ile eşlenir, mod bu dosyayı *geri yazabilir*.
- **Yalnızca `classes.dex`/`libil2cpp.so` içinde geçiyorsa** → içerik koda gömülü.
  O zaman `bits`/`career` sınıf adları alınır ve mod, oyunun kendi nesnelerini
  `Java.choose` ile yakalayıp alanlarını düzenler (Tara sekmesinin yaptığı işin tipli hâli).
- **Hiç geçmiyorsa** → içerik sunucudan geliyor; yerel enjeksiyon yerine
  ağ katmanı (mitmproxy/REA `inspect-web-network-capture`) gerekir.

Eşleme tablosu:

| universe.js alanı | Oyunda karşılığı (aranacak) |
|---|---|
| `characters[].name` | `character`, `name`, `first_name`, `last_name` |
| `characters[].perk` | `trait`, `perk`, `ability` |
| `careers[].name` / `.pay` | `career`, `job`, `salary`, `wage` |
| `careers[].ladder[]` | `promotion`, `rank`, `level` |
| `chapters[].text` | `event`, `scenario`, `story`, `narrative` |
| `choices[].effects` | `stat`, `happiness`, `health`, `money` |

---

## 4. Dürüst sınır

Bu klasördeki REA çalışması **BitLife üzerinde değil**, herkese açık bir test APK'sı üzerinde
doğrulandı. BitLife'ın kendi veri modeli hakkında burada **hiçbir iddia** yok: dosya bu
ortama alınamadığı için manifest, sınıf adı veya içerik tablosu **görülmedi**.

`bitlife/universe.js` bu yüzden kendi kendine yeten bir içerik paketi: oyunun dosyalarına
dokunmuyor, kendi hikâyesini oynatıp sonucu oyunun canlı istatistiklerine yazıyor.
REA hattı, oyunun gerçek şeması öğrenildiğinde bu paketi ona bağlamak için hazır.
