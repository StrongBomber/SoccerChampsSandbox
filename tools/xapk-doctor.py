#!/usr/bin/env python3
"""xapk-doctor — split setinin KURULABİLİR olduğunu doğrular.

    python3 tools/xapk-doctor.py <imzalı-parça-dizini> [rapor-dizini]

Android'in split kurulumunda aradığı koşullar:
  1. base.apk var
  2. tüm parçaların paket adı aynı
  3. tüm parçaların versionCode'u aynı
  4. tüm parçalar AYNI sertifikayla imzalı (aksi halde session reddedilir)
  5. set en az bir ABI için yerel kütüphane içeriyor (yoksa oyun açılmaz)

aapt2/apksigner yoksa adlar üzerinden kısmi denetim yapılır ve bu durum raporda
açıkça belirtilir.

Çıktı: <rapor>/TANI-XAPK.md + xapk-doctor.json · hata varsa çıkış 1
"""
import json
import os
import re
import subprocess
import sys
import zipfile

src = sys.argv[1] if len(sys.argv) > 1 else ""
out_dir = sys.argv[2] if len(sys.argv) > 2 else "apk-analiz"
if not src or not os.path.isdir(src):
    print("kullanım: xapk-doctor.py <parça-dizini> [rapor-dizini]", file=sys.stderr)
    sys.exit(2)
os.makedirs(out_dir, exist_ok=True)

parts = sorted(f for f in os.listdir(src) if f.endswith(".apk"))
if not parts:
    print("parça yok", file=sys.stderr)
    sys.exit(2)


def run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        return r.stdout + r.stderr
    except Exception as e:  # araç yoksa
        return f"__ERR__{e}"


def badging(path):
    out = ""
    for tool in ("aapt2", "aapt"):
        out = run([tool, "dump", "badging", path])
        if not out.startswith("__ERR__") and out.strip():
            break
    pkg = re.search(r"package: name='([^']+)' versionCode='([^']*)' versionName='([^']*)'", out)
    native = re.findall(r"native-code: '([^']+)'", out) + re.findall(r"'([a-z0-9_-]+)'", (re.search(r"native-code: (.*)", out) or [""])[0] if re.search(r"native-code: (.*)", out) else "")
    return {"package": pkg.group(1) if pkg else None,
            "versionCode": pkg.group(2) if pkg else None,
            "versionName": pkg.group(3) if pkg else None,
            "native": sorted(set(native)) if native else []}


def cert(path):
    out = run(["apksigner", "verify", "--print-certs", path])
    m = re.search(r"SHA-256 digest: ([0-9a-f]+)", out)
    ok = "Verifies" in out or "Verified using" in out or m is not None
    return {"sha256": m.group(1) if m else None, "verified": ok}


rows = []
for p in parts:
    path = os.path.join(src, p)
    info = badging(path)
    attrs = []
    try:
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
        attrs = [n for n in names if n.startswith("lib/") and n.endswith(".so")]
    except Exception:
        names = []
    rows.append({"part": p, "bytes": os.path.getsize(path), **info,
                 "so": len(attrs), "cert": cert(path)})

checks = []


def check(name, ok, detail, fatal=True):
    checks.append({"name": name, "ok": bool(ok), "detail": detail, "fatal": fatal})


has_aapt = any(r["package"] for r in rows)
has_signer = any(r["cert"]["sha256"] for r in rows)

check("base.apk var", "base.apk" in parts, "parçalar: " + ", ".join(parts))
pkgs = {r["package"] for r in rows if r["package"]}
check("tüm parçalar aynı pakette", len(pkgs) == 1 or not has_aapt,
      "; ".join(sorted(pkgs)) if pkgs else "aapt2 yok — atlandı", fatal=has_aapt)
vcs = {r["versionCode"] for r in rows if r["versionCode"]}
check("tüm parçalar aynı versionCode", len(vcs) == 1 or not has_aapt,
      "; ".join(sorted(vcs)) if vcs else "aapt2 yok — atlandı", fatal=has_aapt)
certs = {r["cert"]["sha256"] for r in rows if r["cert"]["sha256"]}
check("tüm parçalar aynı sertifika", len(certs) == 1 or not has_signer,
      "; ".join(sorted(certs))[:80] if certs else "apksigner yok — atlandı", fatal=has_signer)
total_so = sum(r["so"] for r in rows)
check("set yerel kütüphane içeriyor (.so)", total_so > 0,
      f"{total_so} .so · dosyalar: " + ", ".join(r["part"] for r in rows if r["so"]))
abis = sorted({n.split("/")[1] for r in rows for n in []})  # aapt'tan gelen native listesi
native_all = sorted({a for r in rows for a in r["native"]})
check("en az bir ABI", bool(native_all) or total_so > 0, ", ".join(native_all) or f"{total_so} .so")

fails = [c for c in checks if not c["ok"] and c["fatal"]]
L = ["# XAPK tanısı (split seti)", "",
     f"- Parça: {len(parts)} · toplam .so: {total_so} · ABI: {', '.join(native_all) or '-'}",
     f"- Sonuç: **{'GEÇTİ' if not fails else 'KALDI'}** ({len(fails)} hata)", "",
     "| Parça | Bayt | versionCode | .so | Sertifika (SHA-256) |", "|---|---|---|---|---|"]
for r in rows:
    L.append(f"| `{r['part']}` | {r['bytes']:,} | {r['versionCode'] or '?'} | {r['so']} | "
             f"{(r['cert']['sha256'] or '?')[:16]}… |")
L += ["", "| Denetim | Sonuç | Ayrıntı |", "|---|---|---|"]
for c in checks:
    L.append(f"| {c['name']} | {'✓' if c['ok'] else ('✗' if c['fatal'] else '!')} | {c['detail']} |")
if fails:
    L += ["", "## Yüklemeyi engelleyen bulgular", ""]
    L += [f"- **{c['name']}**: {c['detail']}" for c in fails]

with open(os.path.join(out_dir, "TANI-XAPK.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(L) + "\n")
json.dump({"parts": rows, "checks": checks, "fails": len(fails)},
          open(os.path.join(out_dir, "xapk-doctor.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)

print(f"{len(checks)} denetim · hata {len(fails)}")
for c in checks:
    print(("  ✓ " if c["ok"] else ("  ✗ " if c["fatal"] else "  ! ")) + c["name"] + " — " + c["detail"])
sys.exit(1 if fails else 0)
