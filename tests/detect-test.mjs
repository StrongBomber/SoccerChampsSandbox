/** Şema tanıma testi — yabancı alan adlarıyla yazılmış kaydı tanımalı. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sandbox = { window: {} };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(here, "..", "sandbox-editor", "detect.js"), "utf8"), sandbox);
const detect = sandbox.window.WSC_DETECT.detect;

const foreign = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "foreign-save.json"), "utf8"));
const demo = JSON.parse(fs.readFileSync(path.join(here, "..", "sandbox-editor", "demo-save.json"), "utf8"));

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
};

console.log("\nYabancı şema (gerçek oyun benzeri)");
const r1 = detect(foreign);
check("oyuncu listesi bulundu", r1.players?.path === "squad", r1.players?.path);
check("oyuncu sayısı", r1.players?.count === 18, String(r1.players?.count));
check("güven yüksek", r1.players?.confidence >= 60, `%${r1.players?.confidence}`);
check("ad alanı eşleşti", r1.players?.matchedFields?.name?.includes("firstName"));
check("kabiliyet alanı eşleşti", r1.players?.matchedFields?.ability?.includes("quality"));
check("değer alanı eşleşti", r1.players?.matchedFields?.value?.includes("marketValue"));
check("personel bulundu", r1.staff?.path === "backroom", r1.staff?.path);
check("finans bulundu", r1.finances?.path === "wallet", r1.finances?.path);
check("kulüp bulundu", r1.club?.path === "team", r1.club?.path);
check("tanınmayan alanlar raporlandı", r1.unknownTopLevel.length >= 3, r1.unknownTopLevel.join(", "));
check("özet metni", /oyuncu kaydı bulundu/.test(r1.summary));

console.log("\nEditörün kendi şeması (demo)");
const r2 = detect(demo);
check("oyuncular", r2.players?.path === "players", r2.players?.path);
check("personel", r2.staff?.path === "staff", r2.staff?.path);
check("finans", r2.finances?.path === "club.finances", r2.finances?.path);
check("kulüp", r2.club?.path === "club", r2.club?.path);

console.log("\nKenar durumlar");
check("boş nesne çökmez", !!detect({}));
check("dizi kökü çökmez", !!detect([1,2,3]));
check("rastgele metin çökmez", !!detect({ a: "b", c: 1 }));
const arrOnly = detect([{ name: "X", age: 20, position: "ST", value: 100 }]);
check("kök dizi içinde oyuncu bulur", arrOnly.players !== null, arrOnly.players?.path);

console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail === 0 ? 0 : 1);
