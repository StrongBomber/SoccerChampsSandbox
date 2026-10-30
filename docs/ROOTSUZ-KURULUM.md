# Root'suz kurulum ve sınırlar

Bu proje **root'suz cihazda** da çalışan bir yol sunar; ama önce teknik gerçeği netleştirelim.

## Neden root'suz mod menüsü olmuyor?

World Soccer Champs:

- **Cocos2d-x / native C++** (`libWorldSoccerChamps.so`), Java tarafında oyun mantığı yok.
- **PairIP** (`com.pairip.SignatureCheck`) + Play Integrity → APK yeniden imzalanırsa çalışmaz.
- Kayıt verisi `/data/data/com.monkeyibrow.worldsoccerchamps/files/` altında; bu dizin
  **başka uygulamalardan ve `adb shell`'den erişilemez** (targetSdk 36, scoped storage).

Sonuç: root'suz bir telefonda **oyunun içine kod enjekte etmek** veya **belleğini okumak**
mümkün değil. Root'suz yapılabilecekler aşağıda.

## Seçenek 1 — Sandbox Editor (kayıt dosyası, önerilen)

`sandbox-editor/` uygulaması kayıt verisini JSON olarak düzenler.

**Kayıt dosyasını nasıl elde edersin?**

| Ortam | Yöntem |
|---|---|
| Android 10 ve altı | `adb pull /sdcard/Android/data/com.monkeyibrow.worldsoccerchamps/files` |
| Root'lu cihaz | `tools/wsc-save.sh pull` |
| Emülatör (root açık) | `tools/wsc-save.sh pull` veya emülatörün paylaşılan klasörü |
| Bulut yedeği | Telefon üreticisinin yedekleme aracı (ör. Samsung Smart Switch) uygulama verisini dışa aktarabilir |
| Root'suz, hepsi kapalı | Kayıt dosyası elde edilemez → Seçenek 2 |

Düzenleme:

```bash
# 1) dosyaları çek
tools/wsc-save.sh pull saves/

# 2) editörü aç (yerelde)
cd sandbox-editor && python3 -m http.server 8080
#   → http://localhost:8080  → "İçe Al" ile saves/ içindeki JSON'u yükle

# 3) düzenle, "Dışa Aktar" ile kaydet
# 4) geri yaz
tools/wsc-save.sh push saves/
```

> Gerçek kayıt JSON şeması birebir doğrulanmadı. Editör bilinen alan adlarını
> (`players`, `finances`, `club`, `contract`…) arar; bulamazsa **Ham JSON** sekmesinden
> her alanı elle düzenleyebilirsin. Alan adları REA ile `libWorldSoccerChamps.so`
> içinden çıkarıldı (`docs/REA-ANALYSIS.md` §4).

## Seçenek 2 — Emülatör (root açık, PC'de)

Bilgisayarda LDPlayer / MuMu / BlueStacks kur, ayarlardan root'u aç:

```bash
adb connect 127.0.0.1:5555
tools/frida-run.sh /yol/frida-server-android-x86
```

Bu artık "telefonda root" gerektirmez; emülatörde tam mod menü deneyimi verir.
Oyun yalnızca `armeabi-v7a` içerdiği için emülatörde ARM çeviri katmanı açık olmalı
(LDPlayer'da varsayılan).

## Seçenek 3 — Cihazı root'lamak

Bu proje root talimatı vermez; cihazına root atmak garantiyi ve bazı bankacılık/ödeme
uygulamalarını etkiler. Karar senin.

## Özet karşılaştırma

| Yol | Root | Kalıcı düzenleme | Zorluk |
|---|---|---|---|
| Sandbox Editor (kayıt dosyası) | Android 10↓ veya emülatör/root | ✅ (dosyaya yazılır) | Kolay |
| Frida overlay | Gerekli | ✅ (bellekte, oturumluk) | Orta |
| APK yeniden paketleme | — | ❌ | PairIP engelliyor |
