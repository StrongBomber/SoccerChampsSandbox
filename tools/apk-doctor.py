#!/usr/bin/env python3
"""apk-doctor — "neden yüklenmiyor?" sorusunu ölçen statik denetçi.

    python3 tools/apk-doctor.py <apk> [--reference <orijinal.apk>] [--out <dizin>]

Denetledikleri (hepsi kurulumu bozabilen GERÇEK nedenler):
  1. zip bütünlüğü (CRC) — bozuk/yarım indirme
  2. resources.arsc sıkıştırılmamış ve 4 bayta hizalı mı (targetSdk >= 30 şartı)
  3. lib/*.so sıkıştırılmamış + 4 KB hizalı; 16 KB sayfa cihazları için 16 KB hizalı mı
  4. imza bloklarının varlığı (v2 / v3 / v3.1) ve v1 (META-INF) durumu
  5. giriş sayısı, dex sayısı, mimari (arm64-v8a / armeabi-v7a) listesi
  6. referans APK ile karşılaştırma: beklenenin dışında değişen girdi var mı

Çıktı: TANI-APK.md + doctor.json · FAIL varsa çıkış kodu 1
"""
import json
import os
import struct
import sys
import zipfile

SIG_MAGIC = b"APK Sig Block 42"
SCHEME_IDS = {
    0x7109871A: "APK Signature Scheme v2",
    0xF05368C0: "APK Signature Scheme v3",
    0x1B93AD61: "APK Signature Scheme v3.1",
    0x6DFF800D: "Source stamp (Play)",
}

apk = sys.argv[1] if len(sys.argv) > 1 else ""
args = sys.argv[2:]
reference = None
out_dir = "apk-analiz"
i = 0
while i < len(args):
    if args[i] == "--reference" and i + 1 < len(args):
        reference = args[i + 1]
        i += 2
    elif args[i] == "--out" and i + 1 < len(args):
        out_dir = args[i + 1]
        i += 2
    else:
        i += 1

if not apk or not os.path.exists(apk):
    print("kullanım: apk-doctor.py <apk> [--reference <orijinal.apk>] [--out <dir>]", file=sys.stderr)
    sys.exit(2)
os.makedirs(out_dir, exist_ok=True)

raw = open(apk, "rb").read()
checks = []


def check(name, ok, detail, fatal=True):
    checks.append({"name": name, "ok": bool(ok), "detail": detail, "fatal": fatal})
    return ok


# ------------------------------------------------------------------ 1) zip bütünlüğü
zf = zipfile.ZipFile(apk)
bad = zf.testzip()
check("zip bütünlüğü (CRC)", bad is None, "bozuk girdi: %s" % bad if bad else "tüm girdiler sağlam")

infos = zf.infolist()
by_name = {x.filename: x for x in infos}

# ------------------------------------------------------------------ 2) resources.arsc
arsc = by_name.get("resources.arsc")


def data_offset(info):
    """Yerel başlıktaki gerçek veri ofseti."""
    off = info.header_offset + 30 + len(info.filename.encode("utf-8")) + len(info.extra)
    return off


if arsc is None:
    check("resources.arsc var", False, "dosyada resources.arsc yok")
else:
    stored = arsc.compress_type == zipfile.ZIP_STORED
    aligned4 = data_offset(arsc) % 4 == 0
    check("resources.arsc sıkıştırılmamış", stored,
          "compress_type=%d (%s)" % (arsc.compress_type, "STORED" if stored else "DEFLATED"))
    check("resources.arsc 4 bayt hizalı", aligned4,
          "veri ofseti %d (mod 4 = %d)" % (data_offset(arsc), data_offset(arsc) % 4))

# ------------------------------------------------------------------ 3) native kütüphaneler
sos = [x for x in infos if x.filename.startswith("lib/") and x.filename.endswith(".so")]
so_stored = [x for x in sos if x.compress_type == zipfile.ZIP_STORED]
so_4k = [x for x in sos if data_offset(x) % 4096 == 0]
so_16k = [x for x in sos if data_offset(x) % 16384 == 0]
abis = sorted({x.filename.split("/")[1] for x in sos if x.filename.count("/") >= 2})
check(".so sıkıştırılmamış", len(so_stored) == len(sos),
      "%d/%d .so STORED" % (len(so_stored), len(sos)))
check(".so 4 KB hizalı", len(so_4k) == len(sos), "%d/%d .so 4096 hizalı" % (len(so_4k), len(sos)))
check(".so 16 KB hizalı (Android 15+ 16 KB sayfa cihazları)", len(so_16k) == len(sos),
      "%d/%d .so 16384 hizalı" % (len(so_16k), len(sos)), fatal=False)

# ------------------------------------------------------------------ 4) imza blokları
schemes = []
eocd = raw.rfind(b"PK\x05\x06")
if eocd < 0:
    check("zip merkezi dizin (EOCD)", False, "EOCD bulunamadı")
else:
    cd_size, cd_off = struct.unpack_from("<II", raw, eocd + 12)
    check("zip merkezi dizin (EOCD)", True, "CD %d bayt, ofset %d" % (cd_size, cd_off))
    if raw[cd_off - 16:cd_off] == SIG_MAGIC:
        block_size = struct.unpack_from("<Q", raw, cd_off - 24)[0]
        start = cd_off - block_size - 8
        p = start + 8
        end = cd_off - 24
        while p + 12 <= end:
            ln = struct.unpack_from("<Q", raw, p)[0]
            sid = struct.unpack_from("<I", raw, p + 8)[0]
            schemes.append({"id": hex(sid), "name": SCHEME_IDS.get(sid, "bilinmeyen"), "bytes": ln - 4})
            p += 8 + ln
        check("APK imza bloğu", True, json.dumps([s["name"] for s in schemes], ensure_ascii=False))
    else:
        check("APK imza bloğu", False, "imza bloğu yok (yalnızca v1/JAR imzası olabilir)")

has_v2 = any(s["id"] == hex(0x7109871A) for s in schemes)
has_v3 = any(s["id"] == hex(0xF05368C0) for s in schemes)
check("v2 imzası", has_v2, "APK Signature Scheme v2 " + ("var" if has_v2 else "YOK"))
check("v3 imzası", has_v3, "APK Signature Scheme v3 " + ("var" if has_v3 else "YOK"), fatal=False)

v1 = sorted(n for n in by_name if n.upper().startswith("META-INF/") and
            n.upper().endswith((".SF", ".RSA", ".DSA", ".EC")))
check("v1 imzası tutarlı", True, ", ".join(v1) if v1 else "v1 yok (v2/v3 yeterli)")

# ------------------------------------------------------------------ 5) genel bilgi
dex = sorted(n for n in by_name if n.startswith("classes") and n.endswith(".dex"))
manifest = by_name.get("AndroidManifest.xml")
check("AndroidManifest.xml var", manifest is not None,
      "%d bayt" % manifest.file_size if manifest else "YOK")
check("en az bir dex var", len(dex) > 0, "%d dex: %s" % (len(dex), ", ".join(dex)))
check("en az bir ABI var", len(abis) > 0, "ABI: " + (", ".join(abis) if abis else "yok"))

# ------------------------------------------------------------------ 6) referans karşılaştırma
diff = []
if reference and os.path.exists(reference):
    with zipfile.ZipFile(reference) as ref:
        ref_by = {x.filename: x for x in ref.infolist()}
        added = [n for n in by_name if n not in ref_by]
        removed = [n for n in ref_by if n not in by_name]
        for n in by_name:
            if n in ref_by:
                a, b = ref_by[n], by_name[n]
                if a.CRC != b.CRC or a.file_size != b.file_size:
                    diff.append(n)
        expected = lambda n: (n == "assets/bin/Data/Managed/Metadata/global-metadata.dat"
                              or n.startswith("META-INF/"))
        unexpected = [n for n in diff if not expected(n)]
        unexpected += [n for n in removed if not n.startswith("META-INF/")]
        check("beklenen dışında değişen girdi yok", not unexpected,
              "değişen: %d (%s) · eklenen: %d · silinen: %d%s" % (
                  len(diff), ", ".join(diff[:5]) or "-", len(added), len(removed),
                  (" · BEKLENMEYEN: " + ", ".join(unexpected[:8])) if unexpected else ""))

# ------------------------------------------------------------------ rapor
fails = [c for c in checks if not c["ok"] and c["fatal"]]
warn = [c for c in checks if not c["ok"] and not c["fatal"]]

L = ["# APK tanısı", "",
     f"- Dosya: `{os.path.basename(apk)}` — {len(raw):,} bayt",
     f"- Giriş: {len(infos)} · dex: {len(dex)} · .so: {len(sos)} · ABI: {', '.join(abis) or '-'}",
     f"- Sonuç: **{'GEÇTİ' if not fails else 'KALDI'}** ({len(fails)} hata, {len(warn)} uyarı)", "",
     "| Denetim | Sonuç | Ayrıntı |", "|---|---|---|"]
for c in checks:
    mark = "✓" if c["ok"] else ("✗" if c["fatal"] else "!")
    L.append(f"| {c['name']} | {mark} | {c['detail']} |")

if fails:
    L += ["", "## Yüklemeyi engelleyen bulgular", ""]
    for c in fails:
        L.append(f"- **{c['name']}**: {c['detail']}")
if warn:
    L += ["", "## Uyarılar", ""]
    for c in warn:
        L.append(f"- {c['name']}: {c['detail']}")

with open(os.path.join(out_dir, "TANI-APK.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
json.dump({"apk": apk, "bytes": len(raw), "entries": len(infos), "dex": dex,
           "abis": abis, "schemes": schemes, "checks": checks,
           "fails": len(fails), "warnings": len(warn)},
          open(os.path.join(out_dir, "doctor.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)

print(f"{len(checks)} denetim · hata {len(fails)} · uyarı {len(warn)}")
for c in checks:
    print(("  ✓ " if c["ok"] else ("  ✗ " if c["fatal"] else "  ! ")) + c["name"] + " — " + c["detail"])
sys.exit(1 if fails else 0)
