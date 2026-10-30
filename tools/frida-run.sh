#!/usr/bin/env bash
# Frida sunucusunu başlat ve Sandbox Mod Menu ile oyunu aç.
#
# Kullanım:
#   tools/frida-run.sh /yol/frida-server        # root'lu cihaz / emülatör
#   tools/frida-run.sh --no-server              # frida-server zaten çalışıyorsa
#
# frida-server indirme (mimariye göre):
#   https://github.com/frida/frida/releases  ->  frida-server-<sürüm>-android-arm.xz
#   (oyun yalnızca armeabi-v7a içeriyor; 64-bit cihazda arm build gerekir)
set -euo pipefail

PKG="com.monkeyibrow.worldsoccerchamps"
AGENT="$(cd "$(dirname "$0")/.." && pwd)/modmenu/sandbox-menu.js"
SERVER="${1:-}"
PORT=27042

command -v frida >/dev/null || { echo "frida CLI yok: pip install frida-tools" >&2; exit 1; }
[ -f "$AGENT" ] || { echo "agent bulunamadı: $AGENT" >&2; exit 1; }

if [ "$SERVER" != "--no-server" ] && [ -n "$SERVER" ]; then
  echo "==> frida-server cihaza kopyalanıyor"
  adb push "$SERVER" /data/local/tmp/frida-server
  adb shell "su -c 'chmod 755 /data/local/tmp/frida-server'"
  echo "==> frida-server başlatılıyor"
  adb shell "su -c 'nohup /data/local/tmp/frida-server -l 0.0.0.0:$PORT >/dev/null 2>&1 &'"
  sleep 2
fi

echo "==> cihaz: $(frida-ps -U 2>/dev/null | head -1)"
echo "==> oyun başlatılıyor: $PKG"
frida -U -f "$PKG" -l "$AGENT" --no-pause
