# The Boys Mod — BitLife

BitLife (`com.candywriter.bitlife`) için **oyun içinde çalışan** mod. Ayrı uygulama yok:
ajan, oyunun kendi penceresine `◢ THE BOYS` düğmesi ekler.

```
◢ THE BOYS  →  [ Tara ] [ Evren ] [ The Boys ] [ İstatistik ] [ Kayıt ]
```

## Neden modlanmış APK değil?

İki sert engel var ve ikisi de teknik:

| Engel | Ayrıntı |
|---|---|
| **APK'yı buraya alamıyorum** | Drive'daki `BitLife.apk` **141 MB**. Sandbox'ın ağ erişimi yalnızca birkaç host'a açık; Drive bağlayıcısı 100 MB üstünde satır içi indirme yapamıyor. GitHub tek dosyada 100 MB kabul ediyor. Yani 141 MB'lık dosya ne indirilebilir ne de repoya konabilir. |
| **Ticari oyunu yeniden dağıtamam** | BitLife, Candywriter'ın ticari uygulaması. APK'yı modlayıp yayınlamak oyunun kopyasını dağıtmak olur. Bu paket **oyun kodunun tek baytını içermez**. |

Bu yüzden mod **çalışma anında** uygulanır: kendi cihazındaki, kendi kurduğun kopyaya enjekte
edilir. Paket yalnızca `frida-server` + ajan içerir.

## Kurulum

**İndir:** `https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/theboys-mod/theboys-mod-magisk.zip`
(CI her push'ta üretir · `module.prop`, `customize.sh`, `post-fs-data.sh`, `service.sh`, ajan)

1. Magisk / KernelSU → Modules → Install → zip
2. BitLife'i aç
3. Bilgisayardan: `tools/theboys.sh --attach`

Alternatif (paket kurmadan): `tools/theboys.sh --server /yol/frida-server-arm`

## Menü

| Sekme | İşlev |
|---|---|
| **Tara** | int32 / int64 / float / double değer taraması. *İlk Ara → oyunda değeri değiştir → Değişti/Aynı/Arttı/Azaldı* ile daralt → satıra dokun → **Seçilene Yaz** / **Tümüne Yaz** / **Dondur** |
| **Evren** | **The Boys Evreni** içerik paketi: 10 karakter, 12 meslek, 30 bölüm. Karakter → meslek → bölüm akışı; seçim sonuçları hem hikâye sayacına hem **bağladığın** oyun adreslerine yazılır. Terfi, 20+ bayrak, karma'ya göre final, Kaydet/Yükle/Sıfırla |
| **The Boys** | 10 karakter paketi. Seçili adreslere karakterin imza değerini yazar: Homelander 100 · Black Noir 100 · Billy Butcher 95 · Starlight 92 · A-Train 90 · Soldier Boy 88 · Kimiko 85 · Frenchie 78 · Hughie 70 · The Deep 60. Ayrıca **Vought parası** (999.999.999), **Vought Modu** (değeri mevcut halinde kilitler), **Compound V** (her doz +5, 100'de durur) ve **Sıralamam** (bulunan adreslerin canlı ortalamasından Homelander…The Deep sıralaması) |
| **İstatistik** | Para · Yaş · Görünüm · Zeka · Sağlık · Mutluluk · Şöhret · Karma için doğru tip ve ipucu şablonları |
| **Kayıt** | Oyunun kendi `files/` dizinini listeler; dosyayı okur, **yedekler**, metinse düzenleyip geri yazar; JSON kayıtta **Bayrakları bul** ile 0/1 ayarları tek dokunuşla çevirir |

### Tipik akış (para)

1. BitLife'ta cüzdandaki nakdi oku (ör. `5.000`).
2. Menü → **İstatistik → Para** → `5000` → **İlk Ara** (10–60 sn).
3. Oyunda para harca/kazan → **Değişti** → 1–5 adres kalana kadar yinele.
4. **The Boys → Vought parası** → hepsine `999.999.999` yazar.
5. Kalıcı olsun diye menüyü kapatmadan oyunun kendi kaydını kullan (Kayıt → Yedekle).

## Testler (cihaz gerekmez)

```bash
node tests/theboys-test.mjs      # 87 iddia — ajan mantığı
node tests/theboys-ui-test.mjs   # 63 iddia — arayüz, Android çerçeve taklidi
```

Arayüz testi ajanın **gerçek kod yolunu** çalıştırır: `android.app.Activity.onCreate` hook'u →
paket adı kontrolü (yabancı uygulamada menü açılmaz) → `buildUi()` → 4 sekme → istatistik
şablonları → bellek tarama → **Homelander/Hughie düğmeleri gerçekten değer yazıyor** →
Vought parası → Vought Modu kilidi → **Compound V (+5) ve sıralama** → oyunun kayıt
dosyalarını listeleme/yedekleme.

## Dürüst sınırlar

1. **Cihazda denenmedi.** Bu ortamda Android emülatörü/KVM yok. Kod yolu taklit katmanlarında
   yürütüldü; gerçek cihazda ilk çalıştırmada sürtünme olabilir.
2. **"Evren" modu oyunun veri tablosuna yazmıyor.** 10 karakter, 12 meslek ve 30 bölüm
   `bitlife/universe.js` içinde tanımlı ve ajan onları **kendi motorunda** oynatıyor; sonuç
   oyunun canlı istatistiklerine (bellekten bağlanan adreslere) yazılıyor. BitLife'ın kendi
   meslek/olay tablosuna satır eklemek için oyunun APK'sını ve veri biçimini görmek gerekir —
   `docs/REA-ANALIZ.md` bu hattı anlatıyor, ama dosya 141 MB olduğu için burada çalıştırılamadı.
3. **Telif:** The Boys karakter adları yalnızca kişisel kullanım için şablon etiketi olarak
   geçiyor; hiçbir görsel, ses veya oyun varlığı kopyalanmadı.
4. **Yalnızca kendi cihazın ve kendi kopyan için.** Modlanmış APK dağıtımı bu projenin dışında.
