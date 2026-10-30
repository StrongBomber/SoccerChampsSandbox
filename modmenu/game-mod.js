/*
 * WSC MOD MENU — World Soccer Champs'i çalışırken modlayan Frida ajanı.
 *
 * Oyunun APK'sı DEĞİŞMEZ. Ajan oyunun kendi sürecine enjekte edilir ve
 * oyunun kendi penceresine yüzen bir "MOD" düğmesi + panel ekler
 * (SYSTEM_ALERT_WINDOW izni gerekmez, activity.addContentView kullanılır).
 *
 * Neden bellek taraması: libWorldSoccerChamps.so 15,9 MB, C++ ve STRIPPED →
 * sembol/offset yok. Değerler (para, bütçe, CA/PA, yaş, sözleşme) çalışma
 * anında taranır:  ilk ara → oyunda değiştir → "Değişti/Aynı/Arttı/Azaldı" ile daralt
 *                  → "Yaz" (kalıcı) veya "Dondur" (sürekli sabit tut).
 *
 * Sekmeler
 *   Tara  : değer tarayıcı (int32/int64/float/double), tek adres yazma, dondurma
 *   Hazır : yaygın modlar için hazır değer/tip şablonları
 *   Kayıt : oyunun KENDİ kayıt dizinini (app files) listeler, yedekler, JSON içeriğini değiştirir
 *
 * Kullanım:
 *   frida -U -f com.monkeyibrow.worldsoccerchamps -l modmenu/game-mod.js --no-pause
 *   (kolay yol: tools/game-mod.sh)
 *
 * Ayrıntı ve dürüst sınırlar: docs/GAME-MOD.md
 */

"use strict";

const PKG = "com.monkeyibrow.worldsoccerchamps";
const LIB = "libWorldSoccerChamps.so";
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
  { id: "budget",  label: "Transfer bütçesi", type: "int32",  note: "Finans ekranındaki değeri gir (virgülsüz)" },
  { id: "wage",    label: "Maaş bütçesi",     type: "int32",  note: "Haftalık maaş bütçesi" },
  { id: "money",   label: "Kulüp bakiyesi",   type: "int32",  note: "Bakiye / kasa" },
  { id: "ca",      label: "CA (oyuncu)",      type: "int32",  note: "1–200 arası; oyuncu profilinde görünür" },
  { id: "pa",      label: "PA (oyuncu)",      type: "int32",  note: "1–200 arası potansiyel" },
  { id: "attr",    label: "Nitelik (1–20)",   type: "int32",  note: "Tek bir nitelik değeri, ör. Bitiricilik = 14" },
  { id: "value",   label: "Piyasa değeri",    type: "int32",  note: "Çok büyük sayı → int64 dene" },
  { id: "rep",     label: "İtibar (1–10000)", type: "int32",  note: "Kulüp itibarı" },
];

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
    const mod = Process.findModuleByName(LIB);
    if (mod) Process.enumerateRanges(mod.name, "rw-").forEach((r) => out.push(r));
    Process.enumerateRanges("rw-").forEach((r) => {
      if (r.file && r.file.path && r.file.path.indexOf(LIB) >= 0) return;
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
  const fab = text("◢ MOD", 12, "#0a0612");
  fab.setGravity(Gravity.CENTER.getValue());
  fab.setBackgroundColor(color("#a78bfa"));
  fab.setPadding(dp(10), dp(7), dp(10), dp(7));

  // ---- panel ----
  const panel = box(LinearLayout.VERTICAL.getValue());
  panel.setBackgroundColor(color("#f00b0912"));
  panel.setPadding(dp(10), dp(8), dp(10), dp(10));

  panel.addView(text("WSC MOD MENU · World Soccer Champs", 12, "#e9e4fb"));
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
  ["scan", "presets", "save"].forEach((id) => {
    const label = id === "scan" ? "Tara" : id === "presets" ? "Hazır" : "Kayıt";
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

  /* ---------------- HAZIR ---------------- */
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

function hookActivity() {
  let hooked = false;
  try {
    const AppActivity = Java.use("org.cocos2dx.cpp.AppActivity");
    AppActivity.onCreate.overload("android.os.Bundle").implementation = function (b) {
      this.onCreate(b);
      S.activity = this;
      setTimeout(attach, 1800);
    };
    hooked = true;
    log("AppActivity.onCreate hook'landı");
  } catch (e) {
    log("AppActivity yok: " + e);
  }
  if (!hooked) {
    try {
      const Activity = Java.use("android.app.Activity");
      Activity.onCreate.overload("android.os.Bundle").implementation = function (b) {
        this.onCreate(b);
        const name = this.getClass().getName();
        if (name.indexOf("monkeyibrow") >= 0 || name.indexOf("cocos2dx") >= 0) {
          S.activity = this;
          setTimeout(attach, 1800);
        }
      };
      log("android.app.Activity.onCreate hook'landı");
    } catch (e) {
      log("Activity hook hatası: " + e);
    }
  }
  setTimeout(() => {
    if (S.activity) return;
    try {
      Java.choose("org.cocos2dx.cpp.AppActivity", {
        onMatch(instance) { S.activity = instance; },
        onComplete() { if (S.activity) attach(); },
      });
    } catch (_) { /* yok say */ }
  }, 3000);
}

/* ------------------------------------------------------------------ */
/* test / çalışma ortamı                                               */
/* ------------------------------------------------------------------ */

// Node testleri ajanın saf mantığını bu nesne üzerinden sınar.
globalThis.MOD = {
  S, TYPES, TYPE_ORDER, PRESETS,
  firstScan, nextScan, writeOne, writeAll, freezeAll,
  saveList, saveRead, saveWrite, saveBackup,
  candidateRanges, startWatcher, stopWatcher,
};

if (typeof Java !== "undefined") {
  Java.perform(() => {
    log("WSC mod menüsü yükleniyor…");
    try {
      const m = Process.findModuleByName(LIB);
      log(m ? `${LIB} @ ${m.base}` : `${LIB} henüz yüklenmedi`);
    } catch (_) { /* yok say */ }
    hookActivity();
  });
} else {
  log("Frida yok — yalnızca MOD API yüklendi (test modu)");
}
