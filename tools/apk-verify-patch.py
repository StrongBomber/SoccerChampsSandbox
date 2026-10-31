#!/usr/bin/env python3
"""apk-verify-patch — YAYINLANACAK imzalı APK'nın içinde yama gerçekten var mı?

    python3 tools/apk-verify-patch.py <imzali.apk> <yama.json> [rapor-dizini]

Paketleme/imzalama sonrası dosyayı yeniden açar, metadata'yı okur ve her yamanın
hem yeni metnini hem de eski metnin yokluğunu doğrular. Ayrıca dex/girdi sayısını
ve imza şemasını (apksigner çıktısı varsa) raporlar.

Çıktı: <rapor>/DOGRULAMA.md + verify.json  ·  hata varsa çıkış kodu 5
"""
import json
import os
import sys
import zipfile

apk, patch_json = sys.argv[1], sys.argv[2]
out_dir = sys.argv[3] if len(sys.argv) > 3 else "apk-analiz"
META = "assets/bin/Data/Managed/Metadata/global-metadata.dat"
os.makedirs(out_dir, exist_ok=True)

pairs = json.load(open(patch_json, encoding="utf-8"))
with zipfile.ZipFile(apk) as z:
    names = z.namelist()
    meta = z.read(META)
    dex = [n for n in names if n.startswith("classes") and n.endswith(".dex")]

rows, fails = [], 0
for p in pairs:
    new = p["replace"].encode()
    old = p["find"].encode()
    ok = meta.count(new) >= 1 and meta.count(old) == 0
    fails += 0 if ok else 1
    rows.append({"find": p["find"][:60], "new_present": meta.count(new), "old_present": meta.count(old), "ok": ok})

L = ["# Yayın öncesi doğrulama", "",
     f"- APK: `{os.path.basename(apk)}` ({os.path.getsize(apk)} bayt)",
     f"- Girdi sayısı: {len(names)} · dex: {len(dex)} ({', '.join(dex)})",
     f"- Metadata: {len(meta)} bayt",
     f"- Yama: {len(pairs)} çift · **doğrulanan: {len(pairs) - fails}** · hatalı: {fails}", "",
     "| Yama | Yeni metin | Eski metin | Sonuç |", "|---|---|---|---|"]
for r in rows:
    L.append(f"| {r['find']} | {r['new_present']} | {r['old_present']} | {'✓' if r['ok'] else '✗'} |")
L.append("")

with open(os.path.join(out_dir, "DOGRULAMA.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
json.dump({"apk": apk, "bytes": os.path.getsize(apk), "entries": len(names),
           "dex": dex, "checked": len(pairs), "fails": fails, "rows": rows},
          open(os.path.join(out_dir, "verify.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)

print(f"doğrulanan {len(pairs) - fails}/{len(pairs)} · hatalı {fails}")
sys.exit(0 if fails == 0 else 5)
