#!/usr/bin/env python3
"""apk-repack — apktool ile yeniden derlemeden APK yamalar.

    python3 tools/apk-repack.py <orijinal.apk> <cozulmus-dizin> <cikti.apk>

Neden: BitLife 85.000+ smali dosyası olan bir Unity/IL2CPP oyunu; apktool b
aşaması bu APK'da kaynak derleme hatasına düşüyor. Oysa bizim değiştirdiğimiz
şey birkaç veri dosyası. Bu araç orijinal APK'yı birebir kopyalar ve SADECE
apk-inject'in değiştirdiği girdileri (yanında .bak dosyası olanlar) değiştirir.

Böylece:
  - dex/arsc/kaynaklar hiç ellenmez (bozulma riski yok)
  - dosya boyutu ve hizalama korunur
  - imza apksigner ile yeniden atılır (zorunlu, girdiler değişti)
"""
import os
import shutil
import sys
import zipfile

src_apk, decoded, out_apk = (sys.argv[1], sys.argv[2], sys.argv[3]) if len(sys.argv) > 3 else ("", "", "")

if not src_apk or not os.path.exists(src_apk):
    print("kullanım: apk-repack.py <orijinal.apk> <cozulmus-dizin> <cikti.apk>", file=sys.stderr)
    sys.exit(2)

# apk-inject değiştirdiği her dosyanın yanına <dosya>.bak bırakır
changed = []
for root, _dirs, files in os.walk(decoded):
    for f in files:
        if not f.endswith(".bak"):
            continue
        bak = os.path.join(root, f)
        target = bak[:-4]
        if os.path.exists(target):
            rel = os.path.relpath(target, decoded).replace(os.sep, "/")
            changed.append(rel)

changed = sorted(set(changed))
print(f"değişen girdi: {len(changed)}")
for c in changed:
    print("  ~", c)

if not changed:
    # Hiçbir girdi değişmediyse zip'i yeniden YAZMA: bayt bayt kopyala.
    # (her yeniden yazma, kurulumu bozabilecek bir fırsattır)
    shutil.copyfile(src_apk, out_apk)
    print(f"değişiklik yok — dosya birebir kopyalandı: {out_apk}")
    sys.exit(0)

tmp = out_apk + ".tmp"
with zipfile.ZipFile(src_apk) as zin, zipfile.ZipFile(tmp, "w") as zout:
    names = set(zin.namelist())
    for item in zin.infolist():
        data = None
        if item.filename in changed:
            with open(os.path.join(decoded, item.filename), "rb") as fh:
                data = fh.read()
            print(f"  yamalandı: {item.filename} ({len(data)} bayt)")
        # ZipInfo alanlarını EKSİKSİZ koru (extra/comment/create_system dahil);
        # eksik alan kurulum hatasına yol açabilir.
        info = zipfile.ZipInfo(item.filename, date_time=item.date_time)
        info.compress_type = item.compress_type
        info.external_attr = item.external_attr
        info.internal_attr = item.internal_attr
        info.create_system = item.create_system
        info.extra = item.extra
        info.comment = item.comment
        info.flag_bits = item.flag_bits
        zout.writestr(info, data if data is not None else zin.read(item.filename))
    # Yeni girdi (ör. yeni bir veri dosyası) eklenmişse onu da koy
    for c in changed:
        if c in names:
            continue
        with open(os.path.join(decoded, c), "rb") as fh:
            zout.writestr(zipfile.ZipInfo(c, date_time=(1981, 1, 1, 0, 0, 0)), fh.read())
        print(f"  eklendi: {c}")

shutil.move(tmp, out_apk)
print(f"→ {out_apk} ({os.path.getsize(out_apk)} bayt)")
