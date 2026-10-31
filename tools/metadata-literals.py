#!/usr/bin/env python3
"""metadata-literals — IL2CPP global-metadata.dat string literal tablosunu okur.

    python3 tools/metadata-literals.py dump  <apk> <literals.json>
    python3 tools/metadata-literals.py patch <apk> <patches.json> <cikti.apk>

Neden: BitLife bir Unity/IL2CPP oyunu. Oyun metinleri (meslek adları, olay
metinleri, LLM istemleri) derlenmiş kodda değil, global-metadata.dat içindeki
string literal havuzunda duruyor. Havuzu okuyup yamalayabiliyoruz:

  - literal tablosu 8 baytlık kayıtlardan oluşur: (uzunluk, veri indeksi)
  - veri havuzu kesintisizdir; bir literalı büyütmek diğerlerini kaydırır
  - bu yüzden YENİ metni dosyanın SONUNA ekliyoruz ve tabloda o literalın
    (uzunluk, indeks) çiftini yeni konuma çeviriyoruz.
  - diğer bölümler başlıktaki mutlak ofsetlerle adreslendiği için dosya
    büyümesi onları bozmaz.

Bu, APK'yı apktool ile yeniden derlemeden oyun metnini değiştirmenin gerçek yoludur.
"""
import json
import os
import struct
import sys
import zipfile

MAGIC = 0xFAB11BAF
META_REL = "assets/bin/Data/Managed/Metadata/global-metadata.dat"


def printable_ratio(data: bytes) -> float:
    if not data:
        return 0.0
    ok = sum(1 for b in data if 32 <= b < 127 or b in (9, 10, 13) or b >= 0xC0)
    return ok / len(data)


def read_meta(apk_path: str) -> bytes:
    if apk_path.endswith(".dat"):
        return open(apk_path, "rb").read()
    with zipfile.ZipFile(apk_path) as z:
        return z.read(META_REL)


def header(raw: bytes):
    magic, version = struct.unpack_from("<II", raw, 0)
    lit_off, lit_size = struct.unpack_from("<II", raw, 8)
    data_off, data_size = struct.unpack_from("<II", raw, 16)
    return {
        "magic": magic, "version": version,
        "lit_off": lit_off, "lit_size": lit_size,
        "data_off": data_off, "data_size": data_size,
    }


def decode(raw: bytes, h: dict, stride: int = 8):
    """Tabloyu çözmeyi dener; en yüksek yazdırılabilirlik oranını seçer.

    Olasılıklar: kayıt sırası (uzunluk, indeks) ya da (indeks, uzunluk) ve
    indeksin göreli tabanı (veri havuzu başı / literal tablosu başı / dosya başı).
    """
    n = h["lit_size"] // stride
    bases = {
        "data": h["data_off"],
        "zero": 0,
        "lit": h["lit_off"],
    }
    best = None
    for order in ("len_first", "index_first"):
        for base_name, base in bases.items():
            items, score, ok = [], 0.0, 0
            for i in range(n):
                a, b = struct.unpack_from("<II", raw, h["lit_off"] + i * stride)
                ln, di = (a, b) if order == "len_first" else (b, a)
                if ln > h["data_size"] or base + di + ln > len(raw):
                    items.append(None)
                    continue
                blob = raw[base + di: base + di + ln]
                ratio = printable_ratio(blob)
                score += ratio
                ok += 1 if ratio > 0.95 else 0
                items.append((ln, di, blob))
            if not items:
                continue
            avg = score / len(items)
            cand = {"order": order, "base": base_name, "avg_printable": avg,
                    "clean": ok, "items": items}
            if best is None or cand["clean"] > best["clean"] or (
                cand["clean"] == best["clean"] and avg > best["avg_printable"]
            ):
                best = cand
    return best


def cmd_dump(apk: str, out_json: str) -> int:
    raw = read_meta(apk)
    h = header(raw)
    print("başlık:", h)
    if h["magic"] != MAGIC:
        print("uyarı: bilinmeyen sihir", hex(h["magic"]), file=sys.stderr)
    best = decode(raw, h)
    print("çözüm:", best["order"], "taban:", best["base"],
          "· okunabilir literal:", best["clean"],
          "· ortalama:", round(best["avg_printable"], 3))
    literals = []
    for i, it in enumerate(best["items"]):
        if not it:
            continue
        ln, di, blob = it
        try:
            text = blob.decode("utf-8")
        except UnicodeDecodeError:
            text = blob.decode("utf-8", "replace")
        literals.append({"i": i, "len": ln, "index": di, "text": text, "printable": printable_ratio(blob)})
    # 4 KB üstü / okunamayan kayıtlar döküme girmez (dosya şişmesin)
    literals = [x for x in literals if x["len"] <= 4096 and x["printable"] > 0.9]
    good = [x for x in literals if x["printable"] > 0.95]
    print(f"literal: {len(literals)} · okunabilir: {len(good)}")
    json.dump({"header": h, "order": best["order"], "base": best["base"], "literals": literals},
              open(out_json, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", out_json, os.path.getsize(out_json), "bayt")
    return 0


def cmd_patch(apk: str, patches_json: str, out_apk: str) -> int:
    """patches.json: [{"find": "...", "replace": "...", "limit": 1}] veya {"replacements": [...]}"""
    spec = json.load(open(patches_json, encoding="utf-8"))
    repls = spec["replacements"] if isinstance(spec, dict) else spec
    raw = bytearray(read_meta(apk))
    h = header(bytes(raw))
    best = decode(bytes(raw), h)
    items = best["items"]
    if best["base"] != "data":
        print(f"hata: literal tabanı '{best['base']}' — yamalama yalnızca 'data' tabanında destekleniyor", file=sys.stderr)
        return 4

    applied = []
    extra = bytearray()
    for r in repls:
        find, repl = r["find"], r["replace"]
        limit = int(r.get("limit", 1))
        count = 0
        for i, it in enumerate(items):
            if count >= limit:
                break
            if not it:
                continue
            ln, di, blob = it
            try:
                text = blob.decode("utf-8")
            except UnicodeDecodeError:
                continue
            if text != find:
                continue
            payload = repl.encode("utf-8")
            # yeni metni dosya sonuna ekle
            new_index = h["data_size"] + len(extra)
            extra += payload
            # tablo kaydını güncelle
            struct.pack_into("<II", raw, h["lit_off"] + i * 8, len(payload), new_index)
            applied.append({"i": i, "old": find, "new": repl, "new_index": new_index})
            count += 1
        if count == 0:
            print(f"uyarı: bulunamadı → {find!r}", file=sys.stderr)

    if not applied:
        print("hiçbir değişiklik yok", file=sys.stderr)
        return 3

    raw += extra
    struct.pack_into("<II", raw, 16, h["data_off"], h["data_size"] + len(extra))

    # APK'ya geri yaz
    with zipfile.ZipFile(apk) as zin, zipfile.ZipFile(out_apk, "w") as zout:
        for item in zin.infolist():
            if item.filename == META_REL:
                zout.writestr(item, bytes(raw))
            else:
                zout.writestr(item, zin.read(item.filename))

    json.dump({"applied": applied}, open(os.path.join(os.path.dirname(out_apk) or ".", "metadata-patch.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"uygulanan: {len(applied)}")
    for a in applied:
        print(f"  #{a['i']}: {a['old']!r} → {a['new']!r}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    mode = sys.argv[1]
    if mode == "dump":
        sys.exit(cmd_dump(sys.argv[2], sys.argv[3]))
    if mode == "patch":
        sys.exit(cmd_patch(sys.argv[2], sys.argv[3], sys.argv[4]))
    print("bilinmeyen mod", file=sys.stderr)
    sys.exit(2)
