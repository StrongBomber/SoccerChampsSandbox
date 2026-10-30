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
