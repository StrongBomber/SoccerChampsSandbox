# Tanılama

sürüm: 2026-10-31T10:42:23Z

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
139:-rw-r--r-- 1 runner runner 240 Oct 31 10:41 apk-analiz/literals.json
140:[arena/a59d6787-soccerchampssandbox 1971e55] analiz(bitlife): unity + içerik + literal dökümü [skip ci]
177:| `.kotlin_builtins` | 8 |
236:değişiklik yok — yine de imzalama zinciri sınanacak
237:değişen girdi: 0
243:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
244:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
245:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
246:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
--- son 120 satır ---
I: Copying assets and libs...
I: Copying unknown files...
I: Copying original files...
I: Copying META-INF/services directory
964M	decoded
# APK içerik analizi

- Paket: **com.candywriter.bitlife**
- Sürüm: **?** · minSdk **25**
- Uygulama sınıfı: `unity.auto-set-game-state`
- Dosya: 89031 · assets: 151 · smali: 85591 · dex: 2
- Aktiviteler: 104 → com.unity3d.player.UnityPlayerActivity, io.didomi.sdk.preferences.ctv.TVPreferencesDialogActivity, io.didomi.sdk.notice.ctv.TVNoticeDialogActivity, com.android.billingclient.api.ProxyBillingActivity, com.android.billingclient.api.ProxyBillingActivityV2, com.hyprmx.android.sdk.activity.HyprMXOfferViewerActivity
- Native kütüphane bildirimi: android.ext.adservices, androidx.window.extensions, androidx.window.sidecar, org.apache.http.legacy, com.amazon.privacypass

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
(node:3841) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[arena/a59d6787-soccerchampssandbox 52ad82b] analiz(bitlife): APK içerik modeli [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   1971e55..52ad82b  HEAD -> arena/a59d6787-soccerchampssandbox
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
[arena/a59d6787-soccerchampssandbox a732c7a] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   52ad82b..a732c7a  HEAD -> arena/a59d6787-soccerchampssandbox
::warning::Oyunun veri dosyalarında enjekte edilebilir içerik tablosu bulunamadı
değişiklik yok — yine de imzalama zinciri sınanacak
değişen girdi: 0
→ unsigned.apk (141434800 bayt)
-rw-r--r-- 1 runner runner 141434800 Oct 31 10:42 unsigned.apk
    testing: stamp-cert-sha256        OK
No errors detected in compressed data of unsigned.apk.
mevcut anahtar indirildi
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
-rw-r--r-- 1 runner runner 141709099 Oct 31 10:42 theboys-signed.apk
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
03ea108f6b4942c203240e7d103a6f2fd6045b266b8f9ae0e8ec235dd66eacea  theboys-signed.apk
```

## artifacts
total 811M
-rw-r--r--  1 runner runner  666 Oct 31 10:42 009db37f-8477-45ea-9b15-821bbaf1b67f.sh
-rw-r--r--  1 runner runner  212 Oct 31 10:41 38acd850-6d88-4d39-8833-cdd42163980c.sh
-rw-r--r--  1 runner runner  381 Oct 31 10:42 415384db-6346-4d38-abb0-0f100cf5221d.sh
-rw-r--r--  1 runner runner  364 Oct 31 10:42 5028791e-bfe9-4b68-a691-a5b07a0f9a6d.sh
-rw-r--r--  1 runner runner  584 Oct 31 10:42 5e8d8a1b-ba2d-4d30-b88e-4ba06d66d1ff.sh
-rw-r--r--  1 runner runner 1.9K Oct 31 10:36 60f20d11-6824-4874-a070-75f48e24dff8.sh
-rw-r--r--  1 runner runner  850 Oct 31 10:42 7740772c-b44a-42ba-acc4-70ca96c65f88.sh
-rw-r--r--  1 runner runner  201 Oct 31 10:42 8d4c86d5-a0d1-4fcd-98a1-cf1031e29acb.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 10:36 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 10:42 _runner_file_commands
-rw-r--r--  1 runner runner  204 Oct 31 10:42 a244a20e-f633-4627-aee8-b3515f485967.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:42 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 10:42 apktool.log
-rw-r--r--  1 runner runner 1.7K Oct 31 10:36 b8e94f13-a86a-4208-a137-5299c1977935.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:36 base.apk
-rw-r--r--  1 runner runner  915 Oct 31 10:36 bf478c10-9a4b-4cba-840d-a522dc36990b.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:36 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 10:36 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 10:36 bt.txt
-rw-r--r--  1 runner runner  464 Oct 31 10:42 c0ea4a54-2623-4405-83db-962dbffa7dbe.sh
-rw-r--r--  1 runner runner  325 Oct 31 10:42 certs.txt
drwxr-xr-x 20 runner runner 4.0K Oct 31 10:42 decoded
-rw-r--r--  1 runner runner  14K Oct 31 10:42 diag.log
-rw-r--r--  1 runner runner  393 Oct 31 10:36 fc6d3ef2-22fe-410d-b1d1-6b8612a14b66.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 10:42 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 10:36 original.apk
-rw-r--r--  1 runner runner 136M Oct 31 10:42 theboys-signed.apk
-rw-r--r--  1 runner runner 1.1M Oct 31 10:42 theboys-signed.apk.idsig
-rw-r--r--  1 runner runner   85 Oct 31 10:42 theboys-signed.apk.sha256
