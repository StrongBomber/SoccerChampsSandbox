/**
 * rea-content-scan — APK içindeki içerik verisini arar.
 *
 * REA'nın Evidence çıktısını bekler ama tek başına da çalışır:
 *   node tools/rea-content-scan.mjs BitLife.apk rea-out
 *
 * Ne arar:
 *   - assets/ içindeki JSON/CSV/XML/veritabanı dosyaları (oyun içeriği genelde orada)
 *   - .so/.dll içindeki metin sabitleri: meslek, olay, karakter, seçim anahtarları
 *   - il2cpp metadata çıktısı varsa sınıf/metot adları
 *
 * Çıktı: rea-out/ICERIK-HARITASI.md (Türkçe özet) + icerik-ham.json
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [, , apkPath, outDir = "rea-out"] = process.argv;
if (!apkPath || !fs.existsSync(apkPath)) {
  console.error("kullanım: node tools/rea-content-scan.mjs <apk> [cikti-dizini]");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

/* ---------------- minimal ZIP okuyucu (bağımlılık yok) ---------------- */
function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("ZIP sonu bulunamadı");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const usize = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    entries.push({ name, method, csize, usize, localOff });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return entries;
}

function readEntry(buf, entry) {
  const nameLen = buf.readUInt16LE(entry.localOff + 26);
  const extraLen = buf.readUInt16LE(entry.localOff + 28);
  const start = entry.localOff + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.csize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  return null;
}

/* ---------------- anahtar sözcükler ---------------- */
const KEYWORDS = {
  "meslek / kariyer": [
    "career", "careers", "occupation", "job", "jobs", "profession", "employment",
    "salary", "wage", "promotion", "fired", "quit", "unemployed",
    "meslek", "kariyer", "maaş", "iş",
  ],
  "olay / hikâye": [
    "event", "events", "scenario", "story", "chapter", "episode", "narrative",
    "encounter", "choice", "choices", "outcome", "random_event",
    "olay", "bölüm", "hikaye", "seçim",
  ],
  "karakter / süper": [
    "character", "characters", "superhero", "supe", "vought", "homelander",
    "butcher", "starlight", "compound", "power", "powers", "hero", "villain",
    "karakter", "kahraman", "güç",
  ],
  "yaşam döngüsü": [
    "life", "lifespan", "age", "birth", "death", "school", "university",
    "marriage", "divorce", "child", "children", "prison", "bank",
  ],
};
const ALL = Object.entries(KEYWORDS).flatMap(([group, words]) => words.map((w) => ({ group, w })));

const HITS_PER_WORD = 4;
const MAX_TEXT_BYTES = 6 * 1024 * 1024; // tek dosyada en fazla 6 MB metin taranır

const buf = fs.readFileSync(apkPath);
const entries = readZip(buf);

const assets = [];
const natives = [];
for (const e of entries) {
  if (e.name.endsWith("/")) continue;
  if (/^assets\//.test(e.name)) assets.push(e);
  if (/\.(so|dll|dylib|pak|bin|dat|json|xml|csv|db|sqlite|txt|dex|arsc|assetbundle|unity3d)$/i.test(e.name)) natives.push(e);
}

const report = {
  apk: path.resolve(apkPath),
  bytes: buf.length,
  entry_count: entries.length,
  asset_files: assets.map((a) => ({ name: a.name, bytes: a.usize })),
  scans: [],
};

function scanBuffer(name, data, isText) {
  const found = {};
  for (const { group, w } of ALL) {
    const needle = isText ? w.toLowerCase() : w;
    const hay = isText ? data.toString("utf8").toLowerCase() : data.toString("latin1");
    let idx = 0;
    let n = 0;
    const samples = [];
    while (n < HITS_PER_WORD) {
      idx = hay.indexOf(needle, idx);
      if (idx < 0) break;
      let ctx = isText ? data.toString("utf8", Math.max(0, idx - 30), Math.min(data.length, idx + 60))
        : data.toString("latin1", Math.max(0, idx - 30), Math.min(data.length, idx + 60));
      ctx = ctx.replace(/[^\x20-\x7eçğıöşüÇĞİÖŞÜ]/g, " ").replace(/\s+/g, " ").trim();
      samples.push(ctx);
      idx += needle.length;
      n++;
    }
    if (n) {
      found[group] = found[group] || [];
      found[group].push({ word: w, count: n, samples });
    }
  }
  if (Object.keys(found).length) report.scans.push({ file: name, hits: found });
}

// önce içerik dosyaları, sonra kod kaynakları
const rank = (n) => n.startsWith("assets/") ? 0 : /\.(dex|arsc)$/i.test(n) ? 1 : 2;
natives.sort((a, b) => rank(a.name) - rank(b.name));

for (const e of natives.slice(0, 40)) {
  if (e.usize > MAX_TEXT_BYTES * 4) continue;
  let data;
  try { data = readEntry(buf, e); } catch (_) { continue; }
  if (!data) continue;
  const isText = /\.(json|xml|csv|txt)$/i.test(e.name);
  if (isText && data.length > MAX_TEXT_BYTES) data = data.subarray(0, MAX_TEXT_BYTES);
  scanBuffer(e.name, data, isText);
}

fs.writeFileSync(path.join(outDir, "icerik-ham.json"), JSON.stringify(report, null, 2));

/* ---------------- Türkçe özet ---------------- */
const lines = [];
lines.push("# İçerik haritası");
lines.push("");
lines.push(`- APK: \`${report.apk}\` (${report.bytes} bayt, ${report.entry_count} girdi)`);
lines.push(`- assets dosyası: **${report.asset_files.length}**`);
lines.push(`- taranan dosya: **${report.scans.length}**`);
lines.push("");

if (!report.scans.length) {
  lines.push("Hiçbir anahtar sözcük bulunamadı. İçerik ya sıkıştırılmış/şifreli ya da");
  lines.push("dışarıdan (sunucudan) yükleniyor olabilir.");
} else {
  const byGroup = new Map();
  for (const s of report.scans) {
    for (const [group, hits] of Object.entries(s.hits)) {
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group).push({ file: s.file, hits });
    }
  }
  for (const [group, items] of byGroup) {
    lines.push(`## ${group}`);
    lines.push("");
    for (const it of items) {
      const words = it.hits.map((h) => `${h.word}(${h.count})`).join(", ");
      lines.push(`- \`${it.file}\` — ${words}`);
      for (const h of it.hits.slice(0, 2)) {
        if (h.samples[0]) lines.push(`  - örnek: \`${h.samples[0].slice(0, 110)}\``);
      }
    }
    lines.push("");
  }
}

if (report.asset_files.length) {
  lines.push("## assets/ dosyaları");
  lines.push("");
  for (const a of report.asset_files.slice(0, 60)) {
    lines.push(`- \`${a.name}\` — ${a.bytes} bayt`);
  }
  if (report.asset_files.length > 60) lines.push(`- … +${report.asset_files.length - 60} dosya`);
  lines.push("");
}

lines.push("## Sonraki adım");
lines.push("");
lines.push("Bir dosya içerik listesi gibi görünüyorsa (JSON/CSV/XML), REA ile o dosyayı aç:");
lines.push("");
lines.push("```bash");
lines.push(`npx rea-agents@6.8.0 inspect-android-package ${path.basename(apkPath)} --detail summary \\`);
lines.push("  --evidence_output rea-out/paket.json");
lines.push("```");
lines.push("");
lines.push("Oradan çıkan sınıf/metot adları `bitlife/universe.js` şemasına eşlenir:");
lines.push("`characters[]`, `careers[]`, `chapters[]`.");

fs.writeFileSync(path.join(outDir, "ICERIK-HARITASI.md"), lines.join("\n") + "\n");
console.log(lines.slice(0, 14).join("\n"));
console.log(`\n→ ${path.join(outDir, "ICERIK-HARITASI.md")}`);
