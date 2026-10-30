#!/usr/bin/env bash
# Download a Google Drive file (works for files >100 MB, incl. the "virus scan" confirm page).
# Usage: download_drive.sh <file_id> <output_path>
set -euo pipefail

FILE_ID="${1:?file id required}"
OUT="${2:?output path required}"

BASE="https://drive.usercontent.google.com/download"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

fetch() {
  curl -fSL --retry 5 --retry-all-errors --retry-delay 5 \
       -c "$JAR" -b "$JAR" -o "$OUT" "$1"
}

echo "==> First attempt: $BASE?id=$FILE_ID&export=download"
fetch "$BASE?id=$FILE_ID&export=download"

if file -b --mime-type "$OUT" | grep -qi 'text/html'; then
  echo "==> Got confirmation page, extracting uuid/confirm token"
  UUID="$(grep -o 'name="uuid" value="[^"]*"' "$OUT" | head -1 | sed 's/.*value="//; s/"$//' || true)"
  echo "    uuid=${UUID:-<none>}"
  CONFIRM_URL="$BASE?id=$FILE_ID&export=download&confirm=t"
  [ -n "${UUID:-}" ] && CONFIRM_URL="$CONFIRM_URL&uuid=$UUID"
  echo "==> Second attempt: $CONFIRM_URL"
  fetch "$CONFIRM_URL"
fi

if file -b --mime-type "$OUT" | grep -qi 'text/html'; then
  echo "ERROR: still receiving an HTML page instead of the file. First lines:" >&2
  head -c 1200 "$OUT" >&2
  exit 1
fi

echo "==> Downloaded $(stat -c%s "$OUT") bytes to $OUT"
file "$OUT"
