# Tanılama

sürüm: 2026-10-31T10:49:15Z

```
21:build-tools: /usr/local/lib/android/sdk/build-tools/37.0.0
31:    ZIP/APK imzası doğru
103:rc(unity)=0
107:rc(probe1)=0
111:rc(probe2)=0
112:== metadata literal dökümü ==
114:çözüm: len_first taban: data · okunabilir literal: 1206 · ortalama: 0.101
115:literal: 1 · okunabilir: 1
116:→ apk-analiz/literals.json 240 bayt
117:rc(literals)=0
118:== metadata literal tablosu — kesin yer ==
130:rc(map2)=0
134:rc(map)=0
138:rc(slice)=0
139:-rw-r--r-- 1 runner runner 240 Oct 31 10:48 apk-analiz/literals.json
140:[arena/a59d6787-soccerchampssandbox acfee20] analiz(bitlife): unity + içerik + literal dökümü [skip ci]
176:| `.kotlin_builtins` | 8 |
248:değişiklik yok — yine de imzalama zinciri sınanacak
249:değişen girdi: 0
255:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
256:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
257:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
258:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
--- son 120 satır ---

## Uzantı dağılımı

| Uzantı | Dosya |
|---|---|
| `.smali` | 85591 |
| `.xml` | 1873 |
| `.png` | 1175 |
| `.version` | 102 |
| `.json` | 72 |
| `.properties` | 65 |
| `(yok)` | 41 |
| `.proto` | 35 |
| `.js` | 21 |
| `.dat` | 8 |
| `.kotlin_builtins` | 8 |
| `.html` | 6 |
| `.txt` | 4 |
| `.httpclientenginecontainer` | 2 |

## assets/ (151 dosya)

| Uzantı | Dosya |
|---|---|
| `.json` | 69 |
| `(yok)` | 36 |
| `.js` | 16 |
| `.dat` | 8 |
| `.html` | 6 |
| `.dex` | 2 |
| `.bmnetwork` | 2 |
| `.txt` | 2 |

→ apk-analiz/ANALIZ.md
→ apk-analiz/model.json
veritabanı: 0 · json: 4 · anahtar dosya: 86080
(node:3618) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[arena/a59d6787-soccerchampssandbox 6bd68b3] analiz(bitlife): APK içerik modeli [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   acfee20..6bd68b3  HEAD -> arena/a59d6787-soccerchampssandbox
# The Boys enjeksiyonu (APK içi)

Toplam eklenen satır/kayıt: **0**

## Veritabanları

Veritabanı bulunamadı — enjeksiyon yapılmadı.
## JSON dosyaları

JSON içerik dosyası yok.

## Atlanan tablolar

- assets/bin/Data/RuntimeInitializeOnLoads.json (Unity çalışma zamanı dosyası)
- assets/didomi_master_config.json (SDK yapılandırması — oyun içeriği değil)
- original/META-INF/native-image/io.opentelemetry/opentelemetry-sdk-trace/reflect-config.json (SDK yapılandırması — oyun içeriği değil)
- res/raw/applovin_consent_flow_unified_cmp.json (SDK yapılandırması — oyun içeriği değil)


→ apk-analiz/INJEKSIYON.md
exit=3
[arena/a59d6787-soccerchampssandbox 8fd5c37] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   6bd68b3..8fd5c37  HEAD -> arena/a59d6787-soccerchampssandbox
::warning::Oyunun veri dosyalarında enjekte edilebilir içerik tablosu bulunamadı
uygulanan: 23 · reddedilen: 0
→ apk-analiz/METIN-YAMASI.md
yamalanan=23
[arena/a59d6787-soccerchampssandbox e1fc5d0] yama(bitlife): The Boys metin yaması (23 çift) [skip ci]
 2 files changed, 273 insertions(+)
 create mode 100644 apk-analiz/METIN-YAMASI.md
 create mode 100644 apk-analiz/text-patch.json
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   8fd5c37..e1fc5d0  HEAD -> arena/a59d6787-soccerchampssandbox
taban: patched.apk
değişiklik yok — yine de imzalama zinciri sınanacak
değişen girdi: 0
→ unsigned.apk (141434895 bayt)
-rw-r--r-- 1 runner runner 141434895 Oct 31 10:49 unsigned.apk
    testing: stamp-cert-sha256        OK
No errors detected in compressed data of unsigned.apk.
mevcut anahtar indirildi
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
-rw-r--r-- 1 runner runner 141709099 Oct 31 10:49 theboys-signed.apk
Archive:  theboys-signed.apk
  Length      Date    Time    Name
---------  ---------- -----   ----
    79236  1981-01-01 01:01   AndroidManifest.xml
     1733  1981-01-01 01:01   DebugProbesKt.bin
     1074  1981-01-01 01:01   META-INF/NOTICE.md
    10175  1981-01-01 01:01   META-INF/androidx/constraintlayout/constraintlayout-core/LICENSE.txt
        6  1981-01-01 01:01   META-INF/androidx.activity_activity-compose.version
        6  1981-01-01 01:01   META-INF/androidx.activity_activity-ktx.version
        6  1981-01-01 01:01   META-INF/androidx.activity_activity.version
        6  1981-01-01 01:01   META-INF/androidx.annotation_annotation-experimental.version
        6  1981-01-01 01:01   META-INF/androidx.appcompat_appcompat-resources.version
        6  1981-01-01 01:01   META-INF/androidx.appcompat_appcompat.version
       67  1981-01-01 01:01   META-INF/androidx.arch.core_core-runtime.version
        6  1981-01-01 01:01   META-INF/androidx.asynclayoutinflater_asynclayoutinflater.version
        6  1981-01-01 01:01   META-INF/androidx.autofill_autofill.version
        6  1981-01-01 01:01   META-INF/androidx.browser_browser.version
        6  1981-01-01 01:01   META-INF/androidx.cardview_cardview.version
        6  1981-01-01 01:01   META-INF/androidx.compose.animation_animation-core.version
        6  1981-01-01 01:01   META-INF/androidx.compose.animation_animation.version
d00753bd367e89ae2ff46e3ce61736202ced6aae2df6fc3f97e0be4f3f612890  theboys-signed.apk
```

## artifacts
total 946M
-rw-r--r--  1 runner runner  393 Oct 31 10:44 017b8b25-fb0d-4cae-a937-d47e46cfe64d.sh
-rw-r--r--  1 runner runner 1.9K Oct 31 10:44 07c1d8fd-744b-4eb6-99fb-646547cdb0e5.sh
-rw-r--r--  1 runner runner  381 Oct 31 10:48 39ad8741-6957-43c4-91ec-f30bc1325eec.sh
-rw-r--r--  1 runner runner 1.7K Oct 31 10:44 3bbb7b31-22dd-441a-a879-48d39c12c153.sh
-rw-r--r--  1 runner runner  584 Oct 31 10:49 40118187-343a-419a-a997-d960ee46e63b.sh
-rw-r--r--  1 runner runner  269 Oct 31 10:49 45d7caac-32a4-4a70-857d-ce129ba7baec.sh
-rw-r--r--  1 runner runner  915 Oct 31 10:44 673a66ce-e958-4744-8dfc-0afb5a111407.sh
-rw-r--r--  1 runner runner 1.4K Oct 31 10:49 75e020ac-9644-46b4-9edf-fec48056739c.sh
-rw-r--r--  1 runner runner  698 Oct 31 10:48 77b1144c-5a0f-4275-aff8-a373824a4cdf.sh
-rw-r--r--  1 runner runner  464 Oct 31 10:49 7a7f5a87-63b9-4a8e-a1ef-26c809502e99.sh
-rw-r--r--  1 runner runner  212 Oct 31 10:48 89ed2839-3435-4770-9aa6-59765df80709.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 10:44 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 10:49 _runner_file_commands
-rw-r--r--  1 runner runner 135M Oct 31 10:49 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 10:48 apktool.log
-rw-r--r--  1 runner runner 135M Oct 31 10:44 base.apk
-rw-r--r--  1 runner runner 135M Oct 31 10:44 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 10:44 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 10:44 bt.txt
-rw-r--r--  1 runner runner  325 Oct 31 10:49 certs.txt
-rw-r--r--  1 runner runner  666 Oct 31 10:48 d5516b6f-8b31-43e9-897a-6af3f48a634e.sh
drwxr-xr-x 20 runner runner 4.0K Oct 31 10:48 decoded
-rw-r--r--  1 runner runner  15K Oct 31 10:49 diag.log
-rw-r--r--  1 runner runner  500 Oct 31 10:49 e318ccd5-3b48-4759-a5de-1c4883b6a22c.sh
-rw-r--r--  1 runner runner  204 Oct 31 10:48 e6562d6f-5dab-4d76-bccb-8ff430d6eace.sh
-rw-r--r--  1 runner runner  850 Oct 31 10:49 f6046d25-c75e-443d-b5b3-9ba2484ae989.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 10:49 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 10:44 original.apk
-rw-r--r--  1 runner runner 135M Oct 31 10:48 patched.apk
