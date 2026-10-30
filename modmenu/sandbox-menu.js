/*
 * Sandbox Mod Menu — World Soccer Champs (Cocos2d-x) için Frida overlay menüsü.
 *
 * Ne yapar
 *   • Oyunun kendi Activity'sine yüzen bir "SANDBOX" düğmesi ve panel ekler
 *     (SYSTEM_ALERT_WINDOW izni GEREKMEZ; görünüm oyunun kendi penceresine eklenir).
 *   • Stripped native bir oyun olduğu için SABİT OFFSET kullanmaz: değer taraması
 *     (first scan → refine → write → freeze) ile bütçe/kabiliyet gibi int/float
 *     değerleri bulup değiştirir.
 *   • APK'yı değiştirmez: PairIP imza kontrolü tetiklenmez.
 *
 * Kullanım (root'lu cihaz veya root'lu emülatör):
 *   frida -U -f com.monkeyibrow.worldsoccerchamps -l sandbox-menu.js --no-pause
 *
 * Gereksinim: cihazda frida-server (aynı mimari: armeabi-v7a oyun için arm build).
 * Ayrıntı: modmenu/README.md
 */

"use strict";

const PKG = "com.monkeyibrow.worldsoccerchamps";
const LIB = "libWorldSoccerChamps.so";
const MAX_RESULTS = 4000;
const CHUNK = 1 << 20; // 1 MiB

const S = {
  activity: null,
  libBase: null,
  type: "int",
  hits: [],            // {addr: NativePointer, last: number}
  frozen: new Map(),   // "0x..." -> {addr, type, value, timer}
  overlay: null,
  panel: null,
  visible: false,
  busy: false,
};

/* ------------------------------------------------------------------ */
/* yardımcılar                                                         */
/* ------------------------------------------------------------------ */

function log(msg) {
  console.log("[sandbox] " + msg);
}

function dp(v) {
  const ctx = S.activity.getApplicationContext();
  const r = ctx.getResources();
  const d = r.getDisplayMetrics();
  return Math.round(v * d.density);
}

function color(hex) {
  return Java.use("android.graphics.Color").parseColor(hex).intValue();
}

function findLib() {
  if (S.libBase) return S.libBase;
  const m = Process.findModuleByName(LIB);
  if (!m) return null;
  S.libBase = m.base;
  log(`${LIB} @ ${m.base} (${m.size} bayt)`);
  return m.base;
}

/* ------------------------------------------------------------------ */
/* bellek taraması                                                     */
/* ------------------------------------------------------------------ */

function candidateRanges() {
  const out = [];
  const mod = Process.findModuleByName(LIB);
  if (mod) {
    // Oyunun kendi veri segmentleri önce denenir.
    Process.enumerateRanges(mod.name, "rw-").forEach((r) => out.push(r));
  }
  // Heap / anonim rw alanları (C++ nesneleri burada yaşar).
  Process.enumerateRanges("rw-").forEach((r) => {
    if (r.file && r.file.path && r.file.path.indexOf(LIB) >= 0) return;
    if (r.size > 96 * 1024 * 1024) return; // çok büyük alanları atla
    out.push(r);
  });
  return out;
}

function readValue(addr, type) {
  try {
    return type === "int" ? addr.readS32() : Math.fround(addr.readFloat());
  } catch (_) {
    return null;
  }
}

/** İlk tarama: değeri verilen tam sayı/float olan tüm adresler. */
function firstScan(value, type) {
  const hits = [];
  const ranges = candidateRanges();
  let scanned = 0;
  const total = ranges.reduce((a, r) => a + r.size, 0);
  log(`tarama: ${ranges.length} bölge, ${(total / 1048576).toFixed(0)} MB`);

  for (const range of ranges) {
    for (let off = 0; off < range.size; off += CHUNK) {
      if (hits.length >= MAX_RESULTS) break;
      const n = Math.min(CHUNK, range.size - off);
      let buf;
      try {
        buf = range.base.add(off).readByteArray(n);
      } catch (_) {
        continue;
      }
      if (!buf) continue;
      const dv = new DataView(buf);
      for (let i = 0; i + 4 <= n; i += 4) {
        const v = type === "int" ? dv.getInt32(i, true) : dv.getFloat32(i, true);
        const eq = type === "int" ? v === value : Math.abs(v - value) < 0.0001;
        if (eq) {
          hits.push({ addr: range.base.add(off + i), last: v });
          if (hits.length >= MAX_RESULTS) break;
        }
      }
      scanned += n;
      if ((off & (16 * CHUNK - 1)) === 0) {
        log(`ilerleme ${((scanned / total) * 100).toFixed(0)}% · ${hits.length} aday`);
      }
    }
  }
  return hits;
}

/** Sonraki tarama: mevcut adayları verilen koşula göre süzer. */
function nextScan(mode) {
  const kept = [];
  for (const h of S.hits) {
    const v = readValue(h.addr, S.type);
    if (v === null) continue;
    const prev = h.last;
    let ok = false;
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

function writeAll(value) {
  let n = 0;
  for (const h of S.hits) {
    try {
      S.type === "int" ? h.addr.writeS32(value) : h.addr.writeFloat(Math.fround(value));
      h.last = value;
      n++;
    } catch (_) { /* yazılamayan bölge */ }
  }
  return n;
}

function freezeAll(value, on) {
  S.hits.forEach((h) => {
    const key = h.addr.toString();
    if (!on) {
      const f = S.frozen.get(key);
      if (f) { clearInterval(f.timer); S.frozen.delete(key); }
      return;
    }
    if (S.frozen.has(key)) return;
    const timer = setInterval(() => {
      try {
        S.type === "int" ? h.addr.writeS32(value) : h.addr.writeFloat(Math.fround(value));
      } catch (_) { /* yok say */ }
    }, 60);
    S.frozen.set(key, { addr: h.addr, type: S.type, value, timer });
  });
  return S.frozen.size;
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

  UI.TextView = TextView;
  UI.LinearLayout = LinearLayout;
  UI.ScrollView = ScrollView;
  UI.EditText = EditText;
  UI.Button = Button;
  UI.Gravity = Gravity;

  const ctx = S.activity;

  const mk = (Klass, text) => {
    const v = Klass.$new(ctx);
    if (text !== undefined && v.setText) v.setText(text);
    return v;
  };

  // yüzen düğme
  const fab = mk(TextView, "◢ SANDBOX");
  fab.setTextSize(12);
  fab.setTextColor(color("#04120b"));
  fab.setGravity(Gravity.CENTER.getValue());
  fab.setBackgroundColor(color("#35d07f"));
  fab.setPadding(dp(10), dp(7), dp(10), dp(7));

  // panel
  const panel = mk(LinearLayout);
  panel.setOrientation(LinearLayout.VERTICAL.getValue());
  panel.setBackgroundColor(color("#e60b0f13"));
  panel.setPadding(dp(12), dp(10), dp(12), dp(12));

  const title = mk(TextView, "SANDBOX EDITOR · World Soccer Champs");
  title.setTextSize(13);
  title.setTextColor(color("#e6eef4"));
  panel.addView(title, null);

  const status = mk(TextView, "hazır");
  status.setTextSize(10);
  status.setTextColor(color("#8fa2b1"));
  panel.addView(status);

  // giriş satırı
  const inputRow = mk(LinearLayout);
  inputRow.setOrientation(LinearLayout.HORIZONTAL.getValue());

  const valueInput = mk(EditText);
  valueInput.setHint("değer");
  valueInput.setTextSize(12);
  valueInput.setInputType(2 | 0x1000 | 0x2000); // number + decimal
  const lpInput = Java.use("android.widget.LinearLayout$LayoutParams").$new(0, -2, 1.0);
  inputRow.addView(valueInput, lpInput);

  const typeBtn = mk(Button, "int");
  typeBtn.setTextSize(10);
  typeBtn.setOnClickListener(Java.use("android.view.View$OnClickListener").$new({
    onClick: function () {
      S.type = S.type === "int" ? "float" : "int";
      typeBtn.setText(S.type);
    },
  }));
  inputRow.addView(typeBtn, Java.use("android.widget.LinearLayout$LayoutParams").$new(dp(56), -2, 0));

  panel.addView(inputRow, null);

  // tarama düğmeleri
  const scanRow = mk(LinearLayout);
  scanRow.setOrientation(LinearLayout.HORIZONTAL.getValue());

  const btn = (label, handler) => {
    const b = mk(Button, label);
    b.setTextSize(9);
    b.setOnClickListener(Java.use("android.view.View$OnClickListener").$new({ onClick: handler }));
    const lp = Java.use("android.widget.LinearLayout$LayoutParams").$new(0, -2, 1.0);
    scanRow.addView(b, lp);
    return b;
  };

  const readInput = () => {
    const raw = valueInput.getText().toString();
    const v = S.type === "int" ? parseInt(raw, 10) : parseFloat(raw.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };

  btn("İlk Ara", () => {
    const v = readInput();
    if (v === null) { status.setText("önce bir değer gir"); return; }
    status.setText("taranıyor…");
    setTimeout(() => {
      S.hits = firstScan(v, S.type);
      renderResults();
      status.setText(`ilk tarama: ${S.hits.length} aday`);
    }, 30);
  });

  btn("Değişti", () => { const n = nextScan("changed"); renderResults(); status.setText(`kalan: ${n}`); });
  btn("Aynı", () => { const n = nextScan("unchanged"); renderResults(); status.setText(`kalan: ${n}`); });
  btn("Arttı", () => { const n = nextScan("increased"); renderResults(); status.setText(`kalan: ${n}`); });
  btn("Azaldı", () => { const n = nextScan("decreased"); renderResults(); status.setText(`kalan: ${n}`); });

  panel.addView(scanRow, null);

  // uygulama satırı
  const applyRow = mk(LinearLayout);
  applyRow.setOrientation(LinearLayout.HORIZONTAL.getValue());

  const applyBtn = mk(Button, "Sonuçlara Yaz");
  applyBtn.setTextSize(10);
  applyBtn.setOnClickListener(Java.use("android.view.View$OnClickListener").$new({
    onClick: function () {
      const v = readInput();
      if (v === null) { status.setText("yazılacak değer gir"); return; }
      const n = writeAll(v);
      status.setText(`${n} adrese yazıldı`);
      renderResults();
    },
  }));
  applyRow.addView(applyBtn, Java.use("android.widget.LinearLayout$LayoutParams").$new(0, -2, 1.0));

  const freezeBtn = mk(Button, "Dondur");
  freezeBtn.setTextSize(10);
  let freezing = false;
  freezeBtn.setOnClickListener(Java.use("android.view.View$OnClickListener").$new({
    onClick: function () {
      const v = readInput();
      freezing = !freezing;
      if (freezing && v === null) { freezing = false; status.setText("dondurmak için değer gir"); return; }
      const n = freezeAll(v, freezing);
      freezeBtn.setText(freezing ? "Çöz" : "Dondur");
      status.setText(freezing ? `${n} adres donduruldu` : "dondurma kapalı");
    },
  }));
  applyRow.addView(freezeBtn, Java.use("android.widget.LinearLayout$LayoutParams").$new(0, -2, 1.0));

  panel.addView(applyRow, null);

  // sonuç listesi
  const scroll = mk(ScrollView);
  const list = mk(LinearLayout);
  list.setOrientation(LinearLayout.VERTICAL.getValue());
  UI.results = list;
  scroll.addView(list);
  panel.addView(scroll, Java.use("android.widget.LinearLayout$LayoutParams").$new(-1, dp(160), 0));

  UI.status = status;
  UI.scroll = scroll;
  UI.valueInput = valueInput;

  const renderResults = (UI.renderResults = function () {
    list.removeAllViews();
    const shown = S.hits.slice(0, 40);
    shown.forEach((h) => {
      const row = mk(TextView, `${h.addr}  =  ${h.last}`);
      row.setTextSize(9);
      row.setTextColor(color("#a9c2d3"));
      list.addView(row);
    });
    if (S.hits.length > shown.length) {
      const more = mk(TextView, `… +${S.hits.length - shown.length} adres`);
      more.setTextSize(9);
      more.setTextColor(color("#8fa2b1"));
      list.addView(more);
    }
    if (!S.hits.length) {
      const empty = mk(TextView, "sonuç yok");
      empty.setTextSize(9);
      empty.setTextColor(color("#8fa2b1"));
      list.addView(empty);
    }
  });

  renderResults();

  // kapat
  const closeBtn = mk(Button, "Kapat");
  closeBtn.setTextSize(10);
  closeBtn.setOnClickListener(Java.use("android.view.View$OnClickListener").$new({
    onClick: function () { S.panel.setVisibility(8); S.visible = false; },
  }));
  panel.addView(closeBtn);

  // yerleşim
  const Gravity2 = Java.use("android.view.Gravity");
  const FrameLP = Java.use("android.widget.FrameLayout$LayoutParams");

  const fabLp = FrameLP.$new(-2, -2);
  fabLp.gravity = Gravity2.TOP.getValue() | Gravity2.RIGHT.getValue();
  fabLp.topMargin = dp(72);
  fabLp.rightMargin = dp(8);

  const plp = FrameLP.$new(-1, -1);
  plp.gravity = Gravity2.CENTER.getValue();
  plp.leftMargin = dp(12);
  plp.rightMargin = dp(12);
  plp.topMargin = dp(120);
  plp.bottomMargin = dp(40);

  panel.setVisibility(8);
  fab.setOnClickListener(Java.use("android.view.View$OnClickListener").$new({
    onClick: function () {
      S.visible = !S.visible;
      S.panel.setVisibility(S.visible ? 0 : 8);
      renderResults();
    },
  }));

  S.activity.addContentView(fab, fabLp);
  S.activity.addContentView(panel, plp);
  S.panel = panel;
  log("overlay eklendi");
}

/* ------------------------------------------------------------------ */
/* Activity yakalama                                                   */
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
      setTimeout(attach, 1500);
    };
    hooked = true;
    log("AppActivity.onCreate hook'landı");
  } catch (e) {
    log("AppActivity bulunamadı: " + e);
  }

  if (!hooked) {
    try {
      const Activity = Java.use("android.app.Activity");
      Activity.onCreate.overload("android.os.Bundle").implementation = function (b) {
        this.onCreate(b);
        const name = this.getClass().getName();
        if (name.indexOf("monkeyibrow") >= 0 || name.indexOf("cocos2dx") >= 0) {
          S.activity = this;
          setTimeout(attach, 1500);
        }
      };
      log("android.app.Activity.onCreate hook'landı");
    } catch (e) {
      log("Activity hook hatası: " + e);
    }
  }

  // Zaten çalışıyorsa mevcut Activity'yi bul
  setTimeout(() => {
    if (S.activity) return;
    try {
      Java.choose("org.cocos2dx.cpp.AppActivity", {
        onMatch(instance) { S.activity = instance; },
        onComplete() { if (S.activity) attach(); },
      });
    } catch (e) { /* yok say */ }
  }, 3000);
}

Java.perform(() => {
  log("sandbox menu yükleniyor…");
  findLib();
  hookActivity();
});
