#!/usr/bin/env bash
# Yalnızca geliştirici kontrolü: Java kaynaklarını stub android.jar ile derler.
# Gerçek APK derlemesi apk/build.sh içindedir (gerçek Android SDK kullanır).
set -euo pipefail
cd "$(dirname "$0")"
OUT="${TMPDIR:-/tmp}/wsc-javac-check"
rm -rf "$OUT" && mkdir -p "$OUT"
javac -nowarn -d "$OUT" $(find stubs java -name '*.java')
echo "javac OK: $(find "$OUT" -name '*.class' | wc -l) sınıf derlendi"
