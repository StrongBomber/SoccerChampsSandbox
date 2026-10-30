#!/usr/bin/env bash
# THE BOYS modu — kurulabilir paket (Magisk / KernelSU modülü).
#
# Oyunun APK'sı DEĞİŞMEZ. Paket şunları yapar:
#   • frida-server'ı cihaza kurar ve açılışta kendiliğinden başlatır
#   • mod ajanını (bitlife/theboys-mod.js) cihaza bırakır
#   • böylece her seferinde "adb push + chmod + başlat" gerekmez
#
# Kullanım:
#   tools/build-mod-zip.sh                          # frida-server zaten indirilmişse: vendor/frida-server
#   tools/build-mod-zip.sh /yol/frida-server-arm    # açıkça belirt
#   FDI_SERVER_URL=... tools/build-mod-zip.sh       # URL'den indir (CI bunu kullanır)
#
# Çıktı: dist/theboys-mod-magisk.zip
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/dist"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

VERSION="${MOD_VERSION:-1.1}"
VERSION_CODE="${MOD_VERSION_CODE:-2}"
PKG="com.candywriter.bitlife"
PORT=27042

SRV="${1:-}"
if [ -z "$SRV" ] && [ -n "${FDI_SERVER_URL:-}" ]; then
  echo "==> frida-server indiriliyor"
  curl -fL --retry 3 "$FDI_SERVER_URL" -o "$WORK/frida-server.xz"
  xz -dc "$WORK/frida-server.xz" > "$WORK/frida-server"
  chmod 755 "$WORK/frida-server"
  SRV="$WORK/frida-server"
fi
[ -z "$SRV" ] && [ -f "$ROOT/vendor/frida-server" ] && SRV="$ROOT/vendor/frida-server"
[ -n "$SRV" ] && [ -f "$SRV" ] || { echo "frida-server bulunamadı (argüman, vendor/ veya FDI_SERVER_URL)" >&2; exit 1; }

MOD="$WORK/mod"
mkdir -p "$MOD/system/bin" "$MOD/agent"

cp "$SRV" "$MOD/system/bin/frida-server"
chmod 755 "$MOD/system/bin/frida-server"
cp "$ROOT/bitlife/theboys-mod.js" "$MOD/agent/theboys-mod.js"

cat > "$MOD/module.prop" <<EOF
id=boysmod
name=The Boys Mod (BitLife)
version=$VERSION
versionCode=$VERSION_CODE
author=SoccerChampsSandbox
description=BitLife icin The Boys modu: frida-server acilista baslar, ajan /data/adb/boysmod/ altinda. Oyun APK'si degismez, dagitilmaz.
EOF

cat > "$MOD/customize.sh" <<'EOF'
SKIPUNZIP=0
ui_print "- The Boys modu kuruluyor"
ui_print "- BitLife APK'si DEGISMEZ; mod yalnizca calisma aninda uygulanir"
set_perm_recursive "$MODPATH/agent" 0 0 0755 0644
set_perm "$MODPATH/system/bin/frida-server" 0 0 0755
mkdir -p /data/adb/boysmod
cp "$MODPATH/agent/theboys-mod.js" /data/adb/boysmod/theboys-mod.js
set_perm /data/adb/boysmod/theboys-mod.js 0 0 0644
ui_print "- Ajan: /data/adb/boysmod/theboys-mod.js"
EOF

cat > "$MOD/post-fs-data.sh" <<EOF
#!/system/bin/sh
# frida-server'ı erken başlat (oyun açılmadan hazır olsun)
MODDIR=\${MODDIR:-/data/adb/modules/wscmod}
LOG=/data/local/tmp/boysmod.log
(
  until [ "\$(getprop sys.boot_completed)" = "1" ]; do sleep 2; done
  pkill -f frida-server 2>/dev/null
  "\$MODDIR/system/bin/frida-server" -l 127.0.0.1:$PORT >> \$LOG 2>&1 &
  echo "\$(date) frida-server başlatıldı (port $PORT)" >> \$LOG
) &
EOF

cat > "$MOD/service.sh" <<EOF
#!/system/bin/sh
# Geç önyükleme: sunucu düştüyse yeniden başlat
MODDIR=\${MODDIR:-/data/adb/modules/wscmod}
LOG=/data/local/tmp/boysmod.log
sleep 20
if ! pgrep -f frida-server >/dev/null 2>&1; then
  "\$MODDIR/system/bin/frida-server" -l 127.0.0.1:$PORT >> \$LOG 2>&1 &
  echo "\$(date) frida-server yeniden başlatıldı" >> \$LOG
fi
EOF

chmod 755 "$MOD/post-fs-data.sh" "$MOD/service.sh" "$MOD/customize.sh"

cat > "$MOD/README.md" <<EOF
# The Boys Mod (Magisk/KernelSU)

- **BitLife APK'sı değişmez ve bu pakette yoktur.**
- \`frida-server\` açılışta kendiliğinden başlar (port $PORT).
- Mod ajanı: \`/data/adb/boysmod/theboys-mod.js\`

## Kullanım

Telefonda oyunu aç, sonra bilgisayardan:

\`\`\`bash
frida -U -n $PKG -l /data/adb/boysmod/theboys-mod.js
\`\`\`

veya repodaki tek komut:

\`\`\`bash
tools/theboys.sh --attach
\`\`\`

Oyunun kendi penceresinde **◢ THE BOYS** düğmesi belirir.
Log: \`/data/local/tmp/wscmod.log\`
EOF

cat > "$MOD/uninstall.sh" <<'EOF'
#!/system/bin/sh
pkill -f frida-server 2>/dev/null
rm -rf /data/adb/boysmod
EOF
chmod 755 "$MOD/uninstall.sh"

mkdir -p "$OUT_DIR"
( cd "$MOD" && zip -qr "$OUT_DIR/theboys-mod-magisk.zip" . )
( cd "$OUT_DIR" && sha256sum theboys-mod-magisk.zip > theboys-mod-magisk.zip.sha256 )

echo
echo "==> $OUT_DIR/theboys-mod-magisk.zip"
ls -l "$OUT_DIR/theboys-mod-magisk.zip"
unzip -l "$OUT_DIR/theboys-mod-magisk.zip"
echo
cat "$OUT_DIR/theboys-mod-magisk.zip.sha256"
