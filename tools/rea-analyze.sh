#!/usr/bin/env bash
# REA ile BitLife/APK analizi — The Boys içerik paketini oyunun GERÇEK veri
# modeline bağlamak için önce oyunun içini görmek gerekir.
#
# REA: https://github.com/morluto/rea  (npx rea-agents)
#
# Kullanım:
#   tools/rea-analyze.sh BitLife.apk [cikti-dizini]
#   tools/rea-analyze.sh BitLife.xapk            # XAPK: base APK'yı kendi bulur
#
# Ne yapar (hepsi statik, cihaz gerekmez):
#   1. rea doctor                   — ortam hazır mı (Java, JADX köprüsü, apktool)
#   2. rea inspect-apk-signature    — v1/v2/v3 imzalama, imzalayan sertifika
#   3. rea inspect-artifact         — APK içerik grafiği + bütünlük
#   4. rea inspect-android-package  — manifest, aktiviteler, izinler (JADX)
#   5. rea decode-android-resources — kaynak tablosu ve metinler (apktool)
#   6. rea inspect-il2cpp-metadata  — Unity/IL2CPP ise sınıf+metot adları
#   7. içerik avı                   — meslek/olay/karakter anahtarlarını arar
#
# Çıktı: <cikti>/rea-*.json (Evidence) + <cikti>/ICERIK-HARITASI.md

set -uo pipefail

APK="${1:-}"
OUT="${2:-rea-out}"
if [ -z "$APK" ]; then
  echo "kullanım: tools/rea-analyze.sh <BitLife.apk|BitLife.xapk> [cikti-dizini]" >&2
  exit 2
fi
[ -f "$APK" ] || { echo "dosya yok: $APK" >&2; exit 2; }

REA="${REA:-npx --yes rea-agents@6.8.0}"
mkdir -p "$OUT"
LOG="$OUT/rea-komutlar.log"
: > "$LOG"

say() { printf '\n==> %s\n' "$*" | tee -a "$LOG"; }
run() {
  local name="$1"; shift
  say "$name"
  echo "+ rea $*" >> "$LOG"
  if $REA "$@" >>"$OUT/$name.json" 2>>"$LOG"; then
    echo "    ok → $OUT/$name.json" | tee -a "$LOG"
    return 0
  fi
  echo "    atlandı (araç/bağımlılık yok — ayrıntı: $LOG)" | tee -a "$LOG"
  return 1
}

# ---------- XAPK ise base APK'yı çıkar ----------
TARGET="$APK"
case "$APK" in
  *.xapk|*.apks|*.zip)
    say "XAPK/APKS paketi: base APK çıkarılıyor"
    EXD="$OUT/xapk"
    rm -rf "$EXD"; mkdir -p "$EXD"
    unzip -q -o "$APK" -d "$EXD" || { echo "açılamadı" >&2; exit 1; }
    if [ -f "$EXD/manifest.json" ]; then
      TARGET="$(node -e '
        const fs=require("fs");const d=process.argv[1];
        const m=JSON.parse(fs.readFileSync(d+"/manifest.json","utf8"));
        const base=(m.split_apks||[]).find(a=>a.id==="base")||{};
        const file=base.file||(m.apk_path||"base.apk");
        console.log(d+"/"+file);
      ' "$EXD")"
    else
      TARGET="$(find "$EXD" -maxdepth 1 -name '*.apk' | head -1)"
    fi
    echo "    base: $TARGET" | tee -a "$LOG"
    # APK'nın kendi içeriğini de listeleyelim
    unzip -l "$TARGET" > "$OUT/apk-icerik.txt" 2>/dev/null || true
    ;;
esac

say "hedef: $TARGET ($(wc -c < "$TARGET") bayt)"

# ---------- 1..6: REA ----------
run 01-doctor doctor --format json
run 02-imza inspect-apk-signature "$TARGET" --format json
run 03-artifact inspect-artifact "$TARGET" --format json
run 04-paket inspect-android-package "$TARGET" --detail summary --format json
run 05-kaynaklar decode-android-resources "$TARGET" --format json

# Unity/IL2CPP mi? APK içinde global-metadata.dat ara
GM="$(unzip -l "$TARGET" 2>/dev/null | awk '/global-metadata.dat/{print $4; exit}')"
if [ -n "$GM" ]; then
  say "IL2CPP metadata bulundu: $GM"
  unzip -p "$TARGET" "$GM" > "$OUT/global-metadata.dat" 2>/dev/null
  run 06-il2cpp inspect-il2cpp-metadata "$OUT/global-metadata.dat" --detail summary --format json
  # native ikiliyi de bağla (varsa)
  LIBCPP="$(unzip -l "$TARGET" 2>/dev/null | awk '/libil2cpp.so|libil2cpp.dylib|GameAssembly.dll/{print $4; exit}')"
  if [ -n "$LIBCPP" ]; then
    say "IL2CPP native: $LIBCPP — metot adresleri bağlanıyor"
    unzip -p "$TARGET" "$LIBCPP" > "$OUT/libil2cpp.so" 2>/dev/null
    run 06b-il2cpp-adres inspect-il2cpp-metadata "$OUT/global-metadata.dat" \
      --binary "$OUT/libil2cpp.so" --architecture arm64 --detail summary --format json
  fi
else
  echo "    IL2CPP yok (veya farklı motor) — adım atlandı" | tee -a "$LOG"
fi

# ---------- 7: içerik avı ----------
say "içerik avı: meslek / olay / karakter anahtarları"
node tools/rea-content-scan.mjs "$TARGET" "$OUT" | tee -a "$LOG"

say "bitti"
echo "Evidence : $OUT/" | tee -a "$LOG"
echo "Harita   : $OUT/ICERIK-HARITASI.md" | tee -a "$LOG"
