/*
 * THE BOYS MOD — BitLife (com.candywriter.bitlife) icin calisma aninda mod.
 *
 * Oyunun APK'si DEGISMEZ, kopyasi dagitilmaz. Ajan yalnizca kullanicinin
 * KENDI cihazindaki kurulu oyuna enjekte edilir ve oyunun kendi penceresine
 * yüzen bir "◢ THE BOYS" dugmesi + panel ekler (ayri uygulama degil).
 *
 * Sekmeler
 *   TARA     : deger tarayici (int32/int64/float/double) — para, yas, gorunum,
 *              zeka, saglik, mutluluk, sohret... ilk ara → oyunda degistir →
 *              "Degisti/Ayni/Artti/Azaldi" ile daralt → yaz veya dondur.
 *   THE BOYS : karakter paketleri (Homelander, Billy Butcher, Starlight,
 *              A-Train, The Deep, Black Noir, Soldier Boy, Kimiko, Frenchie,
 *              Hughie) — secili adreslere o karakterin imza degerini yazar.
 *              Ayrica "Vought Modu": degeri mevcut halinde dondurur.
 *   KAYIT    : oyunun kendi dosya dizinini listeler, yedekler, metin ise duzenler.
 *
 * Kullanim:
 *   frida -U -f com.candywriter.bitlife -l bitlife/theboys-mod.js --no-pause
 *   ya da: tools/theboys.sh
 *
 * Testler (cihaz gerekmez):
 *   node tests/theboys-test.mjs      # mantik
 *   node tests/theboys-ui-test.mjs   # arayuz (Android cerceve taklidi)
 */

"use strict";

const PKG = "com.candywriter.bitlife";
const LIB = "";   // BitLife: tek bir native kutuphane varsayilmiyor, tarama tum rw- bolgelerini gezer
const MAX_RESULTS = 3000;
const CHUNK = 1 << 20; // 1 MiB

/* ------------------------------------------------------------------ */
/* durum                                                               */
/* ------------------------------------------------------------------ */

const S = {
  activity: null,
  type: "int32",
  hits: [],              // [{ addr, last }]
  frozen: new Map(),     // "0x..." -> { addr, type, value, timer }
  selected: null,        // tek adres seçimi
  panel: null,
  fab: null,
  visible: false,
  busy: false,
  tab: "scan",
  watcher: false,
  watcherHook: null,
  status: null,
};

const TYPES = {
  int32:  { label: "int32",  bytes: 4, parse: (s) => parseInt(s, 10),
            read: (p) => p.readS32(), write: (p, v) => p.writeS32(v | 0) },
  int64:  { label: "int64",  bytes: 8, parse: (s) => parseInt(s, 10),
            read: (p) => Number(p.readS64()), write: (p, v) => p.writeS64(Int64(v)) },
  float:  { label: "float",  bytes: 4, parse: (s) => parseFloat(String(s).replace(",", ".")),
            read: (p) => Math.fround(p.readFloat()), write: (p, v) => p.writeFloat(Math.fround(v)) },
  double: { label: "double", bytes: 8, parse: (s) => parseFloat(String(s).replace(",", ".")),
            read: (p) => p.readDouble(), write: (p, v) => p.writeDouble(v) },
};

const TYPE_ORDER = ["int32", "int64", "float", "double"];

const PRESETS = [
  { id: "money",  label: "Para",      type: "int32", note: "Cüzdandaki nakit. Büyük sayıda int64 dene." },
  { id: "age",    label: "Yaş",       type: "int32", note: "Kaç yaşındasın (oyun içi yıl)" },
  { id: "looks",  label: "Görünüm",   type: "int32", note: "0–100 arası" },
  { id: "smarts", label: "Zeka",      type: "int32", note: "0–100 arası" },
  { id: "health", label: "Sağlık",    type: "int32", note: "0–100 arası (ölüm riski)" },
  { id: "happy",  label: "Mutluluk",  type: "int32", note: "0–100 arası" },
  { id: "fame",   label: "Şöhret",    type: "int32", note: "0–100 arası (ünlü olmadan 0)" },
  { id: "karma",  label: "Karma",     type: "int32", note: "0–100 arası" },
];

/* The Boys karakter paketleri — seçili adreslere yazılacak imza değerleri.
 * Dizi/film görselleri KULLANILMAZ; yalnızca istatistik şablonları. */
const CHARACTERS = [
  { id: "homelander", name: "Homelander",     tag: "Vought'un yüzü",     quick: 100, note: "Görünüm + Sağlık + Şöhret 100 · dokunulmaz" },
  { id: "butcher",    name: "Billy Butcher",  tag: "The Boys",           quick: 95,  note: "Sağlık + dayanıklılık 95 · kararlı" },
  { id: "starlight",  name: "Starlight",      tag: "Yedi",               quick: 92,  note: "Şöhret + görünüm 92" },
  { id: "atrain",     name: "A-Train",        tag: "Yedi",               quick: 90,  note: "Hız odaklı 90" },
  { id: "blacknoir",  name: "Black Noir",     tag: "Yedi",               quick: 100, note: "Gizem + dayanıklılık 100" },
  { id: "soldierboy", name: "Soldier Boy",    tag: "Vought efsanesi",    quick: 88,  note: "Savaşçı 88" },
  { id: "kimiko",     name: "Kimiko",         tag: "The Boys",           quick: 85,  note: "Dayanıklılık 85" },
  { id: "frenchie",   name: "Frenchie",       tag: "The Boys",           quick: 78,  note: "Zeka 78" },
  { id: "hughie",     name: "Hughie",         tag: "The Boys",           quick: 70,  note: "Sıradan insan 70" },
  { id: "thedeep",    name: "The Deep",       tag: "Yedi",               quick: 60,  note: "Deniz adamı 60" },
];

const VOUGHT_MONEY = 999999999;

/* ------------------------------------------------------------------ */
/* yardımcılar                                                         */
/* ------------------------------------------------------------------ */

function log(msg) {
  console.log("[wsc-mod] " + msg);
}

function setStatus(msg) {
  log(msg);
  try { if (S.status) S.status.setText(String(msg)); } catch (_) { /* UI yok */ }
}

function candidateRanges() {
  const out = [];
  try {
    const mod = LIB ? Process.findModuleByName(LIB) : null;
    if (mod) Process.enumerateRanges(mod.name, "rw-").forEach((r) => out.push(r));
    Process.enumerateRanges("rw-").forEach((r) => {
      if (LIB && r.file && r.file.path && r.file.path.indexOf(LIB) >= 0) return;
      if (r.size > 96 * 1024 * 1024) return;
      out.push(r);
    });
  } catch (e) {
    log("bölge listesi hatası: " + e);
  }
  return out;
}

/** İlk tarama: değeri verilen tam sayı/ondalık ile eşleşen tüm adresler. */
function firstScan(value, type) {
  const t = TYPES[type] || TYPES.int32;
  const hits = [];
  const ranges = candidateRanges();
  const total = ranges.reduce((a, r) => a + r.size, 0);
  log(`tarama: ${ranges.length} bölge, ${(total / 1048576).toFixed(0)} MB, tip ${t.label}`);

  for (const range of ranges) {
    for (let off = 0; off < range.size; off += CHUNK) {
      if (hits.length >= MAX_RESULTS) break;
      const n = Math.min(CHUNK, range.size - off);
      let buf;
      try { buf = range.base.add(off).readByteArray(n); } catch (_) { continue; }
      if (!buf) continue;
      const dv = new DataView(buf);
      const step = t.bytes;
      for (let i = 0; i + step <= n; i += step) {
        let v;
        if (type === "int32") v = dv.getInt32(i, true);
        else if (type === "int64") v = dv.getInt32(i, true) + dv.getInt32(i + 4, true) * 4294967296;
        else if (type === "float") v = dv.getFloat32(i, true);
        else v = dv.getFloat64(i, true);
        let eq;
        if (type === "float" || type === "double") eq = Math.abs(v - value) < (type === "float" ? 0.001 : 1e-9);
        else eq = v === value;
        if (eq) {
          hits.push({ addr: range.base.add(off + i), last: v });
          if (hits.length >= MAX_RESULTS) break;
        }
      }
    }
  }
  return hits;
}

/** Bulunan adreslerin şu anki değerleri (okunamayanlar atlanır). */
function liveValues(hits, type) {
  const t = TYPES[type] || TYPES.int32;
  const out = [];
  (hits || []).forEach((h) => {
    try {
      const v = t.read(h.addr);
      if (Number.isFinite(v)) out.push(v);
    } catch (_) { /* atla */ }
  });
  return out;
}

/** Compound V: her doz, bulunan adreslerin değerini +5 artırır (100'de durur). */
function compoundV(hits, type, doses = 1) {
  const t = TYPES[type] || TYPES.int32;
  let n = 0;
  (hits || []).forEach((h) => {
    try {
      const cur = t.read(h.addr);
      if (!Number.isFinite(cur)) return;
      const next = cur + 5 * doses;
      t.write(h.addr, Math.min(100, next));
      n++;
    } catch (_) { /* atla */ }
  });
  return n;
}

/** Ortalama istatistiğe karşılık gelen The Boys sıralaması. */
const RANKS = [
  [100, "Homelander", "The Seven'in zirvesi"],
  [95, "Soldier Boy", "Vought'un ilk süper askeri"],
  [90, "Black Noir", "Sessiz infazcı"],
  [85, "Starlight", "The Seven"],
  [80, "A-Train", "The Seven — hız"],
  [70, "Kimiko", "The Boys — dayanıklılık"],
  [60, "Frenchie", "The Boys — teknik"],
  [50, "Hughie", "The Boys — sıradan insan"],
  [-Infinity, "The Deep", "The Seven'in dibi"],
];

function rankFor(avg) {
  if (!Number.isFinite(avg)) return null;
  for (const [min, name, note] of RANKS) {
    if (avg >= min) return { name, note, avg };
  }
  return null;
}

/** Sonraki tarama: adayları oyundaki değişime göre süzer. */
function nextScan(mode, type) {
  const t = TYPES[type] || TYPES.int32;
  const kept = [];
  for (const h of S.hits) {
    let v;
    try { v = t.read(h.addr); } catch (_) { continue; }
    const prev = h.last;
    let ok;
    switch (mode) {
      case "changed": ok = v !== prev; break;
      case "unchanged": ok = v === prev; break;
      case "increased": ok = v > prev; break;
      case "decreased": ok = v < prev; break;
      default: ok = true;
    }
    if (ok) kept.push({ addr: h.addr, last: v });
  }
  S.hits = kept;
  return kept.length;
}

function writeOne(hit, value, type) {
  const t = TYPES[type] || TYPES.int32;
  try {
    t.write(hit.addr, value);
    hit.last = value;
    return true;
  } catch (_) {
    return false;
  }
}

function writeAll(value, type) {
  let n = 0;
  for (const h of S.hits) if (writeOne(h, value, type)) n++;
  return n;
}

function freezeAll(value, on, type) {
  if (!on) {
    S.frozen.forEach((f) => clearInterval(f.timer));
    const n = S.frozen.size;
    S.frozen.clear();
    return n;
  }
  S.hits.forEach((h) => {
    const key = h.addr.toString();
    if (S.frozen.has(key)) return;
    const t = TYPES[type] || TYPES.int32;
    const timer = setInterval(() => {
      try { t.write(h.addr, value); } catch (_) { /* bölge gitti */ }
    }, 60);
    S.frozen.set(key, { addr: h.addr, type, value, timer });
  });
  return S.frozen.size;
}

/** Daha önce düzenlenmiş alanları öne çıkarmak için ipucu listesi (para/yaş/istatistik). */
const INTEREST_RE = /(money|cash|coin|bank|fund|age|year|look|smart|health|happy|fame|karma|stat|level|skill|popular|beauty|intel|strength|talent|vought|supe|power)/i;

/** JSON içindeki sayısal/boolean alanları bulur: [{path, key, value, kind, hot}]
 *  hot = ilgi çekici (para, yaş, istatistik) — liste başında gösterilir. */
function findNumberFields(json) {
  const out = [];
  if (json === null || typeof json !== "object") return out;
  (function walk(node, prefix) {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${prefix}[${i}]`));
      return;
    }
    Object.keys(node).forEach((k) => {
      const path = prefix ? `${prefix}.${k}` : k;
      const v = node[k];
      if (typeof v === "number" || typeof v === "boolean") {
        out.push({ path, key: k, value: v, kind: typeof v, hot: INTEREST_RE.test(k) });
      } else if (v && typeof v === "object") {
        walk(v, path);
      }
    });
  })(json, "");
  out.sort((a, b) => (b.hot === true) - (a.hot === true));
  return out;
}

/** Kayıttaki 0/1 bayrakları (açık/kapalı ayarlar) — dokununca çevrilir. */
function findFlags(json) {
  return findNumberFields(json).filter((f) => f.kind === "boolean" || f.value === 0 || f.value === 1);
}

function setByPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
  return obj;
}

/* ------------------------------------------------------------------ */
/* oyunun KENDİ dosyaları (kayıt dizini)                               */
/* ------------------------------------------------------------------ */

function appDirs() {
  const dirs = [];
  try {
    if (S.activity) {
      dirs.push([S.activity.getFilesDir().getAbsolutePath(), "files"]);
      const ext = S.activity.getExternalFilesDir(null);
      if (ext) dirs.push([ext.getAbsolutePath(), "external"]);
    }
  } catch (e) {
    log("dizin hatası: " + e);
  }
  return dirs;
}

function saveList() {
  const out = [];
  try {
    const File = Java.use("java.io.File");
    appDirs().forEach(([dir, kind]) => {
      const f = File.$new(dir);
      const arr = f.listFiles();
      if (!arr) return;
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        let isDir = false;
        try { isDir = file.isDirectory(); } catch (_) { /* yok say */ }
        if (isDir) continue;
        out.push({ dir: kind, path: file.getAbsolutePath(), name: file.getName(), size: Number(file.length()) });
      }
    });
  } catch (e) {
    log("kayıt listesi hatası: " + e);
  }
  return out;
}

function saveRead(path, maxBytes) {
  try {
    const FileInputStream = Java.use("java.io.FileInputStream");
    const File = Java.use("java.io.File");
    const size = Number(File.$new(path).length());
    const limit = Math.min(size, maxBytes || 65536);
    const stream = FileInputStream.$new(path);
    const bytes = Java.array("byte", new Array(limit).fill(0));
    const read = stream.read(bytes);
    stream.close();
    if (read <= 0) return "";
    let s = "";
    const Charset = Java.use("java.nio.charset.StandardCharsets");
    s = Java.use("java.lang.String").$new(bytes, 0, read, Charset.UTF_8.$new().toString());
    return s;
  } catch (e) {
    return "HATA: " + e;
  }
}

function saveWrite(path, text) {
  try {
    const FileOutputStream = Java.use("java.io.FileOutputStream");
    const Charset = Java.use("java.nio.charset.StandardCharsets");
    const bytes = Java.use("java.lang.String").$new(String(text)).getBytes(Charset.UTF_8.$new());
    const out = FileOutputStream.$new(path, false);
    out.write(bytes);
    out.close();
    return true;
  } catch (e) {
    log("yazma hatası: " + e);
    return false;
  }
}

/** Kayıt dosyasını dışa (external files) yedekler. */
function saveBackup(path) {
  try {
    const File = Java.use("java.io.File");
    const src = File.$new(path);
    const dirs = appDirs().find(([d, k]) => k === "external");
    const target = dirs ? dirs[0] + "/backup-" + Date.now() + "-" + src.getName() : null;
    if (!target) return "";
    const FileInputStream = Java.use("java.io.FileInputStream");
    const FileOutputStream = Java.use("java.io.FileOutputStream");
    const input = FileInputStream.$new(path);
    const output = FileOutputStream.$new(target);
    const buf = Java.array("byte", new Array(8192).fill(0));
    let n;
    while ((n = input.read(buf)) > 0) output.write(buf, 0, n);
    input.close(); output.close();
    return target;
  } catch (e) {
    return "HATA: " + e;
  }
}

/* ------------------------------------------------------------------ */
/* dosya izleyici — oyun hangi dosyaları açıyor?                       */
/* ------------------------------------------------------------------ */

function startWatcher() {
  if (S.watcherHook) return true;
  try {
    const openFn = Module.findExportByName("libc.so", "open");
    if (!openFn) return false;
    S.watcherHook = Interceptor.attach(openFn, {
      onEnter(args) {
        try {
          const p = args[0].readUtf8String();
          if (p && p.indexOf("files") >= 0 && p.indexOf("wsc-mod") < 0) log("open → " + p);
        } catch (_) { /* okunamayan yol */ }
      },
    });
    return true;
  } catch (e) {
    log("izleyici hatası: " + e);
    return false;
  }
}

function stopWatcher() {
  if (S.watcherHook) {
    try { S.watcherHook.detach(); } catch (_) { /* yok say */ }
    S.watcherHook = null;
  }
}

/* ------------------------------------------------------------------ */
/* arayüz                                                              */
/* ------------------------------------------------------------------ */

const UI = {};

function buildUi() {
  const TextView = Java.use("android.widget.TextView");
  const LinearLayout = Java.use("android.widget.LinearLayout");
  const ScrollView = Java.use("android.widget.ScrollView");
  const EditText = Java.use("android.widget.EditText");
  const Button = Java.use("android.widget.Button");
  const Gravity = Java.use("android.view.Gravity");
  const LP = Java.use("android.widget.LinearLayout$LayoutParams");
  const Click = Java.use("android.view.View$OnClickListener");

  const ctx = S.activity;

  const color = (hex) => Java.use("android.graphics.Color").parseColor(hex).intValue();
  const dp = (v) => {
    const d = ctx.getApplicationContext().getResources().getDisplayMetrics();
    return Math.round(v * d.density);
  };

  const text = (value, size, hex) => {
    const t = TextView.$new(ctx);
    t.setText(String(value));
    t.setTextSize(size);
    t.setTextColor(color(hex));
    return t;
  };
  const box = (orient) => {
    const l = LinearLayout.$new(ctx);
    l.setOrientation(orient);
    return l;
  };
  const button = (row, label, handler, weight) => {
    const b = Button.$new(ctx);
    b.setText(label);
    b.setTextSize(9);
    b.setAllCaps(false);
    b.setOnClickListener(Click.$new({ onClick: handler }));
    row.addView(b, LP.$new(0, -2, weight === undefined ? 1.0 : weight));
    return b;
  };

  // ---- yüzen düğme ----
  const fab = text("◢ THE BOYS", 11, "#1a0d02");
  fab.setGravity(Gravity.CENTER.getValue());
  fab.setBackgroundColor(color("#f0a94c"));
  fab.setPadding(dp(10), dp(7), dp(10), dp(7));

  // ---- panel ----
  const panel = box(LinearLayout.VERTICAL.getValue());
  panel.setBackgroundColor(color("#f00b0912"));
  panel.setPadding(dp(10), dp(8), dp(10), dp(10));

  panel.addView(text("THE BOYS MOD · BitLife", 12, "#ffd9a0"));
  const status = text("hazır", 9, "#9a9ab0");
  panel.addView(status);
  S.status = status;

  // ---- sekme çubuğu ----
  const tabsRow = box(LinearLayout.HORIZONTAL.getValue());
  const pages = {};
  const tabBtns = {};
  const showTab = (id) => {
    S.tab = id;
    Object.keys(pages).forEach((k) => pages[k].setVisibility(k === id ? 0 : 8));
    Object.keys(tabBtns).forEach((k) => tabBtns[k].setTextColor(color(k === id ? "#c4b5fd" : "#7c7c92")));
  };
  ["scan", "boys", "presets", "save"].forEach((id) => {
    const label = id === "scan" ? "Tara" : id === "boys" ? "The Boys" : id === "presets" ? "İstatistik" : "Kayıt";
    tabBtns[id] = button(tabsRow, label, () => showTab(id));
    tabBtns[id].setTextSize(10);
  });
  panel.addView(tabsRow);

  const pageContainer = LinearLayout.$new(ctx);
  pageContainer.setOrientation(LinearLayout.VERTICAL.getValue());
  const makePage = (id) => {
    const p = box(LinearLayout.VERTICAL.getValue());
    pages[id] = p;
    pageContainer.addView(p);
    return p;
  };

  /* ---------------- TARA ---------------- */
  const scanPage = makePage("scan");

  const inputRow = box(LinearLayout.HORIZONTAL.getValue());
  const valueInput = EditText.$new(ctx);
  valueInput.setHint("değer");
  valueInput.setTextSize(12);
  valueInput.setInputType(2 | 0x1000 | 0x2000);
  inputRow.addView(valueInput, LP.$new(0, -2, 1.0));

  const typeBtn = Button.$new(ctx);
  typeBtn.setText(S.type);
  typeBtn.setTextSize(9);
  typeBtn.setAllCaps(false);
  typeBtn.setOnClickListener(Click.$new({
    onClick() {
      const i = TYPE_ORDER.indexOf(S.type);
      S.type = TYPE_ORDER[(i + 1) % TYPE_ORDER.length];
      typeBtn.setText(S.type);
      setStatus("tip: " + S.type);
    },
  }));
  inputRow.addView(typeBtn, LP.$new(dp(62), -2, 0));
  scanPage.addView(inputRow);

  const readInput = () => {
    const raw = valueInput.getText().toString();
    const v = TYPES[S.type].parse(raw);
    return Number.isFinite(v) ? v : null;
  };

  const scanRow = box(LinearLayout.HORIZONTAL.getValue());
  button(scanRow, "İlk Ara", () => {
    const v = readInput();
    if (v === null) { setStatus("önce bir değer gir"); return; }
    setStatus("taranıyor… (10–60 sn)");
    setTimeout(() => {
      try {
        S.hits = firstScan(v, S.type);
        S.selected = null;
        renderResults();
        setStatus(`ilk tarama: ${S.hits.length} aday`);
      } catch (e) { setStatus("tarama hatası: " + e); }
    }, 30);
  });
  button(scanRow, "Değişti", () => { const n = nextScan("changed", S.type); renderResults(); setStatus(`kalan: ${n}`); });
  button(scanRow, "Aynı", () => { const n = nextScan("unchanged", S.type); renderResults(); setStatus(`kalan: ${n}`); });
  button(scanRow, "Arttı", () => { const n = nextScan("increased", S.type); renderResults(); setStatus(`kalan: ${n}`); });
  button(scanRow, "Azaldı", () => { const n = nextScan("decreased", S.type); renderResults(); setStatus(`kalan: ${n}`); });
  scanPage.addView(scanRow);

  const applyRow = box(LinearLayout.HORIZONTAL.getValue());
  button(applyRow, "Seçilene Yaz", () => {
    const v = readInput();
    if (v === null) { setStatus("yazılacak değer gir"); return; }
    if (!S.selected) { setStatus("listeden bir adres seç"); return; }
    const ok = writeOne(S.selected, v, S.type);
    renderResults();
    setStatus(ok ? `${S.selected.addr} ← ${v}` : "yazılamadı (salt okunur bölge)");
  });
  button(applyRow, "Tümüne Yaz", () => {
    const v = readInput();
    if (v === null) { setStatus("yazılacak değer gir"); return; }
    const n = writeAll(v, S.type);
    renderResults();
    setStatus(`${n} adrese yazıldı`);
  });
  button(applyRow, "Dondur", () => {
    const v = readInput();
    if (S.frozen.size) {
      freezeAll(0, false, S.type);
      setStatus("dondurma kapalı");
      return;
    }
    if (v === null) { setStatus("dondurmak için değer gir"); return; }
    const n = freezeAll(v, true, S.type);
    setStatus(`${n} adres donduruldu (${v})`);
  });
  scanPage.addView(applyRow);

  const scroll = ScrollView.$new(ctx);
  const list = box(LinearLayout.VERTICAL.getValue());
  scroll.addView(list);
  scanPage.addView(scroll, LP.$new(-1, dp(150), 0));
  UI.results = list;

  const watcherBtn = Button.$new(ctx);
  watcherBtn.setText("Dosya izleyici: kapalı");
  watcherBtn.setTextSize(9);
  watcherBtn.setAllCaps(false);
  watcherBtn.setOnClickListener(Click.$new({
    onClick() {
      S.watcher = !S.watcher;
      if (S.watcher) { const ok = startWatcher(); S.watcher = ok; }
      else stopWatcher();
      watcherBtn.setText("Dosya izleyici: " + (S.watcher ? "açık" : "kapalı"));
      setStatus(S.watcher ? "oyunun açtığı dosyalar console'a yazılıyor" : "izleyici kapandı");
    },
  }));
  scanPage.addView(watcherBtn);

  const renderResults = (UI.renderResults = function () {
    list.removeAllViews();
    const shown = S.hits.slice(0, 60);
    shown.forEach((h) => {
      const row = TextView.$new(ctx);
      const mark = S.selected && S.selected.addr.toString() === h.addr.toString() ? "● " : "○ ";
      row.setText(`${mark}${h.addr}  =  ${h.last}`);
      row.setTextSize(9);
      row.setTextColor(color(S.selected && S.selected.addr.toString() === h.addr.toString() ? "#c4b5fd" : "#a9c2d3"));
      row.setOnClickListener(Click.$new({
        onClick() {
          S.selected = h;
          valueInput.setText(String(h.last));
          renderResults();
          setStatus("seçili: " + h.addr);
        },
      }));
      list.addView(row);
    });
    if (S.hits.length > shown.length) list.addView(text(`… +${S.hits.length - shown.length} adres`, 9, "#8fa2b1"));
    if (!S.hits.length) list.addView(text("sonuç yok — oyunda değeri değiştirip tekrar daralt", 9, "#8fa2b1"));
  });

  /* ---------------- THE BOYS ---------------- */
  const boysPage = makePage("boys");

  const readInputNormalized = () => {
    try { return readInput(); } catch (_) { return null; }
  };

  const applyQuick = (value, label) => {
    if (!S.hits.length) { setStatus("önce Tara'da değer ara"); return; }
    const targets = S.selected ? [S.selected] : S.hits;
    let n = 0;
    targets.forEach((h) => { if (writeOne(h, value, S.type)) n++; });
    renderResults();
    setStatus(`${label}: ${n} adrese ${value} yazıldı`);
  };

  boysPage.addView(text("Karakter paketi — önce Tara'da değeri bul, sonra karaktere dokun.", 9, "#b8a8d8"));

  CHARACTERS.forEach((c) => {
    const row = box(LinearLayout.HORIZONTAL.getValue());
    const b = button(row, `${c.name} · ${c.quick}`, () => applyQuick(c.quick, c.name));
    b.setTextSize(10);
    const info = text(c.tag, 8, "#7c7c92");
    row.addView(info, LP.$new(dp(74), -2, 0));
    boysPage.addView(row);
    boysPage.addView(text(c.note, 8, "#6f6f85"));
  });

  const voughtRow = box(LinearLayout.HORIZONTAL.getValue());
  button(voughtRow, `Vought parası (${VOUGHT_MONEY})`, () => applyQuick(VOUGHT_MONEY, "Vought"));
  button(voughtRow, "Vought Modu (dondur)", () => {
    if (!S.hits.length) { setStatus("önce Tara'da değer ara"); return; }
    if (S.frozen.size) { freezeAll(0, false, S.type); setStatus("Vought Modu kapandı"); return; }
    const v = readInputNormalized();
    if (v === null) { setStatus("dondurulacak değer gir (Tara)"); return; }
    const n = freezeAll(v, true, S.type);
    setStatus(`Vought Modu: ${n} adres ${v} değerinde kilitlendi`);
  });
  boysPage.addView(voughtRow);

  const powerRow = box(LinearLayout.HORIZONTAL.getValue());
  const vDose = { n: 0 };
  button(powerRow, "Compound V (+5 · 100'de durur)", () => {
    if (!S.hits.length) { setStatus("önce Tara'da değer ara"); return; }
    const targets = S.selected ? [S.selected] : S.hits;
    const n = compoundV(targets, S.type, 1);
    vDose.n++;
    renderResults();
    const avg = liveValues(targets, S.type).reduce((a, b) => a + b, 0) / Math.max(1, targets.length);
    const r = rankFor(avg);
    setStatus(`Compound V doz ${vDose.n}: ${n} adres +5 → ${r ? r.name : "?"}`);
  });
  button(powerRow, "Sıralamam", () => {
    if (!S.hits.length) { setStatus("önce Tara'da değer ara"); return; }
    const targets = S.selected ? [S.selected] : S.hits;
    const vals = liveValues(targets, S.type);
    if (!vals.length) { setStatus("değer okunamadı"); return; }
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const r = rankFor(avg);
    setStatus(r ? `${r.name} — ${r.note} (ortalama ${Math.round(avg)})` : "sıralama hesaplanamadı");
  });
  boysPage.addView(powerRow);

  boysPage.addView(text("Vought: istatistiklerini süper seviyeye çek, sıralamada yerini gör.", 8, "#b8a8d8"));
  boysPage.addView(text("Not: bu bir istatistik şablonudur. Oyuna yeni bölüm/karakter verisi eklemez.", 8, "#6f6f85"));

  /* ---------------- İSTATİSTİK ---------------- */
  const presetPage = makePage("presets");
  presetPage.addView(text("Değeri oyundan oku, tipe göre tara, oyunda değiştir, daralt.", 9, "#9a9ab0"));
  PRESETS.forEach((p) => {
    const row = box(LinearLayout.HORIZONTAL.getValue());
    const b = button(row, p.label, () => {
      S.type = p.type;
      typeBtn.setText(S.type);
      showTab("scan");
      valueInput.setText("");
      setStatus(p.note);
    }, 1.0);
    b.setTextSize(10);
    row.addView(text(p.type, 8, "#7c7c92"), LP.$new(dp(46), -2, 0));
    presetPage.addView(row);
  });

  /* ---------------- KAYIT ---------------- */
  const savePage = makePage("save");
  const saveListBox = box(LinearLayout.VERTICAL.getValue());
  const saveScroll = ScrollView.$new(ctx);
  saveScroll.addView(saveListBox);
  savePage.addView(saveScroll, LP.$new(-1, dp(170), 0));

  const previewInput = EditText.$new(ctx);
  previewInput.setHint("dosya içeriği (JSON) — düzenleyip 'Geri Yaz'");
  previewInput.setTextSize(9);
  previewInput.setMinLines(3);
  savePage.addView(previewInput, LP.$new(-1, dp(90), 0));

  let selectedPath = null;

  const renderSaves = (UI.renderSaves = function () {
    saveListBox.removeAllViews();
    const files = saveList();
    if (!files.length) {
      saveListBox.addView(text("dosya bulunamadı (oyun henüz kayıt yazmamış olabilir)", 9, "#8fa2b1"));
      return;
    }
    files.forEach((f) => {
      const row = TextView.$new(ctx);
      row.setText(`${f.dir}/${f.name}  (${(f.size / 1024).toFixed(1)} KB)`);
      row.setTextSize(9);
      row.setTextColor(color(selectedPath === f.path ? "#c4b5fd" : "#a9c2d3"));
      row.setOnClickListener(Click.$new({
        onClick() {
          selectedPath = f.path;
          const txt = saveRead(f.path, 65536);
          previewInput.setText(txt.slice(0, 60000));
          renderSaves();
          setStatus(`okundu: ${f.name} (${f.size} bayt)`);
        },
      }));
      saveListBox.addView(row);
    });
  });

  // ---- sayısal alanlar (para / yaş / istatistik) ----
  const ruleBox = box(LinearLayout.VERTICAL.getValue());
  const ruleTitle = text("Açık/kapalı ayarlar: dosya seçip 'Bayrakları bul'", 9, "#9a9ab0");
  ruleBox.addView(ruleTitle);
  const ruleList = box(LinearLayout.VERTICAL.getValue());
  ruleBox.addView(ruleList);

  let ruleJson = null;

  const renderRules = (UI.renderRules = function () {
    ruleList.removeAllViews();
    if (!ruleJson) return;
    const fields = findFlags(ruleJson);
    if (!fields.length) {
      ruleList.addView(text("Bu dosyada 0/1 bayrak yok. Kayıt ikili (binary) biçimdeyse Tara sekmesiyle bellekten değer arayabilirsin.", 8, "#e0a13f"));
      return;
    }
    fields.slice(0, 24).forEach((f) => {
      const row = text(`${f.path} = ${f.value}`, 9, "#a9c2d3");
      row.setOnClickListener(Click.$new({
        onClick() {
          if (f.kind !== "boolean" && f.value !== 0 && f.value !== 1) {
            setStatus(`${f.path}: yalnızca 0/1 veya boolean çevrilebilir (şu an ${f.value})`);
            return;
          }
          const next = f.kind === "boolean" ? !f.value : f.value === 0 ? 1 : 0;
          setByPath(ruleJson, f.path, next);
          f.value = next;
          previewInput.setText(JSON.stringify(ruleJson));
          renderRules();
          setStatus(`${f.path} → ${next} (kaydetmek için 'Geri Yaz')`);
        },
      }));
      ruleList.addView(row);
    });
    if (fields.length > 24) ruleList.addView(text(`… +${fields.length - 24} alan`, 8, "#8fa2b1"));
  });

  ruleBox.addView((() => {
    const r = box(LinearLayout.HORIZONTAL.getValue());
    button(r, "Bayrakları bul", () => {
      if (!selectedPath) { setStatus("önce bir dosya seç (yukarıdaki listeden)"); return; }
      const raw = saveRead(selectedPath, 262144);
      try {
        ruleJson = JSON.parse(raw);
      } catch (_) {
        ruleJson = null;
        setStatus("dosya JSON değil — bayraklar okunamadı");
        renderRules();
        return;
      }
      const n = findFlags(ruleJson).length;
      ruleTitle.setText(`Bayraklar: ${n} bulundu (dokun → 0/1)`);
      renderRules();
      setStatus(`${n} bayrak`);
    });
    return r;
  })());

  savePage.addView(ruleBox);

  const saveRow = box(LinearLayout.HORIZONTAL.getValue());
  button(saveRow, "Yenile", () => { renderSaves(); setStatus("liste yenilendi"); });
  button(saveRow, "Yedekle", () => {
    if (!selectedPath) { setStatus("önce bir dosya seç"); return; }
    setStatus("yedek: " + saveBackup(selectedPath));
  });
  button(saveRow, "Geri Yaz", () => {
    if (!selectedPath) { setStatus("önce bir dosya seç"); return; }
    const ok = saveWrite(selectedPath, previewInput.getText().toString());
    setStatus(ok ? "yazıldı — oyunu yeniden başlat" : "yazılamadı");
  });
  savePage.addView(saveRow);

  panel.addView(pageContainer);

  // kapat satırı
  const closeRow = box(LinearLayout.HORIZONTAL.getValue());
  button(closeRow, "Kapat", () => { S.visible = false; panel.setVisibility(8); });
  panel.addView(closeRow);

  showTab("scan");
  renderResults();
  renderSaves();

  // ---- yerleşim ----
  const FrameLP = Java.use("android.widget.FrameLayout$LayoutParams");
  const Gravity2 = Java.use("android.view.Gravity");

  const fabLp = FrameLP.$new(-2, -2);
  fabLp.gravity = Gravity2.TOP.getValue() | Gravity2.RIGHT.getValue();
  fabLp.topMargin = dp(64);
  fabLp.rightMargin = dp(6);

  const panelLp = FrameLP.$new(-1, -1);
  panelLp.gravity = Gravity2.CENTER.getValue();
  panelLp.leftMargin = dp(8);
  panelLp.rightMargin = dp(8);
  panelLp.topMargin = dp(96);
  panelLp.bottomMargin = dp(24);

  panel.setVisibility(8);
  fab.setOnClickListener(Click.$new({
    onClick() {
      S.visible = !S.visible;
      panel.setVisibility(S.visible ? 0 : 8);
      if (S.visible) { renderResults(); renderSaves(); }
    },
  }));

  S.activity.addContentView(fab, fabLp);
  S.activity.addContentView(panel, panelLp);
  S.panel = panel;
  S.fab = fab;
  log("overlay eklendi");
}

/* ------------------------------------------------------------------ */
/* activity yakalama                                                   */
/* ------------------------------------------------------------------ */

function attach() {
  try {
    if (Java.available && S.activity && !S.panel) buildUi();
  } catch (e) {
    log("UI hatası: " + e);
  }
}

function isTargetActivity(activity) {
  try {
    const pkg = String(activity.getPackageName());
    return pkg === PKG || pkg.indexOf("candywriter") >= 0 || pkg.indexOf("bitlife") >= 0;
  } catch (_) {
    try { return String(activity.getClass().getName()).toLowerCase().indexOf("bitlife") >= 0; }
    catch (__) { return false; }
  }
}

function hookActivity() {
  try {
    const Activity = Java.use("android.app.Activity");
    Activity.onCreate.overload("android.os.Bundle").implementation = function (b) {
      this.onCreate(b);
      try {
        if (isTargetActivity(this)) {
          S.activity = this;
          setTimeout(attach, 1800);
        }
      } catch (e) { log("activity kontrolü: " + e); }
    };
    log("android.app.Activity.onCreate hook'landı (paket: " + PKG + ")");
  } catch (e) {
    log("Activity hook hatası: " + e);
  }

  // Ajan oyun zaten açıkken yüklenirse: mevcut Activity'yi bul
  setTimeout(() => {
    if (S.activity) return;
    try {
      Java.choose("android.app.Activity", {
        onMatch(instance) {
          try { if (!S.activity && isTargetActivity(instance)) S.activity = instance; } catch (_) { /* yok say */ }
        },
        onComplete() { if (S.activity) attach(); },
      });
    } catch (_) { /* yok say */ }
  }, 3000);
}

/* ------------------------------------------------------------------ */
/* test / çalışma ortamı                                               */
/* ------------------------------------------------------------------ */

// Node testleri ajanın saf mantığını bu nesne üzerinden sınar.
globalThis.BOYS = {
  S, TYPES, TYPE_ORDER, PRESETS, CHARACTERS, VOUGHT_MONEY,
  firstScan, nextScan, writeOne, writeAll, freezeAll,
  saveList, saveRead, saveWrite, saveBackup,
  findNumberFields, findFlags, setByPath, isTargetActivity, liveValues, compoundV, rankFor, RANKS,
  candidateRanges, startWatcher, stopWatcher,
};

if (typeof Java !== "undefined") {
  Java.perform(() => {
    log("The Boys modu yükleniyor…");
    log("hedef paket: " + PKG);
    hookActivity();
  });
} else {
  log("Frida yok — yalnızca MOD API yüklendi (test modu)");
}
