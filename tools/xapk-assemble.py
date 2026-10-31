#!/usr/bin/env python3
"""xapk-assemble — base + split APK'lardan kurulabilir bir XAPK üretir.

    python3 tools/xapk-assemble.py <parca-dizini> <cikti.xapk> [meta.json]

Neden gerekli: Google Play, BitLife'ı "App Bundle" olarak dağıtır. İndirilen
`BitLife.apk` yalnızca base split'tir; manifest `requiredSplitTypes="base__abi"`
der ve `lib/` içermez. Bu yüzden tek başına kurulamaz
(INSTALL_FAILED_MISSING_SPLIT → "Uygulama yüklenemedi").

Bu araç, base + config split'lerini (ör. split_config.arm64_v8a.apk) tek bir
XAPK'da birleştirir ve SAI/APKPure'un okuduğu `manifest.json` dosyasını yazar.

meta.json alanları (opsiyonel): package_name, name, version_code, version_name,
min_sdk_version, target_sdk_version, permissions
"""
import json
import os
import sys
import zipfile

src_dir, out_xapk = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ("", "")
meta_path = sys.argv[3] if len(sys.argv) > 3 else None

if not src_dir or not os.path.isdir(src_dir):
    print("kullanım: xapk-assemble.py <parca-dizini> <cikti.xapk> [meta.json]", file=sys.stderr)
    sys.exit(2)

meta = {}
if meta_path and os.path.exists(meta_path):
    meta = json.load(open(meta_path, encoding="utf-8"))

apks = sorted(f for f in os.listdir(src_dir) if f.endswith(".apk"))
if not apks:
    print("parça APK bulunamadı", file=sys.stderr)
    sys.exit(3)

base = "base.apk" if "base.apk" in apks else next(
    (a for a in apks if "config" not in a and "split" not in a), apks[0])
splits = [a for a in apks if a != base]

entries = [{"file": base, "id": "base"}]
for s in splits:
    name = s[:-4]
    for prefix in ("split_config.", "split_"):
        if name.startswith(prefix):
            name = name[len(prefix):]
            break
    entries.append({"file": s, "id": name})

manifest = {
    "xapk_version": 2,
    "package_name": meta.get("package_name", "com.candywriter.bitlife"),
    "name": meta.get("name", "BitLife"),
    "version_code": str(meta.get("version_code", "")),
    "version_name": meta.get("version_name", ""),
    "min_sdk_version": str(meta.get("min_sdk_version", "")),
    "target_sdk_version": str(meta.get("target_sdk_version", "")),
    "permissions": meta.get("permissions", []),
    "split_apks": entries,
}

with zipfile.ZipFile(out_xapk, "w", zipfile.ZIP_STORED) as z:
    z.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
    for e in entries:
        z.write(os.path.join(src_dir, e["file"]), e["file"])

print(f"→ {out_xapk} ({os.path.getsize(out_xapk)} bayt)")
print(f"  base: {base} · split: {len(splits)}")
for e in entries:
    print("   -", e["file"], "(id:", e["id"] + ")")
