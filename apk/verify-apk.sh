#!/usr/bin/env bash
# APK'nın gerçekten kurulabilir olduğunu doğrular (cihaz gerekmez).
# Kontroller: paket kimliği, launcher activity, minSdk/targetSdk, dex sınıfları,
# gömülü varlıklar, imza, zipalign.
set -euo pipefail
# Argümanı çağrıldığı dizine göre mutlaklaştır, sonra apk/ içine geç.
APK_ARG="${1:-out/wsc-editor.apk}"
case "$APK_ARG" in
  /*) APK="$APK_ARG" ;;
  *)  APK="$(pwd)/$APK_ARG" ;;
esac
cd "$(dirname "$0")"
[ -f "$APK" ] || { echo "APK bulunamadı: $APK" >&2; exit 1; }
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
BT="$(ls -d "$SDK"/build-tools/* 2>/dev/null | grep -Ev -- '-(beta|rc|preview)' | sort -V | tail -1)"

OUT="APK-VERIFY.txt"
: > "$OUT"
FAIL=0

say() { echo "$@" | tee -a "$OUT"; }
ok()  { say "  ✓ $*"; }
bad() { say "  ✗ $*"; FAIL=1; }

say "APK doğrulama: $APK"
say "Boyut: $(stat -c%s "$APK") bayt"
say "SHA-256: $(sha256sum "$APK" | cut -d' ' -f1)"
say ""

say "[1] Paket bilgisi (aapt2 dump badging)"
BADGING="$("$BT/aapt2" dump badging "$APK")"
echo "$BADGING" | sed 's/^/    /' >> "$OUT"
echo "$BADGING" | grep -q "package: name='com.wsc.editor'" && ok "paket: com.wsc.editor" || bad "paket adı yanlış"
echo "$BADGING" | grep -q "launchable-activity: name='com.wsc.editor.MainActivity'" && ok "launcher activity tanımlı" || bad "launcher activity yok"
echo "$BADGING" | grep -q "minSdkVersion:'24'" && ok "minSdk 24" || bad "minSdk 24 değil"
echo "$BADGING" | grep -q "targetSdkVersion:'34'" && ok "targetSdk 34" || bad "targetSdk 34 değil"
echo "$BADGING" | grep -q "application: label='WSC In-Game Editor'" && ok "uygulama etiketi" || bad "etiket yok"
echo "$BADGING" | grep -Eq "application: label='[^']+' icon='res/[^']+'" && ok "uygulama ikonu tanımlı" || bad "ikon yok"
echo "$BADGING" | grep -q "native-code" && bad "beklenmeyen native kod" || ok "native kod yok (saf Java — her ABI'de çalışır)"
say ""

say "[2] DEX sınıfları (dexdump)"
DEXDUMP="$("$BT/dexdump" -f "$APK" 2>/dev/null || true)"
for cls in "Lcom/wsc/editor/MainActivity;" "Lcom/wsc/editor/MiniServer;" "Lcom/wsc/editor/MainActivity\$Bridge;"; do
  echo "$DEXDUMP" | grep -q "Class descriptor.*$cls" && ok "sınıf: $cls" || bad "sınıf eksik: $cls"
done
say ""

say "[3] Gömülü varlıklar"
for asset in assets/index.html assets/app.js assets/data.js assets/styles.css assets/demo-save.json assets/demo-save.js assets/detect.js classes.dex; do
  unzip -l "$APK" | grep -q " $asset\$" && ok "$asset ($(unzip -l "$APK" | awk -v a="$asset" '$4==a {print $1}') bayt)" || bad "eksik: $asset"
done
say ""

say "[4] İmza (apksigner)"
if "$BT/apksigner" verify --print-certs "$APK" | sed 's/^/    /' >> "$OUT"; then
  ok "imza geçerli"
else
  bad "imza doğrulanamadı"
fi
say ""

say "[5] Hizalama (zipalign)"
"$BT/zipalign" -c -p 4 "$APK" && ok "4 bayt hizalı" || bad "hizalama hatalı"
say ""

if [ "$FAIL" -eq 0 ]; then
  say "SONUÇ: APK kurulabilir görünüyor (tüm kontroller geçti)"
else
  say "SONUÇ: HATA VAR — yukarıdaki ✗ satırlarına bak"
fi
exit "$FAIL"
