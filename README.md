# SoccerChampsSandbox

World Soccer Champs (2026.12) için **Football Manager oyun içi editörünün (In-Game Editor) birebir muadili**
ve root'lu cihazlar için **Frida overlay mod menüsü**.

## In-Game Editor (sandbox-editor/)

```bash
cd sandbox-editor && python3 -m http.server 8080   # → http://localhost:8080
```

FM'nin oyun içi editörüyle aynı ekran akışı ve terminoloji:

| Sekme | İçerik |
|---|---|
| **Genel Bakış** | Kulüp başlığı (arma, lig, sezon, tarih, transfer dönemi), kadro değeri, ortalama CA, bakiye, maaş yükü, son düzenlemeler |
| **Kulüp** | Ad/kısa ad/lig/ülke/statü, **İtibar (1–10.000)**, stadyum + kapasite, **Antrenman / Altyapı Tesisi, Genç Oyuncu Keşfi, Genç Antrenörlük (1–20)**, finans özeti |
| **Oyuncular** | Aranabilir kadro listesi (KL/DEF/ORT/FOR filtreleri, CA/PA sıralaması) + oyuncu kartı: **Profil · Nitelikler · Sözleşme · Kişisel** |
| **Personel** | Menajer/antrenör/scout listesi, CA/PA, 7 personel niteliği |
| **Finans** | Bütçeler, maaş yükü göstergesi, sezon projeksiyonu |
| **Müsabakalar** | Müsabaka itibarı/ödül havuzu düzenleme + lig tablosu |
| **Tercihler** | Editör davranışı, JSON içe/dışa aktarma |

**Oyuncu kartı (FM ile aynı alanlar)**

- **CA / PA** (1–200 ölçeği), itibar: mevcut / ülke / dünya (1–10.000)
- **47 nitelik, 1–20**, FM renk skalasıyla (kırmızı → turuncu → sarı → açık yeşil → yeşil), her biri mini bar ile
  - Teknik 14 · Zihinsel 14 · Fiziksel 8 · Kaleci 11
- **Pozisyon uygunluğu** 12 pozisyon × 0–20
- **Sözleşme**: tür, bitiş tarihi, haftalık ücret, imza bonusu, serbest kalma maddesi, transfer durumu
- **Kişisel**: moral, kondisyon, yorgunluk, keskinlik, sakatlık, kişilik, medya ilişkisi

**Düzenleme modeli FM gibi:** değerler sahnelenir → sağ üstteki **Değişiklikleri Kaydet** ile kalıcılaşır,
**Geri Al** (Ctrl+Z) son düzenlemeyi geri alır, **Ctrl+S** kaydeder, sekme kapatılırken kaydedilmemiş
değişiklik uyarısı çıkar. Satırlarda FM'deki gibi `− değer +` stepper'ları vardır.

## Oyun içi mod menü (modmenu/)

```bash
tools/frida-run.sh /yol/frida-server-android-arm   # root'lu cihaz veya root açık emülatör
```

Sağ üstte **◢ SANDBOX** düğmesi: değer tara → daralt → yaz / dondur. Ayrıntı: [`modmenu/README.md`](modmenu/README.md)

## Diğer klasörler

| Klasör | Ne var |
|---|---|
| `tools/` | `wsc-save.sh` (kayıt çek/geri yaz), `frida-run.sh` |
| `analysis/` | REA statik analiz çıktıları |
| `docs/` | `REA-ANALYSIS.md` (teknik rapor), `ROOTSUZ-KURULUM.md` |
| `.github/workflows/` | XAPK indirme + REA analiz iş akışları |

## Neden APK modlanmıyor?

REA analizi (`docs/REA-ANALYSIS.md`): oyun **Cocos2d-x + native C++**, kütüphane **stripped**,
**PairIP** (`SignatureCheck`, `VMRunner`) + Play Integrity korumalı → yeniden imzalanan APK çalışmaz.
Bu yüzden iki güvenli yol: **kayıt verisi düzenleme** (In-Game Editor) ve **bellek taraması** (Frida menü).

Root'suz cihaz için yollar: [`docs/ROOTSUZ-KURULUM.md`](docs/ROOTSUZ-KURULUM.md)

## Yasal not

Yalnızca kendi cihazında, tek oyunculu kariyerinde kullanım için. Çok oyunculu/online modda veya
satılan hesaplarda kullanmak oyunun kullanım koşullarını ihlal eder.
