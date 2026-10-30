# In-Game Editor — kullanım ve alan eşlemesi

Football Manager'ın **In-Game Editor** ekranlarının World Soccer Champs verisiyle çalışan muadili.
Bağımlılık yok: `index.html`, `data.js`, `app.js`, `styles.css`, `demo-save.json`.

```bash
cd sandbox-editor && python3 -m http.server 8080     # → http://localhost:8080
```

## Ekranlar

| Sekme | FM karşılığı | Düzenlenebilen alanlar |
|---|---|---|
| Genel Bakış | Club Overview | doğrulama uyarıları, son düzenlemeler |
| Kulüp | Edit Club | ad/statü, **itibar 1–10.000**, stadyum/kapasite, **tesisler 1–20**, finans, bağlantılı kulüpler, rakipler, efsaneler |
| Oyuncular | Edit Player | 7 alt sekme (aşağıda) |
| Personel | Edit Staff | CA/PA, itibar, 7 nitelik, diziliş/tarz, sorumluluklar |
| Finans | Edit Club Finances | bütçeler, maaş yükü, sezon projeksiyonu |
| Müsabakalar | Edit Competition | seviye, itibar, takım sayısı, ödül havuzu, tur ödülü |
| Sandbox | — | 8 toplu işlem |
| Tercihler | Preferences | renk, otomatik kayıt, içe/dışa aktarma, kısayollar |

### Oyuncu alt sekmeleri

| Alt sekme | İçerik |
|---|---|
| **Profil** | kimlik, **CA / PA (1–200)**, itibar (mevcut/ülke/dünya), **12 pozisyon × 0–20**, kayıt durumu, forma no, yetişme durumu |
| **Nitelikler** | **47 nitelik, 1–20** (Teknik 14 · Zihinsel 14 · Fiziksel 8 · Kaleci 11), FM renk skalası, grup başına **maks / ortala** |
| **Sözleşme** | tür, bitiş, haftalık ücret, imza bonusu, serbest kalma maddesi, transfer durumu, **+3 yıl uzat** |
| **Kişisel** | moral, kondisyon, yorgunluk, keskinlik, kişilik, medya |
| **Özellikler** | 24 FM "Player Trait" (PPM) — çoklu seçim |
| **Disiplin** | sarı/kırmızı kart, maç cezası, para cezası, sakatlık türü/süresi, **sakatlığı bitir** |
| **İlişkiler** | sevdiği/sevmediği kulüpler, sevdiği kişiler (ekle/kaldır) |

## Düzenleme modeli (FM davranışı)

1. Her alan değişikliği yol tabanlı bir **patch** olarak sahnelenir (`players.12.attributes.Bitiricilik`).
2. Sağ üstteki sayaç / `Ctrl+R` **inceleme çekmecesini** açar: her patch eski → yeni değeriyle listelenir.
3. Patch'ler tek tek ya da **Tümünü Geri Al** ile geri alınır (`Ctrl+Z` son patch).
4. **Değişiklikleri Kaydet** (`Ctrl+S`) baseline'ı günceller; kaydedilmemişken sekme kapatılırsa uyarı çıkar.
5. Toplu işlemler tek bir "structural" kayıt olarak sahnelenir; geri alındığında anlık görüntü geri yüklenir.
   (Bu yüzden bir toplu işlem varken ondan **önceki** tekil patch'ler kilitlenir — önce toplu işlemi geri al.)

## Doğrulama

Genel Bakış ve durum çubuğunda sürekli çalışır:

- `CA > PA` → **hata**
- sözleşme bitişi oyun tarihinden önce → uyarı
- maaş yükü > maaş bütçesi → uyarı
- negatif bakiye, kalecisiz kadro, yinelenen forma numarası, düşük kondisyon → uyarı/bilgi

Her uyarının yanındaki **Git** düğmesi ilgili oyuncuya/ekrana atlar.

## Gelişmiş arama

Oyuncular listesinde ⚙ düğmesi: yaş, CA, PA aralıkları, ayak, yetişme durumu, sözleşme bitiş yılı.
`↑ / ↓` ile listede gezinilir, `Ctrl+F` global aramaya odaklanır.

## Gerçek veriyle kullanım

Editör demo kayıtla açılır. Gerçek kaydı yüklemek için:
**Tercihler → JSON İçe Al** → kayıt dosyasını seç. Alan adları farklıysa **Ham** düzenleme yerine
`data.js` içindeki eşlemeyi genişletmek gerekir (alan adları REA analizinden geliyor:
`docs/REA-ANALYSIS.md` §4).

Dışa aktarılan JSON `tools/wsc-save.sh push` ile cihaza geri yazılabilir (root/emülatör).
