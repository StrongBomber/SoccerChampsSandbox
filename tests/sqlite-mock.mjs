/**
 * Android SQLite taklidi — GERÇEK SQLite ile.
 *
 * Ajanın kullandığı Java API yüzeyini (`SQLiteDatabase.openDatabase`,
 * `rawQuery`, `execSQL`, `Cursor.*`) Node'un yerleşik `node:sqlite` modülüne
 * bağlar. Böylece ajanda üretilen SQL cümleleri gerçek bir SQL motorunda
 * çalışır; taklit edilen tek şey Java arayüzüdür.
 *
 *   const sqlite = createSqliteMock({ sqliteDir, FS });
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
let DatabaseSync = null;
let sqliteError = null;
try {
  ({ DatabaseSync } = await import("node:sqlite"));
} catch (e) {
  sqliteError = e;
}

const utf8 = new TextEncoder();
const dec = new TextDecoder();

/** APK yolunu diske güvenli bir dosya adına çevirir. */
const realName = (p) => String(p).replace(/[^\w.-]+/g, "_");

export function createSqliteMock({ sqliteDir, FS } = {}) {
  const dir = sqliteDir || fs.mkdtempSync(path.join(os.tmpdir(), "andjs-sqlite-"));
  fs.mkdirSync(dir, { recursive: true });
  const open = new Map(); // apk yolu -> DatabaseSync
  const calls = { opened: 0, queries: 0, execs: 0 };

  const realPath = (p) => {
    const f = path.join(dir, realName(p));
    // ilk açılışta taklit dosya sistemindeki içeriği diske taşı
    if (!fs.existsSync(f) && FS && FS.has(p)) {
      const v = FS.get(p);
      fs.writeFileSync(f, typeof v === "string" ? Buffer.from(v, "utf8") : Buffer.from(v));
    }
    return f;
  };

  /** Yazma sonrası diski taklit dosya sistemine yansıt (yedek/okuma testleri için). */
  const syncBack = (apkPath) => {
    if (!FS) return;
    try {
      const b = fs.readFileSync(realPath(apkPath));
      FS.set(apkPath, dec.decode(b));
    } catch (_) { /* yok say */ }
  };

  class CursorShim {
    constructor(rows, cols) {
      this.rows = rows || [];
      this.cols = cols || (this.rows[0] ? Object.keys(this.rows[0]) : []);
      this.i = -1;
    }
    getColumnNames() { return this.cols.slice(); }
    getColumnCount() { return this.cols.length; }
    getCount() { return this.rows.length; }
    getColumnIndex(n) { return this.cols.indexOf(String(n)); }
    moveToNext() { if (this.i + 1 >= this.rows.length) return false; this.i++; return true; }
    moveToFirst() { if (!this.rows.length) return false; this.i = 0; return true; }
    isAfterLast() { return this.i >= this.rows.length; }
    _v(i) { return this.rows[this.i][this.cols[i]]; }
    getType(i) {
      const v = this._v(i);
      if (v === null || v === undefined) return 0;
      if (typeof v === "bigint") return 1;
      if (typeof v === "number") return Number.isInteger(v) ? 1 : 2;
      if (typeof v === "string") return 3;
      return 4;
    }
    getString(i) { const v = this._v(i); return v === null || v === undefined ? null : String(v); }
    getLong(i) { const v = this._v(i); return v === null || v === undefined ? 0 : Math.trunc(Number(v)); }
    getInt(i) { return this.getLong(i); }
    getDouble(i) { const v = this._v(i); return v === null || v === undefined ? 0 : Number(v); }
    getBlob(i) { return this._v(i); }
    close() { this.rows = []; }
  }

  const available = typeof DatabaseSync === "function";

  class SQLiteDatabaseShim {
    constructor(apkPath, flags) {
      this.path = String(apkPath);
      this.readOnly = Number(flags) === 1;
      this.db = new DatabaseSync(realPath(this.path));
      calls.opened++;
    }
    rawQuery(sql, args) {
      calls.queries++;
      const stmt = this.db.prepare(String(sql));
      const rows = (args && args.length) ? stmt.all(...args) : stmt.all();
      let cols = null;
      try {
        if (typeof stmt.columns === "function") cols = stmt.columns().map((c) => c.name);
      } catch (_) { /* yok say */ }
      return new CursorShim(rows, cols || (rows[0] ? Object.keys(rows[0]) : []));
    }
    execSQL(sql) {
      calls.execs++;
      const text = String(sql).trim();
      if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/i.test(text)) {
        this.db.exec(text);
      } else {
        this.db.prepare(text).run();
      }
      syncBack(this.path);
      return true;
    }
    beginTransaction() { this.db.exec("BEGIN"); }
    setTransactionSuccessful() { this._ok = true; }
    endTransaction() { this.db.exec(this._ok ? "COMMIT" : "ROLLBACK"); this._ok = false; }
    close() { try { this.db.close(); } catch (_) { /* yok say */ } syncBack(this.path); }
  }

  const SQLiteDatabase = {
    openDatabase: (p, factory, flags) => {
      if (!available) throw new Error("node:sqlite yok (Node 22.5+ gerekir)");
      return new SQLiteDatabaseShim(p, flags);
    },
    OPEN_READONLY: 1,
    OPEN_READWRITE: 0,
  };

  return { SQLiteDatabase, CursorShim, calls, dir, realPath, syncBack, available, sqliteError };
}
