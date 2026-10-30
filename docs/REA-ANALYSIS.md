# REA Analiz Raporu — World Soccer Champs 2026.12

Bu rapor [REA](https://github.com/morluto/rea) (v6.8.0, MIT) ile **statik** olarak üretildi.
Oyun çalıştırılmadı, hiçbir koruma atlatılmadı; yalnızca paket içeriği okundu.
Ham çıktılar `analysis/` altında, üretici iş akışı `.github/workflows/analyze-xapk.yml` içinde.

## 1. Paket kimliği

| Alan | Değer |
|---|---|
| Paket | `com.monkeyibrow.worldsoccerchamps` |
| Sürüm | 2026.12 (versionCode 468) |
| minSdk / targetSdk | 24 / 36 |
| Format | XAPK (base + 21 split APK) |
| Toplam boyut | 237.485.553 bayt |
| SHA-256 (XAPK) | `4198930c006dd294e1e444d489a1df78d42b3e46c2c4c5b1e454ff672c7f3112` |

Split'ler: `base`, `asset_pack`, `asset_pack.config.astc`, `config.armeabi_v7a`,
`config.hdpi` ve 16 dil paketi.

## 2. Motor

| Bulgu | Kanıt |
|---|---|
| **Cocos2d-x (native C++)** | `.so` içinde `cocos2d/cocos/2d/CCAction.h`, `CCRenderer.cpp`, `spine-cocos2dx` yolları |
| Oyun kütüphanesi | `libWorldSoccerChamps.so` — 15.951.256 bayt, **ELF 32-bit ARM (armeabi-v7a)**, **stripped** |
| Java tarafı | `org.cocos2dx.cpp.AppActivity`, `org.cocos2dx.lib.*` |
| Unity yok | `libil2cpp.so`, `libunity.so`, `libmono.so`, `global-metadata.dat`, `assets/bin/Data` **yok** |

> Sonuç: IL2CPP metadata envanteri (`inspect-il2cpp-metadata`) bu hedefte geçerli değil; veri modeli
> native C++ içinde. Bu yüzden REA'nın native/string kanıtları kullanıldı.

## 3. Koruma katmanı

| Bileşen | Not |
|---|---|
| `com.pairip.SignatureCheck` | APK imzası çalışma anında doğrulanıyor |
| `com.pairip.VMRunner`, `VmDecryptor`, `StartupLauncher` | PairIP sanal makine / şifreli DEX |
| `libpairipcore.so`, `libpglarmor.so` | Native koruma çekirdeği |
| Play Integrity | `IntegrityDialogRequest`, `requestExpressIntegrityToken` |

**Operasyonel anlamı:** APK'yı apktool ile açıp yeniden imzalamak (klasik "mod menu inject" yolu)
`SignatureCheck` tarafından yakalanır; bu yüzden bu projede **APK değiştirilmedi**.

## 4. Veri modeli (native sembol kanıtları)

`.so` içindeki `__FILE__` string'leri derleme birimlerini (dolayısıyla sınıfları) açığa çıkarıyor:

```
Data/Classes/Career.cpp              Data/Classes/CareerManager.cpp
Data/Classes/DataManager.cpp         Data/Classes/DataAccess.cpp
Data/Classes/DataPlayer.cpp          Data/Classes/DataScout.cpp
Data/Classes/PlayerMarketValue.cpp   Data/Classes/PlayerHelpers.cpp
Data/Classes/Season.cpp              Data/Classes/SeasonPlayerAwards.cpp
Data/Classes/Competition.cpp         Data/Classes/Fixture.cpp
Data/Classes/MatchSimulation/*.cpp   Data/Classes/News/*.cpp (20+ haber türü)
```

Ekonomi / kadro anahtarları (string tablosundan):

```
TransferBudget   ClubId        ClubName      PlayerPosition
PlayerLoans      Transfers     TransferListed  player_sold
PlayerSearchFilter*            PlayerBodyElements  PlayerCounterOfferAccepted
```

Bu isimler, editörün alan şemasının temelini oluşturur (`sandbox-editor/schema.js`).

## 5. Depolama

- Cocos2d-x `FileUtils::getWritablePath()` → `/data/data/com.monkeyibrow.worldsoccerchamps/files/`
- Uygulama `WRITE_EXTERNAL_STORAGE` / `READ_EXTERNAL_STORAGE` istiyor, ancak targetSdk 36 olduğu için
  Android 11+ üzerinde `/sdcard/Android/data/<paket>/` scoped storage ile korunuyor.
- **Root'suz cihazda kayıt dosyasına erişim yok** → bkz. `docs/ROOTSUZ-KURULUM.md`.

## 6. Yeniden üretim

```bash
gh workflow run analyze-xapk.yml   # veya workflow dosyasında bir değişiklik push et
```

Üretilen dosyalar:

| Dosya | İçerik |
|---|---|
| `analysis/00-listing.txt` | XAPK içerik listesi |
| `analysis/02-engine.txt` | paket APK, dex'ler, native envanter, motor işaretleri |
| `analysis/05-probe.txt` | native string probu, kayıt yolları, PairIP izleri, XAPK manifest |

## 7. Sınırlamalar

- String/sembol kanıtı **çalışma zamanı davranışını kanıtlamaz**; alan adları C++ sembollerinden
  türetilmiştir, gerçek serileştirme formatı (JSON/plist/ikili) statik olarak doğrulanmadı.
- Offsetsiz, stripped bir binary olduğu için sabit bellek adresi yok; canlı düzenleme
  **değer taraması** (scan → refine) ile yapılır.
- PairIP nedeniyle yeniden paketleme desteklenmez.
