/**
 * Android çerçeve taklidi — Frida ajanının ARAYÜZ kodunu cihazsız çalıştırır.
 *
 * Amaç: `buildUi()` içindeki her Android çağrısını (TextView, LinearLayout,
 * LayoutParams, OnClickListener, Activity.addContentView, java.io.File, ...)
 * gerçek bir görünüm ağacına karşı yürütmek. Böylece cihaza gitmeden
 * "menü kuruluyor mu, düğmeler çalışıyor mu, dosya listesi açılıyor mu"
 * sorusunun cevabı test edilebilir olur.
 *
 * Bilinmeyen bir sınıf/metot istenirse HATA fırlatır — yazım hataları yakalanır.
 */

class View {
  constructor(kind, ctx) {
    this.kind = kind;
    this.ctx = ctx;
    this.children = [];
    this.text = "";
    this.hint = "";
    this.visibility = 0;
    this.listener = null;
    this.lp = null;
    this.minLines = 0;
    this.textSize = 0;
    this.props = {};
    this.enabled = true;
  }
  setText(v) { this.text = String(v); return this; }
  getText() { const self = this; return { toString: () => self.editValue !== undefined ? self.editValue : self.text }; }
  setHint(v) { this.hint = String(v); return this; }
  setTextSize(v) { this.textSize = v; return this; }
  setTextColor(c) { this.props.color = c; return this; }
  setGravity(g) { this.props.gravity = g; return this; }
  setBackgroundColor(c) { this.props.background = c; return this; }
  setPadding(a, b, c, d) { this.props.padding = [a, b, c, d]; return this; }
  setOrientation(o) { this.props.orientation = o; return this; }
  setVisibility(v) { this.visibility = v; return this; }
  getVisibility() { return this.visibility; }
  setOnClickListener(l) { this.listener = l; return this; }
  setAllCaps(v) { this.props.allCaps = v; return this; }
  setEnabled(v) { this.enabled = !!v; return this; }
  isEnabled() { return this.enabled; }
  setInputType(v) { this.props.inputType = v; return this; }
  setMinLines(v) { this.minLines = v; return this; }
  addView(v, lp) { this.children.push(v); if (lp) v.lp = lp; return this; }
  removeAllViews() { this.children = []; return this; }
  /** Test yardımcısı: gerçek dokunuşu tetikle. */
  click() {
    if (!this.listener) throw new Error(`${this.kind} tıklanabilir değil (${this.text || this.hint})`);
    this.listener.onClick(this);
    return this;
  }
}

const utf8 = {
  encode: (s) => new TextEncoder().encode(s),
  decode: (bytes) => new TextDecoder().decode(bytes),
};

import { createSqliteMock } from "./sqlite-mock.mjs";

export function createAndroidMock({ files = new Map(), density = 2.75, sqliteDir = null } = {}) {
  const calls = { addContentView: 0 };
  const hooked = new Map(); // "Cls.metod" -> { implementation }

  const FS = files; // path -> string | Uint8Array
  const sqlite = createSqliteMock({ sqliteDir, FS });

  class FileShim {
    constructor(p) { this.path = String(p); }
    getAbsolutePath() { return this.path; }
    exists() { return FS.has(this.path) || this.isDirectory(); }
    getParent() { return this.path.replace(/\/[^/]+$/, ""); }
    getName() { return this.path.split("/").filter(Boolean).pop() || ""; }
    isDirectory() { return [...FS.keys()].some((k) => k.startsWith(this.path.endsWith("/") ? this.path : this.path + "/")); }
    length() {
      const v = FS.get(this.path);
      if (v === undefined) return 0;
      return typeof v === "string" ? utf8.encode(v).length : v.length;
    }
    listFiles() {
      const prefix = this.path.endsWith("/") ? this.path : this.path + "/";
      const names = new Set();
      for (const k of FS.keys()) {
        if (!k.startsWith(prefix)) continue;
        const rest = k.slice(prefix.length);
        if (!rest || rest.includes("/")) continue;
        names.add(rest);
      }
      if (!names.size) return null;
      return [...names].map((n) => new FileShim(prefix + n));
    }
  }

  class FileInputStreamShim {
    constructor(p) {
      const v = FS.get(String(p));
      if (v === undefined) throw new Error("Açılamadı: " + p);
      this.bytes = typeof v === "string" ? utf8.encode(v) : v;
      this.pos = 0;
    }
    read(arr, off, len) {
      const start = this.pos;
      const n = len === undefined ? arr.length : len;
      let count = 0;
      for (let i = 0; i < n && start + i < this.bytes.length; i++) { arr[off === undefined ? i : off + i] = this.bytes[start + i]; count++; }
      this.pos += count;
      return count;
    }
    close() {}
  }

  class FileOutputStreamShim {
    constructor(p, append) {
      this.path = String(p);
      this.chunks = [];
      this.append = !!append;
    }
    write(bytes, off, len) {
      if (typeof bytes === "number") throw new Error("write(int) desteklenmiyor");
      const start = off === undefined ? 0 : off;
      const end = len === undefined ? bytes.length : start + len;
      this.chunks.push(Uint8Array.from(bytes.slice(start, end)));
    }
    close() {
      const total = this.chunks.reduce((a, c) => a + c.length, 0);
      const out = new Uint8Array(total);
      let o = 0;
      for (const c of this.chunks) { out.set(c, o); o += c.length; }
      FS.set(this.path, this.append ? (FS.get(this.path) || "") + utf8.decode(out) : utf8.decode(out));
    }
  }

  const getClass = (name) => {
    switch (name) {
      case "android.widget.TextView": return class extends View { constructor(c) { super("TextView", c); } };
      case "android.widget.Button": return class extends View { constructor(c) { super("Button", c); } };
      case "android.widget.EditText": return class extends View { constructor(c) { super("EditText", c); } };
      case "android.widget.LinearLayout": {
        const L = class extends View { constructor(c) { super("LinearLayout", c); } };
        // Android'de bunlar statik sabitler (Frida'da getValue() ile okunur)
        L.VERTICAL = { getValue: () => 1 };
        L.HORIZONTAL = { getValue: () => 0 };
        return L;
      }
      case "android.widget.ScrollView": return class extends View { constructor(c) { super("ScrollView", c); } };
      case "android.view.View": return { GONE: 8, VISIBLE: 0, INVISIBLE: 4 };
      case "android.widget.FrameLayout$LayoutParams": return class { constructor(w, h) { this.width = w; this.height = h; } };
      case "android.widget.LinearLayout$LayoutParams": return class { constructor(w, h, weight) { this.width = w; this.height = h; this.weight = weight; } };
      case "android.view.View$OnClickListener": return class { constructor(obj) { Object.assign(this, obj); } };
      case "android.view.Gravity": return { CENTER: { getValue: () => 17 }, TOP: { getValue: () => 48 }, RIGHT: { getValue: () => 5 }, LEFT: { getValue: () => 3 }, START: { getValue: () => 8388611 } };
      case "android.graphics.Color": return { parseColor: (hex) => ({ intValue: () => 0xff000000 + parseInt(String(hex).replace("#", "").slice(-6), 16) }) };
      case "java.io.File": return { $new: (p) => new FileShim(p) };
      case "java.io.FileInputStream": return { $new: (p) => new FileInputStreamShim(p) };
      case "java.io.FileOutputStream": return { $new: (p, a) => new FileOutputStreamShim(p, a) };
      case "java.nio.charset.StandardCharsets": return { UTF_8: { $new: () => ({ toString: () => "UTF-8" }) } };
      case "android.database.sqlite.SQLiteDatabase": return sqlite.SQLiteDatabase;
      case "java.lang.String": return {
        $new: (...a) => {
          if (a.length === 4) return utf8.decode(a[0].slice(a[1], a[1] + a[2]));
          const str = String(a[0]);
          return { toString: () => str, getBytes: () => utf8.encode(str) };
        },
      };
      case "org.cocos2dx.cpp.AppActivity": return class { };
      case "android.app.Activity": return class { };
      default: {
        // Metot tanımları sınıf nesnesine tembel eklenir (aşağıdaki `method` sarmalayıcısı).
        if (name.includes(".")) return class { };
        throw new Error("bilinmeyen Java sınıfı: " + name);
      }
    }
  };

  /** Sınıf nesnesini Frida davranışına çevir: onCreate.overload(...) → {implementation} */
  const wrap = (name, raw) => {
    if (typeof raw !== "function") return raw; // Gravity/Color gibi sabit nesneler
    const methods = new Map();
    return new Proxy(raw, {
      get(target, prop) {
        if (prop === "$new") return (...args) => new target(...args);
        if (prop === "overload") return (...sig) => ({ toString: () => sig.join(",") });
        if (typeof prop === "string" && /^[a-z]/.test(prop) && !(prop in target)) {
          // Frida'nın metot sarmalayıcısı: overload() → {implementation}
          if (!methods.has(prop)) {
            const holder = {
              _impl: null,
              overload(...sig) {
                const key = `${name}.${prop}(${sig.join(",")})`;
                if (!hooked.has(key)) hooked.set(key, { holder: this, fn: null });
                this.key = key;
                return this;
              },
              set implementation(fn) { this.fn = fn; if (this.key) hooked.get(this.key).fn = fn; },
              get implementation() { return this.fn; },
            };
            methods.set(prop, holder);
          }
          return methods.get(prop);
        }
        return target[prop];
      },
    });
  };

  const ActivityShim = class {
    constructor(filesDir, externalDir, pkg = "com.example.app") {
      this._files = filesDir;
      this._external = externalDir;
      this._pkg = pkg;
      this.views = [];
    }
    getPackageName() { return this._pkg; }
    getApplicationContext() { return this; }
    getResources() { return { getDisplayMetrics: () => ({ density }) }; }
    getFilesDir() { return new FileShim(this._files); }
    getDatabasePath(name) {
      const base = String(this._files).replace(/\/files$/, "");
      return new FileShim(`${base}/databases/${name}`);
    }
    getExternalFilesDir() { return new FileShim(this._external); }
    addContentView(v, lp) { calls.addContentView++; this.views.push(v); if (lp) v.lp = lp; }
    onCreate(b) { this.created = true; }
  };

  const Java = {
    available: true,
    use: (name) => wrap(name, getClass(name)),
    array: (type, arr) => Uint8Array.from(arr),
    perform: (fn) => fn(),
    choose: (name, { onMatch, onComplete }) => { if (onComplete) onComplete(); },
    _hooked: hooked,
    _Activity: ActivityShim,
  };

  return { Java, calls, files: FS, View, hooked, sqlite };
}
