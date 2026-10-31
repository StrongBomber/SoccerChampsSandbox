#!/usr/bin/env python3
"""unity-inspect — BitLife APK'sındaki Unity paketini açar ve içeriğini listeler.

    python3 tools/unity-inspect.py <apk> <cikti-dizini>

Ne yapar:
  - APK'dan assets/bin/Data/*.unity3d ve sharedassets0.resource çıkarır
  - UnityPy ile nesne envanterini çıkarır (tip, ad, boyut)
  - TextAsset'lerin adını, boyutunu ve ilk 600 karakterini yazar
  - 4 MB altındaki TextAsset'leri <cikti>/unity/ altına kaydeder

Çıktı: <cikti>/UNITY.md + <cikti>/unity/*.txt + <cikti>/unity-model.json
"""
import json
import os
import sys
import zipfile

apk = sys.argv[1] if len(sys.argv) > 1 else ""
out = sys.argv[2] if len(sys.argv) > 2 else "apk-analiz"
os.makedirs(out, exist_ok=True)
os.makedirs(os.path.join(out, "unity"), exist_ok=True)

if not apk or not os.path.exists(apk):
    print("kullanım: unity-inspect.py <apk> <cikti>", file=sys.stderr)
    sys.exit(2)

work = os.path.join(out, "unity-raw")
os.makedirs(work, exist_ok=True)

entries = []
with zipfile.ZipFile(apk) as z:
    for n in z.namelist():
        if n.startswith("assets/bin/Data/") and (
            n.endswith(".unity3d") or n.endswith(".resource") or n.endswith(".assets")
            or n.endswith(".bundle") or n.endswith(".bytes")
        ):
            entries.append(n)
    print("Unity veri girdileri:", entries)
    for n in entries:
        dest = os.path.join(work, n.replace("/", "_"))
        with z.open(n) as src, open(dest, "wb") as dst:
            dst.write(src.read())
        print("  çıkarıldı:", n, os.path.getsize(dest), "bayt")

import re
CONTENT_RE = re.compile(
    r'(career|job|salary|occupation|life ?event|chapter|character|trait)',
    re.IGNORECASE,
)

try:
    import UnityPy
except ImportError:
    print("UnityPy yok — pip install UnityPy", file=sys.stderr)
    sys.exit(4)

model = {"files": [], "text_assets": [], "object_types": {}}
lines = ["# Unity paket envanteri", ""]

for n in entries:
    path = os.path.join(work, n.replace("/", "_"))
    rec = {"entry": n, "bytes": os.path.getsize(path), "objects": 0, "texts": []}
    try:
        env = UnityPy.load(path)
        for obj in env.objects:
            rec["objects"] += 1
            tname = getattr(obj.type, "name", str(obj.type))
            model["object_types"][tname] = model["object_types"].get(tname, 0) + 1
            if tname in ("TextAsset", "MonoBehaviour"):
                try:
                    data = obj.read()
                except Exception as e:  # bozuk nesne
                    continue
                name = getattr(data, "m_Name", None) or getattr(data, "name", "") or f"obj_{obj.path_id}"
                # TextAsset
                if tname == "TextAsset":
                    raw = getattr(data, "m_Script", None)
                    if raw is None:
                        raw = getattr(data, "script", None)
                    if isinstance(raw, (bytes, bytearray)):
                        try:
                            text = raw.decode("utf-8", errors="replace")
                        except Exception:
                            text = ""
                    else:
                        text = str(raw or "")
                    rec["texts"].append({"name": name, "chars": len(text), "preview": text[:600]})
                    model["text_assets"].append({"entry": n, "name": name, "chars": len(text)})
                    # Repoya yalnızca küçük ve içerikle ilgili metinleri yaz
                    if 0 < len(text) <= 512 * 1024 and CONTENT_RE.search(text[:200000]):
                        safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)[:80] or "text"
                        with open(os.path.join(out, "unity", f"{safe}.txt"), "w", encoding="utf-8") as fh:
                            fh.write(text)
    except Exception as e:
        rec["error"] = str(e)
    model["files"].append(rec)
    lines.append(f"## `{n}` — {rec['bytes']} bayt, {rec['objects']} nesne")
    if rec.get("error"):
        lines.append(f"\nhata: {rec['error']}\n")
    if rec["texts"]:
        lines.append("")
        lines.append("| TextAsset | Karakter | İlk satır |")
        lines.append("|---|---|---|")
        for t in rec["texts"][:60]:
            first = (t["preview"] or "").splitlines()[0][:80].replace("|", "\\|")
            lines.append(f"| `{t['name']}` | {t['chars']} | {first} |")
        # büyük olanları ayrıca göster
        big = sorted(rec["texts"], key=lambda x: -x["chars"])[:10]
        for t in big:
            lines.append("")
            lines.append(f"### `{t['name']}` ({t['chars']} karakter)")
            lines.append("")
            lines.append("```")
            lines.append(t["preview"][:600])
            lines.append("```")
    lines.append("")

lines.insert(2, "## Nesne tipleri")
lines.insert(3, "")
for k, v in sorted(model["object_types"].items(), key=lambda x: -x[1]):
    lines.insert(4, f"- {k}: {v}")
lines.insert(5, "")

# ---------------------------------------------------------------- IL2CPP sondası
il2 = {"metadata_bytes": 0, "hits": {}, "sample_lines": []}
try:
    with zipfile.ZipFile(apk) as z:
        cand = [n for n in z.namelist() if n.endswith("global-metadata.dat")]
        if cand:
            raw = z.read(cand[0])
            il2["metadata_bytes"] = len(raw)
            words = [
                "career", "Career", "job", "Job", "salary", "Salary", "occupation",
                "event", "Event", "chapter", "character", "Astronaut", "Doctor",
                "Actor", "Teacher", "Vought", "Supe", "TheBoys", "assetbundle",
            ]
            for w in words:
                il2["hits"][w] = raw.count(w.encode("utf-8"))
            # içerik gibi görünen kısa ascii satırlar
            for m in re.finditer(rb"[ -~]{6,80}", raw):
                t = m.group().decode("ascii", "replace")
                if re.search(r"(actor|astronaut|doctor|teacher|career|profession)", t, re.I):
                    il2["sample_lines"].append(t)
                    if len(il2["sample_lines"]) >= 40:
                        break
except Exception as e:
    il2["error"] = str(e)

model["il2cpp"] = il2
lines.append("## IL2CPP meta veri sondası")
lines.append("")
lines.append(f"- global-metadata.dat: {il2['metadata_bytes']} bayt")
for w, c in sorted(il2["hits"].items(), key=lambda x: -x[1]):
    if c:
        lines.append(f"  - `{w}`: {c} kez")
lines.append("")
if il2["sample_lines"]:
    lines.append("İçerik benzeri metinler:")
    lines.append("")
    lines.append("```")
    lines.extend(il2["sample_lines"][:40])
    lines.append("```")
    lines.append("")

with open(os.path.join(out, "UNITY.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines) + "\n")
with open(os.path.join(out, "unity-model.json"), "w", encoding="utf-8") as fh:
    json.dump(model, fh, indent=2, ensure_ascii=False)

print("→", os.path.join(out, "UNITY.md"))
print("TextAsset:", len(model["text_assets"]), "nesne tipleri:", len(model["object_types"]))
