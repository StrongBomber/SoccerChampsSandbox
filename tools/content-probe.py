#!/usr/bin/env python3
"""content-probe — BitLife APK'sında oyun içeriğinin GERÇEKTEN nerede durduğunu bulur.

    python3 tools/content-probe.py <apk> <cikti-dizini>

Sınadığı yerler:
  1. global-metadata.dat  → string literal havuzu (IL2CPP'de derlenmiş metinler)
  2. assets/ altındaki uzantısız, rastgele adlı dosyalar → şifreli/sıkıştırılmış paket mi?
  3. Unity paketindeki MonoBehaviour sınıf adları → ScriptableObject içerik var mı?
  4. JSON/CSV benzeri büyük blob'lar (içerik tablosu gömülü mü?)

Çıktı: <cikti>/CONTENT-PROBE.md + <cikti>/content-probe.json
"""
import json
import os
import re
import zipfile
import zlib

apk = sys.argv[1] if len(sys.argv) > 1 else ""
out = sys.argv[2] if len(sys.argv) > 2 else "apk-analiz"
os.makedirs(out, exist_ok=True)
if not apk or not os.path.exists(apk):
    print("kullanım: content-probe.py <apk> <cikti>", file=sys.stderr)
    sys.exit(2)

report = {"metadata": {}, "odd_assets": [], "mono_classes": {}, "blobs": []}
L = ["# İçerik sondası", ""]

CONTENT_WORDS = [
    "career", "job", "salary", "occupation", "event", "chapter", "story",
    "character", "trait", "Astronaut", "Vought", "Supe", "superhero",
]

with zipfile.ZipFile(apk) as z:
    names = z.namelist()

    # ---------------------------------------------------------------- 1) metadata
    md = [n for n in names if n.endswith("global-metadata.dat")]
    for n in md:
        raw = z.read(n)
        info = {"entry": n, "bytes": len(raw), "magic": raw[:16].hex(), "hits": {}}
        for w in CONTENT_WORDS:
            info["hits"][w] = raw.count(w.encode())
        # JSON blob izi
        info["json_key_hits"] = {
            k: raw.count(k.encode())
            for k in ['"career"', '"careers"', '"events"', '"jobs"', '"name":', '"title":', '"description":']
        }
        report["metadata"] = info
        L += [
            "## global-metadata.dat",
            "",
            f"- `{n}` — {len(raw)} bayt",
            f"- ilk 16 bayt: `{info['magic']}`",
            "",
            "| Sözcük | Geçiş |",
            "|---|---|",
        ]
        for w, c in sorted(info["hits"].items(), key=lambda x: -x[1]):
            if c:
                L.append(f"| `{w}` | {c} |")
        L += ["", "| JSON anahtarı | Geçiş |", "|---|---|"]
        for k, c in info["json_key_hits"].items():
            L.append(f"| `{k}` | {c} |")
        L.append("")

        # içerik benzeri dizgiler
        samples = []
        for m in re.finditer(rb"[ -~]{10,120}", raw):
            t = m.group().decode("ascii", "replace")
            if re.search(r"(career|profession|salary|you (got|are|were)|job)", t, re.I):
                samples.append(t)
                if len(samples) >= 40:
                    break
        L += ["Örnek dizgiler:", "", "```"] + samples + ["```", ""]

    # ------------------------------------------------------- 2) tuhaf asset dosyaları
    odd = [
        n for n in names
        if n.startswith("assets/") and "/" not in n[len("assets/"):]
        and "." not in os.path.basename(n)
        and not n.endswith("/")
    ]
    for n in odd[:40]:
        raw = z.read(n)
        head = raw[:8]
        kind = "bilinmiyor"
        if head[:2] == b"PK":
            kind = "zip"
        elif head[:2] == b"\x1f\x8b":
            kind = "gzip"
        elif head[:1] == b"{" or head[:1] == b"[":
            kind = "json"
        elif head[:4] == b"SQLi":
            kind = "sqlite"
        elif head[:5] == b"Unity":
            kind = "unityfs"
        elif head[:4] in (b"\x78\x9c", b"\x78\xda", b"\x78\x01"):
            kind = "zlib"
        entry = {"entry": n, "bytes": len(raw), "head_hex": head.hex(), "kind": kind}
        # ilk 400 baytın yazdırılabilir kısmı
        printable = re.sub(rb"[^\x20-\x7e]", b" ", raw[:400]).decode("ascii", "replace")
        entry["printable_head"] = printable.strip()[:200]
        report["odd_assets"].append(entry)
    L += ["## Uzantısız asset dosyaları", "", "| Dosya | Bayt | Tür | İlk baytlar |", "|---|---|---|---|"]
    for e in report["odd_assets"]:
        L.append(f"| `{e['entry']}` | {e['bytes']} | {e['kind']} | `{e['head_hex']}` |")
    L.append("")

# ------------------------------------------------------- 3) MonoBehaviour sınıfları
try:
    import UnityPy

    candidates = [
        n for n in names
        if n.startswith("assets/bin/Data/") and n.endswith((".unity3d", ".assets", ".bundle"))
    ]
    work = os.path.join(out, "unity-raw")
    os.makedirs(work, exist_ok=True)
    for n in candidates:
        dest = os.path.join(work, n.replace("/", "_"))
        if not os.path.exists(dest):
            with zipfile.ZipFile(apk) as z:
                with open(dest, "wb") as fh:
                    fh.write(z.read(n))
        env = UnityPy.load(dest)
        for obj in env.objects:
            tname = getattr(obj.type, "name", str(obj.type))
            if tname not in ("MonoBehaviour", "MonoScript"):
                continue
            try:
                d = obj.read()
            except Exception:
                continue
            name = getattr(d, "m_Name", "") or ""
            if tname == "MonoScript":
                name = getattr(d, "m_ClassName", "") or name
            if not name:
                continue
            report["mono_classes"][name] = report["mono_classes"].get(name, 0) + 1
except Exception as e:
    L += ["", f"UnityPy hatası: `{e}`", ""]

cls = sorted(report["mono_classes"].items(), key=lambda x: -x[1])
L += ["## MonoBehaviour / MonoScript sınıf adları", "", f"Toplam farklı ad: {len(cls)}", ""]
interesting = [c for c in cls if re.search(r"(career|job|event|content|data|story|chapter|character|trait|dlc|pack)", c[0], re.I)]
L += ["İçerikle ilgili olanlar:", "", "| Sınıf | Adet |", "|---|---|"]
for n_, c_ in interesting[:80]:
    L.append(f"| `{n_}` | {c_} |")
L += ["", "En kalabalık 40 ad:", "", "| Sınıf | Adet |", "|---|---|"]
for n_, c_ in cls[:40]:
    L.append(f"| `{n_}` | {c_} |")
L.append("")

with open(os.path.join(out, "CONTENT-PROBE.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
with open(os.path.join(out, "content-probe.json"), "w", encoding="utf-8") as fh:
    json.dump(report, fh, indent=2, ensure_ascii=False)
print("→", os.path.join(out, "CONTENT-PROBE.md"))
print("sınıf adı:", len(report["mono_classes"]), "· tuhaf asset:", len(report["odd_assets"]))
