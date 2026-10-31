#!/usr/bin/env bash
# mirror-probe.sh — BitLife tam paketini bulmak için kaynak taraması.
#   bash tools/mirror-probe.sh <rapor-dizini>
# Her denemenin HTTP kodu, boyutu, içerik tipi ve gövde başlangıcını yazar.
set -uo pipefail
OUT="${1:-apk-analiz}"
mkdir -p "$OUT"
R="$OUT/AYNA-SONDA.md"
: > "$R"
echo "# Ayna sondası" > "$R"
echo "" >> "$R"
echo "| # | Kaynak | HTTP | Bayt | Tip | Gövde (ilk 120) |" >> "$R"
echo "|---|---|---|---|---|---|" >> "$R"

BROWSER_UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
APK_UA="APKPure/3.20.32 (Aegon)"
PKG="com.candywriter.bitlife"
N=0

probe() { # <etiket> <url> [ek curl argümanları...]
  local label="$1" url="$2"; shift 2
  N=$((N + 1))
  local body="$OUT/_p.bin" hdr="$OUT/_p.hdr"
  local code
  code=$(curl -sS -L --max-time 60 -o "$body" -D "$hdr" -w '%{http_code}' "$@" "$url" 2>/dev/null)
  local size=0 ctype="-"
  [ -f "$body" ] && size=$(wc -c < "$body")
  ctype=$(grep -i '^content-type:' "$hdr" 2>/dev/null | tail -1 | cut -d' ' -f2- | tr -d '\r')
  local snip
  snip=$(head -c 400 "$body" 2>/dev/null | tr -d '\n\r' | tr -d '|' | cut -c1-120)
  echo "| $N | $label | $code | $size | ${ctype:--} | ${snip//\`/} |" >> "$R"
  echo "[$N] $label → $code $size ${ctype:-}"
  rm -f "$body" "$hdr"
}

echo "## JSON API'leri (başlıklarla)" >> "$R"
probe "pureapk m/v3 (tarayıcı)" "https://api.pureapk.com/m/v3/cms/app_version?hl=en-US&package_name=$PKG" -A "$BROWSER_UA"
probe "pureapk m/v3 (APKPure UA)" "https://api.pureapk.com/m/v3/cms/app_version?hl=en-US&package_name=$PKG" -A "$APK_UA" \
  -H "x-cv: 3172500" -H "x-sv: 29" -H "x-abis: arm64-v8a,armeabi-v7a,armeabi"
probe "pureapk m/v3 (paket adı parametresiz)" "https://api.pureapk.com/m/v3/cms/app_version?hl=en-US&package_name=$PKG&nc=1" -A "$APK_UA" \
  -H "x-cv: 3172500" -H "x-sv: 29" -H "x-abis: arm64-v8a"
probe "pureapk get_app_his_version" "https://api.pureapk.com/v3/get_app_his_version?package_name=$PKG&hl=en-US" -A "$APK_UA" \
  -H "x-cv: 3172500" -H "x-sv: 29"
probe "tapi get_app_his_version" "https://tapi.pureapk.com/v3/get_app_his_version?package_name=$PKG&hl=en-US" -A "$APK_UA" \
  -H "x-cv: 3172500" -H "x-sv: 29"

echo "" >> "$R"
echo "## Doğrudan indirme uçları" >> "$R"
for host in d.apkpure.com d.apkpure.net download.apkpure.com; do
  probe "$host XAPK" "https://$host/b/XAPK/$PKG?version=latest" -A "$BROWSER_UA" -H "Referer: https://apkpure.com/"
done
probe "apkpure.com XAPK (sayfa)" "https://apkpure.com/bitlife/$PKG/download/xapk" -A "$BROWSER_UA"

echo "" >> "$R"
echo "## Diğer aynalar" >> "$R"
probe "apkcombo.com" "https://apkcombo.com/bitlife/$PKG/download/xapk" -A "$BROWSER_UA"
probe "apk.support" "https://apk.support/download-app/$PKG" -A "$BROWSER_UA"
probe "apkmirror arama" "https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=bitlife" -A "$BROWSER_UA"
probe "apkfab" "https://apkfab.com/bitlife/$PKG" -A "$BROWSER_UA"
probe "apkmonk" "https://www.apkmonk.com/app/$PKG/" -A "$BROWSER_UA"

echo "" >> "$R"
echo "## Ağ genel" >> "$R"
probe "example.com (kontrol)" "https://example.com" -A "$BROWSER_UA"
probe "api.github.com (kontrol)" "https://api.github.com/rate_limit" -A "$BROWSER_UA"

echo "" >> "$R"
echo "bitti · $N deneme" >> "$R"
echo "bitti · $N deneme → $R"
