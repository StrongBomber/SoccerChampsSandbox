# APK tanısı

- Dosya: `theboys-signed.apk` — 141,450,854 bayt
- Giriş: 3103 · dex: 11 · .so: 0 · ABI: -
- Üst düzey: res/=2713, assets/=151, META-INF/=134, explorestack/=12, google/=10, src/=10, kotlin/=8, io/=7, com/=2, okhttp3/=2, AndroidManifest.xml=1, DebugProbesKt.bin=1
- Sonuç: **KALDI** (3 hata, 0 uyarı)

| Denetim | Sonuç | Ayrıntı |
|---|---|---|
| zip bütünlüğü (CRC) | ✓ | tüm girdiler sağlam |
| resources.arsc sıkıştırılmamış | ✓ | compress_type=0 (STORED) |
| resources.arsc 4 bayt hizalı | ✓ | veri ofseti 137460508 (mod 4 = 0) |
| .so sıkıştırılmamış | ✓ | 0/0 .so STORED |
| .so 4 KB hizalı | ✓ | 0/0 .so 4096 hizalı |
| .so 16 KB hizalı (Android 15+ 16 KB sayfa cihazları) | ✓ | 0/0 .so 16384 hizalı |
| zip merkezi dizin (EOCD) | ✓ | CD 286288 bayt, ofset 141164544 |
| APK imza bloğu | ✓ | ["APK Signature Scheme v2", "APK Signature Scheme v3", "bilinmeyen"] |
| v2 imzası | ✓ | APK Signature Scheme v2 var |
| v3 imzası | ✓ | APK Signature Scheme v3 var |
| v1 imzası tutarlı | ✓ | v1 yok (v2/v3 yeterli) |
| AndroidManifest.xml var | ✓ | 79236 bayt |
| en az bir dex var | ✓ | 11 dex: classes.dex, classes10.dex, classes11.dex, classes2.dex, classes3.dex, classes4.dex, classes5.dex, classes6.dex, classes7.dex, classes8.dex, classes9.dex |
| en az bir ABI var | ✗ | ABI: yok |
| beklenen dışında değişen girdi yok | ✗ | değişen: 1 (assets/bin/Data/Managed/Metadata/global-metadata.dat) · eklenen: 0 · silinen: 1 · BEKLENMEYEN: stamp-cert-sha256 |
| yerel kütüphane (lib/) var | ✗ | lib/ girdisi: 0 · .so: 0 · YOK: bu APK tek başına çalışamaz (yerel kod ayrı split'te olabilir) |

## Yüklemeyi engelleyen bulgular

- **en az bir ABI var**: ABI: yok
- **beklenen dışında değişen girdi yok**: değişen: 1 (assets/bin/Data/Managed/Metadata/global-metadata.dat) · eklenen: 0 · silinen: 1 · BEKLENMEYEN: stamp-cert-sha256
- **yerel kütüphane (lib/) var**: lib/ girdisi: 0 · .so: 0 · YOK: bu APK tek başına çalışamaz (yerel kod ayrı split'te olabilir)
