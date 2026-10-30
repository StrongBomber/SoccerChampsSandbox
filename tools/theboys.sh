#!/usr/bin/env bash
# BitLife'i THE BOYS moduyla başlat (tek komut).
#
#   tools/theboys.sh                    # frida-server zaten çalışıyorsa doğrudan bağlan
#   tools/theboys.sh --server /yol/frida-server-arm    # sunucuyu at + başlat + oyunu aç
#   tools/theboys.sh --attach            # oyun zaten açıksa sürece enjekte et
#   tools/theboys.sh --check             # cihaz/kök/mimari raporu (hiçbir şey değiştirmez)
#   tools/theboys.sh --emulator          # LDPlayer/MuMu/BlueStacks: adb connect 127.0.0.1:5555
#
# Gereksinim: root'lu cihaz veya root açık emülatör + `adb` + `frida-tools`.
# Karşı koruma yok: APK değişmez, yalnızca oyun süreci çalışırken modlanır.
set -euo pipefail

PKG="com.candywriter.bitlife"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT="$ROOT/bitlife/theboys-mod.js"
REMOTE="/data/local/tmp/frida-server"
PORT=27042

MODE="spawn"
SERVER=""
EMU=""

while [ $# -gt 0 ]; do
  case "$1" in
    --server) SERVER="${2:-}"; shift 2 ;;
    --attach) MODE="attach"; shift ;;
    --check)  MODE="check"; shift ;;
    --emulator) EMU="${2:-127.0.0.1:5555}"; shift; [ $# -gt 0 ] && [ "${1#-}" = "$1" ] && shift || true ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "bilinmeyen argüman: $1" >&2; exit 2 ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "eksik araç: $1" >&2; exit 1; }; }
need adb

if [ -n "$EMU" ]; then
  echo "==> emülatöre bağlanılıyor: $EMU"
  adb connect "$EMU" >/dev/null || true
  sleep 1
fi
[ -f "$AGENT" ] || { echo "ajan bulunamadı: $AGENT" >&2; exit 1; }

DEVICE="$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
[ -n "$DEVICE" ] || { echo "bağlı cihaz yok — 'adb devices' boş" >&2; exit 1; }

ABI="$(adb shell getprop ro.product.cpu.abilist 2>/dev/null | tr -d '\r' || true)"
SDK="$(adb shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || true)"
HAS_ROOT=no
adb shell 'su -c id' 2>/dev/null | grep -q 'uid=0' && HAS_ROOT=yes
GAME_INSTALLED=no
adb shell "pm list packages $PKG" 2>/dev/null | grep -q "$PKG" && GAME_INSTALLED=yes

echo "cihaz      : $DEVICE"
echo "android sdk: ${SDK:-?}"
echo "abilist    : ${ABI:-?}"
echo "root       : $HAS_ROOT"
echo "oyun       : $GAME_INSTALLED ($PKG)"
echo "ajan       : $AGENT"

if [ "$MODE" = "check" ]; then
  echo
  echo "frida (PC) : $(frida --version 2>/dev/null || echo 'yok — pip install frida-tools')"
  echo "frida-server (cihaz): $(adb shell "su -c 'ls -l $REMOTE 2>/dev/null'" 2>/dev/null | tr -d '\r' || echo 'yok')"
  exit 0
fi

[ "$HAS_ROOT" = "yes" ] || { echo "root gerekli: Frida oyun sürecine enjekte edilecek" >&2; exit 1; }
[ "$GAME_INSTALLED" = "yes" ] || { echo "oyun kurulu değil: $PKG" >&2; exit 1; }
need frida

if [ -n "$SERVER" ]; then
  echo "==> frida-server cihaza kopyalanıyor"
  adb push "$SERVER" "$REMOTE"
  adb shell "su -c 'chmod 755 $REMOTE'"
  adb shell "su -c 'pkill -f frida-server || true'"
  echo "==> frida-server başlatılıyor (port $PORT)"
  adb shell "su -c 'nohup $REMOTE -l 0.0.0.0:$PORT >/dev/null 2>&1 &'"
  sleep 2
fi

if [ "$MODE" = "attach" ]; then
  echo "==> çalışan oyuna enjekte ediliyor"
  exec frida -U -n "$PKG" -l "$AGENT"
fi

echo "==> BitLife THE BOYS moduyla başlatılıyor"
exec frida -U -f "$PKG" -l "$AGENT" --no-pause
