#!/usr/bin/env bash
# World Soccer Champs kayıt verisini cihazdan çek / geri yaz.
#
# Kullanım:
#   tools/wsc-save.sh pull  [çıktı_dizini]   # /data/data/<paket>/files -> ./saves/
#   tools/wsc-save.sh push  [girdi_dizini]   # düzenlenmiş dosyaları geri yazar
#   tools/wsc-save.sh ls                     # cihazdaki kayıt dosyalarını listeler
#
# Gereksinim: root (adb shell su) VEYA Android 10 ve altı (o zaman /sdcard üzerinden).
# Root yoksa: docs/ROOTSUZ-KURULUM.md
set -euo pipefail

PKG="com.monkeyibrow.worldsoccerchamps"
REMOTE="/data/data/$PKG/files"
CMD="${1:-ls}"
DIR="${2:-saves}"

have_root() {
  adb shell 'su -c id' 2>/dev/null | grep -q 'uid=0'
}

case "$CMD" in
  ls)
    if have_root; then
      adb shell "su -c 'ls -la $REMOTE'"
    else
      echo "root yok; /sdcard üzerinden deneniyor (yalnızca Android 10 ve altı)"
      adb shell "ls -la /sdcard/Android/data/$PKG/files" || {
        echo "Erişim yok. Android 11+ scoped storage root olmadan izin vermez." >&2
        exit 1
      }
    fi
    ;;

  pull)
    mkdir -p "$DIR"
    if have_root; then
      adb shell "su -c 'tar -C $REMOTE -cf - .'" > "$DIR/save.tar"
    else
      adb pull "/sdcard/Android/data/$PKG/files/." "$DIR/" 2>/dev/null || {
        echo "Çekme başarısız: root gerekli." >&2; exit 1
      }
    fi
    [ -f "$DIR/save.tar" ] && (cd "$DIR" && tar -xf save.tar -C . 2>/dev/null || tar -xf save.tar)
    echo "Kayıt şuraya çekildi: $DIR"
    find "$DIR" -maxdepth 2 -type f -printf '  %p (%s bayt)\n' | head -40
    ;;

  push)
    [ -d "$DIR" ] || { echo "Dizin yok: $DIR" >&2; exit 1; }
    ( cd "$DIR" && tar -cf ../save-push.tar . )
    adb push "$DIR/../save-push.tar" /data/local/tmp/save-push.tar
    adb shell "su -c 'tar -C $REMOTE -xf /data/local/tmp/save-push.tar && rm /data/local/tmp/save-push.tar'"
    echo "Kayıt cihaza geri yazıldı. Oyunu tamamen kapatıp yeniden aç."
    ;;

  *)
    sed -n '2,12p' "$0"
    exit 2
    ;;
esac
