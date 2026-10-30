# SoccerChampsSandbox — World Soccer Champs modu

**Hedef: World Soccer Champs'in kendisini modlamak.** Ayrı bir uygulama değil — mod, oyunun
kendi sürecinde çalışır: Frida ile canlı bellek modu veya oyunun kendi kayıt dosyası.

## Modu çalıştır (tek komut)

```bash
tools/game-mod.sh --check                           # cihaz / root / mimari raporu
tools/game-mod.sh --server /yol/frida-server-arm    # oyunu mod menüsüyle aç
```

Oyunun kendi penceresine `◢ MOD` düğmesi eklenir:

| Sekme | İçerik |
|---|---|
| **Tara** | int32/int64/float/double tarama · *İlk Ara → Değişti/Aynı/Arttı/Azaldı* · Seçilene Yaz · Tümüne Yaz · Dondur/Çöz · dosya izleyici |
| **Hazır** | transfer/maaş bütçesi, bakiye, CA, PA, nitelik, piyasa değeri, itibar şablonları |
| **Kayıt** | oyunun kendi `files/` dizini: listele, oku, yedekle, JSON'u düzenleyip geri yaz |

Root yoksa (Android ≤10) kayıt dosyası yolu:

```bash
tools/wsc-save.sh pull saves/
node tools/save-scan.mjs saves/<dosya> --patch "transferBudget=200000000" --out saves/yeni.json
tools/wsc-save.sh push saves/
```

Ayrıntı: [`docs/GAME-MOD.md`](docs/GAME-MOD.md) · Ajan: [`modmenu/game-mod.js`](modmenu/game-mod.js)

## Neden "modlanmış APK" dağıtılmıyor?

`com.pairip.SignatureCheck`, `libpairipcore.so` ve Play Integrity: yeniden imzalanan APK açılmaz
(kanıt: `analysis/05-probe.txt`). Bu yüzden mod **çalışma anında** uygulanır; oyunun orijinal
kurulumu korunur. Ayrıntı: [`docs/GAME-MOD.md`](docs/GAME-MOD.md) §1.

## İsteğe bağlı: kayıt dosyası yardımcısı (sandbox-editor/)

> Hedef bu değil. Çekilen kayıt JSON'unu PC'de elle düzenlemek isteyenler için tarayıcı arayüzü;
> mod menüsü ve `tools/save-scan.mjs` onsuz da çalışır.

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

## Mod ajanı testi

```bash
node tests/game-mod-test.mjs     # sahte Frida ortamı: 27 iddia, cihaz gerekmez
```

Tarama, daraltma, yazma, dondurma ve kayıt API'si gerçek cihaz olmadan sınanır.
Dürüst sınırlar: [`docs/GAME-MOD.md`](docs/GAME-MOD.md) §4.

## Diğer klasörler

| Klasör | Ne var |
|---|---|
| `tools/` | `game-mod.sh` (tek komut mod menüsü), `wsc-save.sh` (kayıt çek/geri yaz), `save-scan.mjs` (kayıt biçimi + yama) |
| `analysis/` | REA statik analiz çıktıları |
| `apk/` | Android APK kaynakları (`build.sh`, `verify-apk.sh`, Java, manifest, ikon) |
| `tests/` | `game-mod-test.mjs` — 27 iddialık Frida ajan testi · `editor-smoke.mjs` — 89 · `detect-test.mjs` — 19 |
| `docs/` | `APK.md`, `EDITOR.md`, `REA-ANALYSIS.md`, `ROOTSUZ-KURULUM.md` |
| `.github/workflows/` | XAPK indirme + REA analiz iş akışları |

## Teknik özet

| Katman | Bulgu |
|---|---|
| Motor | **Cocos2d-x**, native C++ (`libWorldSoccerChamps.so`, 15,9 MB, **stripped**) |
| Koruma | `com.pairip.SignatureCheck`, `VMRunner`, `libpairipcore.so`, `libpglarmor.so` + Play Integrity |
| Sonuç | Sabit offset / sembol yok → **değer taraması**; yeniden imzalama yok → **runtime mod** |

Ayrıntılı analiz: [`docs/REA-ANALYSIS.md`](docs/REA-ANALYSIS.md) · Root'suz seçenekler:
[`docs/ROOTSUZ-KURULUM.md`](docs/ROOTSUZ-KURULUM.md)

## Yasal not

Yalnızca kendi cihazında, tek oyunculu kariyerinde kullanım için. Çok oyunculu/online modda veya
satılan hesaplarda kullanmak oyunun kullanım koşullarını ihlal eder.
