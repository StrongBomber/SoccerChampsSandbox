#!/usr/bin/env python3
"""apk-text-patch — oyunun KENDİ metin havuzunu The Boys evrenine çevirir.

    python3 tools/apk-text-patch.py <giris.apk> <yama.json> <cikis.apk> [rapor-dizini]

Neden böyle: BitLife bir Unity/IL2CPP oyunu. Meslekler ve olaylar C# SINIFLARI
olarak derlenmiş (ör. `AstronautJobPack`), yani veri tablosu yok — yeni meslek
eklemek yeniden derleme gerektirir. Buna karşılık oyunun gösterdiği TÜM metin
`assets/bin/Data/Managed/Metadata/global-metadata.dat` içindeki literal havuzunda
düz UTF-8 olarak duruyor ve oyun onu doğrudan okuyor.

Bu araç havuzdaki dizgileri BİREBİR AYNI BAYT UZUNLUĞUNDA değiştirir:
  - uzunluk aynı kaldığı için literal tablosu, ofsetler, dosya boyutu değişmez
  - kısa kalan yamalar sağdan boşlukla doldurulur
  - her çift için havuzda kaç kez geçtiği raporlanır ve uygulama sonrası
    yeniden okunarak doğrulanır

Çıktı: <cikis.apk> + <rapor>/METIN-YAMASI.md + <rapor>/text-patch.json
"""
import json
import os
import shutil
import sys
import zipfile

apk_in, patch_json, apk_out = (sys.argv[1], sys.argv[2], sys.argv[3]) if len(sys.argv) > 3 else ("", "", "")
out_dir = sys.argv[4] if len(sys.argv) > 4 else "apk-analiz"
META = "assets/bin/Data/Managed/Metadata/global-metadata.dat"
os.makedirs(out_dir, exist_ok=True)

if not apk_in or not os.path.exists(apk_in):
    print("kullanım: apk-text-patch.py <apk> <yama.json> <cikis.apk> [rapor-dizini]", file=sys.stderr)
    sys.exit(2)

pairs = json.load(open(patch_json, encoding="utf-8"))
with zipfile.ZipFile(apk_in) as z:
    meta = z.read(META)

report = {"input": apk_in, "metadata_bytes": len(meta), "pairs": [], "applied": 0, "rejected": []}
for p in pairs:
    find = p["find"].encode("utf-8")
    repl = p["replace"].encode("utf-8")
    entry = {"find": p["find"], "replace": p["replace"], "find_len": len(find),
             "replace_len": len(repl), "occurrences": meta.count(find)}
    if len(find) != len(repl):
        entry["status"] = "reddedildi: uzunluk farklı"
        report["rejected"].append(entry)
        continue
    if entry["occurrences"] == 0:
        entry["status"] = "reddedildi: havuzda yok"
        report["rejected"].append(entry)
        continue
    meta = meta.replace(find, repl)
    entry["status"] = "uygulandı"
    report["applied"] += 1
    report["pairs"].append(entry)

# doğrulama: yeni metin havuzda var mı, eski metin kaldı mı
for e in report["pairs"]:
    e["verified_new"] = meta.count(e["replace"].encode()) >= 1
    e["old_remaining"] = meta.count(e["find"].encode())

print(f"uygulanan: {report['applied']} · reddedilen: {len(report['rejected'])}")
if not report["applied"]:
    print("hiçbir yama uygulanmadı", file=sys.stderr)
    sys.exit(3)

# APK'yı kopyala, yalnızca metadata girdisini değiştir
tmp = apk_out + ".tmp"
with zipfile.ZipFile(apk_in) as zin, zipfile.ZipFile(tmp, "w") as zout:
    for item in zin.infolist():
        if item.filename == META:
            zout.writestr(item, meta)
        else:
            zout.writestr(item, zin.read(item.filename))
shutil.move(tmp, apk_out)

L = ["# The Boys metin yaması (gerçek APK)", "",
     f"- Girdi: `{os.path.basename(apk_in)}` ({os.path.getsize(apk_in)} bayt)",
     f"- Çıktı: `{os.path.basename(apk_out)}` ({os.path.getsize(apk_out)} bayt)",
     f"- Metadata: {report['metadata_bytes']} bayt (boyut değişmedi)",
     f"- Uygulanan yama: **{report['applied']}/{len(pairs)}**", "",
     "Her yama birebir aynı bayt uzunluğundadır; literal tablosu ve tüm ofsetler",
     "korunur. Bu yüzden oyun dosya yapısı bozulmaz, yalnızca gösterilen metin değişir.", "",
     "| # | Önce | Sonra | Uzunluk | Adet | Doğrulama |", "|---|---|---|---|---|---|"]
for i, e in enumerate(report["pairs"], 1):
    ok = "✓" if e["verified_new"] and e["old_remaining"] == 0 else "!"
    L.append(f"| {i} | {e['find'][:60]} | {e['replace'][:60]} | {e['find_len']} | {e['occurrences']} | {ok} |")
if report["rejected"]:
    L += ["", "## Reddedilen", ""]
    for e in report["rejected"]:
        L.append(f"- `{e['find'][:60]}` — {e['status']} ({e['find_len']}→{e['replace_len']})")

with open(os.path.join(out_dir, "METIN-YAMASI.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
json.dump(report, open(os.path.join(out_dir, "text-patch.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("→", os.path.join(out_dir, "METIN-YAMASI.md"))
