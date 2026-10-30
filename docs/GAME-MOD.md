# Oyunu modlama — asıl hedef

Bu projenin hedefi **World Soccer Champs'in kendisini modlamak**. Ayrı bir uygulama,
tarayıcı editörü veya "yan araç" hedef değildir; onlar yalnızca kayıt dosyasına erişim
için isteğe bağlı yardımcılardır.

Bu sayfa, modun **nasıl** uygulandığını, neyin neden mümkün olmadığını ve tek komutla
nasıl çalıştırıldığını anlatır.

---

## 1. Neden "APK'yı indir, kur" yok?

Oyunun APK'sını açıp mod menüsü gömmek (klasik yöntem: apktool → smali/lib değiştir →
yeniden imzala) bu oyunda **çalışmaz**:

| Kanıt | Anlamı |
|---|---|
| `com.pairip.SignatureCheck`, `com.pairip.VMRunner`, `VmDecryptor` | APK imzası çalışma anında doğrulanıyor; yeniden imzalanan APK açılmaz |
| `libpairipcore.so`, `libpglarmor.so` | Native koruma çekirdeği |
| Play Integrity | Kurcalanmış kurulum işaretlenir |

Bu yüzden mod, **APK'ya dokunmadan** uygulanır. İki yol var:

| Yol | Root | Ne değişir | Kalıcılık |
|---|---|---|---|
| **A. Runtime mod menüsü (Frida)** | gerekli | Oyun süreci çalışırken bellek/kayıt | Oturum boyunca (istenirse kayıt dosyasına yazılır) |
| **B. Kayıt dosyası modu** | Android ≤10 ise gerekmez | Oyunun kendi kayıt dosyası | Kalıcı |

İki yol da **oyunun kendisini** değiştirir — ikinci bir uygulama yok.

---

## 2. Kurulabilir mod paketi (Magisk / KernelSU)

**İndir:** https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/wsc-mod/wsc-mod-magisk.zip
(15,8 MB · frida-server + mod ajanı · sha256 dosyası yanında)

| İçerik | Görev |
|---|---|
| `system/bin/frida-server` | Cihazda çalışır, açılışta kendiliğinden başlar |
| `agent/game-mod.js` | Mod menüsü (oyunun penceresine `◢ MOD`) |
| `post-fs-data.sh` / `service.sh` | Önyüklemede başlat + düşerse yeniden başlat |
| `customize.sh` | Ajanı `/data/adb/wscmod/game-mod.js` konumuna kopyalar |

> **Neden APK değil?** Oyunun APK'sını modlayıp yeniden imzalamak bu oyunda çalışmaz:
> `com.pairip.SignatureCheck` + `libpairipcore.so` + Play Integrity. Yeniden imzalanan
> APK açılmaz — bu bir tercih değil, teknik sınır (kanıt: `analysis/05-probe.txt`).
> Bu yüzden mod **çalışma anında** uygulanır ve dağıtım biçimi **flash'lanan paket**tir.
> APK biçiminde "mod" vermek, açılmayan bir oyun dosyası vermek olurdu.

Kurulum: Magisk/KernelSU → Modules → Install → zip. Oyunu aç, PC'den `tools/game-mod.sh --attach`.

## 3. Yol A — oyun içi mod menüsü (tek komut)

```bash
tools/game-mod.sh --check                          # cihaz / root / mimari raporu
tools/game-mod.sh --emulator                       # LDPlayer/MuMu: adb connect 127.0.0.1:5555
tools/game-mod.sh --server /yol/frida-server-arm   # sunucuyu at, başlat, oyunu aç
tools/game-mod.sh --attach                         # oyun açıksa sürece enjekte et
```

Root'lu cihaz veya root açık emülatör gerekir. Komut oyunu `frida -f` ile başlatır ve
`modmenu/game-mod.js` ajanını enjekte eder. Oyunun **kendi penceresine** yüzen `◢ MOD`
düğmesi eklenir (ayrı uygulama değil, ekran izni de gerekmez).

### Menüde ne var

| Sekme | İşlev |
|---|---|
| **Tara** | int32 / int64 / float / double değer taraması: *İlk Ara → oyunda değiştir → Değişti/Aynı/Arttı/Azaldı* ile daralt → **Seçilene Yaz** / **Tümüne Yaz** / **Dondur** |
| **Hazır** | Transfer bütçesi, maaş bütçesi, bakiye, CA, PA, nitelik, piyasa değeri, itibar için tip + ipucu şablonları |
| **Kayıt** | Oyunun **kendi** kayıt dizinini (`getFilesDir()` + external) listeler, dosyayı okur, yedekler, JSON içeriğini düzenleyip geri yazar (oyunu kapatmadan) |
| Ek | **Dosya izleyici**: oyunun açtığı `…/files/…` yollarını loglar — kayıt biçimini bulmak için |

### Tipik akış (transfer bütçesi)

1. Oyunda **Finans** ekranına git, değeri oku (ör. `62.000.000`).
2. Menü → tip `int32` → değer `62000000` → **İlk Ara** (10–60 sn).
3. Oyunda bütçeyi değiştiren bir şey yap (transfer teklifi / oyuncu sat).
4. **Değişti** ile daralt; 1–5 adres kalana kadar 3–4'ü yinele.
5. Yeni değeri yaz → **Seçilene Yaz** (tek adres) veya **Tümüne Yaz** (hepsi).
6. Kalıcı olsun istersen menüyü kapatmadan **Kayıt → Yedekle → Geri Yaz**.

Nitelikler için aynı akış: profilde `14` olan bir nitelik → `14` ara → oyunda antrenmanla
değiştir → **Değişti** → kalan adreslere `20` yaz.

---

### Kurallar (ofsayt / taç / penaltı / korner / faul)

Menüde **Kayıt → Kuralları bul**: seçtiğin kayıt dosyasında kural benzeri alanları
(`offside`, `throwIn`, `penalty`, `corner`, `foul`, `yellow`…) listeler. Bir satıra dokununca
değer 0 ↔ 1 çevrilir, **Geri Yaz** ile oyunun kendi dosyasına işlenir.

Bu, kuralları **veri olarak** değiştirmenin tek dürüst yolu:

| Durum | Sonuç |
|---|---|
| Kural alanları kayıtta varsa | Doğrudan değiştirilir, oyun okur |
| Alan yoksa | Menü bunu söyler; kurallar oyunun **native maç motorunda** (stripped C++) demektir |

Native maç motorunun içine "ofsayt kuralı eklemek" için kaynak/offset gerekir; kütüphane
**stripped** (sembol yok) ve 15,9 MB. Bu proje o noktada **abartı yapmaz**: kural değiştirmek
isteyen için pratik yol, maç sırasında `Tara` sekmesiyle ilgili değeri bulup yazmaktır.

## 4. Yol B — kayıt dosyası modu (ayrı uygulama olmadan)

```bash
# 1) çek
tools/wsc-save.sh pull saves/

# 2) biçimi gör ve aday alanları listele
node tools/save-scan.mjs saves/<dosya> --keys

# 3) yamala (JSON ise)
node tools/save-scan.mjs saves/<dosya> --patch "transferBudget=200000000,ca=200" --out saves/yeni.json

# 4) geri yaz (oyun tamamen kapalıyken)
tools/wsc-save.sh push saves/
```

Binary dosyalarda `--strings --grep budget` ile alan adı izleri aranabilir.

`save-scan.mjs` dosya biçimini tespit eder (JSON / binary plist / XML plist / zip / sqlite /
bilinmeyen) ve JSON'sa para-bütçe/kabiliyet/kural adaylarını **alan adına göre** listeler.
JSON değilse alan adıyla yama yapılamaz — o durumda Yol A (Frida) kullanılır; araç bunu
açıkça söyler, dosyayı zorla dönüştürmez.

---

## 5. Emülatör testi — ne yapıldı, ne yapılamadı

Bu ortamda **gerçek Android emülatörü çalıştırılamıyor** (KVM yok, sistem imajı yok, ağ kısıtlı).
Bu yüzden ajanın **tamamı** iki taklit katmanı üzerinde koşturuldu:

| Test | Katman | İddia |
|---|---|---|
| `tests/android-ui-test.mjs` | **Android çerçeve taklidi** (`tests/android-mock.mjs`): TextView, LinearLayout, LayoutParams, OnClickListener, Activity.addContentView, java.io.File… | **46** |
| `tests/game-mod-test.mjs` | **Frida çalışma zamanı taklidi** (`tests/frida-mock.mjs`): Process, Module, NativePointer, Interceptor | **27** |

Arayüz testi gerçekten şunları yapar: `AppActivity.onCreate` hook'lanır → `buildUi()` çalışır →
3 sekme açılır → hazır mod düğmeleri tıklanır → bellek taranır → satıra dokunulur → değer yazılır →
dondurulur → **oyunun kayıt dosyaları listelenir, okunur, yedeklenir, kural alanı 1↔0 çevrilip
geri yazılır.** Yani cihazda çalışacak kod yolu, cihazsız olarak yürütüldü.

Gerçek emülatörde 3 komut:

```bash
# LDPlayer / MuMu: ayarlardan root açık olsun
tools/game-mod.sh --emulator                    # adb connect 127.0.0.1:5555
tools/game-mod.sh --check                       # root/oyun/mimari doğrula
tools/game-mod.sh --server /yol/frida-server-arm
```

## 6. Dürüst sınırlar

- **Bu ortamda cihaz/emülatör yok.** Ajan, test edilebilir kısmıyla kanıtlandı:
  `node tests/game-mod-test.mjs` → **27 iddia** (tarama, daraltma, yazma, int64/float/double,
  dondurma, kayıt API'si, izleyici) sahte Frida çalışma zamanıyla geçiyor. Cihazda
  uçtan uca denenmedi.
- **Koruma atlatma yok.** PairIP root/Frida ortamını tespit ederse oyun kapanabilir; bu proje
  tespit gizleme (anti-anti-debug) içermez. Tespit edilirse yeniden adlandırılmış
  `frida-server` ve gecikmeli enjeksiyon (`--attach`) denenebilir.
- **Değer adresleri her oturumda değişir** (ASLR). Tarama her açılışta yeniden yapılır;
  "offset listesi" dağıtılmaz.
- **Kurallar (ofsayt/penaltı/taç/korner/faul) maç motorunun içinde**. Native, stripped kodda
  bunları isimle bulmak mümkün değil; kural değiştirmek isteyen için yol **değer taraması**
  (ör. faul eşiği bir sayıysa) ya da ilgili maç ekranında değer takibi. Bu, para/nitelik
  kadar güvenilir değil — abartmıyoruz.
- Mod **yalnızca kendi cihazın ve kendi kopyan için**. Oyunu satın almış olman gerekir;
  modlanmış APK dağıtımı bu projenin kapsamı dışıdır.
