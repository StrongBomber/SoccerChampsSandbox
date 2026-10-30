# WSC Mod Menu — oyun içi (Frida)

`modmenu/game-mod.js`, World Soccer Champs'in **kendi penceresine** yüzen bir `◢ MOD`
düğmesi ve panel ekleyen Frida ajanıdır. Ayrı uygulama değildir: APK değişmez, koruma
tetiklenmez, mod yalnızca oyun süreci çalışırken uygulanır.

```
◢ MOD  →  [ Tara ] [ Hazır ] [ Kayıt ]
   Tara  : int32/int64/float/double değer taraması
           İlk Ara · Değişti · Aynı · Arttı · Azaldı
           Seçilene Yaz · Tümüne Yaz · Dondur/Çöz
           + Dosya izleyici (oyunun açtığı kayıt dosyaları)
   Hazır : transfer/maaş bütçesi, bakiye, CA, PA, nitelik, itibar şablonları
   Kayıt : oyunun kendi files/ dizini — liste, oku, yedekle, JSON'u düzenleyip geri yaz
```

## Hızlı başlangıç

```bash
tools/game-mod.sh --check                          # cihaz + root + mimari raporu
tools/game-mod.sh --emulator                       # LDPlayer/MuMu (adb connect 127.0.0.1:5555)
tools/game-mod.sh --server /yol/frida-server-arm   # sunucuyu at, oyunu mod menüsüyle aç
tools/game-mod.sh --attach                         # oyun açıksa sürece enjekte et
```

Manuel:

```bash
adb push frida-server-arm /data/local/tmp/frida-server
adb shell "su -c 'chmod 755 /data/local/tmp/frida-server'"
adb shell "su -c '/data/local/tmp/frida-server &'"
frida -U -f com.monkeyibrow.worldsoccerchamps -l modmenu/game-mod.js --no-pause
```

## Neden offset yok?

`libWorldSoccerChamps.so` 15,9 MB, C++ ve **stripped** (sembol yok, `Data/Classes/...`
yolları yalnızca hata ayıklama dizesi olarak duruyor). Bu yüzden sabit offset yerine
**değer taraması** kullanılır: oyun içi değer → tarama → oyunda değiştir → daralt → yaz.

## Gereksinimler

| Gereksinim | Not |
|---|---|
| Root'lu cihaz **veya** root açık emülatör | `frida-server` için |
| `frida-tools` (PC) | `pip install frida-tools` |
| `frida-server` (cihaz) | oyun armeabi-v7a → 64-bit cihazda `android-arm` build |
| USB hata ayıklama | `adb devices` görmeli |

## Test

```bash
node tests/game-mod-test.mjs    # sahte Frida ortamında 27 iddia
```

Ajanın tamamı (tarama, daraltma, yazma, dondurma, kayıt API'si, izleyici) gerçek cihaz
olmadan sınanır. Ayrıntı ve dürüst sınırlar: [`../docs/GAME-MOD.md`](../docs/GAME-MOD.md).
