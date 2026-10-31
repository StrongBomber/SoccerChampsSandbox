# Tanılama

sürüm: 2026-10-31T13:16:11Z

```
21:build-tools: /usr/local/lib/android/sdk/build-tools/37.0.0
31:    ZIP/APK imzası doğru
118:lib/ YOK
127:rc(unity)=0
131:rc(probe1)=0
135:rc(probe2)=0
136:== metadata literal dökümü ==
138:çözüm: len_first taban: data · okunabilir literal: 1206 · ortalama: 0.101
139:literal: 1 · okunabilir: 1
140:→ apk-analiz/literals.json 240 bayt
141:rc(literals)=0
142:== metadata literal tablosu — kesin yer ==
154:rc(map2)=0
158:rc(map)=0
160:-rw-r--r-- 1 runner runner 240 Oct 31 13:15 apk-analiz/literals.json
199:| `.kotlin_builtins` | 8 |
275:değişen girdi: 0
281:build-tools: /usr/local/lib/android/sdk/build-tools/37.0.0
289:--- imza doğrulaması ---
299:V3.0 Signer: certificate DN: CN=The Boys Mod, O=BitLifeSandbox, C=TR
300:V3.0 Signer: certificate SHA-256 digest: 4c23343b95eb2e1e79e0b5ad938f0fd1ea94b6480f294e73ccadce0efba784e4
301:V3.0 Signer: certificate SHA-1 digest: ed0d96424bd305cb8eb2238d93ba831f72b36883
302:V3.0 Signer: certificate MD5 digest: 9e6d1d835d99f5e5c0aee1c1d1df48c1
303:V3.0 Signer: key algorithm: RSA
304:V3.0 Signer: key size (bits): 2048
305:V3.0 Signer: public key SHA-256 digest: de0a98b2e5622387d34d5237649fea9264e081088af87306dbf4751e0b354bef
306:V3.0 Signer: public key SHA-1 digest: 77e59bea5d04dc112988f77569bb7c505595b3b1
307:V3.0 Signer: public key MD5 digest: fab6c336c4bb0e10a1abc048f3c67055
311:doğrulanan 23/23 · hatalı 0
312:rc(patch)=0
344:16 denetim · hata 3 · uyarı 0
352:  ✓ APK imza bloğu — ["APK Signature Scheme v2", "APK Signature Scheme v3", "bilinmeyen"]
353:  ✓ v2 imzası — APK Signature Scheme v2 var
354:  ✓ v3 imzası — APK Signature Scheme v3 var
355:  ✓ v1 imzası tutarlı — v1 yok (v2/v3 yeterli)
359:  ✗ beklenen dışında değişen girdi yok — değişen: 1 (assets/bin/Data/Managed/Metadata/global-metadata.dat) · eklenen: 0 · silinen: 1 · BEKLENMEYEN: stamp-cert-sha256
360:  ✗ yerel kütüphane (lib/) var — lib/ girdisi: 0 · .so: 0 · YOK: bu APK tek başına çalışamaz (yerel kod ayrı split'te olabilir)
361:rc(doctor)=1
362:[arena/a59d6787-soccerchampssandbox ac43ccb] dogrulama(bitlife): imzali APK denetimi (rc=1) [skip ci]
--- son 120 satır ---
exit=3
[arena/a59d6787-soccerchampssandbox 909d899] enjeksiyon(bitlife): The Boys içeriği [skip ci]
 1 file changed, 1 insertion(+), 1 deletion(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   cf40844..909d899  HEAD -> arena/a59d6787-soccerchampssandbox
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
-rw-r--r-- 1 runner runner 141434895 Oct 31 13:16 unsigned.apk
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
-rw-r--r-- 1 runner runner 141450854 Oct 31 13:16 theboys-signed.apk
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
uses-permission: name='android.permission.POST_NOTIFICATIONS'
uses-permission: name='android.permission.WAKE_LOCK'
uses-permission: name='com.google.android.c2dm.permission.RECEIVE'
uses-permission: name='android.permission.ACCESS_ADSERVICES_TOPICS'
uses-permission: name='android.permission.ACCESS_ADSERVICES_ATTRIBUTION'
uses-permission: name='com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE'
uses-permission: name='android.permission.ACCESS_ADSERVICES_AD_ID'
uses-permission: name='android.permission.FOREGROUND_SERVICE'
uses-permission: name='android.permission.FOREGROUND_SERVICE_DATA_SYNC'
uses-permission: name='com.samsung.android.mapsagent.permission.READ_APP_INFO'
uses-permission: name='com.huawei.appmarket.service.commondata.permission.GET_COMMON_DATA'
uses-permission: name='com.candywriter.bitlife.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'
uses-permission: name='com.candywriter.bitlife.permission.C2D_MESSAGE'
uses-permission: name='android.permission.READ_CONTACTS'
uses-permission: name='com.amazon.privacypass.ATTEST'
application-label:'BitLife'
application-label-af:'BitLife'
application-label-af-ZA:'BitLife'
16 denetim · hata 3 · uyarı 0
  ✓ zip bütünlüğü (CRC) — tüm girdiler sağlam
  ✓ resources.arsc sıkıştırılmamış — compress_type=0 (STORED)
  ✓ resources.arsc 4 bayt hizalı — veri ofseti 137460508 (mod 4 = 0)
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
  ✗ yerel kütüphane (lib/) var — lib/ girdisi: 0 · .so: 0 · YOK: bu APK tek başına çalışamaz (yerel kod ayrı split'te olabilir)
rc(doctor)=1
[arena/a59d6787-soccerchampssandbox ac43ccb] dogrulama(bitlife): imzali APK denetimi (rc=1) [skip ci]
 2 files changed, 12 insertions(+), 4 deletions(-)
From https://github.com/StrongBomber/SoccerChampsSandbox
 * branch            arena/a59d6787-soccerchampssandbox -> FETCH_HEAD
Current branch arena/a59d6787-soccerchampssandbox is up to date.
To https://github.com/StrongBomber/SoccerChampsSandbox
   909d899..ac43ccb  HEAD -> arena/a59d6787-soccerchampssandbox
```

## artifacts
total 946M
-rw-r--r--  1 runner runner 1.7K Oct 31 13:09 01f88c28-9119-4971-ad89-0a109feefe59.sh
-rw-r--r--  1 runner runner 1.5K Oct 31 13:10 19ff4251-d39b-4522-85b2-70a7eb40a817.sh
-rw-r--r--  1 runner runner  381 Oct 31 13:15 1ff0ef16-85a2-489f-8c0f-e03826b63185.sh
-rw-r--r--  1 runner runner  212 Oct 31 13:15 2e5b2339-5805-431b-95de-93233778fd2f.sh
-rw-r--r--  1 runner runner 1.4K Oct 31 13:10 3e3dd207-d66b-407b-98ae-cce47c4fc2da.sh
-rw-r--r--  1 runner runner  464 Oct 31 13:16 66c7d15e-d698-4933-99ed-32fed7b09c41.sh
-rw-r--r--  1 runner runner  269 Oct 31 13:16 811795fb-c58e-4fe7-8bd8-3dd5f073e847.sh
-rw-r--r--  1 runner runner  850 Oct 31 13:16 9a7c58bf-cf70-4347-97cf-fbe274fa23fb.sh
-rw-r--r--  1 runner runner  204 Oct 31 13:15 9e09c416-289a-460c-ab86-3c6dd6a9022c.sh
drwxr-xr-x  2 runner runner 4.0K Oct 31 13:09 _github_workflow
drwxr-xr-x  2 runner runner  12K Oct 31 13:16 _runner_file_commands
-rw-r--r--  1 runner runner  500 Oct 31 13:16 ab62fafe-df39-4596-8641-4ea63003a835.sh
-rw-r--r--  1 runner runner 135M Oct 31 13:16 aligned.apk
-rw-r--r--  1 runner runner  863 Oct 31 13:15 apktool.log
-rw-r--r--  1 runner runner 135M Oct 31 13:10 base.apk
-rw-r--r--  1 runner runner  915 Oct 31 13:10 bce86760-130e-42df-a2cb-880325ea2007.sh
-rw-r--r--  1 runner runner 135M Oct 31 13:10 bitlife.apk
-rw-r--r--  1 runner runner  102 Oct 31 13:10 bitlife.apk.sha256
-rw-r--r--  1 runner runner   46 Oct 31 13:10 bt.txt
-rw-r--r--  1 runner runner  698 Oct 31 13:16 ce903a29-5a80-4a44-a639-616849375a72.sh
-rw-r--r--  1 runner runner 1.1K Oct 31 13:16 certs.txt
drwxr-xr-x 20 runner runner 4.0K Oct 31 13:15 decoded
-rw-r--r--  1 runner runner  19K Oct 31 13:16 diag.log
-rw-r--r--  1 runner runner 1.1K Oct 31 13:16 e306cc86-04e4-4852-9167-0d033adfac0c.sh
-rw-r--r--  1 runner runner 1.1K Oct 31 13:16 f4ae66ae-f709-4f30-93a8-f631d2f7ed91.sh
-rw-r--r--  1 runner runner  666 Oct 31 13:16 f9fd9d55-420b-4b9e-b91e-002bb1ec179d.sh
-rw-r--r--  1 runner runner 2.6K Oct 31 13:16 mod-signing.jks
-rw-r--r--  1 runner runner 135M Oct 31 13:10 original.apk
-rw-r--r--  1 runner runner 135M Oct 31 13:16 patched.apk
