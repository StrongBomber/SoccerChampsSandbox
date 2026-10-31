#!/usr/bin/env node
/**
 * apk-inject — apktool ile açılmış APK'nın GERÇEK veri dosyalarına
 * The Boys Evreni içeriğini yazar.
 *
 *   node tools/apk-inject.mjs <decoded-apktool-dir> <model.json> [cikti-dizini]
 *
 * Yaptığı iş:
 *   - içerik tablosu puanı yüksek SQLite tablolarına 12 meslek / 30 bölüm / 10 karakter ekler
 *   - assets içindeki JSON içerik dizilerine kayıt ekler
 *   - her dosyayı yazmadan önce .bak yedeği alır
 *   - NE YAPTIĞINI <cikti>/INJEKSIYON.md'ye yazar (yapamadıysa nedenini de)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let DatabaseSync = null;
try { ({ DatabaseSync } = await import("node:sqlite")); } catch (_) { /* yok */ }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

const [, , decodedDir, modelPath, outDirArg] = process.argv;
if (!decodedDir || !modelPath) {
  console.error("kullanım: node tools/apk-inject.mjs <decoded-dir> <model.json> [cikti]");
  process.exit(2);
}
const outDir = outDirArg || "apk-analiz";
fs.mkdirSync(outDir, { recursive: true });

/* ---------------- içerik paketi ---------------- */
const universeSrc = fs.readFileSync(path.join(ROOT, "bitlife", "universe.js"), "utf8");
new Function(universeSrc)();
const pack = globalThis.BOYS_UNIVERSE;
if (!pack) { console.error("universe.js yüklenemedi"); process.exit(1); }

const model = JSON.parse(fs.readFileSync(modelPath, "utf8"));

/* ---------------- eşleme kuralları ---------------- */
const CONTENT_KIND = [
  { re: /(career|job|occupation|profession|employ)/i, kind: "career" },
  { re: /(character|npc|actor|person|supe|hero)/i, kind: "character" },
  { re: /(event|scenario|story|chapter|episode|choice|decision|activity|random|life)/i, kind: "chapter" },
];
const NAME_RE = /(^|_)(name|title|label|display_name|fullname|full_name)($|_)/i;
const DESC_RE = /(desc|description|detail|body|content|story|bio|summary|note|text)/i;
const PAY_RE = /(salary|pay|wage|income|earn|revenue|price|cost|value)/i;
const TAG_RE = /(tag|category|type|group|kind|class|family|sector|employer|company|org|profession)/i;
const ID_RE = /^(id|_id|uid|pk|key|row_id|rowid)$/i;

function kindFor(table) {
  for (const k of CONTENT_KIND) if (k.re.test(table)) return k.kind;
  return "career";
}
function recipesFor(kind) {
  if (kind === "character") {
    return pack.characters.map((c) => ({ name: c.name, desc: c.perk, pay: 0, tag: c.tag, kind }));
  }
  if (kind === "chapter") {
    return pack.chapters.map((c) => ({ name: c.title, desc: c.text, pay: 0, tag: c.career, kind }));
  }
  return pack.careers.map((c) => ({ name: c.name, desc: c.note, pay: c.pay, tag: c.employer, kind }));
}

const sq = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return "'" + String(v).replace(/'/g, "''") + "'";
};

function valueFor(col, recipe, tmpl) {
  const n = String(col.name).toLowerCase();
  const base = tmpl ? tmpl[col.name] : null;
  if (col.pk) return undefined;
  if (ID_RE.test(n)) return undefined;
  if (NAME_RE.test(n)) return String(recipe.name || "").slice(0, 200);
  if (DESC_RE.test(n)) return String(recipe.desc || "").slice(0, 4000);
  if (PAY_RE.test(n)) return Number(recipe.pay || 0);
  if (TAG_RE.test(n)) return String(recipe.tag || base || "").slice(0, 200);
  return base === undefined ? null : base;
}

/* ---------------- SQLite enjeksiyonu ---------------- */
const report = { started_at: new Date().toISOString(), databases: [], json: [], total_rows: 0, skipped: [] };

for (const d of model.databases || []) {
  const abs = path.join(decodedDir, d.path);
  const entry = { path: d.path, tables: [], error: null };
  if (!DatabaseSync) { entry.error = "node:sqlite yok"; report.databases.push(entry); continue; }
  let db = null;
  try {
    fs.copyFileSync(abs, abs + ".bak");
    db = new DatabaseSync(abs);
    for (const t of d.tables || []) {
      if (t.score < 3) { report.skipped.push(`${d.path}::${t.name} (puan ${t.score})`); continue; }
      // gerçek sütun listesi
      const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all().map((c) => ({ name: c.name, type: c.type, pk: c.pk, notnull: c.notnull }));
      if (!cols.length) continue;
      let tmpl = null;
      try { tmpl = db.prepare(`SELECT * FROM "${t.name}" LIMIT 1`).get() || null; } catch (_) { /* yok say */ }
      const insertable = cols.filter((c) => !(c.pk && /int/i.test(c.type || "")) && !ID_RE.test(String(c.name).toLowerCase()) && !(c.pk && cols.length > 1));
      if (!insertable.length) { report.skipped.push(`${d.path}::${t.name} (yazılabilir sütun yok)`); continue; }

      const kind = kindFor(t.name);
      const recipes = recipesFor(kind);
      const names = insertable.map((c) => `"${c.name}"`).join(", ");
      let added = 0;
      const before = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n;
      db.exec("BEGIN");
      for (const r of recipes) {
        const vals = insertable.map((c) => {
          const v = valueFor(c, r, tmpl);
          return sq(v === undefined ? null : v);
        }).join(", ");
        try {
          db.prepare(`INSERT INTO "${t.name}" (${names}) VALUES (${vals})`).run();
          added++;
        } catch (e) {
          // kısıt hatası: bu satırı atla, devam et
        }
      }
      db.exec("COMMIT");
      const after = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n;
      entry.tables.push({ name: t.name, kind, added, before, after, inserted: added > 0 });
      report.total_rows += added;
    }
  } catch (e) {
    entry.error = String(e && e.message || e);
  } finally {
    if (db) { try { db.close(); } catch (_) { /* yok say */ } }
  }
  report.databases.push(entry);
}

/* ---------------- JSON enjeksiyonu ---------------- */
const pick = (obj, re) => Object.keys(obj).find((k) => re.test(k));

for (const j of model.json || []) {
  const abs = path.join(decodedDir, j.path);
  const entry = { path: j.path, added: 0, error: null };
  try {
    fs.copyFileSync(abs, abs + ".bak");
    let data = JSON.parse(fs.readFileSync(abs, "utf8"));
    for (const a of j.arrays) {
      const arr = a.key === "" ? data : data[a.key];
      if (!Array.isArray(arr) || !arr.length || typeof arr[0] !== "object" || arr[0] === null) continue;
      const template = arr[0];
      const nameKey = pick(template, NAME_RE);
      const descKey = pick(template, DESC_RE);
      const payKey = pick(template, PAY_RE);
      const idKey = pick(template, /^(id|_id|uid|key)$/i) || pick(template, /id/i);
      const kind = kindFor(a.key || j.path);
      const recipes = recipesFor(kind);
      const maxId = idKey ? arr.reduce((m, o) => (typeof o[idKey] === "number" && o[idKey] > m ? o[idKey] : m), 0) : 0;
      recipes.forEach((r, i) => {
        const clone = JSON.parse(JSON.stringify(template));
        if (nameKey) clone[nameKey] = r.name;
        if (descKey) clone[descKey] = r.desc;
        if (payKey && typeof clone[payKey] === "number") clone[payKey] = Number(r.pay || 0);
        if (idKey) clone[idKey] = typeof template[idKey] === "number" ? maxId + 1 + i : `${template[idKey]}_boys${i}`;
        arr.push(clone);
        entry.added++;
      });
      report.total_rows += recipes.length;
    }
    fs.writeFileSync(abs, JSON.stringify(data));
  } catch (e) {
    entry.error = String(e && e.message || e);
  }
  report.json.push(entry);
}

/* ---------------- rapor ---------------- */
fs.writeFileSync(path.join(outDir, "injection.json"), JSON.stringify(report, null, 2));

const L = [];
L.push("# The Boys enjeksiyonu (APK içi)");
L.push("");
L.push(`Toplam eklenen satır/kayıt: **${report.total_rows}**`);
L.push("");
L.push("## Veritabanları");
L.push("");
if (!report.databases.length) L.push("Veritabanı bulunamadı — enjeksiyon yapılmadı.");
for (const d of report.databases) {
  L.push(`### \`${d.path}\``);
  if (d.error) { L.push(`hata: ${d.error}`); L.push(""); continue; }
  L.push("| Tablo | Tür | Eklenen | Önce | Sonra |");
  L.push("|---|---|---|---|---|");
  d.tables.forEach((t) => L.push(`| \`${t.name}\` | ${t.kind} | ${t.added} | ${t.before} | ${t.after} |`));
  L.push("");
}
L.push("## JSON dosyaları");
L.push("");
if (!report.json.length) L.push("JSON içerik dosyası yok.");
report.json.forEach((j) => L.push(`- \`${j.path}\` — ${j.added} kayıt${j.error ? " · hata: " + j.error : ""}`));
L.push("");
if (report.skipped.length) {
  L.push("## Atlanan tablolar");
  L.push("");
  report.skipped.slice(0, 40).forEach((s) => L.push(`- ${s}`));
  L.push("");
}
fs.writeFileSync(path.join(outDir, "INJEKSIYON.md"), L.join("\n") + "\n");

console.log(L.join("\n"));
console.log(`\n→ ${path.join(outDir, "INJEKSIYON.md")}`);
process.exit(report.total_rows > 0 ? 0 : 3);
