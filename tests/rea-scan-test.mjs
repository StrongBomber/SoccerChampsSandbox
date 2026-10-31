/**
 * tools/rea-content-scan.mjs testi — gerçek bir APK benzeri zip üzerinde.
 *
 *   node tests/rea-scan-test.mjs
 *
 * Test APK'sı yerelde üretilir (assets/events.json + classes.dex + lib/x.so),
 * `zip` ile paketlenir ve tarayıcı bunun üzerinde çalıştırılır.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
};
const section = (t) => console.log(`\n${t}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rea-scan-"));
const pkg = path.join(tmp, "pkg");
fs.mkdirSync(path.join(pkg, "assets"), { recursive: true });
fs.mkdirSync(path.join(pkg, "lib", "arm64-v8a"), { recursive: true });

// oyun içeriği gibi görünen dosyalar
fs.writeFileSync(path.join(pkg, "assets", "events.json"), JSON.stringify({
  careers: [{ id: "vought_pr", name: "Vought PR", salary: 96000 }],
  events: [{ title: "Homelander krizi", choices: ["sus", "konuş"] }],
  characters: [{ name: "Starlight", power: "light" }],
}, null, 2));

// sıkıştırılmış kod kaynağı (metin sabitleri)
const dex = Buffer.alloc(4096, 0);
Buffer.from("Lcom/candywriter/bitlife/Career; career salary event choice", "latin1").copy(dex, 64);
fs.writeFileSync(path.join(pkg, "classes.dex"), dex);

// native ikili
const so = Buffer.alloc(2048, 0);
Buffer.from("homelander butcher compound_v supe power", "latin1").copy(so, 32);
fs.writeFileSync(path.join(pkg, "lib", "arm64-v8a", "libgame.so"), so);

const apk = path.join(tmp, "Fake.apk");
execFileSync("zip", ["-q", "-r", apk, "assets", "classes.dex", "lib"], { cwd: pkg });

const out = path.join(tmp, "out");
const stdout = execFileSync("node", [path.join(ROOT, "tools", "rea-content-scan.mjs"), apk, out], { encoding: "utf8" });

section("Tarama çıktısı");
const report = JSON.parse(fs.readFileSync(path.join(out, "icerik-ham.json"), "utf8"));
check("APK boyutu raporlandı", report.bytes > 0, `${report.bytes} bayt`);
check("assets dosyası bulundu", report.asset_files.length === 1 && report.asset_files[0].name === "assets/events.json");
check("kod ve native dosyaları tarandı", report.scans.length >= 2, report.scans.map((s) => s.file).join(", "));
check("assets önce taranıyor", report.scans[0].file === "assets/events.json", report.scans[0].file);

const groups = new Set();
report.scans.forEach((s) => Object.keys(s.hits).forEach((g) => groups.add(g)));
check("meslek grubu bulundu", groups.has("meslek / kariyer"), [...groups].join(", "));
check("olay grubu bulundu", groups.has("olay / hikâye"));
check("karakter grubu bulundu", groups.has("karakter / süper"));

const dexScan = report.scans.find((s) => s.file === "classes.dex");
check("dex içinde 'career' geçiyor", !!dexScan && !!dexScan.hits["meslek / kariyer"], dexScan ? Object.keys(dexScan.hits).join(",") : "yok");
check("örnek bağlam kırpıldı", dexScan.hits["meslek / kariyer"][0].samples[0].length <= 110);

section("Türkçe harita");
const md = fs.readFileSync(path.join(out, "ICERIK-HARITASI.md"), "utf8");
check("başlık var", md.startsWith("# İçerik haritası"));
check("meslek bölümü var", md.includes("## meslek / kariyer"));
check("assets listelendi", md.includes("assets/events.json"));
check("sonraki adım yazılı", md.includes("## Sonraki adım"));
check("stdout özet basıldı", stdout.includes("İçerik haritası"));

section("Kenar durumlar");
const notZip = path.join(tmp, "bozuk.apk");
fs.writeFileSync(notZip, "bu bir zip değil");
let failed = false;
try {
  execFileSync("node", [path.join(ROOT, "tools", "rea-content-scan.mjs"), notZip, path.join(tmp, "out2")], { stdio: "pipe" });
} catch (e) {
  failed = true;
}
check("bozuk dosyada sıfırdan farklı çıkış", failed);

section("Sonuç");
console.log(`\n${pass} geçti, ${fail} başarısız`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail === 0 ? 0 : 1);
