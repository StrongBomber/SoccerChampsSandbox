#!/usr/bin/env bash
# get-package.sh — BitLife için KURULABİLİR paketi halka açık kaynaklardan çeker.
#
#   bash tools/get-package.sh <cikti-dizini> [versionCode]
#
# Çıktı sözleşmesi (cikti-dizini içinde):
#   KIND   → universal | xapk | none
#   file   → indirilen dosyanın yolu
#   SONDA.md → her denemenin durum kodu / boyutu / sınıflandırması
#
# Sınıflandırma:
#   universal = APK'nın içinde lib/**/*.so VAR   → tek dosya kurulabilir
#   xapk      = base.apk + split_config*.apk var → split seti (SAI/APKPure kurar)
#   none      = hiçbiri (yalnızca base split → kurulamaz)
set -uo pipefail

OUT="${1:?kullanım: get-package.sh <cikti-dizini> [versionCode]}"
VC="${2:-}"
mkdir -p "$OUT"
: > "$OUT/SONDA.md"
echo "# Paket kaynağı sondası" >> "$OUT/SONDA.md"
echo "" >> "$OUT/SONDA.md"
echo "| # | Kaynak | HTTP | Bayt | Sınıf |" >> "$OUT/SONDA.md"
echo "|---|---|---|---|---|" >> "$OUT/SONDA.md"

UA="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
PKG="com.candywriter.bitlife"
TMP="$OUT/_tmp.bin"
N=0

classify() {
  python3 - "$1" <<'PY'
import sys, zipfile
p = sys.argv[1]
try:
    z = zipfile.ZipFile(p)
    names = z.namelist()
except Exception:
    print("none"); sys.exit()
so = [n for n in names if n.startswith("lib/") and n.endswith(".so")]
top_apk = [n for n in names if "/" not in n and n.endswith(".apk")]
if so:
    print("universal")
elif any("config" in a or "split" in a for a in top_apk):
    print("xapk")
else:
    print("none")
PY
}

try_url() {
  local label="$1"; shift
  N=$((N + 1))
  local url="$1"; shift
  rm -f "$TMP"
  local code
  code=$(curl -L --max-time 900 -A "$UA" -w '%{http_code}' -o "$TMP" "$url" 2>/dev/null)
  local size=0
  [ -f "$TMP" ] && size=$(wc -c < "$TMP")
  local cls="none"
  if [ "$code" = "200" ] && [ "$size" -gt 40000000 ] && [ "$(head -c2 "$TMP")" = "PK" ]; then
    cls=$(classify "$TMP")
  fi
  echo "| $N | $label | $code | $size | $cls |" >> "$OUT/SONDA.md"
  echo "  [$N] $label → HTTP $code, $size bayt, $cls"
  if [ "$cls" != "none" ]; then
    cp "$TMP" "$OUT/file"
    echo "$cls" > "$OUT/KIND"
    return 0
  fi
  return 1
}

VQ=""
[ -n "$VC" ] && VQ="&versionCode=$VC"

# 1) d.apkpure.net — Cloudflare yok, tam XAPK veriyor (2026-10 itibarıyla çalışıyor)
try_url "apkpure.net XAPK (latest)" "https://d.apkpure.net/b/XAPK/$PKG?version=latest" ||
try_url "apkpure.net XAPK (sürüm $VC)" "https://d.apkpure.net/b/XAPK/$PKG?versionCode=${VC:-latest}" ||
# 2) d.apkpure.net APK (bazı sürümler tek parça/universal)
try_url "apkpure.net APK (latest)" "https://d.apkpure.net/b/APK/$PKG?version=latest" ||
# 3) Cloudflare'lı uçlar (genelde 403 ama yedek)
try_url "d.apkpure.com XAPK" "https://d.apkpure.com/b/XAPK/$PKG?version=latest" ||
try_url "download.apkpure.com XAPK" "https://download.apkpure.com/b/XAPK/$PKG?version=latest" ||
{
  echo "none" > "$OUT/KIND"
}

KIND=$(cat "$OUT/KIND" 2>/dev/null || echo none)
echo "" >> "$OUT/SONDA.md"
echo "**Sonuç:** $KIND" >> "$OUT/SONDA.md"
echo "sonuç: $KIND"
[ "$KIND" != "none" ]
