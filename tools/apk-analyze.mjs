#!/usr/bin/env node
/**
 * apk-analyze — apktool ile açılmış bir APK'nın içerik modelini çıkarır.
 *
 *   node tools/apk-analyze.mjs <decoded-apktool-dir> [cikti-dizini]
 *
 * Ne üretir:
 *   <cikti>/ANALIZ.md      — Türkçe rapor (insan okur)
 *   <cikti>/model.json     — tablo/JSON envanteri (enjektör bunu kullanır)
 *   <cikti>/strings.txt    — içerik anahtar sözcükleri geçen dizeler
 *
 * Hiçbir şeyi değiştirmez; sadece okur.
 */
import fs from "node:fs";
import path from "node:path";

let DatabaseSync = null;
try { ({ DatabaseSync } = await import("node:sqlite")); } catch (_) { /* Node < 22.5 */ }

const [, , root, outDirArg] = process.argv;
if (!root || !fs.existsSync(root)) {
  console.error("kullanım: node tools/apk-analyze.mjs <decoded-apktool-dir> [cikti]");
  process.exit(2);
}
const outDir = outDirArg || "apk-analiz";
fs.mkdirSync(outDir, { recursive: true });

const CONTENT_TABLE_RE = /(career|job|occupation|profession|employ|event|scenario|story|chapter|episode|character|npc|actor|choice|decision|random|activity|life|supe|hero)/i;
const TEXT_COL_RE = /(name|title|label|text|desc|description|body|content|story|bio|summary|note)/i;
const KEYWORDS = [
  "career", "occupation", "profession", "job", "salary", "wage",
  "event", "scenario", "story", "chapter", "episode", "choice", "outcome",
  "character", "superhero", "supe", "power", "trait", "perk",
  "life", "age", "birth", "death", "school", "prison",
];

/* ---------------- dosya yürüyüşü ---------------- */
function walk(dir, acc = [], depth = 0) {
  if (depth > 8) return acc;
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) walk(p, acc, depth + 1);
    else {
      let st = null;
      try { st = fs.statSync(p); } catch (_) { continue; }
      acc.push({ path: p, rel: path.relative(root, p), size: st.size, ext: path.extname(it.name).toLowerCase() });
    }
  }
  return acc;
}

const all = walk(root);
const byExt = {};
for (const f of all) byExt[f.ext || "(yok)"] = (byExt[f.ext || "(yok)"] || 0) + 1;
const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";

/* ---------------- manifest / apktool.yml ---------------- */
function readIf(p) {
  try { return fs.readFileSync(p, "utf8"); } catch (_) { return ""; }
}
const manifest = readIf(path.join(root, "AndroidManifest.xml"));
const apktoolYml = readIf(path.join(root, "apktool.yml"));
const pkgMatch = manifest.match(/package="([^"]+)"/);
const verMatch = manifest.match(/versionName="([^"]+)"/);
const sdkMatch = manifest.match(/minSdkVersion="(\d+)"/);
const activities = [...manifest.matchAll(/<activity[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
const usesLibs = [...manifest.matchAll(/<(?:uses-library|uses-native-library)[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
const compiledSdk = (apktoolYml.match(/minSdkVersion:\s*'?"?(\d+)/) || [])[1];
const appClass = (manifest.match(/android:name="([^"]+)"[^>]*>\s*<activity/) || [])[1];

/* ---------------- SQLite keşfi ---------------- */
function isSqlite(p) {
  try {
    const fd = fs.openSync(p, "r");
    const b = Buffer.alloc(16);
    fs.readSync(fd, b, 0, 16, 0);
    fs.closeSync(fd);
    return b.toString("latin1", 0, 15) === "SQLite format 3";
  } catch (_) { return false; }
}

function dumpDb(p) {
  const info = { path: path.relative(root, p), size: fs.statSync(p).size, tables: [] };
  if (!DatabaseSync) { info.error = "node:sqlite yok (Node 22.5+)"; return info; }
  let db = null;
  try {
    db = new DatabaseSync(p, { readOnly: true });
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const { name } of names) {
      if (/^(android_metadata|room_master_table|sqlite_sequence)$/.test(name)) continue;
      let cols = [];
      try { cols = db.prepare(`PRAGMA table_info("${name}")`).all().map((c) => ({ name: c.name, type: c.type, pk: c.pk, notnull: c.notnull })); } catch (_) { continue; }
      let rows = 0;
      try { rows = db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n; } catch (_) { continue; }
      let sample = null;
      try { sample = db.prepare(`SELECT * FROM "${name}" LIMIT 1`).get() || null; } catch (_) { /* yok say */ }
      let score = 0;
      if (CONTENT_TABLE_RE.test(name)) score += 3;
      cols.forEach((c) => { if (TEXT_COL_RE.test(c.name)) score += 1; });
      if (rows > 0 && rows < 100000) score += 1;
      if (cols.length >= 2) score += 1;
      info.tables.push({ name, rows, cols, sample, score });
    }
    info.tables.sort((a, b) => b.score - a.score || b.rows - a.rows);
  } catch (e) {
    info.error = String(e && e.message || e);
  } finally {
    if (db) { try { db.close(); } catch (_) { /* yok say */ } }
  }
  return info;
}

const dbs = all.filter((f) => f.ext === ".db" || f.ext === ".sqlite" || f.ext === ".sqlite3")
  .map((f) => f.path).filter(isSqlite).map(dumpDb);

/* ---------------- JSON içerik keşfi ---------------- */
const jsonFiles = [];
for (const f of all) {
  if (![".json", ".txt", ".dat", ".save"].includes(f.ext) || f.size < 8 || f.size > 16 * 1024 * 1024) continue;
  let raw = "";
  try { raw = fs.readFileSync(f.path, "utf8"); } catch (_) { continue; }
  const t = raw.trim();
  if (!(t.startsWith("[") || t.startsWith("{"))) continue;
  let j = null;
  try { j = JSON.parse(t); } catch (_) { continue; }
  const arrays = [];
  if (Array.isArray(j) && j.length && typeof j[0] === "object" && j[0] !== null) {
    arrays.push({ key: "", count: j.length, sampleKeys: Object.keys(j[0]).slice(0, 12) });
  } else if (j && typeof j === "object") {
    for (const k of Object.keys(j)) {
      if (Array.isArray(j[k]) && j[k].length && typeof j[k][0] === "object" && j[k][0] !== null) {
        arrays.push({ key: k, count: j[k].length, sampleKeys: Object.keys(j[k][0]).slice(0, 12) });
      }
    }
  }
  if (arrays.length) jsonFiles.push({ path: f.rel, size: f.size, arrays });
}

/* ---------------- metin/kod anahtar sözcük taraması ---------------- */
const hitFiles = [];
const stringLines = [];
for (const f of all) {
  if (![".xml", ".json", ".txt", ".smali", ".csv", ".dat"].includes(f.ext)) continue;
  if (f.size > 12 * 1024 * 1024) continue;
  let content = "";
  try { content = fs.readFileSync(f.path, "utf8"); } catch (_) { continue; }
  const lower = content.toLowerCase();
  const found = [];
  for (const k of KEYWORDS) {
    const i = lower.indexOf(k);
    if (i >= 0) {
      found.push(k);
      if (stringLines.length < 400) {
        const line = content.slice(Math.max(0, i - 60), Math.min(content.length, i + 90)).replace(/\s+/g, " ").trim();
        stringLines.push(`${f.rel}: ${line}`);
      }
    }
  }
  if (found.length) hitFiles.push({ path: f.rel, size: f.size, keywords: found });
}
hitFiles.sort((a, b) => b.keywords.length - a.keywords.length);

/* ---------------- assets özeti ---------------- */
const assets = all.filter((f) => f.rel.startsWith("assets" + path.sep) || f.rel.startsWith("assets/"));
const assetsByExt = {};
for (const a of assets) assetsByExt[a.ext || "(yok)"] = (assetsByExt[a.ext || "(yok)"] || 0) + 1;
const biggest = assets.slice().sort((a, b) => b.size - a.size).slice(0, 25);

/* ---------------- model.json ---------------- */
const model = {
  root: path.resolve(root),
  package: pkgMatch ? pkgMatch[1] : null,
  versionName: verMatch ? verMatch[1] : null,
  minSdk: sdkMatch ? Number(sdkMatch[1]) : (compiledSdk ? Number(compiledSdk) : null),
  applicationClass: appClass || null,
  activities: activities.slice(0, 40),
  counts: { files: all.length, assets: assets.length, smali: (byExt[".smali"] || 0), dex: (byExt[".dex"] || 0) },
  databases: dbs,
  json: jsonFiles,
  keywordFiles: hitFiles.slice(0, 40),
  generated_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "model.json"), JSON.stringify(model, null, 2));
fs.writeFileSync(path.join(outDir, "strings.txt"), stringLines.join("\n") + "\n");

/* ---------------- ANALIZ.md ---------------- */
const L = [];
L.push("# APK içerik analizi");
L.push("");
L.push(`- Paket: **${model.package || "?"}**`);
L.push(`- Sürüm: **${model.versionName || "?"}** · minSdk **${model.minSdk ?? "?"}**`);
L.push(`- Uygulama sınıfı: \`${model.applicationClass || "?"}\``);
L.push(`- Dosya: ${all.length} · assets: ${assets.length} · smali: ${model.counts.smali} · dex: ${model.counts.dex}`);
L.push(`- Aktiviteler: ${activities.length}${activities.length ? " → " + activities.slice(0, 6).join(", ") : ""}`);
if (usesLibs.length) L.push(`- Native kütüphane bildirimi: ${usesLibs.join(", ")}`);
L.push("");

L.push("## Uzantı dağılımı");
L.push("");
L.push("| Uzantı | Dosya |");
L.push("|---|---|");
Object.entries(byExt).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([e, n]) => L.push(`| \`${e}\` | ${n} |`));
L.push("");

L.push(`## assets/ (${assets.length} dosya)`);
L.push("");
if (!assets.length) L.push("assets/ klasörü yok.");
else {
  L.push("| Uzantı | Dosya |");
  L.push("|---|---|");
  Object.entries(assetsByExt).sort((a, b) => b[1] - a[1]).forEach(([e, n]) => L.push(`| \`${e}\` | ${n} |`));
  L.push("");
  L.push("En büyük dosyalar:");
  L.push("");
  biggest.forEach((a) => L.push(`- \`${a.rel}\` — ${mb(a.size)}`));
}
L.push("");

L.push(`## SQLite veritabanları (${dbs.length})`);
L.push("");
if (!dbs.length) L.push("**Bulunamadı.** İçerik kodda gömülü veya sıkıştırılmış olabilir.");
for (const d of dbs) {
  L.push(`### \`${d.path}\` — ${mb(d.size)}`);
  L.push("");
  if (d.error) { L.push(`okunamadı: ${d.error}`); L.push(""); continue; }
  L.push("| Tablo | Satır | Puan | Sütunlar |");
  L.push("|---|---|---|---|");
  d.tables.slice(0, 40).forEach((t) => {
    L.push(`| \`${t.name}\` | ${t.rows} | ${t.score} | ${t.cols.map((c) => c.name + (c.pk ? "*" : "")).join(", ")} |`);
  });
  L.push("");
  const best = d.tables[0];
  if (best && best.sample) {
    L.push(`En yüksek puanlı tablo \`${best.name}\` örnek satır:`);
    L.push("");
    L.push("```json");
    L.push(JSON.stringify(best.sample, null, 2).slice(0, 1200));
    L.push("```");
    L.push("");
  }
}

L.push(`## JSON içerik dosyaları (${jsonFiles.length})`);
L.push("");
if (!jsonFiles.length) L.push("**Bulunamadı.**");
jsonFiles.slice(0, 25).forEach((j) => {
  L.push(`- \`${j.path}\` — ${mb(j.size)}`);
  j.arrays.forEach((a) => L.push(`  - \`${a.key || "(kök dizi)"}\` → ${a.count} kayıt · alanlar: ${a.sampleKeys.join(", ")}`));
});
L.push("");

L.push("## Anahtar sözcük geçen dosyalar");
L.push("");
if (!hitFiles.length) L.push("**Hiçbiri.** İçerik ikili (binary) biçimde veya şifreli olabilir.");
hitFiles.slice(0, 20).forEach((h) => L.push(`- \`${h.path}\` — ${h.keywords.join(", ")}`));
L.push("");

fs.writeFileSync(path.join(outDir, "ANALIZ.md"), L.join("\n") + "\n");

console.log(L.slice(0, 40).join("\n"));
console.log(`\n→ ${path.join(outDir, "ANALIZ.md")}`);
console.log(`→ ${path.join(outDir, "model.json")}`);
console.log(`veritabanı: ${dbs.length} · json: ${jsonFiles.length} · anahtar dosya: ${hitFiles.length}`);
