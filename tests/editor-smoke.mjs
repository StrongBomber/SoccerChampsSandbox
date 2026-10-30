/**
 * In-Game Editor — uçtan uca duman testi (jsdom).
 *
 * Çalıştırma:
 *   npm i --no-save jsdom
 *   node tests/editor-smoke.mjs
 *
 * Kapsam: tüm sekmeler, oyuncu alt sekmeleri, patch/geri al/kaydet döngüsü,
 * toplu işlemler, serbest JSON ağacı, komut paleti, gelişmiş filtreler.
 */
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sandbox-editor");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const demo = JSON.parse(fs.readFileSync(path.join(ROOT, "demo-save.json"), "utf8"));

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost:8080/", pretendToBeVisual: true });
const { window } = dom;
window.fetch = async () => ({ ok: true, json: async () => demo });
window.confirm = () => true;

const errors = [];
window.addEventListener("error", (e) => errors.push(e.message || String(e.error)));
window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));

for (const f of ["detect.js", "data.js", "app.js"]) {
  try { window.eval(fs.readFileSync(path.join(ROOT, f), "utf8")); }
  catch (e) { errors.push(`${f}: ${e.message}`); }
}
await new Promise((r) => setTimeout(r, 250));

const d = window.document;
const click = (sel) => {
  const el = typeof sel === "string" ? d.querySelector(sel) : sel;
  if (!el) throw new Error("bulunamadı: " + sel);
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  return el;
};
const fire = (sel, ev, value) => {
  const el = d.querySelector(sel);
  if (!el) throw new Error("bulunamadı: " + sel);
  if (value !== undefined) el.value = value;
  el.dispatchEvent(new window.Event(ev, { bubbles: true }));
  return el;
};

let pass = 0;
let fail = 0;
const check = (name, condition, detail = "") => {
  if (condition) { pass++; console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
};
const section = (t) => console.log(`\n${t}`);

/* ---------------------------------------------------------------- */
section("Sekmeler ve görünümler");
const ROUTES = ["overview", "club", "players", "staff", "finances", "competitions", "sandbox", "free", "preferences"];
for (const r of ROUTES) {
  click(`[data-route="${r}"]`);
  check(`sekme: ${r}`, d.querySelector("#view").children.length > 0);
}

section("Oyuncu alt sekmeleri");
click('[data-route="players"]');
check("liste 25 oyuncu", d.querySelectorAll("[data-player]").length === 25);
for (const t of ["profile", "attributes", "contract", "personal", "traits", "discipline", "relations"]) {
  click(`[data-ptab="${t}"]`);
  check(`alt sekme: ${t}`, d.querySelectorAll("#view .card, #view .attr-group, #view .trait-grid, #view .mini-table").length > 0);
}

section("Kontrol yolları (data-path) geçerliliği");
const badPaths = [];
for (const r of ROUTES) {
  click(`[data-route="${r}"]`);
  const scan = () => d.querySelectorAll("[data-path]").forEach((el) => {
    const p = el.dataset.path;
    if (!p || p.startsWith(".") || p.includes("..") || p.includes("undefined")) badPaths.push(`${r}:${p}`);
  });
  if (r === "players") {
    for (const t of ["profile", "attributes", "contract", "personal", "discipline"]) {
      click(`[data-ptab="${t}"]`);
      scan();
    }
  } else scan();
}
check("tüm yollar geçerli", badPaths.length === 0, badPaths.slice(0, 3).join(", "));

section("Sahneleme → inceleme → geri al → kaydet");
click('[data-route="players"]');
click('[data-ptab="attributes"]');
fire('.attr input', "change", "20");
check("nitelik değişikliği sahnelendi", d.querySelector("#reviewBtn").textContent.includes("1 bekleyen"));
click("#reviewBtn");
check("inceleme çekmecesi açıldı", !d.querySelector("#review").hidden);
check("patch listelendi", d.querySelectorAll(".patch").length === 1);
check("eski→yeni gösterimi", /→/.test(d.querySelector(".patch").textContent));
click("[data-revert='0']");
check("tek patch geri alındı", d.querySelector("#reviewBtn").textContent.trim() === "Kaydedildi");
click("#reviewClose");
fire('.attr input', "change", "18");
click("#saveBtn");
check("kaydet temizledi", d.querySelector("#reviewBtn").textContent.trim() === "Kaydedildi");
check("kaydet butonu pasif", d.querySelector("#saveBtn").disabled === true);

section("Toplu işlemler");
click('[data-route="sandbox"]');
check("8 toplu işlem", d.querySelectorAll("[data-bulk]").length === 8);
click('[data-bulk="paca"]');
click('[data-bulk="heal"]');
check("iki bulk tek tek kayıt", d.querySelectorAll("[data-bulk]").length === 8 && d.querySelector("#reviewBtn").textContent.includes("2 bekleyen"));
click("#reviewBtn");
const structural = [...d.querySelectorAll(".patch")].filter((p) => p.className.includes("structural"));
check("bulk kayıtları structural", structural.length === 2);
click("#revertAllBtn");
check("tümü geri alındı", d.querySelector("#reviewBtn").textContent.trim() === "Kaydedildi");
click("#reviewClose");

section("Serbest JSON ağacı");
click('[data-route="free"]');
const rowCount = d.querySelectorAll(".tree-row").length;
check("ağaç render edildi", rowCount > 5, `${rowCount} satır`);
click('[data-tree-expand="all"]');
check("tümünü aç daha fazla satır", d.querySelectorAll(".tree-row").length > rowCount);
click('[data-tree-expand="none"]');
fire("#treeQ", "input", "transferBudget");
const budgetInput = d.querySelector('[data-tree-path="club.finances.transferBudget"]');
check("arama ile yol bulundu", !!budgetInput);
if (budgetInput) {
  budgetInput.value = "7777777";
  budgetInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  check("ağaçtan düzenleme sahnelendi", d.querySelector("#reviewBtn").textContent.includes("1 bekleyen"));
  click("#undoBtn");
}
fire("#treeQ", "input", "");
click('[data-tree-toggle="competitions"]');
const addBtn = d.querySelector('[data-tree-add="competitions"]');
check("dizi ekleme düğmesi var", !!addBtn);
if (addBtn) { click(addBtn); check("diziye ekleme sahnelendi", d.querySelector("#reviewBtn").textContent.includes("1 bekleyen")); }

section("Komut paleti");
const gs = d.querySelector("#globalSearch");
gs.value = "efe"; gs.dispatchEvent(new window.Event("input", { bubbles: true }));
check("palet açıldı", !d.querySelector("#palette").hidden);
check("oyuncu sonucu var", d.querySelectorAll(".pal-item").length > 0);
const first = d.querySelector(".pal-item");
click(first);
check("palet seçimi oyuncuya gitti", !!d.querySelector(".player-head h2"));
gs.value = "sandbox"; gs.dispatchEvent(new window.Event("input", { bubbles: true }));
check("komut/bölüm araması", d.querySelectorAll(".pal-item").length > 0);
click('[data-route="overview"]');

section("Gelişmiş filtre");
click('[data-route="players"]');
click("[data-toggle-filters]");
check("filtre paneli", d.querySelectorAll(".filters-panel .f").length === 9);
fire('[data-filter="caMin"]', "input", "160");
const filtered = d.querySelectorAll("[data-player]").length;
check("CA ≥ 160 filtresi daralttı", filtered > 0 && filtered < 25, `${filtered} oyuncu`);
fire('[data-filter="caMin"]', "input", "");

section("Doğrulama");
click('[data-route="overview"]');
check("doğrulama satırları", d.querySelectorAll(".issue").length > 0);
check("durum çubuğu", d.querySelector("#statusIssues").textContent.length > 0);

section("Mobil aksiyon çubuğu");
check("mobil kaydet düğmesi", !!d.querySelector("#mSave"));
check("mobil sayaç", !!d.querySelector("#mCount"));

section("İçe alma raporu (yabancı şema)");
const foreign = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "foreign-save.json"), "utf8");
window.WSC_IMPORT_JSON(foreign);
await new Promise((r) => setTimeout(r, 50));
check("rapor açıldı", !d.querySelector("#report").hidden);
check("özet metni", /oyuncu kaydı bulundu/.test(d.querySelector("#reportSummary").textContent));
check("4 bölüm kartı", d.querySelectorAll(".detect-card").length >= 4);
check("güven yüzdesi gösterildi", /%\d+ güven/.test(d.querySelector("#reportBody").textContent));
click("#reportRaw");
check("rapor kapandı + Serbest JSON", d.querySelector("#report").hidden && d.querySelector(".tab.active")?.textContent === "Serbest JSON");
check("ağaç araması dolduruldu", d.querySelector("#treeQ")?.value.length > 0, d.querySelector("#treeQ")?.value);
// demo kayda geri dön
window.WSC_IMPORT_JSON(JSON.stringify(demo));

section("Sonuç");
check("JavaScript hatası yok", errors.length === 0, errors.join(" | "));
console.log(`\n${pass} geçti, ${fail} başarısız`);
process.exit(fail === 0 ? 0 : 1);
