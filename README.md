# SoccerChampsSandbox

World Soccer Champs (2026.12) için **sandbox mod menü** ve **Football Manager tarzı oyun içi editör**.

## İçerik

| Klasör | Ne var |
|---|---|
| `sandbox-editor/` | **Sandbox Editor** — bağımlılıksız web uygulaması: kadro, finans, transfer, personel düzenleme + sandbox araçları |
| `modmenu/` | Frida ile **oyun içi overlay mod menü** (root'lu cihaz/emülatör) |
| `tools/` | `wsc-save.sh` (kayıt çek/geri yaz), `frida-run.sh` |
| `analysis/` | REA statik analiz çıktıları |
| `docs/` | `REA-ANALYSIS.md` (teknik rapor), `ROOTSUZ-KURULUM.md` (root'suz yollar) |

## Hızlı başlangıç — Sandbox Editor

```bash
cd sandbox-editor
python3 -m http.server 8080
# → http://localhost:8080
```

Editör açılışta **demo bir kariyer** yükler (25 oyuncu, 6 personel, 4 transfer hedefi),
böylece hiçbir şey kurmadan tüm özellikleri deneyebilirsin.

- **Kadro**: yaş / OVR / POT / değer / maaş / sözleşme / moral / form alanlarını satır içi düzenle,
  sırala, filtrele, transfer listesine al.
- **Finans**: bakiye, transfer ve maaş bütçesi; maaş yükü göstergesi.
- **Transferler**: oyuncu sat (bütçeye %90'ı eklenir), scout hedefi imzala, ilgi artır.
- **Sandbox Araçları**: Sınırsız Bütçe, Maaş Yükünü Sıfırla, Süper Kadro, Mutlu Soyunma Odası,
  Sözleşme Kilidi, Piyasa Değeri ×2, Altyapı Full, Transfer Listesini Temizle.
- **Değişiklik günlüğü**: her işlem alan bazında diff ile listelenir, tek tek geri alınabilir (Ctrl+Z).
- **İçe/Dışa Al**: gerçek kayıt JSON'unu yükle, düzenle, indir.

## Hızlı başlangıç — oyun içi menü

```bash
tools/frida-run.sh /yol/frida-server-android-arm   # root'lu cihaz veya root açık emülatör
```

Oyunda sağ üstte **◢ SANDBOX** düğmesi çıkar: değer tara → daralt → yaz / dondur.
Ayrıntı: [`modmenu/README.md`](modmenu/README.md)

## Neden APK modlanmıyor?

REA analizi (bkz. `docs/REA-ANALYSIS.md`) oyunun **Cocos2d-x + native C++**, kütüphanesinin
**stripped** ve **PairIP** (`SignatureCheck`, `VMRunner`) + Play Integrity ile korunduğunu gösterdi.
Yeniden imzalanan APK imza kontrolüne takılır. Bu yüzden iki güvenli yol seçildi:

1. **Kayıt verisi / bellek** üzerinden düzenleme (APK'ya dokunmaz),
2. Kalıcı veri için **Sandbox Editor**.

Root'suz cihazda neler yapılabileceği: [`docs/ROOTSUZ-KURULUM.md`](docs/ROOTSUZ-KURULUM.md)

## Depodaki diğer dosyalar

- `scripts/download_drive.sh` — Google Drive'dan büyük dosya indirme (XAPK'nın kaynağı)
- `.github/workflows/fetch-xapk.yml` — XAPK'yı indirip release asset olarak yayınlar
- `.github/workflows/analyze-xapk.yml` — REA analizini çalıştırır, `analysis/` altına commit eder

## Yasal not

Bu araçlar yalnızca **kendi cihazında, tek oyunculu kariyerinde** kullanım için hazırlandı.
Çok oyunculu/online modda, satışa sunulan hesaplarda veya başkasının cihazında kullanmak
oyunun kullanım koşullarını ihlal eder. Oyun kodu tersine mühendislik için incelenmedi;
hiçbir koruma atlatma tekniği içermiyor.
