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
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./frida-mock.mjs";
import { createAndroidMock } from "./android-mock.mjs";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "bitlife", "theboys-mod.js"), "utf8");
const universeSrc = fs.readFileSync(path.join(ROOT, "bitlife", "universe.js"), "utf8");

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
  [`/data/user/0/${PKG}/files/prefs.json`, JSON.stringify({ money: 5000, age: 27, looks: 78, noAds: false })],
  [`/data/user/0/${PKG}/files/savegame`, JSON.stringify({ money: 5000, age: 27, vought: 0, premium: 1 })],
]);
const ext = `/storage/emulated/0/Android/data/${PKG}/files`;

const android = createAndroidMock({ files });
const timers = [];

new Function(universeSrc)();   // globalThis.BOYS_UNIVERSE

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
const tabLabels = ["Tara", "Evren", "Enjekte", "The Boys", "İstatistik", "Kayıt"];
check("6 sekme", tabLabels.every((t) => byText(t)[0]), tabLabels.join(","));
const pages = panel.children[3].children;
check("6 sayfa", pages.length === 6, `${pages.length}`);
const [scanPage, uniPage, injPage, boysPage, presetsPage, savePage] = pages;
byText("Evren")[0].click();
check("Evren sekmesi açıldı", uniPage.visibility === 0 && scanPage.visibility === 8);
byText("Enjekte")[0].click();
check("Enjekte sekmesi açıldı", injPage.visibility === 0 && uniPage.visibility === 8);
byText("The Boys")[0].click();
check("The Boys sekmesi açıldı", boysPage.visibility === 0 && injPage.visibility === 8);
byText("İstatistik")[0].click();
check("İstatistik sekmesi açıldı", presetsPage.visibility === 0);
byText("Kayıt")[0].click();
check("Kayıt sekmesi açıldı", savePage.visibility === 0);

section("İstatistik şablonları");
const presetButtons = walk(presetsPage).filter((n) => n.kind === "Button");
check("8 istatistik düğmesi", presetButtons.length === 8, `${presetButtons.length}`);
presetButtons[3].click(); // Zeka
check("şablon seçimi Tara'ya attı", scanPage.visibility === 0 && presetsPage.visibility === 8);
check("Zeka ipucu durum satırında", /0–100/.test(BOYS.S.status.text), BOYS.S.status.text);

section("Değer tarama (para)");
const input = walk(scanPage).find((n) => n.kind === "EditText" && n.hint === "değer");
const btn = (label, page = scanPage) => walk(page).find((n) => n.kind === "Button" && n.text === label);
rt.plant.int32(0x200, 5000);
rt.plant.int32(0x240, 5000);
input.editValue = "5000";
btn("İlk Ara").click();
flush();
check("para 2 adreste bulundu", BOYS.S.hits.length === 2, `${BOYS.S.hits.length} aday`);

section("The Boys Evreni — karakter ve meslek");
byText("Evren")[0].click();
check("evren paketi yüklendi", !!BOYS.universePack(), BOYS.universePack() ? BOYS.universePack().title : "yok");
const uniButtons = () => walk(uniPage).filter((n) => n.kind === "Button");
const names = BOYS.universePack().characters.map((c) => c.name);
const charBtns = uniButtons().filter((b) => names.indexOf(b.text) >= 0);
check("10 karakter düğmesi", charBtns.length === 10, `${charBtns.length}`);
check("kaydet/yükle/sıfırla her ekranda", ["Kaydet", "Yükle", "Sıfırla"].every((t) => uniButtons().some((b) => b.text === t)));
uniButtons().find((b) => b.text === "Homelander").click();
check("Homelander seçildi", BOYS.U.character === "homelander");
check("başlangıç etkisi uygulandı", BOYS.U.stat.fame === 35 && BOYS.U.stat.money === 2500000, JSON.stringify(BOYS.U.stat));
check("12 meslek listelendi", uniButtons().filter((b) => b.text.includes("·")).length >= 12, `${uniButtons().length}`);
const sevenBtn = uniButtons().find((b) => b.text.startsWith("The Seven Üyesi"));
check("Compound V olmadan Seven kilitli", sevenBtn.enabled === false);
uniButtons().find((b) => b.text.startsWith("Vought PR Uzmanı")).click();
check("Vought PR seçildi", BOYS.U.career === "vought-pr" && BOYS.U.rank === 0);
check("bölüm 1 açıldı", /Bölüm 1/.test(BOYS.universeCurrent().title), BOYS.universeCurrent().title);

section("The Boys Evreni — bölüm oynama");
const beforeMoney = BOYS.U.stat.money;
const choiceBtn = () => walk(uniPage).filter((n) => n.kind === "Button").find((b) => b.text.startsWith("1. "));
check("3 seçim düğmesi", walk(uniPage).filter((n) => n.kind === "Button" && /^[123]\. /.test(n.text)).length === 3);
choiceBtn().click();
check("seçim uygulandı, maaş eklendi", BOYS.U.stat.money > beforeMoney, `${beforeMoney} → ${BOYS.U.stat.money}`);
check("bölüm tamamlandı", BOYS.U.done.includes("vought-pr-1"));
check("Vought bayrağı açıldı", BOYS.U.flags.vought_insider === true);
check("sıradaki bölüm 2", /Bölüm 2/.test(BOYS.universeCurrent().title), BOYS.universeCurrent().title);

section("The Boys Evreni — istatistik bağlama");
// oyunda 0–100 arası bir istatistik gibi davranan iki adres hazırla
rt.plant.int32(0x300, 42);
rt.plant.int32(0x304, 42);
byText("Tara")[0].click();
input.editValue = "42";
btn("İlk Ara").click();
flush();
check("tarama yeniden yapıldı", BOYS.S.hits.length === 2, `${BOYS.S.hits.length} aday`);
byText("Evren")[0].click();
const uniBtn = (t) => walk(uniPage).filter((n) => n.kind === "Button").find((b) => b.text === t);
uniBtn("fame").click();
check("fame iki adrese bağlandı", BOYS.BINDS.fame && BOYS.BINDS.fame.addrs.length === 2,
  JSON.stringify(BOYS.BINDS.fame && BOYS.BINDS.fame.addrs.length));
BOYS.universeApply({ fame: 10 });
check("bağlı adreslere fame +10 yazıldı", rt.plant.readInt32(0x300) === 52 && rt.plant.readInt32(0x304) === 52,
  `${rt.plant.readInt32(0x300)}, ${rt.plant.readInt32(0x304)}`);
BOYS.universeApply({ fame: 200 });
check("istatistik 100'de kırpılıyor", rt.plant.readInt32(0x300) === 100, String(rt.plant.readInt32(0x300)));
BOYS.universeApply({ health: 5 });
check("bağlanmayan istatistik belleğe yazılmıyor", rt.plant.readInt32(0x300) === 100 && BOYS.U.stat.health === 15,
  `sağlık ${BOYS.U.stat.health}`);
const prevMoney = BOYS.U.stat.money;
walk(uniPage).filter((n) => n.kind === "Button").find((b) => b.text.startsWith("1. ")).click();
check("para sayacı arttı", BOYS.U.stat.money > prevMoney, `${prevMoney} → ${BOYS.U.stat.money}`);

section("The Boys Evreni — kaydet/yükle/sıfırla");
walk(uniPage).filter((n) => n.kind === "Button").find((b) => b.text === "Kaydet").click();
check("evren kaydedildi", files.has(`/data/user/0/${PKG}/files/boys-universe.json`));
const savedDone = BOYS.U.done.length;
walk(uniPage).filter((n) => n.kind === "Button").find((b) => b.text === "Sıfırla").click();
check("sıfırlama temizledi", BOYS.U.done.length === 0 && BOYS.U.character === null);
walk(uniPage).filter((n) => n.kind === "Button").find((b) => b.text === "Yükle").click();
check("geri yüklendi", BOYS.U.done.length === savedDone && BOYS.U.character === "homelander",
  `${BOYS.U.done.length} bölüm, karakter ${BOYS.U.character}`);

section("Enjekte — oyunun kendi SQLite verisi");
if (!android.sqlite.available) {
  console.log("  ! node:sqlite yok (Node 22.5+ gerekir) — SQLite bölümü atlandı");
}
const HAS_SQLITE = android.sqlite.available;
if (HAS_SQLITE) {
const apkDb = `/data/user/0/${PKG}/databases/game.db`;
const realDb = android.sqlite.realPath(apkDb);
{
  const d = new DatabaseSync(realDb);
  d.exec(`CREATE TABLE careers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
          salary INTEGER NOT NULL, company TEXT, description TEXT)`);
  d.exec(`CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
          body TEXT, category TEXT)`);
  d.exec(`CREATE TABLE settings (id INTEGER PRIMARY KEY AUTOINCREMENT, sound INTEGER, music INTEGER)`);
  d.exec(`INSERT INTO careers (name, salary, company, description) VALUES
          ('Police Officer', 45000, 'City', 'Keep the peace'),
          ('Teacher', 38000, 'School', 'Teach kids')`);
  d.exec(`INSERT INTO events (title, body, category) VALUES ('Birthday', 'You turn one year older', 'life')`);
  d.exec("INSERT INTO settings (sound, music) VALUES (1, 1)");
  d.close();
}
const dbBytes = fs.readFileSync(realDb);
files.set(apkDb, new Uint8Array(dbBytes));

byText("Enjekte")[0].click();
const injBtn = (t) => walk(injPage).filter((n) => n.kind === "Button").find((b) => b.text === t);
injBtn("Veriyi tara").click();
check("tarama veritabanı buldu", BOYS.SQLI.dbs.length === 1, `${BOYS.SQLI.dbs.length}`);
const tables = BOYS.SQLI.dbs[0].tables.map((t) => t.name);
check("3 tablo listelendi", tables.length === 3, tables.join(", "));
const careersT = BOYS.SQLI.dbs[0].tables.find((t) => t.name === "careers");
const settingsT = BOYS.SQLI.dbs[0].tables.find((t) => t.name === "settings");
check("careers içerik tablosu sayıldı", careersT.score >= 3, `puan ${careersT.score}`);
check("settings içerik tablosu değil", settingsT.score < 3, `puan ${settingsT.score}`);

const rowOf = (name) => walk(injPage).filter((n) => n.kind === "TextView" && n.text.startsWith(name + " "))[0];
check("tablo satırı çizildi", !!rowOf("careers"), rowOf("careers") && rowOf("careers").text);
const careersAdd = walk(injPage).filter((n) => {
  const i = injPage ? null : null;
  return n.kind === "Button" && n.text === "Ekle";
});
check("her tablo için Ekle düğmesi", careersAdd.length === 3, `${careersAdd.length}`);
check("ayarlar tablosunun Ekle'si pasif", careersAdd[2].enabled === false || careersAdd.some((b) => b.enabled === false));

const before = 2;
careersAdd[0].click();
check("12 meslek eklendi", BOYS.SQLI.last && BOYS.SQLI.last.ids.length === 12, JSON.stringify(BOYS.SQLI.last && BOYS.SQLI.last.ids.length));

// gerçek dosyada doğrula
const checkDb = new DatabaseSync(realDb);
const rows = checkDb.prepare("SELECT name, salary, company FROM careers WHERE id > 2 ORDER BY id").all();
check("gerçek veritabanında 14 satır", before === 2 && checkDb.prepare("SELECT COUNT(*) AS n FROM careers").get().n === 14,
  `${checkDb.prepare("SELECT COUNT(*) AS n FROM careers").get().n}`);
check("ilk eklenen Vought PR", rows[0].name === "Vought PR Uzmanı", rows[0] && rows[0].name);
check("maaş yazıldı", rows[0].salary === 96000, String(rows[0] && rows[0].salary));
check("şirket yazıldı", rows[0].company === "Vought International", rows[0] && rows[0].company);
check("12 The Boys mesleği", rows.length === 12 && new Set(rows.map((r) => r.name)).size === 12, `${rows.length}`);
check("mevcut satırlar bozulmadı", checkDb.prepare("SELECT name FROM careers WHERE id = 1").get().name === "Police Officer");
checkDb.close();

injBtn("Geri al").click();
const afterDb = new DatabaseSync(realDb);
check("geri alma 14 → 2", afterDb.prepare("SELECT COUNT(*) AS n FROM careers").get().n === 2,
  String(afterDb.prepare("SELECT COUNT(*) AS n FROM careers").get().n));
check("geri alma kaydı temizledi", BOYS.SQLI.last === null);
afterDb.close();

section("Enjekte — hepsine birden");
files.set(apkDb, new Uint8Array(fs.readFileSync(realDb)));
BOYS.SQLI.scanned = false;
byText("Enjekte")[0].click();
injBtn("Veriyi tara").click();
const allBtn = walk(injPage).filter((n) => n.kind === "Button").find((b) => b.text.startsWith("THE BOYS'U EKLE"));
check("'hepsine ekle' düğmesi var", !!allBtn);
allBtn.click();
const allDb = new DatabaseSync(realDb);
const cCareers = allDb.prepare("SELECT COUNT(*) AS n FROM careers").get().n;
const cEvents = allDb.prepare("SELECT COUNT(*) AS n FROM events").get().n;
const cSettings = allDb.prepare("SELECT COUNT(*) AS n FROM settings").get().n;
check("careers tablosuna 12 eklendi", cCareers === 14, `${cCareers}`);
check("events tablosuna 30 bölüm eklendi", cEvents === 31, `${cEvents}`);
check("ayarlar tablosuna dokunulmadı", cSettings === 1, `${cSettings}`);
check("durum satırı toplamı yazdı", /42 satır eklendi/.test(BOYS.S.status.text), BOYS.S.status.text);
check("çoklu geri alma kaydı", BOYS.SQLI.last && BOYS.SQLI.last.ids.length === 42, `${BOYS.SQLI.last && BOYS.SQLI.last.ids.length}`);
allDb.close();
// temizle: gerçek dosyayı baştaki hâline döndür
const resetDb = new DatabaseSync(realDb);
resetDb.exec("DELETE FROM careers WHERE id > 2");
resetDb.exec("DELETE FROM events WHERE id > 1");
resetDb.close();
files.set(apkDb, new Uint8Array(fs.readFileSync(realDb)));

}  // HAS_SQLITE sonu

section("Enjekte — JSON içerik dosyası");
const jsonPath = `/data/user/0/${PKG}/files/content.json`;
files.set(jsonPath, JSON.stringify([{ id: 1, name: "Police Officer", description: "x", salary: 45000 }], null, 0));
BOYS.sqlScan();
const jsonEntry = BOYS.SQLI.json.find((j) => j.path === jsonPath);
check("JSON içerik dosyası bulundu", !!jsonEntry && jsonEntry.count === 1, jsonEntry ? `${jsonEntry.count}` : "yok");
const jres = BOYS.injectJson(jsonPath, jsonEntry.arrayKey);
check("JSON'a 12 kayıt eklendi", jres.ok && jres.added === 12, jres.msg);
const parsed = JSON.parse(files.get(jsonPath));
check("JSON dizisi büyüdü", parsed.length === 13, `${parsed.length}`);
check("eklenen kayıt adı Vought", parsed[1].name === "Vought PR Uzmanı", parsed[1].name);
check("ilk kayıt korundu", parsed[0].name === "Police Officer");

section("The Boys karakter paketleri");
byText("Tara")[0].click();
input.editValue = "5000";
btn("İlk Ara").click();
flush();
byText("The Boys")[0].click();
byText("The Boys")[0].click();
const charButtons = walk(boysPage).filter((n) => n.kind === "Button");
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
const saveButtons = walk(savePage).filter((n) => n.kind === "Button");
check("kayıt düğmeleri", ["Yenile", "Yedekle", "Geri Yaz"].every((t) => saveButtons.some((b) => b.text === t)));
const fileRows = walk(savePage).filter((n) => n.kind === "TextView" && n.text.includes("files/"));
check("BitLife dosyaları listelendi", fileRows.length === 2, fileRows.map((r) => r.text).join(" | "));
fileRows.find((r) => r.text.includes("savegame")).click();
const preview = walk(savePage).find((n) => n.kind === "EditText");
check("dosya önizlendi", preview.getText().toString().includes("5000"));
saveButtons.find((b) => b.text === "Bayrakları bul").click();
const flagRows = walk(savePage).filter((n) => n.kind === "TextView" && /vought|premium/.test(n.text));
check("bayraklar bulundu", flagRows.length === 2, flagRows.map((r) => r.text).join(" | "));
flagRows.find((r) => r.text.startsWith("vought")).click();
check("bayrak 0 → 1 çevrildi", preview.getText().toString().includes('"vought":1'), preview.getText().toString().slice(0, 60));
saveButtons.find((b) => b.text === "Geri Yaz").click();
check("bayrak diske yazıldı", files.get(`/data/user/0/${PKG}/files/savegame`).includes('"vought":1'));
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
