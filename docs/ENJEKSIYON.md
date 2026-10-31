# Gerçek enjeksiyon — oyunun kendi verisine The Boys Evreni

Bu belge **Enjekte** sekmesinin ne yaptığını anlatır: oyunun kendi veri tabanına ve JSON
içerik dosyalarına The Boys satırları ekler. Süs değil — eklenen satırlar oyunun okuduğu
yerde durur.

```
◢ THE BOYS → [ Tara ] [ Evren ] [ Enjekte ] [ The Boys ] [ İstatistik ] [ Kayıt ]
                                                 ↑
                                     oyunun kendi verisi
```

---

## 1. Nasıl çalışır

1. **Veriyi tara** — uygulamanın `files/`, `databases/` ve harici dizinlerini gezer:
   - Her dosyayı SQLite olarak açmayı dener; açılanların `sqlite_master` tablosundan
     tablo listesini, her tablo için `PRAGMA table_info` + `SELECT COUNT(*)` çeker.
   - Açılamayan dosyalarda ilk 256 KB'yi okuyup JSON olarak çözer; **nesne dizisi**
     içerenleri içerik dosyası sayar.
2. **İçerik tablosu puanı** — tablo adı `career|job|event|chapter|character|story…`
   içeriyorsa +3, metin sütunu başına +1, makul satır sayısı +1, ≥2 sütun +1.
   Puanı 3'ün altındaki tabloların `Ekle` düğmesi **pasif** (yanlış tabloya yazmayalım).
3. **Ekle** — tablodan **gerçek bir örnek satır** çeker, sütun tiplerini okur ve The Boys
   kaydını o şablonun üstüne bindirir:
   - `id`/`_id`/`pk` veya `INTEGER PRIMARY KEY` → SQLite'a bırakılır (otomatik artar)
   - ad/title/label sütunları → `Vought PR Uzmanı`, `Homelander`, `Bölüm 1 · İlk kriz`…
   - maaş/ücret/`pay` sütunları → `96000`, `6000000`… (mesleğin kendi ücreti)
   - şirket/kategori/etiket sütunları → `Vought International`, `Vought · The Seven`…
   - açıklama/metin sütunları → mesleğin notu veya bölümün metni
   - **eşleşmeyen sütunlar şablondan aynen kopyalanır** → `NOT NULL` kısıtları patlamaz
4. **Doğrulama** — ekleme sonrası `SELECT COUNT(*)` tekrar okunur, `last_insert_rowid()`
   ile eklenen satırların listesi tutulur ve durum satırında gösterilir.
5. **Geri al** — tutulan rowid'ler `DELETE` ile silinir, sayı yeniden doğrulanır.

Her yazma işleminden **önce** dosya harici dizine yedeklenir (`backup-<zaman>-<ad>`).

---

## 2. Ne ekliyor

| Tablo türü | Eklenen |
|---|---|
| `career` / `job` / `occupation` | **12 meslek** — The Seven Üyesi, Supe Avcısı, Compound V Kimyageri, Vought Avukatı, Vought PR, Sosyal Medya, Deniz Biyoloğu, Güvenlik Şefi, Muhabir, TEMP-V Koordinatörü, Starlight'ın Menajeri, Yedi Ayakçısı (ad + işveren + maaş + açıklama) |
| `event` / `story` / `chapter` / `activity` | **30 bölüm** — her mesleğin 2 bölümü + 6 sezon finali (başlık + metin + kategori) |
| `character` / `npc` / `supe` / `hero` | **10 karakter** — Homelander, Butcher, Starlight, A-Train, Black Noir, Soldier Boy, Kimiko, Frenchie, Hughie, The Deep (ad + etiket + ayrıcalık metni) |
| JSON içerik dosyası | dizinin son elemanı klonlanır, ad/açıklama/maaş alanları The Boys değerleriyle değiştirilir, **12 kayıt** eklenir |

**THE BOYS'U EKLE** düğmesi bunu tek seferde, puanı 3+ olan **bütün** tablolara yapar.
Tipik çıktı: `42 satır eklendi — careers+12, events+30`.

---

## 3. Sınırlar (dürüst)

1. **Oyun yeniden başlatılmalı.** Oyun açılışta içeriği belleğe alıyorsa yeni satırlar
   ancak yeniden açılışta görünür. Mod bunu durum satırında hatırlatır.
2. **İçerik kodda gömülüyse satır eklenemez.** Tablo yoksa, JSON yoksa mod bunu açıkça
   söyler ("uygulama dizininde SQLite/JSON içerik bulunamadı"). O durumda oyunun
   içeriği APK assets'inde veya IL2CPP binary'sinde demektir; oraya yazmak için APK'yı
   açıp yeniden paketlemek gerekir (bkz. `docs/REA-ANALIZ.md`).
3. **Şema tahmini.** Sütun adları İngilizce ve tanıdık varsayılır. Tanımadığı sütunları
   şablondan kopyalar; bu yüzden satır **her zaman** geçerli olur ama anlamı oyunun
   şemasına bağlıdır.
4. **Oyun açıkken yazma.** SQLite kilitlenirse işlem geri alınır (`ROLLBACK`), dosya
   bozulmaz; yine de en güvenlisi oyunu kapatıp enjekte etmektir.

---

## 4. Test kanıtı

`node tests/theboys-ui-test.mjs` → **91 iddia**, içinde gerçek SQLite:

```
Enjekte — oyunun kendi SQLite verisi
  ✓ tarama veritabanı buldu — 1
  ✓ careers içerik tablosu sayıldı — puan 7
  ✓ settings içerik tablosu değil — puan 2
  ✓ 12 meslek eklendi — 12
  ✓ gerçek veritabanında 14 satır — 14
  ✓ ilk eklenen Vought PR — Vought PR Uzmanı
  ✓ maaş yazıldı — 96000
  ✓ şirket yazıldı — Vought International
  ✓ mevcut satırlar bozulmadı
  ✓ geri alma 14 → 2

Enjekte — hepsine birden
  ✓ careers tablosuna 12 eklendi — 14
  ✓ events tablosuna 30 bölüm eklendi — 31
  ✓ ayarlar tablosuna dokunulmadı — 1
  ✓ çoklu geri alma kaydı — 42
```

Test **gerçek bir SQLite dosyası** üzerinde çalışır: `tests/sqlite-mock.mjs`, ajanın
kullandığı Java API yüzeyini Node'un yerleşik `node:sqlite` motoruna bağlar. Yani ajanın
ürettiği `INSERT`, `PRAGMA`, `last_insert_rowid()` cümleleri gerçekten çalıştırılır;
taklit edilen tek şey `SQLiteDatabase`/`Cursor` sınıflarıdır.

`node tests/theboys-test.mjs` → **103 iddia** (SQL kaçışlama, sütun eşleme, kırpma,
şablon koruma, içerik seçimi).
