# Tanılama

sürüm: 2026-10-31T10:55:54Z

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
139:-rw-r--r-- 1 runner runner 240 Oct 31 10:55 apk-analiz/literals.json
140:[arena/a59d6787-soccerchampssandbox 1aec402] analiz(bitlife): unity + içerik + literal dökümü [skip ci]
176:| `.kotlin_builtins` | 8 |
252:değişiklik yok — yine de imzalama zinciri sınanacak
253:değişen girdi: 0
259:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
260:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
261:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
262:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
285:doğrulanan 23/23 · hatalı 0
286:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
287:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
288:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
289:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
290:[arena/a59d6787-soccerchampssandbox 6f1cc0c] dogrulama(bitlife): imzali APK icinde yama var [skip ci]
--- son 120 satır ---
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
(node:3488) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[arena/a59d6787-soccerchampssandbox ed3d0be] analiz(bitlife): APK içerik modeli [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   1aec402..ed3d0be  HEAD -> arena/a59d6787-soccerchampssandbox
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
[arena/a59d6787-soccerchampssandbox b43716c] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   ed3d0be..b43716c  HEAD -> arena/a59d6787-soccerchampssandbox
::warning::Oyunun veri dosyalarında enjekte edilebilir içerik tablosu bulunamadı
uygulanan: 23 · reddedilen: 0
→ apk-analiz/METIN-YAMASI.md
yamalanan=23
On branch arena/a59d6787-soccerchampssandbox
Your branch is up to date with 'origin/arena/a59d6787-soccerchampssandbox'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	apk-analiz-stdout.txt

nothing added to commit but untracked files present (use "git add" to track)
değişiklik yok
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Already up to date.
Everything up-to-date
taban: patched.apk
değişiklik yok — yine de imzalama zinciri sınanacak
değişen girdi: 0
→ unsigned.apk (141434895 bayt)
-rw-r--r-- 1 runner runner 141434895 Oct 31 10:55 unsigned.apk
    testing: stamp-cert-sha256        OK
No errors detected in compressed data of unsigned.apk.
mevcut anahtar indirildi
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
-rw-r--r-- 1 runner runner 141709099 Oct 31 10:55 theboys-signed.apk
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
doğrulanan 23/23 · hatalı 0
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
[arena/a59d6787-soccerchampssandbox 6f1cc0c] dogrulama(bitlife): imzali APK icinde yama var [skip ci]
 2 files changed, 193 insertions(+)
 create mode 100644 apk-analiz/DOGRULAMA.md
 create mode 100644 apk-analiz/verify.json
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   b43716c..6f1cc0c  HEAD -> arena/a59d6787-soccerchampssandbox
```

## artifacts
total 946M
-rw-r--r--  1 runner runner 1.4K Oct 31 10:55 07b92b6e-471a-4a69-b08b-a1acf8866cf7.sh
-rw-r--r--  1 runner runner  915 Oct 31 10:52 1e391b1d-ab54-4282-8653-6797fd169248.sh
-rw-r--r--  1 runner runner 1.9K Oct 31 10:52 21b7ce67-ae11-452a-8265-c8d0a33c896f.sh
-rw-r--r--  1 runner runner  584 Oct 31 10:55 3b18028d-6158-48fe-8fc9-4dbdc26a72d0.sh
-rw-r--r--  1 runner runner  600 Oct 31 10:55 532e97bf-99b9-495d-b01f-127fff5dc99a.sh
-rw-r--r--  1 runner runner  204 Oct 31 10:55 7382dae1-159a-429a-971a-29e084001deb.sh
-rw-r--r--  1 runner runner  666 Oct 31 10:55 7da4f38f-a702-44b2-a539-7c0dba4a1104.sh
-rw-r--r--  1 runner runner  464 Oct 31 10:55 84cf24cd-09b3-4995-a7f6-ee114fd76e38.sh
-rw-r--r--  1 runner runner  212 Oct 31 10:55 8f676c3f-0218-4a09-974c-08c3fe336ef6.sh
-rw-r--r--  1 runner runner  381 Oct 31 10:55 9a0f1342-e8f2-4c84-8a36-5c3d970f9c66.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 10:52 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 10:55 _runner_file_commands
-rw-r--r--  1 runner runner 1.7K Oct 31 10:52 a8ddbad9-f83e-4015-8194-706ceb635511.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:55 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 10:55 apktool.log
-rw-r--r--  1 runner runner  698 Oct 31 10:55 b33b94dd-bdff-4682-8bb9-98fe5dee6026.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:52 base.apk
-rw-r--r--  1 runner runner  850 Oct 31 10:55 bf4eb206-20a4-4001-8b8c-9c5b1065015c.sh
-rw-r--r--  1 runner runner 135M Oct 31 10:52 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 10:52 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 10:52 bt.txt
-rw-r--r--  1 runner runner  269 Oct 31 10:55 c4fb94c1-8479-4454-9f02-ccc3a67e31b5.sh
-rw-r--r--  1 runner runner  325 Oct 31 10:55 certs.txt
-rw-r--r--  1 runner runner  500 Oct 31 10:55 db9ff38e-ba77-4c18-b635-4705f678325f.sh
drwxr-xr-x 20 runner runner 4.0K Oct 31 10:55 decoded
-rw-r--r--  1 runner runner  16K Oct 31 10:55 diag.log
-rw-r--r--  1 runner runner  393 Oct 31 10:52 f2b5180e-8260-47dd-9f0c-bf4a1100ae59.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 10:55 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 10:52 original.apk
