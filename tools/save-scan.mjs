#!/usr/bin/env node
/**
 * Oyunun KENDİ kayıt dosyasını incele ve modla (ayrı uygulama yok, CLI).
 *
 * Kayıt dosyasını cihazdan çek:
 *   tools/wsc-save.sh pull saves/           (root)
 *   adb pull /sdcard/Android/data/com.monkeyibrow.worldsoccerchamps/files   (Android ≤10)
 *
 * Kullanım:
 *   node tools/save-scan.mjs saves/xxx              # biçim + aday para/kabiliyet alanları
 *   node tools/save-scan.mjs saves/xxx --keys       # tüm sayısal yolları listele
 *   node tools/save-scan.mjs saves/xxx --patch money=99999999,attr=20 --out saves/yeni.json
 *
 * Not: oyun JSON saklıyorsa doğrudan yamalar; binary/plist ise bunu söyler ve
 * Frida yolunu (modmenu/game-mod.js) önerir. Dosya biçimini zorla değiştirmez.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
if (!args.length || args[0] === "-h" || args[0] === "--help") {
  console.log("kullanım: node tools/save-scan.mjs <dosya> [--keys] [--patch k=v,...] [--out dosya] [--max 40]");
  console.log("         binary dosyalar için: --strings [--grep budget]");
  process.exit(args.length ? 0 : 2);
}

const file = args[0];
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(name);

if (!fs.existsSync(file)) {
  console.error("dosya yok: " + file);
  process.exit(1);
}

const buf = fs.readFileSync(file);
const head = buf.subarray(0, 16);
const hex = [...head].map((b) => b.toString(16).padStart(2, "0")).join(" ");

let kind = "binary";
if (buf[0] === 0x7b || buf[0] === 0x5b) kind = "json";
else if (buf.subarray(0, 6).toString("latin1") === "bplist") kind = "binary-plist";
else if (buf.subarray(0, 5).toString("latin1") === "<?xml") kind = "xml-plist";
else if (head.subarray(0, 2).toString("latin1") === "PK") kind = "zip";
else if (buf.subarray(0, 4).toString("latin1") === "SQLi") kind = "sqlite";

console.log(`dosya : ${path.basename(file)}`);
console.log(`boyut : ${buf.length} bayt`);
console.log(`baş   : ${hex}`);
console.log(`biçim : ${kind}`);

/* ------------------------------------------------------------------ */
/* JSON ise: alanları çıkar, adayları işaretle                         */
/* ------------------------------------------------------------------ */

const MONEY = /(budget|balance|money|cash|wage|salary|transfer|fund|value|price|income|expense|prize)/i;
const ABILITY = /(ability|ca$|pa$|current_?ability|potential|attr|rating|overall|stat)/i;
const RULES = /(offside|penalty|throw|corner|foul|yellow|red|rule)/i;

function walk(node, prefix, out) {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${prefix}[${i}]`, out));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "number") out.push({ path: p, value: v, key: k });
    else walk(v, p, out);
  }
}

if (kind !== "json") {
  console.log("\nJSON değil → alan adlarıyla yama yapılamaz.");
  console.log("Bu durumda oyunu çalışırken modla:  tools/game-mod.sh");
  const strings = buf.toString("latin1").match(/[\x20-\x7e]{6,}/g) || [];
  if (has("--strings")) {
    const filter = (flag("--grep") || "").toLowerCase();
    const list = filter ? strings.filter((x) => x.toLowerCase().includes(filter)) : strings;
    console.log(`\nmetin parçaları: ${list.length}${filter ? ` ("${filter}" filtresi)` : ""} (ilk ${Number(flag("--max") || 40)})`);
    list.slice(0, Number(flag("--max") || 40)).forEach((x) => console.log("  " + x.slice(0, 78)));
    if (!list.length) console.log("  (eşleşme yok)");
  } else {
    console.log(`\nyazdırılabilir metin parçası: ${strings.length} (ilk 10 · hepsi için --strings)`);
    strings.slice(0, 10).forEach((x) => console.log("  " + x.slice(0, 72)));
  }
  process.exit(0);
}

let data;
try {
  data = JSON.parse(buf.toString("utf8"));
} catch (e) {
  console.error("JSON ayrıştırılamadı: " + e.message);
  process.exit(1);
}

const nums = [];
walk(data, "", nums);
const money = nums.filter((n) => MONEY.test(n.key));
const ability = nums.filter((n) => ABILITY.test(n.key));
const rules = nums.filter((n) => RULES.test(n.key));

console.log(`\nsayısal alan: ${nums.length}`);
const section = (title, list) => {
  console.log(`\n${title} (${list.length})`);
  list.slice(0, Number(flag("--max") || 20)).forEach((n) => console.log(`  ${n.path} = ${n.value}`));
  if (list.length > Number(flag("--max") || 20)) console.log(`  … +${list.length - Number(flag("--max") || 20)}`);
};
section("PARA / BÜTÇE adayları", money);
section("KABİLİYET adayları", ability);
if (rules.length) section("KURAL alanları", rules);

if (has("--keys")) {
  console.log(`\ntüm sayısal yollar (${nums.length})`);
  nums.forEach((n) => console.log(`${n.path} = ${n.value}`));
}

/* ------------------------------------------------------------------ */
/* yama                                                                */
/* ------------------------------------------------------------------ */

function setPath(obj, p, v) {
  const parts = p.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = v;
}

const patchArg = flag("--patch");
if (patchArg) {
  const ops = patchArg.split(",").map((s) => s.trim()).filter(Boolean);
  const target = data;
  let applied = 0;
  for (const op of ops) {
    const [key, rawValue] = op.split("=");
    const value = Number(rawValue);
    if (!Number.isFinite(value)) { console.error(`geçersiz değer: ${op}`); continue; }
    // tam yol verildiyse onu kullan, yoksa ada göre ilk eşleşmeyi yamala
    if (key.includes(".") || key.includes("[")) {
      setPath(target, key, value);
      applied++;
      console.log(`  ${key} = ${value}`);
      continue;
    }
    const list = nums.filter((n) => n.key.toLowerCase() === key.toLowerCase());
    if (!list.length) { console.error(`  alan bulunamadı: ${key}`); continue; }
    for (const n of list) { setPath(target, n.path, value); applied++; }
    console.log(`  ${list.length} × ${key} = ${value}`);
  }
  const out = flag("--out") || file.replace(/\.json$/i, "") + ".mod.json";
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`\n${applied} alan yamalandı → ${out}`);
  console.log("Cihaza geri yaz: tools/wsc-save.sh push <dizin>  (oyunu tamamen kapat)");
}
