#!/usr/bin/env python3
"""meta-map — global-metadata.dat içindeki string literal tablosunu AMPİRİK olarak çözer.

    python3 tools/meta-map.py <apk> <cikti-dizini>

Yöntem: gerçekten var olan içerik dizgilerinin dosyadaki ofsetini bulur, sonra
literal tablosundaki (a,b) çiftlerinden hangi (taban, sıra) kuralının bu
ofsetleri ürettiğini ölçer. Böylece tersine mühendislik tahmini yerine kanıt
elde edilir.

Çıktı: <cikti>/META-MAP.md + meta-map.json + meta-ctx.bin
"""
import json
import os
import re
import struct
import sys
import zipfile

apk = sys.argv[1] if len(sys.argv) > 1 else ""
out = sys.argv[2] if len(sys.argv) > 2 else "apk-analiz"
os.makedirs(out, exist_ok=True)
META = "assets/bin/Data/Managed/Metadata/global-metadata.dat"

with zipfile.ZipFile(apk) as z:
    raw = z.read(META)

magic, ver = struct.unpack_from("<II", raw, 0)
lit_off, lit_size, data_off, data_size = struct.unpack_from("<IIII", raw, 8)
str_off, str_size = struct.unpack_from("<II", raw, 24)

NEEDLES = [
    "You went to the witch doctor, who says you have V. Coli",
    "Your teacher sent you to the principal's office!",
    "I began training to be an astronaut at the ",
    "Astronaut",
    "You are a strict JSON translation engine",
    "Space Academy",
]

report = {
    "file_bytes": len(raw), "magic": hex(magic), "version": ver,
    "lit_off": lit_off, "lit_size": lit_size,
    "data_off": data_off, "data_size": data_size,
    "str_off": str_off, "str_size": str_size,
    "needles": [], "solutions": [], "context": {},
}


def find_all(hay: bytes, needle: bytes, limit=8):
    res, start = [], 0
    while len(res) < limit:
        i = hay.find(needle, start)
        if i < 0:
            break
        res.append(i)
        start = i + 1
    return res


# 1) gerçek ofsetler
offsets = {}
for n in NEEDLES:
    b = n.encode("utf-8")
    offs = find_all(raw, b)
    offsets[n] = offs
    report["needles"].append({"text": n, "count": raw.count(b), "offsets": offs[:8]})

# 2) tablo çözümü: hangi kural bu ofsetleri üretiyor?
entries = []
n_entries = min(lit_size // 8, 40000)
for i in range(n_entries):
    a, b = struct.unpack_from("<II", raw, lit_off + i * 8)
    entries.append((a, b))

bases = {"zero": 0, "data_off": data_off, "lit_off": lit_off, "str_off": str_off}
for order in ("len,idx", "idx,len"):
    for base_name, base in bases.items():
        hits = 0
        total = 0
        log = []
        for needle, offs in offsets.items():
            if not offs:
                continue
            total += 1
            want_off = offs[0]
            want_len = len(needle.encode("utf-8"))
            found = None
            for idx, (a, b) in enumerate(entries):
                ln, di = (a, b) if order == "len,idx" else (b, a)
                if base + di == want_off and (ln == want_len or ln >= want_len):
                    found = idx
                    break
            if found is not None:
                hits += 1
                log.append(f"  ✓ {needle[:40]!r} → tablo#{found}")
        report["solutions"].append({
            "order": order, "base": base_name, "hits": hits, "total": total, "log": log[:10],
        })

# 3) dizgi çevresi (yapıyı görmek için)
ctx = bytearray()
index = []
for needle, offs in offsets.items():
    for o in offs[:2]:
        start = max(0, o - 96)
        end = min(len(raw), o + len(needle.encode()) + 96)
        index.append({"text": needle[:50], "offset": o, "start": start, "len": end - start})
        ctx += struct.pack("<II", start, end - start) + raw[start:end]
report["context"] = index
with open(os.path.join(out, "meta-ctx.bin"), "wb") as fh:
    fh.write(bytes(ctx))

L = ["# Metadata tablo çözümü", "", "```",
     json.dumps({k: v for k, v in report.items() if k not in ("needles", "solutions", "context")}, indent=2),
     "```", "", "## Dizgi ofsetleri", "", "| Dizgi | Geçiş | Ofsetler |", "|---|---|---|"]
for n in report["needles"]:
    L.append(f"| `{n['text'][:50]}` | {n['count']} | {n['offsets'][:4]} |")
L += ["", "## Tablo çözümleri", "", "| Sıra | Taban | Tutan | Toplam |", "|---|---|---|---|"]
for s in report["solutions"]:
    L.append(f"| {s['order']} | {s['base']} | {s['hits']} | {s['total']} |")
L += ["", "## Çevre dizgileri", "", "| Dizgi | Ofset | Başlangıç | Boy |", "|---|---|---|---|"]
for c in index:
    L.append(f"| `{c['text']}` | {c['offset']} | {c['start']} | {c['len']} |")
L.append("")

with open(os.path.join(out, "META-MAP.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
json.dump(report, open(os.path.join(out, "meta-map.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("→", os.path.join(out, "META-MAP.md"))
best = max(report["solutions"], key=lambda s: (s["hits"], -len(s["base"])))
print("en iyi çözüm:", best["order"], best["base"], best["hits"], "/", best["total"])
