/**
 * bitlife/theboys-mod.js — The Boys modu mantık testi (gerçek cihaz gerekmez).
 *
 * Ajan Node içinde sahte Frida çalışma zamanıyla yüklenir; tarama, daraltma,
 * yazma, dondurma ve kayıt dosyası API'leri sınanır. Amaç: cihaza gitmeden
 * ajanın çökmeyeceğini ve tarama matematiğinin doğru olduğunu kanıtlamak.
 *
 *   node tests/game-mod-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./frida-mock.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "bitlife", "theboys-mod.js"), "utf8");
const universeSrc = fs.readFileSync(path.join(ROOT, "bitlife", "universe.js"), "utf8");
new Function(universeSrc)();   // globalThis.BOYS_UNIVERSE

const rt = createRuntime();
const logs = [];
const fakeConsole = { log: (m) => logs.push(String(m)), warn: () => {}, error: (m) => logs.push("ERR " + m) };

const factory = new Function(
  "Process", "Module", "Interceptor", "Int64", "setInterval", "clearInterval", "console",
  src + "\nreturn globalThis.BOYS;",
);
const MOD = factory(
  rt.Process, rt.Module, rt.Interceptor, rt.Int64,
  rt.setIntervalMock, rt.clearIntervalMock, fakeConsole,
);

let pass = 0;
let fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
};
const section = (t) => console.log(`\n${t}`);

/* ---------------------------------------------------------------- */
section("İçerik paketi");
const pack = MOD.universePack();
check("paket yüklendi", !!pack && pack.version === 2, pack ? pack.title : "yok");
check("10 karakter", pack.characters.length === 10);
check("12 meslek", pack.careers.length === 12);
check("30 bölüm", pack.chapters.length === 30, `${pack.chapters.length}`);
check("kimlikler benzersiz", (() => {
  const ids = [].concat(pack.characters, pack.careers, pack.chapters).map((x) => x.id);
  return new Set(ids).size === ids.length;
})());
check("her bölüm geçerli mesleğe bağlı", pack.chapters.every((c) => c.career === "*" || pack.careers.some((k) => k.id === c.career)));
check("her bölümün 2–3 seçimi var", pack.chapters.every((c) => c.choices.length >= 2 && c.choices.length <= 3));
check("her seçimin sonucu yazılı", pack.chapters.every((c) => c.choices.every((ch) => typeof ch.outcome === "string" && ch.outcome.length > 5)));
check("etki anahtarları geçerli", pack.chapters.every((c) => c.choices.every((ch) =>
  Object.keys(ch.effects || {}).every((k) => MOD.UNI_STATS.indexOf(k) >= 0))));
check("her mesleğin 4 kademesi var", pack.careers.every((c) => c.ladder.length === 4));
check("her mesleğin bölümleri var", pack.careers.every((c) => MOD.uCareerChapters(c.id).length >= 2));
check("her bölüm oynanabilir (bölüm→final akışı)", pack.chapters.every((c) => c.choices.length > 0));

section("Meslek gereksinimleri");
MOD.U.flags = {}; MOD.U.career = null;
check("Seven: supe şartı", MOD.universeNeed("seven").ok === false && MOD.universeNeed("seven").missing.indexOf("supe") >= 0);
check("Seven: supe bayrağıyla açılır", (() => { MOD.U.flags.supe = true; return MOD.universeNeed("seven").ok; })());
check("The Boys: Vought çalışanı engellenir", (() => {
  MOD.U.flags = { vought_insider: true };
  const n = MOD.universeNeed("boys");
  return n.ok === false && n.blocked.indexOf("vought_insider") >= 0;
})());
check("kimyager: Vought içinden olmalı", MOD.universeNeed("chemist").ok === true);
MOD.U.flags = {};
check("PR uzmanı herkese açık", MOD.universeNeed("vought-pr").ok === true);

section("Karakter ve hikâye akışı");
MOD.universeReset();
const start = MOD.universeStart("butcher");
check("karakter başladı", start.ok && MOD.U.character === "butcher");
check("başlangıç etkileri (karma 0'da kırpılır)", MOD.U.stat.karma === 0 && MOD.U.stat.health === 15 && MOD.U.stat.money === -5000, JSON.stringify(MOD.U.stat));
check("meslek seçimi (boys)", MOD.universeChoose("boys").ok === true);
check("ilk bölüm boys-1", MOD.universeCurrent().id === "boys-1");

const r1 = MOD.universePlay(0);
check("seçim uygulandı", r1.ok && MOD.U.done.indexOf("boys-1") >= 0);
check("maaş eklendi", MOD.U.stat.money > 0, `${MOD.U.stat.money}`);
check("bayrak açıldı", MOD.U.flags.boys_member === true && MOD.U.flags.wanted === true);
check("sıradaki bölüm boys-2", MOD.universeCurrent().id === "boys-2");

const r2 = MOD.universePlay(1);
check("terfi (2 meslek bölümü bitti)", r2.promoted === "Ekip Üyesi", r2.promoted);
check("sonra final bölümü geldi", MOD.universeCurrent().career === "*");

// bütün final bölümlerini oyna
let guard = 0;
while (MOD.universeCurrent() && guard++ < 20) MOD.universePlay(0);
check("tüm bölümler bitti", MOD.universeCurrent() === null, `${MOD.U.done.length} bölüm`);
check("final üretildi", !!MOD.U.ending && typeof MOD.U.ending.title === "string", MOD.U.ending && MOD.U.ending.title);
check("toplam bölüm sayısı 2 + 6 final", MOD.U.done.length === 8, `${MOD.U.done.length}`);
check("bölüm kalmayınca oynanamaz", MOD.universePlay(0).ok === false);

section("Durum, kayıt ve sıfırlama (bellek yok)");
const st = MOD.universeStatus();
check("durum karakteri gösteriyor", st.character === "Billy Butcher" && st.characterId === "butcher", st.character);
check("durum bölüm sayısı", st.done === 8 && st.total === 8, `${st.done}/${st.total}`);
check("bayraklar listelendi", st.flags.indexOf("boys_member") >= 0, st.flags.join(","));
check("günlük dolu", MOD.U.log.length > 0 && MOD.U.log.length <= 12);
check("bağlama tarama olmadan 0", MOD.universeBind("fame") === 0);
check("bilinmeyen istatistik bağlanmaz", MOD.universeBind("torque") === 0);
check("kayıt: oyun dizini yoksa sessiz", MOD.universeSave().ok === false);
check("sıfırlama her şeyi temizler", (() => {
  MOD.universeReset();
  return MOD.U.character === null && MOD.U.done.length === 0 && Object.keys(MOD.BINDS).length === 0;
})());

section("Ajan yükleme");
check("MOD API yüklendi", !!MOD && typeof MOD.firstScan === "function");
check("ajan çökmeden sonlandı", logs.some((l) => l.includes("test modu")), logs.slice(-1)[0]);
check("Frida yokken Java'ya dokunmuyor", !logs.some((l) => l.startsWith("ERR")));
check("4 tarama tipi", Object.keys(MOD.TYPES).length === 4, Object.keys(MOD.TYPES).join(","));
check("varsayılan tip int32", MOD.S.type === "int32");

section("Hazır modlar");
check("8 istatistik şablonu", MOD.PRESETS.length === 8, MOD.PRESETS.map((p) => p.id).join(","));
check("her şablon geçerli tipte", MOD.PRESETS.every((p) => !!MOD.TYPES[p.type]));
check("BitLife istatistikleri", ["money", "age", "looks", "smarts", "health", "happy", "fame", "karma"].every((id) => MOD.PRESETS.some((p) => p.id === id)));
check("10 The Boys karakteri", MOD.CHARACTERS.length === 10, MOD.CHARACTERS.map((c) => c.name).join(", "));
check("Homelander 100", MOD.CHARACTERS.find((c) => c.id === "homelander").quick === 100);
check("karakter değerleri 1–100", MOD.CHARACTERS.every((c) => c.quick > 0 && c.quick <= 100));
check("Vought para sabiti", MOD.VOUGHT_MONEY === 999999999);
check("hedef paket BitLife", /com\.candywriter\.bitlife/.test(src));

section("Değer tarama (int32)");
rt.plant.int32(0x100, 4200000);
rt.plant.int32(0x200, 4200000);
rt.plant.int32(0x300, 4200000);
rt.plant.int32(0x400, 999);
const hits = MOD.firstScan(4200000, "int32");
check("3 adres bulundu", hits.length === 3, `${hits.length} adres`);
check("adresler doğru", hits.every((h) => [0x100, 0x200, 0x300].includes(h.addr.offset)));

section("Daraltma (değişti / aynı)");
MOD.S.hits = hits;
rt.plant.int32(0x200, 1234567); // oyunda değer değişti
const kept = MOD.nextScan("changed", "int32");
check("değişen tek adres kaldı", kept === 1 && MOD.S.hits[0].addr.offset === 0x200, `${kept} adres`);
check("son değer güncellendi", MOD.S.hits[0].last === 1234567);

section("Yazma");
const changed = MOD.writeAll(7777777, "int32");
check("tüm adreslere yazıldı", changed === 1);
check("bellekte yeni değer", rt.plant.readInt32(0x200) === 7777777);
const one = MOD.writeOne(MOD.S.hits[0], 8888888, "int32");
check("tek adres yazma", one === true && rt.plant.readInt32(0x200) === 8888888);

section("Float / double / int64");
rt.plant.float(0x500, 1.5);
rt.plant.double(0x600, 6200000.5);
rt.plant.int64(0x700, 9876543210);
const fh = MOD.firstScan(1.5, "float");
check("float tarama", fh.length === 1 && fh[0].addr.offset === 0x500);
const dh = MOD.firstScan(6200000.5, "double");
check("double tarama", dh.length === 1 && dh[0].addr.offset === 0x600);
const ih = MOD.firstScan(9876543210, "int64");
check("int64 tarama", ih.length === 1 && ih[0].addr.offset === 0x700, `${ih.length}`);
MOD.writeOne(ih[0], 12345678901, "int64");
check("int64 yazma", rt.plant.readInt64(0x700) === 12345678901);

section("Dondurma");
MOD.S.hits = [{ addr: new rt.NativePointer(0x200), last: 0 }];
const n = MOD.freezeAll(5555, true, "int32");
check("dondurma kaydı", n === 1 && MOD.S.frozen.size === 1);
check("interval kuruldu", rt.calls.intervals >= 1);
const cleared = MOD.freezeAll(0, false, "int32");
check("çözme temizledi", cleared === 1 && MOD.S.frozen.size === 0 && rt.calls.cleared >= 1);

section("Compound V ve sıralama");
rt.plant.int32(0x900, 40);
rt.plant.int32(0x904, 60);
const vHits = [{ addr: new rt.NativePointer(0x900) }, { addr: new rt.NativePointer(0x904) }];
check("canlı değerler okundu", JSON.stringify(MOD.liveValues(vHits, "int32")) === "[40,60]");
check("Compound V +5", MOD.compoundV(vHits, "int32", 1) === 2 && rt.plant.readInt32(0x900) === 45);
MOD.compoundV(vHits, "int32", 20);
check("100'de duruyor", rt.plant.readInt32(0x900) === 100 && rt.plant.readInt32(0x904) === 100);
check("sıralama: 100 → Homelander", MOD.rankFor(100).name === "Homelander");
check("sıralama: 85 → Starlight", MOD.rankFor(85).name === "Starlight");
check("sıralama: 50 → Hughie", MOD.rankFor(50).name === "Hughie");
check("sıralama: 10 → The Deep", MOD.rankFor(10).name === "The Deep");
check("sıralama: NaN → null", MOD.rankFor(NaN) === null);
check("sıralama merdiveni azalan", MOD.RANKS.slice(0, -1).every((r, i) => r[0] > MOD.RANKS[i + 1][0]));

section("Kayıt dosyası alan tarayıcı");
const save = { money: 5000, age: 27, noAds: true, vought: 0, name: "x", nested: { premium: 1, notes: "a" }, arr: [{ flag: 0 }] };
const nums = MOD.findNumberFields(save);
check("sayısal/boolean alanlar bulundu", nums.length === 6, nums.map((f) => f.path).join(", "));
check("ilgi çekici alanlar önce", nums[0].hot === true, nums[0].path);
const flags = MOD.findFlags(save);
check("bayraklar: 0/1/boolean", flags.length === 4, flags.map((f) => `${f.path}=${f.value}`).join(", "));
check("iç içe dizi yolu", flags.some((f) => f.path === "arr[0].flag"));
check("metin alanı bayrak değil", !flags.some((f) => f.key === "name"));
const target = { a: { b: 0 } };
MOD.setByPath(target, "a.b", 1);
check("setByPath iç içe yazdı", target.a.b === 1);

section("Enjeksiyon mantığı");
check("sqlLit sayı", MOD.sqlLit(96000) === "96000");
check("sqlLit metin kaçışı", MOD.sqlLit("O'Brien") === "'O''Brien'", MOD.sqlLit("O'Brien"));
check("sqlLit null", MOD.sqlLit(null) === "NULL" && MOD.sqlLit(undefined) === "NULL");
check("sqlLit boolean", MOD.sqlLit(true) === "1");
const careerRecipes = MOD.recipesFor("careers");
check("careers tablosu → 12 meslek", careerRecipes.length === 12, `${careerRecipes.length}`);
check("meslek kaydı alanları", careerRecipes[0].name === "Vought PR Uzmanı" && careerRecipes[0].pay === 96000);
check("character tablosu → 10 karakter", MOD.recipesFor("characters").length === 10);
check("events tablosu → 30 bölüm", MOD.recipesFor("events").length === 30);
check("bilinmeyen tablo → meslek varsayılanı", MOD.recipesFor("foo").length === 12);

const colName = { name: "name", type: "TEXT", pk: 0, notnull: 0 };
const colSalary = { name: "salary", type: "INTEGER", pk: 0, notnull: 0 };
const colPk = { name: "id", type: "INTEGER", pk: 1, notnull: 0 };
const colCompany = { name: "company", type: "TEXT", pk: 0, notnull: 0 };
const tmpl = { id: 1, name: "Police", salary: 45000, company: "City" };
const rec = { name: "Vought PR Uzmanı", pay: 96000, tag: "Vought International", kind: "career", desc: "x" };
check("pk sütunu atlanır", MOD.valueFor(colPk, rec, tmpl) === null);
check("ad sütununa meslek adı", MOD.valueFor(colName, rec, tmpl) === "Vought PR Uzmanı");
check("maaş sütununa ücret", MOD.valueFor(colSalary, rec, tmpl) === 96000);
check("şirket sütununa işveren", MOD.valueFor(colCompany, rec, tmpl) === "Vought International");
check("eşleşmeyen sütun şablonu korur", MOD.valueFor({ name: "weight", type: "INTEGER" }, rec, { weight: 7 }) === 7);
check("uzun metin 2000 karakterde kırpılır", MOD.valueFor({ name: "body", type: "TEXT" }, { desc: "a".repeat(5000) }, null).length === 2000);
check("tarama öncesi durum boş", MOD.SQLI.scanned === false && MOD.SQLI.dbs.length === 0);

section("Oyunun kendi kayıt dosyaları (BitLife)");
check("Java yokken liste boş (çökmez)", Array.isArray(MOD.saveList()) && MOD.saveList().length === 0);
check("okuma hatayı yutar", String(MOD.saveRead("/yok/dosya", 100)).startsWith("HATA"));
check("yazma sessiz başarısız", MOD.saveWrite("/yok/dosya", "x") === false);

section("Dosya izleyici");
check("libc export yoksa zarifçe kapanır", MOD.startWatcher() === false);
check("durdurma güvenli", (MOD.stopWatcher(), true));

section("Sonuç");
check("ajan hiç istisna fırlatmadı", !logs.some((l) => l.startsWith("ERR")));
console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail === 0 ? 0 : 1);
