# XAPK tanısı (split seti)

- Parça: 3 · toplam .so: 28 · ABI: arm64-v8a
- Sonuç: **GEÇTİ** (0 hata)

| Parça | Bayt | versionCode | .so | Sertifika (SHA-256) |
|---|---|---|---|---|
| `UnityDataAssetPack.apk` | 143,225,134 | 1069 | 0 | ?… |
| `base.apk` | 141,450,854 | 1069 | 0 | 4c23343b95eb2e1e… |
| `config.arm64_v8a.apk` | 44,525,860 | 1069 | 28 | ?… |

| Denetim | Sonuç | Ayrıntı |
|---|---|---|
| base.apk var | ✓ | parçalar: UnityDataAssetPack.apk, base.apk, config.arm64_v8a.apk |
| tüm parçalar aynı pakette | ✓ | com.candywriter.bitlife |
| tüm parçalar aynı versionCode | ✓ | 1069 |
| tüm parçalar aynı sertifika | ✓ | 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4 |
| set yerel kütüphane içeriyor (.so) | ✓ | 28 .so · dosyalar: config.arm64_v8a.apk |
| en az bir ABI | ✓ | arm64-v8a |
