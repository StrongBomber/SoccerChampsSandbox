/**
 * THE BOYS modu — ARAYÜZ testi (Android çerçeve taklidi, cihaz gerekmez).
 *
 * Ajanın Android tarafındaki tüm kodu yürütülür: Activity hook'u (paket adına
 * göre) → buildUi() → 4 sekme → istatistik şablonları → The Boys karakter
 * paketleri → değer tarama/yazma → Vought Modu → oyunun kayıt dosyaları.
 *
 *   node tests/theboys-ui-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./frida-mock.mjs";
import { createAndroidMock } from "./android-mock.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "bitlife", "theboys-mod.js"), "utf8");

let pass = 0;
let fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
};
const section = (t) => console.log(`\n${t}`);

const PKG = "com.candywriter.bitlife";
const rt = createRuntime();
const logs = [];
const files = new Map([
  [`/data/user/0/${PKG}/files/prefs.json`, JSON.stringify({ money: 5000, age: 27, looks: 78 })],
  [`/data/user/0/${PKG}/files/savegame`, JSON.stringify({ money: 5000, age: 27, looks: 78, offside: 0 })],
]);
const ext = `/storage/emulated/0/Android/data/${PKG}/files`;

const android = createAndroidMock({ files });
const timers = [];

const factory = new Function(
  "Process", "Module", "Interceptor", "Int64", "setInterval", "clearInterval", "setTimeout", "console", "Java",
  src + "\nreturn globalThis.BOYS;",
);
const BOYS = factory(
  rt.Process, rt.Module, rt.Interceptor, rt.Int64,
  rt.setIntervalMock, rt.clearIntervalMock,
  (fn) => { timers.push(fn); },
  { log: (m) => logs.push(String(m)), warn: () => {}, error: (m) => logs.push("ERR " + m) },
  android.Java,
);
const flush = () => timers.splice(0).forEach((fn) => fn());

section("Activity yakalama (paket adına göre)");
check("android.app.Activity.onCreate hook'landı", android.hooked.has("android.app.Activity.onCreate(android.os.Bundle)"));
const hook = android.hooked.get("android.app.Activity.onCreate(android.os.Bundle)");

// yabancı uygulama → menü eklenmemeli
const other = new android.Java._Activity("/data/user/0/com.other.app/files", "/x", "com.other.app");
hook.fn.call(other, null);
flush();
check("yabancı pakette menü eklenmiyor", other.views.length === 0 && BOYS.S.activity === null);

// BitLife → menü eklenmeli
const activity = new android.Java._Activity(`/data/user/0/${PKG}/files`, ext, PKG);
hook.fn.call(activity, null);
timerQueue();
function timerQueue() { flush(); }
check("BitLife activity yakalandı", BOYS.S.activity === activity);
check("oyunun penceresine 2 görünüm (düğme + panel)", android.calls.addContentView === 2, `${android.calls.addContentView}`);

const fab = activity.views[0];
const panel = activity.views[1];
check("yüzen düğme '◢ THE BOYS'", fab.text === "◢ THE BOYS", fab.text);
check("panel başlığı", panel.children[0].text.includes("THE BOYS MOD · BitLife"), panel.children[0].text);
check("panel başlangıçta gizli", panel.visibility === 8);

const walk = (node, out = []) => { out.push(node); (node.children || []).forEach((c) => walk(c, out)); return out; };
const all = () => walk(panel);
const byText = (t) => all().filter((n) => n.text === t);

section("Sekmeler");
const tabLabels = ["Tara", "The Boys", "İstatistik", "Kayıt"];
check("4 sekme", tabLabels.every((t) => byText(t)[0]), tabLabels.join(","));
const pages = panel.children[3].children;
check("4 sayfa", pages.length === 4, `${pages.length}`);
byText("The Boys")[0].click();
check("The Boys sekmesi açıldı", pages[1].visibility === 0 && pages[0].visibility === 8);
byText("İstatistik")[0].click();
check("İstatistik sekmesi açıldı", pages[2].visibility === 0);
byText("Kayıt")[0].click();
check("Kayıt sekmesi açıldı", pages[3].visibility === 0);

section("İstatistik şablonları");
const presetButtons = walk(pages[2]).filter((n) => n.kind === "Button");
check("8 istatistik düğmesi", presetButtons.length === 8, `${presetButtons.length}`);
presetButtons[3].click(); // Zeka
check("şablon seçimi Tara'ya attı", pages[0].visibility === 0 && pages[2].visibility === 8);
check("Zeka ipucu durum satırında", /0–100/.test(BOYS.S.status.text), BOYS.S.status.text);

section("Değer tarama (para)");
const input = walk(pages[0]).find((n) => n.kind === "EditText" && n.hint === "değer");
const btn = (label, page = pages[0]) => walk(page).find((n) => n.kind === "Button" && n.text === label);
rt.plant.int32(0x200, 5000);
rt.plant.int32(0x240, 5000);
input.editValue = "5000";
btn("İlk Ara").click();
flush();
check("para 2 adreste bulundu", BOYS.S.hits.length === 2, `${BOYS.S.hits.length} aday`);

section("The Boys karakter paketleri");
byText("The Boys")[0].click();
const charButtons = walk(pages[1]).filter((n) => n.kind === "Button");
check("10 karakter + 2 Vought + 2 güç düğmesi", charButtons.length === 14, `${charButtons.length}`);
check("Homelander düğmesi", charButtons.some((b) => b.text.startsWith("Homelander · 100")));

const homelander = charButtons.find((b) => b.text.startsWith("Homelander"));
homelander.click();
check("Homelander seçili olmayan tüm adreslere yazdı", rt.plant.readInt32(0x200) === 100 && rt.plant.readInt32(0x240) === 100,
  `${rt.plant.readInt32(0x200)}, ${rt.plant.readInt32(0x240)}`);
check("durum satırı karakter adını gösterdi", /Homelander: 2 adrese 100/.test(BOYS.S.status.text), BOYS.S.status.text);

const hughie = charButtons.find((b) => b.text.startsWith("Hughie"));
hughie.click();
check("Hughie 70 yazdı", rt.plant.readInt32(0x200) === 70 && rt.plant.readInt32(0x240) === 70);

section("Vought parası ve Vought Modu");
const vought = charButtons.find((b) => b.text.startsWith("Vought parası"));
vought.click();
check("Vought parası yazıldı", rt.plant.readInt32(0x200) === 999999999, String(rt.plant.readInt32(0x200)));
const freeze = charButtons.find((b) => b.text.startsWith("Vought Modu"));
input.editValue = "8888";
freeze.click();
check("Vought Modu kilitledi", BOYS.S.frozen.size === 2, `${BOYS.S.frozen.size}`);
freeze.click();
check("Vought Modu kapandı", BOYS.S.frozen.size === 0);

section("Compound V ve sıralama (arayüz)");
charButtons.find((b) => b.text.startsWith("Hughie")).click();
check("Hughie 70 → taban", rt.plant.readInt32(0x200) === 70);
const cv = charButtons.find((b) => b.text.startsWith("Compound V"));
cv.click();
check("Compound V +5 yazdı", rt.plant.readInt32(0x200) === 75, String(rt.plant.readInt32(0x200)));
check("doz sayacı durum satırında", /doz 1/.test(BOYS.S.status.text), BOYS.S.status.text);
check("sıralama durum satırında", /Kimiko/.test(BOYS.S.status.text), BOYS.S.status.text);
charButtons.find((b) => b.text === "Sıralamam").click();
check("Sıralamam 75 → Kimiko", /Kimiko/.test(BOYS.S.status.text), BOYS.S.status.text);

section("Oyunun kendi kayıt dosyaları");
const saveButtons = walk(pages[3]).filter((n) => n.kind === "Button");
check("kayıt düğmeleri", ["Yenile", "Yedekle", "Geri Yaz"].every((t) => saveButtons.some((b) => b.text === t)));
const fileRows = walk(pages[3]).filter((n) => n.kind === "TextView" && n.text.includes("files/"));
check("BitLife dosyaları listelendi", fileRows.length === 2, fileRows.map((r) => r.text).join(" | "));
fileRows.find((r) => r.text.includes("savegame")).click();
const preview = walk(pages[3]).find((n) => n.kind === "EditText");
check("dosya önizlendi", preview.getText().toString().includes("5000"));
saveButtons.find((b) => b.text === "Yedekle").click();
check("yedek alındı", [...files.keys()].some((k) => k.startsWith(ext) && k.includes("backup-")));

section("Kapatma");
walk(panel).find((n) => n.kind === "Button" && n.text === "Kapat").click();
check("panel kapandı", panel.visibility === 8);
fab.click();
check("düğme paneli açtı", panel.visibility === 0 && BOYS.S.visible === true);

section("Sonuç");
check("hiç Java/UI istisnası yok", !logs.some((l) => l.startsWith("ERR")), logs.filter((l) => l.startsWith("ERR")).slice(0, 2).join(" | "));
console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail === 0 ? 0 : 1);
