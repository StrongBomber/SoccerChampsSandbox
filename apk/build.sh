#!/usr/bin/env bash
# WSC In-Game Editor — APK derleme betiği (Gradle'siz, doğrudan Android SDK araçlarıyla).
#
# Gereksinimler: JDK 17+, Android SDK (build-tools + platforms/android-34)
# Kullanım:  apk/build.sh  [--release]
# Çıktı:     apk/out/wsc-editor.apk  (+ .sha256)
set -euo pipefail

cd "$(dirname "$0")"
APK_DIR="$(pwd)"
ROOT="$(cd .. && pwd)"
OUT="$APK_DIR/out"
BUILD="$APK_DIR/build"
MODE="${1:-debug}"

SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [ -z "$SDK" ] || [ ! -d "$SDK" ]; then
  echo "HATA: Android SDK bulunamadı (ANDROID_SDK_ROOT)." >&2
  exit 1
fi

BT="$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1)"
PLATFORM="$(ls -d "$SDK"/platforms/android-* 2>/dev/null | grep -Ev -- '-(beta|rc|preview)' | sort -V | tail -1)"
[ -n "$BT" ] || { echo "HATA: build-tools yok." >&2; exit 1; }
[ -n "$PLATFORM" ] || { echo "HATA: platforms/android-* yok." >&2; exit 1; }
ANDROID_JAR="$PLATFORM/android.jar"

echo "==> SDK      : $SDK"
echo "==> build-tools: $(basename "$BT")"
echo "==> platform : $(basename "$PLATFORM")"

rm -rf "$BUILD" "$OUT"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/assets" "$OUT"

# ---------------------------------------------------------------- 1) varlıklar
echo "==> [1/6] Web uygulaması varlıkları kopyalanıyor"
cp "$ROOT"/sandbox-editor/index.html \
   "$ROOT"/sandbox-editor/app.js \
   "$ROOT"/sandbox-editor/data.js \
   "$ROOT"/sandbox-editor/detect.js \
   "$ROOT"/sandbox-editor/styles.css \
   "$ROOT"/sandbox-editor/demo-save.json \
   "$BUILD/assets/"

# demo verisini JS'e göm (file:// ortamında fetch() çalışmazsa yedek)
python3 - "$BUILD/assets" <<'PY'
import json, pathlib, sys
assets = pathlib.Path(sys.argv[1])
data = json.loads((assets / "demo-save.json").read_text(encoding="utf-8"))
(assets / "demo-save.js").write_text(
    "window.__DEMO_SAVE__ = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
html = (assets / "index.html").read_text(encoding="utf-8")
html = html.replace('<script src="./data.js"></script>',
                    '<script src="./demo-save.js"></script>\n<script src="./data.js"></script>')
(assets / "index.html").write_text(html, encoding="utf-8")
print("    demo-save.js gömüldü:", (assets / "demo-save.js").stat().st_size, "bayt")
PY

# ---------------------------------------------------------------- 2) java -> class
echo "==> [2/6] Java derleniyor"
set +e
javac -nowarn -source 8 -target 8 -bootclasspath "$ANDROID_JAR" \
      -classpath "$ANDROID_JAR" -d "$BUILD/classes" \
      $(find "$APK_DIR/java" -name '*.java') > "$BUILD/javac.log" 2>&1
JAVAC_RC=$?
set -e
grep -v "bootstrap class path" "$BUILD/javac.log" | grep -v "^warning: \[options\]" || true
if [ "$JAVAC_RC" -ne 0 ]; then
  echo "HATA: javac başarısız (rc=$JAVAC_RC)" >&2
  exit 1
fi
echo "    $(find "$BUILD/classes" -name '*.class' | wc -l) sınıf"

# ---------------------------------------------------------------- 3) d8 -> dex
echo "==> [3/6] DEX üretiliyor"
"$BT/d8" --lib "$ANDROID_JAR" --min-api 24 --release \
         --output "$BUILD/dex" $(find "$BUILD/classes" -name '*.class')
echo "    classes.dex: $(stat -c%s "$BUILD/dex/classes.dex") bayt"

# ---------------------------------------------------------------- 4) manifest/zip
echo "==> [4/6] APK paketleniyor"
"$BT/aapt2" compile --dir "$APK_DIR/res" -o "$BUILD/res.zip"
"$BT/aapt2" link -o "$BUILD/base.apk" -I "$ANDROID_JAR" \
     -R "$BUILD/res.zip" \
     --manifest "$APK_DIR/AndroidManifest.xml" \
     --min-sdk-version 24 --target-sdk-version 34 \
     --version-code 3 --version-name "1.2"

cp "$BUILD/dex/classes.dex" "$BUILD/classes.dex"
( cd "$BUILD" && zip -q base.apk classes.dex && zip -qr base.apk assets )

# ---------------------------------------------------------------- 5) hizala/imzala
echo "==> [5/6] Hizalanıyor (zipalign)"
"$BT/zipalign" -f -p 4 "$BUILD/base.apk" "$OUT/wsc-editor-unaligned.apk"

echo "==> [6/6] İmzalanıyor (apksigner)"
# Not: keystore repoya girmez (.gitignore); CI her derlemede üretir.
KS="$APK_DIR/keystore.jks"
if [ ! -f "$KS" ]; then
  echo "    keystore üretiliyor (wsc-editor.jks)"
  keytool -genkeypair -v -keystore "$KS" -storepass wsc-editor -keypass wsc-editor \
          -alias wsc -keyalg RSA -keysize 2048 -validity 10000 \
          -dname "CN=WSC In-Game Editor, OU=Sandbox, O=WSC, L=Istanbul, C=TR" >/dev/null 2>&1
fi

"$BT/apksigner" sign --ks "$KS" --ks-pass pass:wsc-editor --key-pass pass:wsc-editor \
      --out "$OUT/wsc-editor.apk" "$OUT/wsc-editor-unaligned.apk"
rm -f "$OUT/wsc-editor-unaligned.apk"

"$BT/apksigner" verify --print-certs "$OUT/wsc-editor.apk" | head -4
( cd "$OUT" && sha256sum wsc-editor.apk > wsc-editor.apk.sha256 )

echo
echo "==> TAMAM"
ls -la "$OUT"
echo "Boyut: $(du -h "$OUT/wsc-editor.apk" | cut -f1)"
