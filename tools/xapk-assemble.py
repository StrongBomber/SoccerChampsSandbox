#!/usr/bin/env python3
"""xapk-assemble — imzalanmış parçalardan kurulabilir bir XAPK üretir.

    python3 tools/xapk-assemble.py <parca-dizini> <cikti.xapk>

Kaynak XAPK'dan gelen `manifest.json` varsa temel alınır (xapk_version, ad,
simge, sürüm alanları korunur); yalnızca `split_apks` listesi gerçek dosyalarla
yeniden yazılır ve dosyada bulunmayan referanslar (ör. icon.png) temizlenir.
Yoksa SAI/APKPure'un beklediği asgari manifest üretilir.

`.obb` dosyaları varsa `Android/obb/<paket>/` altına konur.
"""
import json
import os
import sys
import zipfile

src_dir, out_xapk = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ("", "")
if not src_dir or not os.path.isdir(src_dir):
    print("kullanım: xapk-assemble.py <parça-dizini> <çıktı.xapk>", file=sys.stderr)
    sys.exit(2)

apks = sorted(f for f in os.listdir(src_dir) if f.endswith(".apk"))
if not apks:
    print("parça APK bulunamadı", file=sys.stderr)
    sys.exit(3)

src_manifest = None
mpath = os.path.join(src_dir, "manifest.json")
if os.path.exists(mpath):
    try:
        src_manifest = json.load(open(mpath, encoding="utf-8"))
    except Exception:
        src_manifest = None

# orijinal kimlik eşlemesi: dosya → id
orig_ids = {}
if src_manifest:
    for a in src_manifest.get("split_apks", []) or []:
        if a.get("file"):
            orig_ids[a["file"]] = a.get("id")


def split_id(fname):
    if fname in orig_ids and orig_ids[fname]:
        return orig_ids[fname]
    if fname == "base.apk":
        return "base"
    name = fname[:-4]
    for prefix in ("split_config.", "config.", "split_"):
        if name.startswith(prefix):
            name = name[len(prefix):]
            break
    return name


entries = [{"file": f, "id": split_id(f)} for f in apks]

manifest = dict(src_manifest) if src_manifest else {
    "xapk_version": 2,
    "package_name": "com.candywriter.bitlife",
    "name": "BitLife",
    "version_code": "",
    "version_name": "",
    "min_sdk_version": "",
    "target_sdk_version": "",
    "permissions": [],
}
manifest["split_apks"] = entries

# dosyada olmayan referansları temizle (SAI katı davranabilir)
for key in list(manifest):
    if key in ("split_apks", "package_name", "name", "xapk_version"):
        continue
    val = manifest[key]
    if isinstance(val, str) and val.lower().endswith((".png", ".jpg", ".obb")) and not os.path.exists(os.path.join(src_dir, val)):
        manifest.pop(key)
if "obb" in manifest:
    manifest.pop("obb")

obbs = sorted(f for f in os.listdir(src_dir) if f.lower().endswith(".obb"))
pkg = manifest.get("package_name", "com.candywriter.bitlife")

with zipfile.ZipFile(out_xapk, "w", zipfile.ZIP_STORED) as z:
    z.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
    for e in entries:
        z.write(os.path.join(src_dir, e["file"]), e["file"])
    for o in obbs:
        z.write(os.path.join(src_dir, o), f"Android/obb/{pkg}/{o}")

print(f"→ {out_xapk} ({os.path.getsize(out_xapk)} bayt)")
print(f"  parça: {len(entries)} · obb: {len(obbs)}")
for e in entries:
    print("   -", e["file"], "(id:", e["id"] + ")")
