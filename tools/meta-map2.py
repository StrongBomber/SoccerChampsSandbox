#!/usr/bin/env python3
"""meta-map2 — literal tablosunun gerçek yerini ve kayıt biçimini bulur.

    python3 tools/meta-map2.py <apk> <cikti>

Yöntem: dosyada GERÇEKTEN bulunan bir içerik dizgisinin ofseti O alınır.
Tabloda O'yu üreten bir 32 bit değer aranır: v = O - taban. v'nin dosyadaki
tüm konumları listelenir; her konumun 16 bayt öncesi/sonrası yazdırılır.
Böylece kayıt biçimi (uzunluk, indeks) doğrudan görülür.

Çıktı: <cikti>/META-MAP2.md + meta-map2.json
"""
import json
import os
import struct
import sys
import zipfile

apk = sys.argv[1] if len(sys.argv) > 1 else ""
out = sys.argv[2] if len(sys.argv) > 2 else "apk-analiz"
os.makedirs(out, exist_ok=True)
META = "assets/bin/Data/Managed/Metadata/global-metadata.dat"

with zipfile.ZipFile(apk) as z:
    raw = z.read(META)

lit_off, lit_size, data_off, data_size = struct.unpack_from("<IIII", raw, 8)

TARGETS = [
    "You went to the witch doctor, who says you have V. Coli",
    "Your teacher sent you to the principal's office!",
    "You are a strict JSON translation engine",
]

def preceding_text(pos: int, limit: int = 400) -> str:
    """pos'tan geriye doğru giderek bu dizginin havuzdaki başlangıcını bulur."""
    b = pos
    while b > 0 and 32 <= raw[b - 1] < 127:
        b -= 1
    return raw[b:pos].decode("ascii", "replace")

report = {"table": {"lit_off": lit_off, "lit_size": lit_size, "data_off": data_off, "data_size": data_size},
          "targets": [], "candidates": []}
L = ["# Metadata literal tablosu — kesin yer", "",
     f"- tablo: {lit_off}..{lit_off + lit_size}",
     f"- veri: {data_off}..{data_off + data_size}", ""]

# 1) hedef dizgilerin ofseti ve havuz içindeki başlangıcı
for t in TARGETS:
    b = t.encode()
    o = raw.find(b)
    if o < 0:
        continue
    start = o
    while start > 0 and 32 <= raw[start - 1] < 127:
        start -= 1
    report["targets"].append({"text": t, "offset": o, "runtime_start": start,
                              "prefix_in_pool": raw[start:o].decode("ascii", "replace")[-80:],
                              "index_if_data": o - data_off})
    L.append(f"- `{t[:50]}` ofset **{o}**, havuz içi başlangıç **{start}** "
             f"(önek: `{raw[start:o].decode('ascii','replace')[-40:]}`)")

# 2) tablo bölgesinde hedef ofsetleri üreten kayıtları bul
L += ["", "## Tablo bölgesindeki eşleşmeler", ""]
scan_from, scan_to = lit_off, lit_off + lit_size
for t in report["targets"]:
    o = t["offset"]
    for base_name, base in (("data_off", data_off), ("zero", 0), ("lit_off", lit_off),
                            ("pool_start", t["runtime_start"])):
        v = o - base
        if v < 0 or v > 0xFFFFFFFF:
            continue
        pat = struct.pack("<I", v)
        pos = scan_from
        found = []
        while len(found) < 4:
            i = raw.find(pat, pos, scan_to)
            if i < 0:
                break
            found.append(i)
            pos = i + 1
        for i in found:
            around = raw[max(0, i - 16): i + 16]
            prev = struct.unpack_from("<I", raw, i - 4)[0] if i >= 4 else None
            nxt = struct.unpack_from("<I", raw, i + 4)[0] if i + 8 <= len(raw) else None
            rec = {"text": t["text"][:40], "base": base_name, "table_pos": i,
                   "record_index": (i - lit_off) // 8, "prev_u32": prev, "next_u32": nxt,
                   "hex": around.hex()}
            report["candidates"].append(rec)
            L.append(f"- `{t['text'][:30]}` taban={base_name} → tablo konumu {i} "
                     f"(kayıt #{(i - lit_off) // 8}) komşu: {prev}, {nxt}")

# 3) tablonun ilk 40 kaydı
L += ["", "## Tablonun ilk 40 kaydı (8 baytlık)", "", "| # | a | b |", "|---|---|---|"]
for i in range(40):
    a, b = struct.unpack_from("<II", raw, lit_off + i * 8)
    L.append(f"| {i} | {a} | {b} |")

# 4) veri havuzunun ilk 32 baytı ve 290268 çevresi
L += ["", "## Veri havuzu çevresi", "", "```",
      f"data_off={data_off}: {raw[data_off:data_off + 32].hex()}",
      f"lit_end={lit_off + lit_size}: {raw[lit_off + lit_size: lit_off + lit_size + 48].hex()}",
      f"@290268: {raw[290268:290268 + 64].hex()}",
      f"@295600: {raw[295600:295664].hex()}",
      "```"]

with open(os.path.join(out, "META-MAP2.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
json.dump(report, open(os.path.join(out, "meta-map2.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("eşleşme:", len(report["candidates"]))
for c in report["candidates"][:10]:
    print(c["text"][:30], c["base"], c["table_pos"], "prev", c["prev_u32"], "next", c["next_u32"])
