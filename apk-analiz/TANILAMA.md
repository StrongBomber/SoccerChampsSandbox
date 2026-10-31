# Tanılama

sürüm: 2026-10-31T10:31:54Z

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
137:rc(slice)=0
138:-rw-r--r-- 1 runner runner 240 Oct 31 10:31 apk-analiz/literals.json
139:[arena/a59d6787-soccerchampssandbox 832e7b9] analiz(bitlife): unity + içerik + literal dökümü [skip ci]
176:| `.kotlin_builtins` | 8 |
235:değişiklik yok — yine de imzalama zinciri sınanacak
236:değişen girdi: 0
242:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
243:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
244:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
245:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
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
(node:3489) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[arena/a59d6787-soccerchampssandbox 8f271b8] analiz(bitlife): APK içerik modeli [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   832e7b9..8f271b8  HEAD -> arena/a59d6787-soccerchampssandbox
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
[arena/a59d6787-soccerchampssandbox 6725620] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   8f271b8..6725620  HEAD -> arena/a59d6787-soccerchampssandbox
::warning::Oyunun veri dosyalarında enjekte edilebilir içerik tablosu bulunamadı
değişiklik yok — yine de imzalama zinciri sınanacak
değişen girdi: 0
→ unsigned.apk (141434800 bayt)
-rw-r--r-- 1 runner runner 141434800 Oct 31 10:31 unsigned.apk
    testing: stamp-cert-sha256        OK
No errors detected in compressed data of unsigned.apk.
mevcut anahtar indirildi
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
-rw-r--r-- 1 runner runner 141709099 Oct 31 10:31 theboys-signed.apk
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
-rw-r--r--  1 runner runner  584 Oct 31 10:31 07f7c884-c70f-4cf3-ab1a-3477fd97816f.sh
-rw-r--r--  1 runner runner  212 Oct 31 10:31 2bc638d2-2f64-4f98-b5bc-c55f8bc4a684.sh
-rw-r--r--  1 runner runner  204 Oct 31 10:31 46a21d43-5929-4244-8e45-277bfc613ce4.sh
-rw-r--r--  1 runner runner  201 Oct 31 10:31 47081a53-8259-4bd2-aba3-2b67637627fd.sh
-rw-r--r--  1 runner runner 1.7K Oct 31 10:28 5d669dd6-9d9b-46c0-ac8d-fbf98fc0eebd.sh
-rw-r--r--  1 runner runner 1.8K Oct 31 10:28 9f5f37b8-5166-48f2-abf8-b8895acfaf05.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 10:28 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 10:31 _runner_file_commands
-rw-r--r--  1 runner runner  393 Oct 31 10:28 ad0bc047-15f8-476b-82ed-fcab2cf3969f.sh
-rw-r--r--  1 runner runner  381 Oct 31 10:31 aff1c5af-ec5c-41a6-be3f-084c6ca16c12.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:31 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 10:31 apktool.log
-rw-r--r--  1 runner runner 135M Oct 31 10:28 base.apk
-rw-r--r--  1 runner runner 135M Oct 31 10:28 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 10:28 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 10:28 bt.txt
-rw-r--r--  1 runner runner  850 Oct 31 10:31 c5a966b8-1844-4792-b9be-b5d890046392.sh
-rw-r--r--  1 runner runner  915 Oct 31 10:28 c94131e5-42dc-4c64-8ace-7eeb446de779.sh
-rw-r--r--  1 runner runner  325 Oct 31 10:31 certs.txt
drwxr-xr-x 20 runner runner 4.0K Oct 31 10:31 decoded
-rw-r--r--  1 runner runner  14K Oct 31 10:31 diag.log
-rw-r--r--  1 runner runner  464 Oct 31 10:31 ea6c9e6c-0b8d-4ae1-9d30-5db80c0f7a13.sh
-rw-r--r--  1 runner runner  364 Oct 31 10:31 ef83306e-bcfa-4434-aac8-7e29bca5ee3c.sh
-rw-r--r--  1 runner runner  666 Oct 31 10:31 f610a279-f3b2-45f9-a662-1939dbf9d8cb.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 10:31 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 10:28 original.apk
-rw-r--r--  1 runner runner 136M Oct 31 10:31 theboys-signed.apk
-rw-r--r--  1 runner runner 1.1M Oct 31 10:31 theboys-signed.apk.idsig
-rw-r--r--  1 runner runner   85 Oct 31 10:31 theboys-signed.apk.sha256
