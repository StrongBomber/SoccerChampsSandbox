#!/usr/bin/env bash
# Google Drive'dan büyük dosya indirir (bağlantıyla erişilebilir dosya).
#
#   tools/drive-fetch.sh <file-id> <cikti>
#
# Drive'ın üç ayrı indirme uç noktasını sırayla dener, HTML arakatmanını
# (virüs taraması onayı) kendi çözer ve dosyayı doğrular.
set -uo pipefail

ID="${1:-}"
OUT="${2:-bitlife.apk}"
[ -n "$ID" ] || { echo "kullanım: tools/drive-fetch.sh <file-id> <cikti>" >&2; exit 2; }

COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

try() {
  local url="$1"
  echo "==> deneniyor: ${url%%&confirm*}"
  curl -fL --retry 3 --retry-delay 2 --max-time 1800 \
    -c "$COOKIES" -b "$COOKIES" \
    -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" \
    -o "$OUT" "$url" || return 1
  local size
  size=$(wc -c < "$OUT" 2>/dev/null || echo 0)
  echo "    indirilen: $size bayt"
  # HTML arakatmanı mı?
  if head -c 200 "$OUT" | grep -qi "<!DOCTYPE html\|<html"; then
    echo "    HTML arakatmanı geldi"
    return 1
  fi
  # APK/ZIP imzası
  if [ "$(head -c 2 "$OUT")" = "PK" ]; then
    echo "    ZIP/APK imzası doğru"
    return 0
  fi
  echo "    beklenmeyen içerik"
  return 1
}

URLS=(
  "https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t"
  "https://drive.google.com/uc?export=download&id=${ID}&confirm=t"
  "https://drive.google.com/uc?id=${ID}&export=download"
)

ok=0
for u in "${URLS[@]}"; do
  if try "$u"; then ok=1; break; fi
done

if [ "$ok" != "1" ]; then
  # onay belirteci akışı
  echo "==> onay belirteci akışı"
  curl -sL -c "$COOKIES" -b "$COOKIES" \
    -A "Mozilla/5.0" \
    "https://drive.google.com/uc?export=download&id=${ID}" -o /tmp/drive-first.html || true
  UUID=$(grep -o 'name="uuid" value="[^"]*"' /tmp/drive-first.html | head -1 | sed 's/.*value="//; s/"//')
  CONFIRM=$(grep -o 'name="confirm" value="[^"]*"' /tmp/drive-first.html | head -1 | sed 's/.*value="//; s/"//')
  echo "    uuid=${UUID:-yok} confirm=${CONFIRM:-yok}"
  if [ -n "$CONFIRM" ]; then
    try "https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=${CONFIRM}${UUID:+&uuid=$UUID}" || true
  fi
fi

if [ "$(head -c 2 "$OUT" 2>/dev/null)" != "PK" ]; then
  echo "İNDİRME BAŞARISIZ: dosya bir APK/ZIP değil" >&2
  head -c 300 "$OUT" 2>/dev/null >&2 || true
  exit 1
fi

SIZE=$(wc -c < "$OUT")
echo "==> tamam: $OUT ($SIZE bayt)"
sha256sum "$OUT" | tee "${OUT}.sha256"
unzip -l "$OUT" | tail -5 || true
