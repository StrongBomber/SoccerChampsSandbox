# Sandbox Mod Menu (oyun içi overlay)

`modmenu/sandbox-menu.js` — World Soccer Champs'in **kendi penceresine** yüzen bir
"SANDBOX" düğmesi ve düzenleme paneli ekleyen Frida ajanı.

```
◢ SANDBOX  →  panel:
   [değer] [int|float]
   İlk Ara · Değişti · Aynı · Arttı · Azaldı
   Sonuçlara Yaz · Dondur · Çöz
   ── eşleşen adres listesi (adres = değer)
```

## Neden offset yok?

REA analizi (`docs/REA-ANALYSIS.md`) gösterdi ki oyun Cocos2d-x, native kütüphane
**stripped** ve PairIP ile korunuyor:

- Sabit bellek adresi/alan offseti yok → menü **değer taraması** ile çalışır.
- APK yeniden imzalanmıyor → `com.pairip.SignatureCheck` tetiklenmez.
- Görünüm `activity.addContentView(...)` ile ekleniyor → `SYSTEM_ALERT_WINDOW` izni gerekmez.

## Gereksinimler

| Gereksinim | Not |
|---|---|
| Root'lu cihaz **veya** root açık emülatör | `frida-server` çalıştırmak için |
| `frida-tools` (PC) | `pip install frida-tools` |
| `frida-server` (cihaz) | [sürümler](https://github.com/frida/frida/releases) — oyun **armeabi-v7a**, 64-bit cihazda `android-arm` build |
| USB hata ayıklama | `adb devices` görüyor olmalı |

## Çalıştırma

```bash
# 1) frida-server'ı indir (PC tarafında frida sürümüyle aynı olmalı)
frida --version

# 2) tek komut: sunucuyu at, oyunu menüyle başlat
tools/frida-run.sh /yol/frida-server-arm

# veya elle:
adb push frida-server-arm /data/local/tmp/frida-server
adb shell "su -c 'chmod 755 /data/local/tmp/frida-server'"
adb shell "su -c '/data/local/tmp/frida-server &'"
frida -U -f com.monkeyibrow.worldsoccerchamps -l modmenu/sandbox-menu.js --no-pause
```

Emülatörde (LDPlayer/MuMu/BlueStacks): emülatör ayarlarından **root** aç, `adb connect 127.0.0.1:5555`,
sonra yukarıdaki komutlar. Emülatör x86 olduğu için `frida-server-android-x86` gerekir; oyunun
yalnızca ARM kütüphanesi olduğundan ARM çeviri katmanı (LDPlayer'da varsayılan) açık olmalı.

## Kullanım akışı (örnek: transfer bütçesi)

1. Oyunda **Finans → Transfer Bütçesi** ekranına git, değeri not al (ör. `6.200.000`).
2. Menüde `değer = 6200000`, tür `int` → **İlk Ara**.
3. Oyunda bütçeyi değiştiren bir işlem yap (oyuncu sat, teklif ver) → **Değişti**.
4. Sonuç 1–5 adrese düşene kadar 3. adımı yinele.
5. Yeni değeri gir → **Sonuçlara Yaz** (kalıcı) veya **Dondur** (sürekli aynı değer).

## Sınırlamalar (dürüst liste)

- **Cihazda test edilmedi.** Bu ajan statik analize göre yazıldı; Frida API'leri doğru
  kullanıldı ve söz dizimi doğrulandı, ancak gerçek cihazda uçtan uca denenmedi.
- PairIP, root/Frida ortamlarını tespit edip oyunu kapatabilir. Tespit edilirse
  Frida'yı yeniden adlandırılmış `frida-server` ile ve `--enable-jit` gibi seçeneklerle
  denemek gerekir; bu proje **koruma atlatma** içermez.
- Tarama, `rw-` bellek bölgelerini okur; 32-bit oyunda tipik olarak 300–600 MB.
  Telefonda ilk tarama 20–60 saniye sürebilir (menüde ilerleme `console`'a yazılır).
- Değerler her oturumda yeniden aranmalıdır (ASLR/pointer'lar değişir).

## Root'suz ne yapabilirim?

Bkz. [`../docs/ROOTSUZ-KURULUM.md`](../docs/ROOTSUZ-KURULUM.md): kayıt dosyası yolu,
Android sürümüne göre erişim ve **Sandbox Editor** ile düzenleme.
