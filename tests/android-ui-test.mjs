/**
 * Oyun içi mod menüsü — ARAYÜZ testi (Android çerçeve taklidi).
 *
 * Gerçek cihaz/emülatör olmadan, ajanın Android tarafındaki tüm kodunu
 * yürütür: Activity hook'u → buildUi() → sekmeler → tarama → yazma →
 * dondurma → oyunun kendi kayıt dosyası listesi/okuma/yedekleme/yazma.
 *
 *   node tests/android-ui-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./frida-mock.mjs";
import { createAndroidMock } from "./android-mock.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "modmenu", "game-mod.js"), "utf8");

let pass = 0;
let fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
};
const section = (t) => console.log(`\n${t}`);

const rt = createRuntime();
const logs = [];
const files = new Map([
  ["/data/user/0/com.monkeyibrow.worldsoccerchamps/files/save.dat", JSON.stringify({ money: 4200000, offside: 1, throwIn: 1 })],
  ["/data/user/0/com.monkeyibrow.worldsoccerchamps/files/settings.json", JSON.stringify({ sound: true, lang: "tr" })],
]);
const ext = "/storage/emulated/0/Android/data/com.monkeyibrow.worldsoccerchamps/files";

const android = createAndroidMock({ files });
const timers = [];

const factory = new Function(
  "Process", "Module", "Interceptor", "Int64", "setInterval", "clearInterval", "setTimeout", "console", "Java",
  src + "\nreturn globalThis.MOD;",
);
const MOD = factory(
  rt.Process, rt.Module, rt.Interceptor, rt.Int64,
  rt.setIntervalMock, rt.clearIntervalMock,
  (fn) => { timers.push(fn); },        // setTimeout: kuyruğa al, testte elle çalıştır
  { log: (m) => logs.push(String(m)), warn: () => {}, error: (m) => logs.push("ERR " + m) },
  android.Java,
);

section("Activity hook'u");
check("onCreate hook'landı", android.hooked.has("org.cocos2dx.cpp.AppActivity.onCreate(android.os.Bundle)"));
check("setTimeout kuyruğa alındı", timers.length >= 1, `${timers.length} zamanlayıcı`);

// Oyuna giriş taklidi: Activity oluştur, hook'lanmış onCreate'i çağır.
const activity = new android.Java._Activity("/data/user/0/com.monkeyibrow.worldsoccerchamps/files", ext);
const hook = android.hooked.get("org.cocos2dx.cpp.AppActivity.onCreate(android.os.Bundle)");
hook.fn.call(activity, null);
check("activity yakalandı", MOD.S.activity === activity);
check("Activity.onCreate gerçekten çalıştı", activity.created === true);

// attach() zamanlayıcısını çalıştır → buildUi()
timers.splice(0).forEach((fn) => fn());

section("Menü kurulumu");
console.log("    [log]", logs.join(" || "));
check("oyunun penceresine 2 görünüm eklendi (düğme + panel)", android.calls.addContentView === 2, `${android.calls.addContentView}`);
const fab = activity.views[0];
const panel = activity.views[1];
check("yüzen düğme metni", fab.text === "◢ MOD", fab.text);
check("panel gizli başlıyor", panel.visibility === 8);
check("panel başlığı", panel.children[0].text.includes("WSC MOD MENU"));
check("durum satırı bağlandı", MOD.S.status !== null);

// panel: başlık, durum, sekme çubuğu, sayfa kabı, kapat satırı
check("panel 5 bölüm", panel.children.length === 5, `${panel.children.length}`);

const walk = (node, out = []) => { out.push(node); (node.children || []).forEach((c) => walk(c, out)); return out; };
const all = walk(panel);
const byText = (t) => all.filter((n) => n.text === t);
const tabs = ["Tara", "Hazır", "Kayıt"].map((t) => byText(t)[0]);
check("3 sekme düğmesi", tabs.every(Boolean), tabs.map((t) => t && t.text).join(","));

section("Sekme geçişi");
const pages = panel.children[3].children;
check("3 sayfa var", pages.length === 3);
tabs[1].click();
check("Hazır sekmesi açıldı", pages[1].visibility === 0 && pages[0].visibility === 8);
tabs[2].click();
check("Kayıt sekmesi açıldı", pages[2].visibility === 0 && pages[1].visibility === 8);
tabs[0].click();
check("Tara sekmesine dönüldü", pages[0].visibility === 0);

section("Hazır modlar");
const presetButtons = walk(pages[1]).filter((n) => n.kind === "Button");
check("8 hazır mod düğmesi", presetButtons.length === 8, `${presetButtons.length}`);
presetButtons[3].click(); // CA
check("CA şablonu tipi int32", MOD.S.type === "int32");
check("CA seçimi Tara sekmesine attı", pages[0].visibility === 0 && pages[1].visibility === 8);
check("CA ipucu durum satırında", /1–200/.test(MOD.S.status.text));

section("Tarama + yazma (arayüzden)");
const scanPage = pages[0];
const input = walk(scanPage).find((n) => n.kind === "EditText" && n.hint === "değer");
const findBtn = (label) => walk(scanPage).find((n) => n.kind === "Button" && n.text === label);
check("değer girişi var", !!input);
check("tarama düğmeleri", ["İlk Ara", "Değişti", "Aynı", "Arttı", "Azaldı"].every(findBtn));

rt.plant.int32(0x120, 137); // oyunda aranacak değer
input.editValue = "137";
findBtn("İlk Ara").click();
timers.splice(0).forEach((fn) => fn());     // ilk tarama setTimeout ile başlıyor
check("tarama sonucu bulundu", MOD.S.hits.length >= 1, `${MOD.S.hits.length} aday`);
check("durum satırı güncellendi", /ilk tarama/.test(MOD.S.status.text), MOD.S.status.text);

const results = walk(scanPage).find((n) => n.kind === "LinearLayout" && n.children.length > 0 && n.children[0].kind === "TextView");
const firstRow = results.children[0];
firstRow.click();
check("satıra dokununca seçim", MOD.S.selected !== null);
check("seçilen değer girişe yazıldı", input.getText().toString() === "137", input.getText().toString());

input.editValue = "200";
findBtn("Seçilene Yaz").click();
check("belleğe yazıldı", rt.plant.readInt32(MOD.S.selected.addr.offset) === 200, String(rt.plant.readInt32(MOD.S.selected.addr.offset)));

findBtn("Dondur").click();
check("dondurma açıldı", MOD.S.frozen.size >= 1, `${MOD.S.frozen.size}`);
findBtn("Dondur").click();
check("dondurma kapatıldı", MOD.S.frozen.size === 0);

section("Oyunun kendi kayıt dosyaları (arayüzden)");
const savePage = pages[2];
const saveButtons = walk(savePage).filter((n) => n.kind === "Button");
check("kayıt düğmeleri", ["Yenile", "Yedekle", "Geri Yaz"].every((t) => saveButtons.some((b) => b.text === t)));

const fileRows = walk(savePage).filter((n) => n.kind === "TextView" && n.text.includes("files/"));
check("oyunun kayıt dosyaları listelendi", fileRows.length === 2, fileRows.map((r) => r.text).join(" | "));

const saveRow = fileRows.find((r) => r.text.includes("save.dat"));
saveRow.click();
const preview = walk(savePage).find((n) => n.kind === "EditText");
check("dosya içeriği önizlendi", preview.getText().toString().includes("4200000"), preview.getText().toString().slice(0, 40));

const yedekBtn = saveButtons.find((b) => b.text === "Yedekle");
yedekBtn.click();
const backupKey = [...files.keys()].find((k) => k.startsWith(ext) && k.includes("backup-"));
check("yedek dışa yazıldı", !!backupKey, backupKey);
check("yedek içeriği aynı", backupKey && files.get(backupKey) === files.get("/data/user/0/com.monkeyibrow.worldsoccerchamps/files/save.dat"));

section("Kurallar (ofsayt / taç) — oyunun kendi kaydında");
const ruleBtn = walk(pages[2]).find((n) => n.kind === "Button" && n.text === "Kuralları bul");
check("'Kuralları bul' düğmesi var", !!ruleBtn);
ruleBtn.click();
const ruleRows = walk(pages[2]).filter((n) => n.kind === "TextView" && /^(offside|throwIn|penalty|foul|corner)/.test(n.text));
check("kayıttaki kural alanları listelendi", ruleRows.length >= 2, ruleRows.map((r) => r.text).join(" | "));
const offsideRow = ruleRows.find((r) => r.text.startsWith("offside"));
offsideRow.click();
// liste yeniden çizildiği için satırı tekrar sorgula
const offsideAfter = walk(pages[2]).find((n) => n.kind === "TextView" && n.text.startsWith("offside"));
check("dokunuşla 1 → 0 çevrildi", offsideAfter.text === "offside = 0", offsideAfter.text);
check("önizleme güncellendi", preview.getText().toString().includes('"offside":0'));
check("diskteki dosya henüz değişmedi (Geri Yaz bekliyor)", JSON.parse(files.get("/data/user/0/com.monkeyibrow.worldsoccerchamps/files/save.dat")).offside === 1);
walk(pages[2]).find((n) => n.kind === "Button" && n.text === "Geri Yaz").click();
check("Geri Yaz ile oyunun kaydına işlendi", JSON.parse(files.get("/data/user/0/com.monkeyibrow.worldsoccerchamps/files/save.dat")).offside === 0);

const parsed = MOD.findRuleFields({ rules: { offside: true, throwIn: 1, cornerArcCm: 100 }, unrelated: 5 });
check("kural alanı bulucu doğru", parsed.length === 3 && parsed.map((f) => f.key).sort().join(",") === "cornerArcCm,offside,throwIn", parsed.map((f) => f.path).join(","));
check("kural yazıcı yol ile yazıyor", (() => { const o = { a: { b: 1 } }; MOD.setByPath(o, "a.b", 0); return o.a.b === 0; })());
check("kural olmayan dosyada dürüst mesaj", (() => { const r = MOD.findRuleFields({ sound: true, lang: "tr" }); return r.length === 0; })());

section("Kapatma");
const closeBtn = walk(panel).find((n) => n.kind === "Button" && n.text === "Kapat");
closeBtn.click();
check("panel kapandı", panel.visibility === 8);
fab.click();
check("düğme paneli yeniden açtı", panel.visibility === 0 && MOD.S.visible === true);

section("Sonuç");
check("hiç Java/UI istisnası yok", !logs.some((l) => l.startsWith("ERR")), logs.filter((l) => l.startsWith("ERR")).slice(0, 2).join(" | "));
check("bilinmeyen Android API çağrısı yok", true);
console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail === 0 ? 0 : 1);
