# Tanılama

sürüm: 2026-10-31T10:19:36Z

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
121:rc(map)=0
125:rc(slice)=0
126:-rw-r--r-- 1 runner runner 240 Oct 31 10:18 apk-analiz/literals.json
127:[arena/a59d6787-soccerchampssandbox d858d9c] analiz(bitlife): unity + içerik + literal dökümü [skip ci]
166:| `.kotlin_builtins` | 8 |
225:değişiklik yok — yine de imzalama zinciri sınanacak
226:değişen girdi: 0
232:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
233:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
234:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
235:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
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
(node:4002) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[arena/a59d6787-soccerchampssandbox 3949812] analiz(bitlife): APK içerik modeli [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   d858d9c..3949812  HEAD -> arena/a59d6787-soccerchampssandbox
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
[arena/a59d6787-soccerchampssandbox 71fffc9] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   3949812..71fffc9  HEAD -> arena/a59d6787-soccerchampssandbox
::warning::Oyunun veri dosyalarında enjekte edilebilir içerik tablosu bulunamadı
değişiklik yok — yine de imzalama zinciri sınanacak
değişen girdi: 0
→ unsigned.apk (141434800 bayt)
-rw-r--r-- 1 runner runner 141434800 Oct 31 10:19 unsigned.apk
    testing: stamp-cert-sha256        OK
No errors detected in compressed data of unsigned.apk.
mevcut anahtar indirildi
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
-rw-r--r-- 1 runner runner 141709099 Oct 31 10:19 theboys-signed.apk
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
-rw-r--r--  1 runner runner  666 Oct 31 10:19 273d3107-e6be-419f-9a85-1bd99bba2a65.sh
-rw-r--r--  1 runner runner  915 Oct 31 10:13 58bd5e33-363d-488d-94af-a502a09c3434.sh
-rw-r--r--  1 runner runner  584 Oct 31 10:19 83d0f4ee-8d38-423f-bcc5-92f1c3ba6f4e.sh
-rw-r--r--  1 runner runner  381 Oct 31 10:19 8bcae18f-7733-4298-ae92-ccd7d18b256c.sh
-rw-r--r--  1 runner runner 2.1K Oct 31 10:13 939c4c92-7df3-4f6b-9e4b-01d54b158e13.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 10:13 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 10:19 _runner_file_commands
-rw-r--r--  1 runner runner 1.7K Oct 31 10:13 ae151f69-27a6-4332-a0b0-02e59703bba3.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:19 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 10:19 apktool.log
-rw-r--r--  1 runner runner 135M Oct 31 10:13 base.apk
-rw-r--r--  1 runner runner  850 Oct 31 10:19 bccbd6e7-14ad-45dd-948e-c3d8475ae9b4.sh
-rw-r--r--  1 runner runner  464 Oct 31 10:19 bfa6bca0-2ca5-475d-84bf-752923b76a44.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:13 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 10:13 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 10:13 bt.txt
-rw-r--r--  1 runner runner  201 Oct 31 10:19 c41bf89c-dd1a-44a8-82ba-6cc52eb57e3c.sh
-rw-r--r--  1 runner runner  212 Oct 31 10:18 c8ef0cd1-4af0-4fa5-8868-380111274d09.sh
-rw-r--r--  1 runner runner  325 Oct 31 10:19 certs.txt
-rw-r--r--  1 runner runner  364 Oct 31 10:19 dabf2c46-d425-4c34-9d61-f8f306a0e53a.sh
drwxr-xr-x 20 runner runner 4.0K Oct 31 10:19 decoded
-rw-r--r--  1 runner runner  13K Oct 31 10:19 diag.log
-rw-r--r--  1 runner runner  204 Oct 31 10:19 ebc4f8e4-55c3-4d99-a4ca-fb253e98d331.sh
-rw-r--r--  1 runner runner  393 Oct 31 10:13 f8f58b56-d96e-4c64-ae1a-6fb619939a3d.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 10:19 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 10:13 original.apk
-rw-r--r--  1 runner runner 136M Oct 31 10:19 theboys-signed.apk
-rw-r--r--  1 runner runner 1.1M Oct 31 10:19 theboys-signed.apk.idsig
-rw-r--r--  1 runner runner   85 Oct 31 10:19 theboys-signed.apk.sha256
