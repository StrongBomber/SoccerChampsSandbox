# SoccerChampsSandbox

World Soccer Champs (2026.12) için **Football Manager oyun içi editörünün (In-Game Editor) birebir muadili**
ve root'lu cihazlar için **Frida overlay mod menüsü**.

## Android APK

**İndir:** https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/editor-apk/wsc-editor.apk
(85 KB · v1.3 · minSdk 24 · imzalı · çevrimdışı · kurulabilirlik doğrulandı)

```bash
adb install wsc-editor.apk          # veya telefona kopyalayıp dokun
```

Uygulama, editörü WebView içinde gömer; kayıtlar sistem dosya seçicisiyle içe/dışa aktarılır.
Ayrıntı: [`docs/APK.md`](docs/APK.md) · Derleme: `bash apk/build.sh`

## In-Game Editor (sandbox-editor/)

```bash
cd sandbox-editor && python3 -m http.server 8080   # → http://localhost:8080
```

FM'nin oyun içi editörüyle aynı ekran akışı, terminoloji ve düzenleme modeli.
Ayrıntılı kullanım: [`docs/EDITOR.md`](docs/EDITOR.md)

| Sekme | İçerik |
|---|---|
| **Genel Bakış** | Kulüp başlığı, kadro değeri, ortalama CA, bakiye, maaş yükü, **doğrulama uyarıları**, son düzenlemeler |
| **Kulüp** | Ad/statü, **İtibar 1–10.000**, stadyum/kapasite, **Antrenman/Altyapı Tesisi, Genç Keşif, Genç Antrenörlük (1–20)**, finans, **bağlantılı kulüpler / rakipler / efsaneler** |
| **Oyuncular** | Aranabilir kadro + **7 alt sekme**: Profil · **Nitelikler (47 × 1–20)** · Sözleşme · Kişisel · **Özellikler (24 PPM)** · **Disiplin/Sakatlık** · **İlişkiler** |
| **Personel** | CA/PA, itibar, 7 nitelik, tercih edilen diziliş/tarz, **sorumluluklar** |
| **Finans** | Bütçeler, maaş yükü göstergesi, sezon projeksiyonu, hızlı işlemler |
| **Müsabakalar** | Seviye, itibar, takım sayısı, ödül havuzu, tur ödülü + lig tablosu |
| **Maç Kuralları** | **Ofsayt · Penaltı · Taç · Korner · Faul** kuralları (tolerans, mesafe, süre, yay, eşik, kart limiti, VAR) + 4 hazır profil + **maç motoru** tahmini (gol, penaltı, ofsayt, korner, taç, faul, kart) |
| **Maaşlar** | **Adil ücret** hesabı, primler (maç başı/gol/gol yememe/sadakat), vergi, bütçe kullanımı, 25 satırlık ücret tablosu ve toplu işlemler (piyasa ücretine çek, bütçeye sığdır, ±%10, sözleşme yenile) |
| **Serbest JSON** | Gerçek kayıt dosyaları için ağaç editörü (her alanı düzenle, dizi ekle/sil, ara) |
| **Sandbox** | 8 toplu işlem (nitelik maks, PA=CA, sakatlık temizle, sözleşme +3 yıl, bütçe, moral, genç yetenek…) |
| **Tercihler** | Renk/otomatik kayıt, JSON içe/dışa aktarma, kısayollar |

**FM gibi düzenleme:** her alan değişikliği sahnelenir → **inceleme çekmecesi** (Ctrl+R) eski→yeni
değerleri listeler, tek tek veya toplu geri alınır → **Değişiklikleri Kaydet** (Ctrl+S) kalıcılaştırır.
Kaydedilmemişken sekmeyi kapatmak uyarı verir. `CA > PA`, geçmiş sözleşme, bütçe aşımı, kural
tutarsızlığı (ör. penaltı mesafesi 9–13 m dışı), asgari ücret altı oyuncu gibi durumlar
**doğrulama** panelinde canlı gösterilir ve ilgili ekrana/oyuncuya atlar.

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
| `apk/` | Android APK kaynakları (`build.sh`, `verify-apk.sh`, Java, manifest, ikon) |
| `tests/` | `editor-smoke.mjs` — 89 iddialık jsdom duman testi · `detect-test.mjs` — 19 iddialık şema algılama testi |
| `docs/` | `APK.md`, `EDITOR.md`, `REA-ANALYSIS.md`, `ROOTSUZ-KURULUM.md` |
| `.github/workflows/` | XAPK indirme + REA analiz iş akışları |

## Neden APK modlanmıyor?

REA analizi (`docs/REA-ANALYSIS.md`): oyun **Cocos2d-x + native C++**, kütüphane **stripped**,
**PairIP** (`SignatureCheck`, `VMRunner`) + Play Integrity korumalı → yeniden imzalanan APK çalışmaz.
Bu yüzden iki güvenli yol: **kayıt verisi düzenleme** (In-Game Editor) ve **bellek taraması** (Frida menü).

Root'suz cihaz için yollar: [`docs/ROOTSUZ-KURULUM.md`](docs/ROOTSUZ-KURULUM.md)

## Yasal not

Yalnızca kendi cihazında, tek oyunculu kariyerinde kullanım için. Çok oyunculu/online modda veya
satılan hesaplarda kullanmak oyunun kullanım koşullarını ihlal eder.
