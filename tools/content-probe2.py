#!/usr/bin/env python3
"""content-probe2 — "içerik hangi dosyada?" sorusunun kesin cevabı.

    python3 tools/content-probe2.py <apk> <cikti-dizini>

1. Unity paketindeki MONOBEHAVIOUR ÖRNEKLERİNİN sınıf adları (veri mi, kod mı?)
2. Paket/asset ham baytlarında içerik dizgileri (Astronaut, Teacher, Career...)
3. Uzantısız asset dosyalarını açma denemeleri (zlib, gzip, brotli, lz4, zip)
4. global-metadata'daki string literal tablosunun yapısı (yamalanabilir mi?)

Çıktı: <cikti>/CONTENT-PROBE2.md + content-probe2.json
"""
import bz2
import gzip
import json
import os
import re
import struct
import sys
import zipfile
import zlib

apk = sys.argv[1] if len(sys.argv) > 1 else ""
out = sys.argv[2] if len(sys.argv) > 2 else "apk-analiz"
os.makedirs(out, exist_ok=True)
if not apk or not os.path.exists(apk):
    print("kullanım: content-probe2.py <apk> <cikti>", file=sys.stderr)
    sys.exit(2)

PROBE_STRINGS = [b"Astronaut", b"Teacher", b"Doctor", b"Career", b"career", b"salary"]
report = {"instances": {}, "string_hits": {}, "odd_assets": [], "metadata_layout": {}}
L = ["# İçerik sondası 2 — kesin adres", ""]

work = os.path.join(out, "unity-raw")
os.makedirs(work, exist_ok=True)

with zipfile.ZipFile(apk) as z:
    names = z.namelist()
    bundles = [n for n in names if n.startswith("assets/bin/Data/") and n.endswith((".unity3d", ".assets", ".bundle"))]
    for n in bundles:
        dest = os.path.join(work, n.replace("/", "_"))
        if not os.path.exists(dest):
            with open(dest, "wb") as fh:
                fh.write(z.read(n))
        raw = open(dest, "rb").read()
        report["string_hits"][n] = {s.decode(): raw.count(s) for s in PROBE_STRINGS}

    odd = [
        n for n in names
        if n.startswith("assets/") and "/" not in n[len("assets/"):]
        and "." not in os.path.basename(n) and not n.endswith("/")
    ]
    for n in odd:
        raw = z.read(n)
        entry = {"entry": n, "bytes": len(raw), "head_hex": raw[:12].hex(), "trials": {}}
        body = raw[8:] if raw[:4] == b"\x00IAP" else raw
        for label, fn in (
            ("zlib", lambda b: zlib.decompress(b)),
            ("zlib_raw", lambda b: zlib.decompress(b, -15)),
            ("gzip", lambda b: gzip.decompress(b)),
            ("bz2", lambda b: bz2.decompress(b)),
        ):
            try:
                got = fn(body)
                entry["trials"][label] = len(got)
                if len(got) > 32:
                    sniff = re.sub(rb"[^\x20-\x7e]", b" ", got[:200]).decode("ascii", "replace").strip()
                    entry["decoded_head"] = sniff[:160]
                    entry["decoded_probe"] = {s.decode(): got.count(s) for s in PROBE_STRINGS}
                    if len(got) <= 2 * 1024 * 1024:
                        with open(os.path.join(out, f"odd-{os.path.basename(n)}.dec"), "wb") as fh:
                            fh.write(got)
                    break
            except Exception:
                entry["trials"][label] = None
        try:
            import brotli

            got = brotli.decompress(body)
            entry["trials"]["brotli"] = len(got)
            entry["decoded_head"] = re.sub(rb"[^\x20-\x7e]", b" ", got[:200]).decode("ascii", "replace").strip()[:160]
        except Exception:
            pass
        report["odd_assets"].append(entry)

    # metadata string literal tablosu
    md = [n for n in names if n.endswith("global-metadata.dat")]
    if md:
        raw = z.read(md[0])
        magic, version = struct.unpack_from("<II", raw, 0)
        lit_off, lit_size = struct.unpack_from("<II", raw, 8)
        data_off, data_size = struct.unpack_from("<II", raw, 16)
        layout = {
            "magic": hex(magic), "version": version, "bytes": len(raw),
            "string_literal_offset": lit_off, "string_literal_size": lit_size,
            "string_literal_data_offset": data_off, "string_literal_data_size": data_size,
        }
        # ilk birkaç literal (uzunluk + veri indeksi)
        lits = []
        for i in range(min(8, lit_size // 8)):
            ln, di = struct.unpack_from("<II", raw, lit_off + i * 8)
            lits.append((ln, di))
        layout["first_literals"] = lits
        # tablo gerçekten (len,dataIndex) mi?  sınama: dizgi havuzundan okunan uzunluk
        checks = []
        for ln, di in lits:
            s = raw[data_off + di: data_off + di + min(ln, 40)]
            checks.append({"len": ln, "index": di, "text": re.sub(rb"[^\x20-\x7e]", b".", s).decode("ascii", "replace")})
        layout["literal_checks"] = checks
        report["metadata_layout"] = layout

# MonoBehaviour örnekleri
instances = {}
try:
    import UnityPy

    for n in bundles:
        env = UnityPy.load(os.path.join(work, n.replace("/", "_")))
        for obj in env.objects:
            tname = getattr(obj.type, "name", str(obj.type))
            if tname != "MonoBehaviour":
                continue
            try:
                d = obj.read()
                script = getattr(d, "m_Script", None)
                cls = ""
                if script is not None:
                    try:
                        cls = getattr(script.read(), "m_ClassName", "") or ""
                    except Exception:
                        cls = ""
                cls = cls or "?"
                instances[cls] = instances.get(cls, 0) + 1
            except Exception:
                instances["<okunamadı>"] = instances.get("<okunamadı>", 0) + 1
except Exception as e:
    L += ["", f"UnityPy hatası: `{e}`", ""]
report["instances"] = instances

L += ["## Unity paketi — ham baytlarda içerik dizgileri", "", "| Paket | " + " | ".join(s.decode() for s in PROBE_STRINGS) + " |", "|---|" + "---|" * len(PROBE_STRINGS)]
for k, v in report["string_hits"].items():
    L.append(f"| `{k}` | " + " | ".join(str(v[s.decode()]) for s in PROBE_STRINGS) + " |")
L.append("")

L += ["## MonoBehaviour örnekleri (gerçek veri nesneleri)", "", f"Toplam sınıf: {len(instances)}", "", "| Sınıf | Adet |", "|---|---|"]
for k, v in sorted(instances.items(), key=lambda x: -x[1])[:60]:
    L.append(f"| `{k}` | {v} |")
L.append("")

L += ["## Uzantısız asset dosyaları — açma denemeleri", "", "| Dosya | Bayt | Denemeler | Açılan baş |", "|---|---|---|---|"]
for e in report["odd_assets"]:
    trials = ", ".join(f"{k}:{'-' if v is None else v}" for k, v in e["trials"].items())
    head = (e.get("decoded_head") or "").replace("|", "\\|")[:90]
    L.append(f"| `{e['entry']}` | {e['bytes']} | {trials} | {head} |")
L.append("")

if report["metadata_layout"]:
    m = report["metadata_layout"]
    L += ["## global-metadata string literal tablosu", "", "```", json.dumps(m, indent=2, ensure_ascii=False)[:2000], "```", ""]

with open(os.path.join(out, "CONTENT-PROBE2.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
with open(os.path.join(out, "content-probe2.json"), "w", encoding="utf-8") as fh:
    json.dump(report, fh, indent=2, ensure_ascii=False)
print("→", os.path.join(out, "CONTENT-PROBE2.md"))
print("örnek sınıf:", len(instances), "· asset:", len(report["odd_assets"]))
