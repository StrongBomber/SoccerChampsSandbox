# Tanılama

sürüm: 2026-10-31T13:05:34Z

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
136:-rw-r--r-- 1 runner runner 240 Oct 31 13:04 apk-analiz/literals.json
175:| `.kotlin_builtins` | 8 |
251:değişen girdi: 0
257:build-tools: /usr/local/lib/android/sdk/build-tools/37.0.0
265:--- imza doğrulaması ---
275:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
276:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
277:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
278:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
279:V3.0 Signer: key algorithm: RSA
280:V3.0 Signer: key size (bits): 2048
281:V3.0 Signer: public key SHA-256 digest: de0a98b2e5622387d34d5237649fea9264e081088af87306dbf4751e0b354bef
282:V3.0 Signer: public key SHA-1 digest: 77e59bea5d04dc112988f77569bb7c505595b3b1
283:V3.0 Signer: public key MD5 digest: fab6c336c4bb0e10a1abc048f3c67055
287:doğrulanan 23/23 · hatalı 0
288:rc(patch)=0
302:15 denetim · hata 3 · uyarı 0
310:  ✓ APK imza bloğu — ["APK Signature Scheme v2", "APK Signature Scheme v3", "bilinmeyen"]
311:  ✓ v2 imzası — APK Signature Scheme v2 var
312:  ✓ v3 imzası — APK Signature Scheme v3 var
313:  ✓ v1 imzası tutarlı — v1 yok (v2/v3 yeterli)
317:  ✗ beklenen dışında değişen girdi yok — değişen: 1 (assets/bin/Data/Managed/Metadata/global-metadata.dat) · eklenen: 0 · silinen: 1 · BEKLENMEYEN: stamp-cert-sha256
318:rc(doctor)=1
319:[arena/a59d6787-soccerchampssandbox 8cfd225] dogrulama(bitlife): imzali APK denetimi (rc=1) [skip ci]
--- son 120 satır ---

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
[arena/a59d6787-soccerchampssandbox 26ea727] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   035942c..26ea727  HEAD -> arena/a59d6787-soccerchampssandbox
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
değişen girdi: 0
değişiklik yok — dosya birebir kopyalandı: unsigned.apk
-rw-r--r-- 1 runner runner 141434895 Oct 31 13:05 unsigned.apk
    testing: stamp-cert-sha256        OK
No errors detected in compressed data of unsigned.apk.
mevcut anahtar indirildi
build-tools: /usr/local/lib/android/sdk/build-tools/37.0.0
::warning::zipalign -P 16 desteklenmiyor, 4 KB hizalama kullanılıyor
--- hizalama doğrulaması ---
141146500 src/google/protobuf/type.proto (OK - compressed)
141148941 src/google/protobuf/wrappers.proto (OK - compressed)
141150551 user-messaging-platform.properties (OK - compressed)
141150652 stamp-cert-sha256 (OK - compressed)
Verification successful
--- imza doğrulaması ---
Verifies
Verified using v1 scheme (JAR signing): false
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Verified using v3.1 scheme (APK Signature Scheme v3.1): false
Verified using v3.2 scheme (APK Signature Scheme v3.2): false
Verified using v4 scheme (APK Signature Scheme v4): false
Verified for SourceStamp: false
Number of signers: 1
V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
V3.0 Signer: key algorithm: RSA
V3.0 Signer: key size (bits): 2048
V3.0 Signer: public key SHA-256 digest: de0a98b2e5622387d34d5237649fea9264e081088af87306dbf4751e0b354bef
V3.0 Signer: public key SHA-1 digest: 77e59bea5d04dc112988f77569bb7c505595b3b1
V3.0 Signer: public key MD5 digest: fab6c336c4bb0e10a1abc048f3c67055
-rw-r--r-- 1 runner runner 141450854 Oct 31 13:05 theboys-signed.apk
43ad001ccd21270d3e851284f30ccbdf41c3ad5e4edf24f74366d2574f465e68  theboys-signed.apk
== metin yaması gerçekten içinde mi? ==
doğrulanan 23/23 · hatalı 0
rc(patch)=0
== APK doktoru (kurulabilirlik) ==
package: name='com.candywriter.bitlife' versionCode='1069' versionName='3.26.0' platformBuildVersionName='16' platformBuildVersionCode='36' compileSdkVersion='36' compileSdkVersionCodename='16'
install-location:'preferExternal'
minSdkVersion:'25'
targetSdkVersion:'36'
uses-permission: name='android.permission.INTERNET'
uses-permission: name='android.permission.ACCESS_NETWORK_STATE'
uses-permission: name='android.permission.ACCESS_WIFI_STATE'
uses-permission: name='android.permission.VIBRATE'
uses-permission: name='com.google.android.gms.permission.AD_ID'
uses-permission: name='android.permission.READ_PHONE_STATE'
uses-permission: name='com.android.vending.BILLING'
uses-permission: name='com.android.vending.CHECK_LICENSE'
15 denetim · hata 3 · uyarı 0
  ✓ zip bütünlüğü (CRC) — tüm girdiler sağlam
  ✓ resources.arsc sıkıştırılmamış — compress_type=0 (STORED)
  ✗ resources.arsc 4 bayt hizalı — veri ofseti 137460499 (mod 4 = 3)
  ✓ .so sıkıştırılmamış — 0/0 .so STORED
  ✓ .so 4 KB hizalı — 0/0 .so 4096 hizalı
  ✓ .so 16 KB hizalı (Android 15+ 16 KB sayfa cihazları) — 0/0 .so 16384 hizalı
  ✓ zip merkezi dizin (EOCD) — CD 286288 bayt, ofset 141164544
  ✓ APK imza bloğu — ["APK Signature Scheme v2", "APK Signature Scheme v3", "bilinmeyen"]
  ✓ v2 imzası — APK Signature Scheme v2 var
  ✓ v3 imzası — APK Signature Scheme v3 var
  ✓ v1 imzası tutarlı — v1 yok (v2/v3 yeterli)
  ✓ AndroidManifest.xml var — 79236 bayt
  ✓ en az bir dex var — 11 dex: classes.dex, classes10.dex, classes11.dex, classes2.dex, classes3.dex, classes4.dex, classes5.dex, classes6.dex, classes7.dex, classes8.dex, classes9.dex
  ✗ en az bir ABI var — ABI: yok
  ✗ beklenen dışında değişen girdi yok — değişen: 1 (assets/bin/Data/Managed/Metadata/global-metadata.dat) · eklenen: 0 · silinen: 1 · BEKLENMEYEN: stamp-cert-sha256
rc(doctor)=1
[arena/a59d6787-soccerchampssandbox 8cfd225] dogrulama(bitlife): imzali APK denetimi (rc=1) [skip ci]
 4 files changed, 163 insertions(+), 4 deletions(-)
 create mode 100644 apk-analiz/TANI-APK.md
 create mode 100644 apk-analiz/doctor.json
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   26ea727..8cfd225  HEAD -> arena/a59d6787-soccerchampssandbox
```

## artifacts
total 946M
-rw-r--r--  1 runner runner  204 Oct 31 13:05 087a0a29-686f-45d4-a1ed-0848a68b96a4.sh
-rw-r--r--  1 runner runner  666 Oct 31 13:05 0dc60819-8333-4b04-bfba-3d9dd794325f.sh
-rw-r--r--  1 runner runner 1.4K Oct 31 13:02 12a4efe3-ea0b-4141-a388-66df1cf0e7d5.sh
-rw-r--r--  1 runner runner  915 Oct 31 13:02 139f6f12-7fd3-4e99-9df8-9a0a4f9ce96d.sh
-rw-r--r--  1 runner runner  464 Oct 31 13:05 1ce46c71-1ef5-48e5-920d-182a3919eaaf.sh
-rw-r--r--  1 runner runner  269 Oct 31 13:05 3faa451e-235b-460e-979c-836872606365.sh
-rw-r--r--  1 runner runner  500 Oct 31 13:05 48cd275e-05b1-4241-9577-0b480b110b9a.sh
-rw-r--r--  1 runner runner 1.1K Oct 31 13:05 8c9f667c-32b1-4d78-b266-dca8605fa10d.sh
-rw-r--r--  1 runner runner  698 Oct 31 13:05 903337c7-6fdd-4150-b574-c380163df129.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 13:01 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 13:05 _runner_file_commands
-rw-r--r--  1 runner runner 1.1K Oct 31 13:05 a0a24f01-30bd-4e86-962e-4e2d49f4a4ef.sh
-rw-r--r--  1 runner runner 135M Oct 31 13:05 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 13:05 apktool.log
-rw-r--r--  1 runner runner 135M Oct 31 13:02 base.apk
-rw-r--r--  1 runner runner 135M Oct 31 13:02 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 13:02 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 13:02 bt.txt
-rw-r--r--  1 runner runner 1.1K Oct 31 13:05 certs.txt
drwxr-xr-x 20 runner runner 4.0K Oct 31 13:05 decoded
-rw-r--r--  1 runner runner  381 Oct 31 13:05 df45d473-4588-4c02-87ac-c5e8d119f550.sh
-rw-r--r--  1 runner runner  17K Oct 31 13:05 diag.log
-rw-r--r--  1 runner runner  850 Oct 31 13:05 e91520db-01dd-457a-b36f-907a640f3f88.sh
-rw-r--r--  1 runner runner 1.7K Oct 31 13:01 ebc6fb22-fb91-4914-b2bb-b416d0d9f9cd.sh
-rw-r--r--  1 runner runner 1.1K Oct 31 13:02 ef053d38-f5c6-458e-91c5-ee0e6316bf91.sh
-rw-r--r--  1 runner runner  212 Oct 31 13:04 f557a1cd-e46d-4274-9506-19d15ececccc.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 13:05 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 13:02 original.apk
-rw-r--r--  1 runner runner 135M Oct 31 13:05 patched.apk
