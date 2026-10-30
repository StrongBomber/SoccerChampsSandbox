/* In-Game Editor — Football Manager oyun içi editörünün birebir muadili.
 *
 * Ekran akışı: Genel Bakış · Kulüp · Oyuncular · Personel · Finans · Müsabakalar · Sandbox · Tercihler
 * Düzenleme modeli: her alan değişikliği yol (path) tabanlı bir "patch" olarak sahnelenir;
 * inceleme çekmecesinden tek tek ya da toplu geri alınır, "Değişiklikleri Kaydet" ile kalıcılaşır.
 */
(function () {
  "use strict";

  const {
    POSITIONS, POSITION_LABEL, GROUPS, STAFF_ATTRS, ENUMS, TRAITS, INJURIES,
    FORMATIONS, COACHING_STYLES, RESPONSIBILITIES, AFFILIATION_TYPES,
    attrColor, abilityColor, fmt,
  } = window.FM;

  const LS_KEY = "wsc-fm-editor-v2";
  const DEMO_URL = "./demo-save.json";

  const TABS = [
    { id: "overview", label: "Genel Bakış" },
    { id: "club", label: "Kulüp" },
    { id: "players", label: "Oyuncular" },
    { id: "staff", label: "Personel" },
    { id: "finances", label: "Finans" },
    { id: "competitions", label: "Müsabakalar" },
    { id: "sandbox", label: "Sandbox" },
    { id: "free", label: "Serbest JSON" },
    { id: "preferences", label: "Tercihler" },
  ];

  const PLAYER_TABS = [
    ["profile", "Profil"],
    ["attributes", "Nitelikler"],
    ["contract", "Sözleşme"],
    ["personal", "Kişisel"],
    ["traits", "Özellikler"],
    ["discipline", "Disiplin"],
    ["relations", "İlişkiler"],
  ];

  const S = {
    save: null,
    demo: null,
    baseline: null,
    route: "overview",
    playerId: null,
    playerTab: "profile",
    staffId: null,
    staffQ: "",
    expanded: new Set(["club", "club.finances", "game", "meta", "finances"]),
    treeQ: "",
    palette: { open: false, index: 0, items: [] },
    q: "",
    posFilter: "ALL",
    sort: "ca",
    showFilters: false,
    filters: { ageMin: "", ageMax: "", caMin: "", caMax: "", paMin: "", paMax: "", foot: "", trained: "", year: "" },
    patches: [],
    history: [],
    prefs: { confirmLeave: true, attrColors: true, autoSave: false },
    scope: { path: "", name: "" },
    foreign: false,
    focusPath: null,
  };

  /* ============================ yardımcılar ============================ */

  const $ = (s, r = document) => r.querySelector(s);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function getPath(obj, path) {
    return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
  }
  function setPath(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((a, k) => a[k], obj);
    parent[last] = value;
  }

  function deepDiff(a, b, prefix, out) {
    const isObj = (v) => v && typeof v === "object";
    if (a === b) return out;
    if (!isObj(a) || !isObj(b)) { out.push({ path: prefix, oldValue: a, newValue: b }); return out; }
    const aArr = Array.isArray(a), bArr = Array.isArray(b);
    if (aArr !== bArr) { out.push({ path: prefix, oldValue: a, newValue: b }); return out; }
    if (aArr) {
      if (a.length !== b.length) { out.push({ path: prefix, oldValue: a, newValue: b, structural: true }); return out; }
      a.forEach((v, i) => deepDiff(v, b[i], `${prefix}.${i}`, out));
      return out;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((k) => {
      const p = prefix ? `${prefix}.${k}` : k;
      if (!(k in a) || !(k in b)) out.push({ path: p, oldValue: a[k], newValue: b[k], structural: true });
      else deepDiff(a[k], b[k], p, out);
    });
    return out;
  }

  function savePrefs() {
    try { localStorage.setItem(`${LS_KEY}-prefs`, JSON.stringify(S.prefs)); } catch (_) { /* kota */ }
  }

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2000);
  }

  function short(v) {
    if (v === undefined) return "(yok)";
    if (Array.isArray(v)) return v.length ? `${v.length} kayıt` : "(boş)";
    const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
    return s.length > 46 ? s.slice(0, 46) + "…" : s;
  }

  /* ============================ patch sistemi ============================ */

  const canRevert = (i) => {
    const structuralAfter = S.patches.some((p, j) => j > i && p.structural);
    if (structuralAfter) return false;
    if (S.patches[i].structural) return i === S.patches.length - 1;
    return true;
  };

  function recordPatch(patch) {
    const existing = S.patches.findIndex((p) => p.path === patch.path && !p.structural && !patch.structural);
    if (existing >= 0) {
      const prev = S.patches[existing];
      if (JSON.stringify(prev.oldValue) === JSON.stringify(patch.newValue)) S.patches.splice(existing, 1);
      else prev.newValue = patch.newValue;
    } else {
      S.patches.push({ ...patch, at: Date.now() });
    }
    S.history.push({ label: `${patch.scope ? patch.scope + " · " : ""}${patch.label}`, at: new Date() });
    if (S.history.length > 60) S.history.shift();
    if (S.prefs.autoSave) saveNow(true);
  }

  function revertPatch(i) {
    const p = S.patches[i];
    if (!p) return;
    if (p.structural) S.save = clone(p.snapshot);
    else setPath(S.save, p.path, clone(p.oldValue));
    S.patches.splice(i, 1);
    paint();
  }

  function revertAll() {
    if (!S.baseline) return;
    if (!confirm("Tüm bekleyen değişiklikler geri alınsın mı?")) return;
    S.save = clone(S.baseline);
    S.patches = [];
    paint();
    toast("Tüm değişiklikler geri alındı");
  }

  function undo() {
    if (!S.patches.length) { toast("Geri alınacak düzenleme yok"); return; }
    revertPatch(S.patches.length - 1);
    toast("Geri alındı");
  }

  function saveNow(silent) {
    S.baseline = clone(S.save);
    S.patches = [];
    try { localStorage.setItem(LS_KEY, JSON.stringify(S.save)); } catch (_) { /* kota */ }
    closeReview();
    paint();
    if (!silent) toast("Değişiklikler kaydedildi");
  }

  const dirty = () => S.patches.length > 0;

  /* ============================ kontroller ============================ */

  let CTLS = [];

  function ctl(obj, key, label, opts = {}) {
    const rel = opts.path || String(key);
    const path = opts.absolute || !S.scope.path ? rel : `${S.scope.path}.${rel}`;
    CTLS.push({ obj, key, label, path, scope: S.scope.name, min: opts.min, max: opts.max });
    return CTLS.length - 1;
  }

  function numRow(label, obj, key, opts = {}) {
    const { min = 0, max = 1000000000, step = 1, unit = "", hint = false } = opts;
    const v = Number(obj[key]) || 0;
    const id = ctl(obj, key, label, opts);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value">
        <span class="stepper ${opts.wide ? "wide" : ""}">
          <button type="button" data-step="-${step}" data-ctl="${id}" tabindex="-1">−</button>
          <input type="number" data-ctl="${id}" data-path="${esc(CTLS[id].path)}" value="${v}" min="${min}" max="${max}" step="${step}" />
          <button type="button" data-step="${step}" data-ctl="${id}" tabindex="-1">+</button>
        </span>
        <span class="unit">${esc(unit)}</span>
      </span>
    </div>`;
  }

  function selRow(label, obj, key, options, hint = false) {
    const v = obj[key];
    const id = ctl(obj, key, label);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value">
        <select class="field" data-ctl="${id}" data-path="${esc(CTLS[id].path)}">
          ${options.map((o) => `<option value="${esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("")}
        </select>
      </span>
    </div>`;
  }

  function txtRow(label, obj, key, type = "text", hint = false) {
    const id = ctl(obj, key, label);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value"><input class="field" type="${type}" data-ctl="${id}" data-path="${esc(CTLS[id].path)}" value="${esc(obj[key] ?? "")}" /></span>
    </div>`;
  }

  function moneyRow(label, obj, key) {
    const id = ctl(obj, key, label, { min: -1e12, max: 1e12 });
    const v = Number(obj[key]) || 0;
    return `<div class="row">
      <span class="label">${esc(label)}</span>
      <span class="value">
        <span class="stepper wide">
          <button type="button" data-step="-100000" data-ctl="${id}" tabindex="-1">−</button>
          <input type="number" data-ctl="${id}" data-path="${esc(CTLS[id].path)}" value="${v}" step="100000" />
          <button type="button" data-step="100000" data-ctl="${id}" tabindex="-1">+</button>
        </span>
        <span class="unit">${esc(fmt.money(v))}</span>
      </span>
    </div>`;
  }

  function attrRow(label, attrs, key) {
    const v = Number(attrs[key]) || 0;
    const id = ctl(attrs, key, label, { path: `attributes.${key}`, min: 1, max: 20 });
    const c = S.prefs.attrColors ? attrColor(v) : "inherit";
    const barColor = c === "inherit" ? "#6b7280" : c;
    return `<div class="attr">
      <span class="n">${esc(label)}</span>
      <span class="meter">
        <i><b style="width:${Math.min(100, (v / 20) * 100)}%;background:${barColor}"></b></i>
        <input type="number" min="1" max="20" data-ctl="${id}" data-path="${esc(CTLS[id].path)}"
               value="${v}" style="color:${c}" />
      </span>
    </div>`;
  }

  function stepperInline(obj, key, min, max, step = 1, label = "Değer") {
    const id = ctl(obj, key, label, { min, max });
    return `<span class="stepper">
      <button type="button" data-step="-${step}" data-ctl="${id}" tabindex="-1">−</button>
      <input type="number" data-ctl="${id}" value="${obj[key]}" min="${min}" max="${max}" step="${step}" style="width:84px" />
      <button type="button" data-step="${step}" data-ctl="${id}" tabindex="-1">+</button>
    </span>`;
  }

  function switchRow(label, flagKey, setter) {
    const holder = { [flagKey]: S.prefs[flagKey] };
    const id = ctl(holder, flagKey, label, { path: `prefs.${flagKey}`, absolute: true });
    CTLS[id].custom = setter;
    return `<div class="switch-row">
      <span>${esc(label)}</span>
      <label class="switch"><input type="checkbox" data-ctl="${id}" ${S.prefs[flagKey] ? "checked" : ""} /><span></span></label>
    </div>`;
  }

  function applyCtl(id, raw, isStep) {
    const c = CTLS[id];
    if (!c) return;
    const before = c.custom ? undefined : c.obj[c.key];
    let next;
    if (c.custom) {
      next = !!raw;
      c.custom(next);
    } else if (isStep) {
      next = Number(before) + Number(raw);
    } else if (typeof before === "boolean") {
      next = !!raw;
    } else if (typeof before === "number") {
      next = Number(raw);
    } else {
      next = raw;
    }
    if (!c.custom) {
      if (typeof next === "number") {
        if (Number.isNaN(next)) return;
        if (c.min !== undefined && next < c.min) next = c.min;
        if (c.max !== undefined && next > c.max) next = c.max;
      }
      if (next === before) return;
      c.obj[c.key] = next;
      recordPatch({ path: c.path, label: c.label, oldValue: before, newValue: next, scope: c.scope });
    } else {
      if (c.custom) savePrefs();
      if (S.prefs.autoSave) saveNow(true);
    }
    paint({ focus: c.path });
  }

  /* ============================ doğrulama ============================ */

  function validate() {
    const s = S.save;
    const out = [];
    if (!s || !Array.isArray(s.players) || !s.club || !s.club.finances) return out;
    const push = (level, text, go) => out.push({ level, text, go });

    if (s.club.finances.balance < 0) push("err", `Kulüp bakiyesi negatif (${fmt.money(s.club.finances.balance)}).`, { route: "finances" });
    const wages = s.players.reduce((a, p) => a + (p.contract?.wage || 0), 0);
    if (wages > s.club.finances.wageBudget)
      push("warn", `Haftalık maaş yükü bütçeyi aşıyor: ${fmt.money(wages)} / ${fmt.money(s.club.finances.wageBudget)}.`, { route: "finances" });

    const gk = s.players.filter((p) => p.position === "GK").length;
    if (!gk) push("err", "Kadroda kaleci yok.", { route: "players" });

    s.players.forEach((p) => {
      if (p.ca > p.pa) push("err", `${p.name}: PA (${p.pa}) CA'dan (${p.ca}) düşük.`, { route: "players", playerId: p.id });
      if (String(p.contract?.expiry || "") < s.game.date)
        push("warn", `${p.name}: sözleşme süresi geçmiş (${fmt.date(p.contract.expiry)}).`, { route: "players", playerId: p.id });
      if ((p.condition ?? 100) < 30) push("info", `${p.name}: kondisyon %${p.condition}.`, { route: "players", playerId: p.id });
    });

    const nums = s.players.map((p) => p.registration?.squadNumber).filter((n) => n > 0);
    if (new Set(nums).size !== nums.length) push("info", "Aynı forma numarası birden fazla oyuncuda.", { route: "players" });

    return out;
  }

  /* ============================ görünümler ============================ */

  function playerIndex(p) { return S.save.players.indexOf(p); }

  /* ============================ serbest JSON ağacı ============================ */

  function treeValue(obj, key) {
    return obj[key];
  }

  function renderTree(node, path, depth) {
    if (node === null || typeof node !== "object") return "";
    const isArr = Array.isArray(node);
    const keys = isArr ? node.map((_, i) => String(i)) : Object.keys(node);
    const rows = [];

    keys.forEach((k) => {
      const childPath = path ? `${path}.${k}` : k;
      const v = node[k];
      const isBranch = v !== null && typeof v === "object";
      const open = S.expanded.has(childPath);
      const indent = `style="padding-left:${10 + depth * 14}px"`;

      if (isBranch) {
        const count = Array.isArray(v) ? v.length : Object.keys(v).length;
        rows.push(`<div class="tree-row branch" ${indent}>
          <button class="tree-caret ${open ? "open" : ""}" data-tree-toggle="${esc(childPath)}">${open ? "▾" : "▸"}</button>
          <span class="tree-key">${esc(isArr ? `#${k}` : k)}</span>
          <span class="tree-type">${Array.isArray(v) ? "dizi" : "nesne"} · ${count}</span>
          ${isArr ? `<span class="tree-actions">
            <button title="Öğe ekle" data-tree-add="${esc(childPath)}">＋</button>
          </span>` : ""}
        </div>`);
        if (open) rows.push(renderTree(v, childPath, depth + 1));
      } else {
        const type = v === null ? "null" : typeof v;
        const input = type === "boolean"
          ? `<input type="checkbox" data-tree-path="${esc(childPath)}" data-tree-type="boolean" ${v ? "checked" : ""} />`
          : `<input class="tree-input ${type === "number" ? "num" : ""}" data-tree-path="${esc(childPath)}"
               data-tree-type="${type}" value="${esc(v === null ? "" : v)}" ${type === "number" ? 'type="number" step="any"' : 'type="text"'} />`;
        rows.push(`<div class="tree-row leaf" ${indent}>
          <span class="tree-caret ghost"></span>
          <span class="tree-key">${esc(isArr ? `#${k}` : k)}</span>
          <span class="tree-val">${input}</span>
          ${isArr ? `<span class="tree-actions"><button title="Sil" data-tree-del="${esc(childPath)}">✕</button></span>` : ""}
        </div>`);
      }
    });

    // dizi/nesne için öğe ekleme satırı
    if (isArr) {
      rows.push(`<div class="tree-row add" style="padding-left:${10 + depth * 14 + 22}px">
        <button class="tree-add" data-tree-add="${esc(path)}">＋ öğe ekle</button>
      </div>`);
    }
    return rows.join("");
  }

  function treeMatches(query) {
    const out = [];
    const q = query.toLocaleLowerCase("tr");
    (function walk(node, path) {
      if (node === null || typeof node !== "object") {
        if (path.toLocaleLowerCase("tr").includes(q) || String(node).toLocaleLowerCase("tr").includes(q)) out.push(path);
        return;
      }
      Object.keys(node).forEach((k) => walk(node[k], path ? `${path}.${k}` : k));
    })(S.save, "");
    return out.slice(0, 400);
  }

  /* ============================ komut paleti ============================ */

  function paletteItems(query) {
    const q = (query || "").toLocaleLowerCase("tr").trim();
    const out = [];
    if (!q) {
      out.push({ kind: "Komut", label: "Değişiklikleri kaydet", hint: "Ctrl+S", run: () => saveNow() });
      out.push({ kind: "Komut", label: "Bekleyen değişiklikler", hint: "Ctrl+R", run: () => openReview() });
      TABS.forEach((t) => out.push({ kind: "Bölüm", label: t.label, run: () => { S.route = t.id; paint(); } }));
      return out.slice(0, 12);
    }
    S.save.players.forEach((p) => {
      if (p.name.toLocaleLowerCase("tr").includes(q))
        out.push({ kind: "Oyuncu", label: p.name, hint: `${p.position} · ${p.age} yaş · CA ${p.ca}`, run: () => { S.route = "players"; S.playerId = p.id; paint(); } });
    });
    S.save.staff.forEach((m) => {
      if (m.name.toLocaleLowerCase("tr").includes(q))
        out.push({ kind: "Personel", label: m.name, hint: m.role, run: () => { S.route = "staff"; S.staffId = m.id; paint(); } });
    });
    TABS.forEach((t) => {
      if (t.label.toLocaleLowerCase("tr").includes(q))
        out.push({ kind: "Bölüm", label: t.label, run: () => { S.route = t.id; paint(); } });
    });
    S.save.competitions.forEach((c, i) => {
      if (c.name.toLocaleLowerCase("tr").includes(q))
        out.push({ kind: "Müsabaka", label: c.name, hint: `itibar ${c.reputation}`, run: () => { S.route = "competitions"; paint(); } });
    });
    return out.slice(0, 12);
  }

  function paintPalette() {
    const box = $("#palette");
    if (!box) return;
    const items = S.palette.items;
    if (!S.palette.open || !items.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = items.map((it, i) => `
      <button class="pal-item ${i === S.palette.index ? "active" : ""}" data-pal="${i}">
        <span class="pal-kind">${esc(it.kind)}</span>
        <span class="pal-label">${esc(it.label)}</span>
        <span class="pal-hint">${esc(it.hint || "")}</span>
      </button>`).join("");
  }

  function runPalette(i) {
    const it = S.palette.items[i];
    if (!it) return;
    S.palette.open = false;
    const gs = $("#globalSearch");
    if (gs) gs.value = "";
    it.run();
    paint();
  }

  const views = {
    overview() {
      const s = S.save;
      const squadValue = s.players.reduce((a, p) => a + (p.value || 0), 0);
      const wages = s.players.reduce((a, p) => a + (p.contract?.wage || 0), 0);
      const avgCa = s.players.length ? Math.round(s.players.reduce((a, p) => a + p.ca, 0) / s.players.length) : 0;
      const expiring = s.players.filter((p) => String(p.contract?.expiry) < "2027-07-01").length;
      const issues = S.foreign ? [] : validate();
      const wagePct = s.club.finances.wageBudget ? Math.round((wages / s.club.finances.wageBudget) * 100) : 0;

      return `
        <div class="hero">
          <div class="crest">${esc(s.club.shortName)}</div>
          <div>
            <h1>${esc(s.club.name)}</h1>
            <div class="meta">
              <span><b>${esc(s.club.league)}</b> · ${esc(s.club.country)}</span>
              <span>Sezon <b>${esc(s.game.season)}</b></span>
              <span>Tarih <b>${fmt.date(s.game.date)}</b></span>
              <span>${esc(s.game.transferWindow)}</span>
            </div>
            <div class="chips" style="margin-top:8px">
              <span class="chip purple">${esc(s.club.status)}</span>
              <span class="chip">İtibar ${fmt.num(s.club.reputation)}</span>
              <span class="chip">Stadyum ${fmt.num(s.club.capacity)}</span>
              <span class="chip gold">${s.players.length} oyuncu</span>
            </div>
          </div>
          <div class="spacer"></div>
          <div class="chips" style="flex-direction:column;align-items:flex-end">
            <span class="chip">${esc(s.meta.editor)} v${esc(s.meta.version)}</span>
            <span class="chip">${esc(s.meta.package)}</span>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="stats">
          <div class="stat"><div class="k">Kadro Değeri</div><div class="v">${fmt.money(squadValue)}</div><div class="s">${s.players.length} oyuncu</div></div>
          <div class="stat"><div class="k">Ortalama CA</div><div class="v" style="color:${abilityColor(avgCa)}">${avgCa}</div><div class="s">1–200 ölçeği</div></div>
          <div class="stat"><div class="k">Bakiye</div><div class="v">${fmt.money(s.club.finances.balance)}</div><div class="s">Transfer: ${fmt.money(s.club.finances.transferBudget)}</div></div>
          <div class="stat" style="border-left-color:${wagePct > 100 ? "var(--red)" : wagePct > 85 ? "var(--gold)" : "var(--green)"}">
            <div class="k">Haftalık Maaş</div><div class="v">${fmt.money(wages)}</div><div class="s">Bütçenin %${wagePct}'i</div></div>
          <div class="stat"><div class="k">Sözleşmesi Biten</div><div class="v">${expiring}</div><div class="s">1 yıl içinde</div></div>
        </div>

        <div style="height:12px"></div>

        <div class="cols">
          <div class="card">
            <div class="card-head">Doğrulama <span class="sub">${issues.length} uyarı</span></div>
            <div class="card-body">
              ${issues.length ? issues.slice(0, 8).map((it) => `
                <div class="issue ${it.level}">
                  <span class="ico">${it.level === "err" ? "✕" : it.level === "warn" ? "!" : "i"}</span>
                  <span>${esc(it.text)}</span>
                  ${it.go ? `<button data-issue-go='${esc(JSON.stringify(it.go))}'>Git</button>` : "<span></span>"}
                </div>`).join("") : `<div class="empty-state"><b>Uyarı yok</b>Kayıt tutarlı görünüyor.</div>`}
              ${issues.length > 8 ? `<div class="issue info"><span class="ico">i</span><span>+${issues.length - 8} uyarı daha…</span><span></span></div>` : ""}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Son Düzenlemeler <span class="sub">${S.history.length} kayıt</span></div>
            <div class="card-body">
              ${S.history.length ? S.history.slice(-8).reverse().map((c) => `
                <div class="row"><span class="label">${esc(c.label)}</span>
                <span class="value muted mono">${c.at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")
                : `<div class="empty-state"><b>Henüz düzenleme yok</b>Soldaki sekmelerden bir oyuncu veya kulüp alanı seç.</div>`}
            </div>
          </div>
        </div>`;
    },

    club() {
      const c = S.save.club;
      S.scope = { path: "club", name: c.name };

      return `
        <div class="cols">
          <div class="card">
            <div class="card-head">Kulüp Bilgisi</div>
            <div class="card-body">
              ${txtRow("Ad", c, "name")}
              ${txtRow("Kısa Ad", c, "shortName")}
              ${txtRow("Lig", c, "league")}
              ${txtRow("Ülke", c, "country")}
              ${selRow("Statü", c, "status", ENUMS.clubStatus)}
              ${numRow("İtibar", c, "reputation", { min: 1, max: 10000, unit: "/ 10.000", hint: true })}
              ${txtRow("Stadyum", c, "stadium")}
              ${numRow("Kapasite", c, "capacity", { min: 0, max: 200000, step: 500, unit: "kişi" })}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Tesisler</div>
            <div class="card-body">
              ${numRow("Antrenman Tesisi", c, "trainingFacilities", { min: 1, max: 20, hint: true })}
              ${numRow("Altyapı Tesisi", c, "youthFacilities", { min: 1, max: 20 })}
              ${numRow("Genç Oyuncu Keşfi", c, "youthRecruitment", { min: 1, max: 20 })}
              ${numRow("Genç Antrenörlük", c, "juniorCoaching", { min: 1, max: 20 })}
              ${txtRow("Antrenman Sahası", c, "trainingGround")}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Finans Özeti</div>
            <div class="card-body">
              ${moneyRow("Bakiye", c.finances, "balance")}
              ${moneyRow("Transfer Bütçesi", c.finances, "transferBudget")}
              ${moneyRow("Maaş Bütçesi", c.finances, "wageBudget")}
              ${moneyRow("Sponsorluk", c.finances, "sponsorship")}
              ${moneyRow("Borç", c.finances, "debt")}
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="cols">
          <div class="card">
            <div class="card-head">Bağlantılı Kulüpler <span class="sub">${(c.affiliations || []).length}</span></div>
            <table class="mini-table">
              ${(c.affiliations || []).map((a, i) => `<tr>
                <td><b>${esc(a.club)}</b></td>
                <td class="muted">${esc(a.type)}</td>
                <td class="muted mono">${fmt.date(a.since)}</td>
                <td class="act"><button class="icon-btn" data-del-aff="${i}" title="Kaldır">✕</button></td>
              </tr>`).join("") || `<tr><td class="muted" colspan="4">Bağlantı yok</td></tr>`}
            </table>
            <div class="add-row">
              <input id="affClub" placeholder="Kulüp adı" />
              <select id="affType">${AFFILIATION_TYPES.map((t) => `<option>${t}</option>`).join("")}</select>
              <button class="btn" style="height:24px;background:#241a3a" data-add-aff>Ekle</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Ezeli Rakipler</div>
            <table class="mini-table">
              ${(c.rivals || []).map((r, i) => `<tr>
                <td><b>${esc(r.club)}</b><div class="muted" style="font-size:11px">${esc(r.note || "")}</div></td>
                <td style="width:120px">${stepperInline(r, "intensity", 1, 5, 1, "Şiddet")}</td>
                <td class="act"><button class="icon-btn" data-del-rival="${i}" title="Kaldır">✕</button></td>
              </tr>`).join("") || `<tr><td class="muted">Rakip tanımlı değil</td></tr>`}
            </table>
            <div class="add-row">
              <input id="rivalClub" placeholder="Rakip kulüp" />
              <input id="rivalNote" placeholder="Not" />
              <button class="btn" style="height:24px;background:#241a3a" data-add-rival>Ekle</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kulüp Efsaneleri</div>
            <table class="mini-table">
              ${(c.legends || []).map((l, i) => `<tr>
                <td><b>${esc(l.name)}</b></td>
                <td class="muted mono">${esc(l.years)}</td>
                <td class="muted right mono">${fmt.num(l.appearances)} maç</td>
                <td class="act"><button class="icon-btn" data-del-legend="${i}" title="Kaldır">✕</button></td>
              </tr>`).join("") || `<tr><td class="muted">Kayıt yok</td></tr>`}
            </table>
            <div class="add-row">
              <input id="legendName" placeholder="İsim" />
              <input id="legendYears" placeholder="1998-2006" />
              <button class="btn" style="height:24px;background:#241a3a" data-add-legend>Ekle</button>
            </div>
          </div>
        </div>`;
    },

    players() {
      const list = filteredPlayers();
      if (!list.some((p) => p.id === S.playerId)) S.playerId = list[0]?.id ?? S.save.players[0]?.id ?? null;
      const p = S.save.players.find((x) => x.id === S.playerId);

      return `<div class="split">
        <div class="list-panel">
          <div class="list-toolbar">
            <input id="pq" type="search" placeholder="Oyuncu ara…" value="${esc(S.q)}" />
            <div class="filters">
              ${[["ALL", "Tümü"], ["GK", "KL"], ["DEF", "DEF"], ["MID", "ORT"], ["ATT", "FOR"]].map(([k, l]) => `
                <button data-pos-filter="${k}" class="${S.posFilter === k ? "active" : ""}">${l}</button>`).join("")}
              <button class="filters-toggle ${S.showFilters ? "on" : ""}" data-toggle-filters title="Gelişmiş filtreler">⚙</button>
            </div>
            ${S.showFilters ? filtersPanel() : ""}
            <select id="psort">
              ${[["ca", "CA'ya göre"], ["name", "İsme göre"], ["value", "Değere göre"], ["age", "Yaşa göre"], ["pa", "PA'ya göre"]].map(([k, l]) => `
                <option value="${k}" ${S.sort === k ? "selected" : ""}>${l}</option>`).join("")}
            </select>
          </div>
          <div class="list" id="playerList">
            ${list.map((x) => `
              <div class="list-row ${x.id === S.playerId ? "active" : ""}" data-player="${x.id}" tabindex="0">
                <span class="badge-pos ${esc(x.position)}">${esc(x.position)}</span>
                <div>
                  <div class="nm">${esc(x.name)}</div>
                  <div class="sub">${x.age} yaş · ${esc(x.nationality)} · ${esc(x.squadStatus || "")}</div>
                </div>
                <div class="ca-mini" style="color:${abilityColor(x.ca)}">${x.ca}<small> / ${x.pa}</small></div>
              </div>`).join("")}
            ${list.length ? "" : `<div class="empty-state"><b>Sonuç yok</b>Filtreleri gevşetmeyi dene.</div>`}
          </div>
        </div>

        ${p ? playerDetail(p) : `<div class="card"><div class="empty-state"><b>Oyuncu seçilmedi</b>Soldan bir oyuncu seç.</div></div>`}
      </div>`;
    },

    staff() {
      const s = S.save;
      if (!s.staff.some((x) => x.id === S.staffId)) S.staffId = s.staff[0]?.id ?? null;
      const m = s.staff.find((x) => x.id === S.staffId);
      if (m) S.scope = { path: `staff.${s.staff.indexOf(m)}`, name: m.name };

      return `<div class="split">
        <div class="list-panel">
          <div class="list-toolbar"><input id="sq" type="search" placeholder="Personel ara…" value="${esc(S.staffQ)}" /></div>
          <div class="list">
            ${s.staff.filter((x) => !S.staffQ || x.name.toLocaleLowerCase("tr").includes(S.staffQ.toLocaleLowerCase("tr"))).map((x) => `
              <div class="list-row ${x.id === S.staffId ? "active" : ""}" data-staff="${x.id}" tabindex="0">
                <span class="badge-pos" style="background:#2a2140;color:#cfc7ee">${esc(x.role.slice(0, 3).toUpperCase())}</span>
                <div><div class="nm">${esc(x.name)}</div><div class="sub">${esc(x.role)} · ${x.age} yaş</div></div>
                <div class="ca-mini" style="color:${abilityColor(x.ca)}">${x.ca}</div>
              </div>`).join("")}
          </div>
        </div>

        ${m ? `
        <div>
          <div class="player-head">
            <div>
              <h2>${esc(m.name)}</h2>
              <div class="sub">${esc(m.role)} · ${m.age} yaş · ${esc(m.club)}</div>
            </div>
            <div class="ability">
              <div class="item"><div class="k">CA</div><div class="v" style="color:${abilityColor(m.ca)}">${m.ca}</div></div>
              <div class="item"><div class="k">PA</div><div class="v pa">${m.pa}</div></div>
              <div class="item"><div class="k">İtibar</div><div class="v" style="font-size:16px">${fmt.num(m.reputation)}</div></div>
            </div>
          </div>

          <div class="cols" style="margin-top:12px">
            <div class="card">
              <div class="card-head">Profil</div>
              <div class="card-body">
                ${selRow("Görev", m, "role", ENUMS.staffRole)}
                ${numRow("Yaş", m, "age", { min: 18, max: 90 })}
                ${numRow("Mevcut Kabiliyet (CA)", m, "ca", { min: 1, max: 200 })}
                ${numRow("Potansiyel Kabiliyet (PA)", m, "pa", { min: 1, max: 200 })}
                ${numRow("İtibar", m, "reputation", { min: 1, max: 10000 })}
                ${moneyRow("Maaş", m, "wage")}
                ${txtRow("Sözleşme Bitişi", m, "contract", "date")}
              </div>
            </div>

            <div class="card">
              <div class="card-head">Nitelikler</div>
              <div class="card-body">
                ${STAFF_ATTRS.map((k) => attrRow(k, m.attributes, k)).join("")}
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:12px">
            <div class="card-head">Tercihler & Sorumluluklar</div>
            <div class="card-body" style="padding:10px 12px">
              <div class="cols tight">
                <div>
                  ${selRow("Tercih Ettiği Diziliş", m, "preferredFormation", FORMATIONS)}
                  ${selRow("Oyun Tarzı", m, "style", COACHING_STYLES)}
                  ${selRow("Tercih Ettiği Görev", m, "preferredJob", ENUMS.staffRole)}
                </div>
                <div>
                  <div class="muted" style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Sorumluluklar</div>
                  <div class="chips">
                    ${RESPONSIBILITIES.map((r) => {
                      const on = (m.responsibilities || []).includes(r);
                      return `<button class="trait-chip ${on ? "on" : ""}" data-staff-resp="${esc(r)}">${esc(r)}</button>`;
                    }).join("")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>` : `<div class="card"><div class="empty-state"><b>Personel seçilmedi</b></div></div>`}
      </div>`;
    },

    finances() {
      const f = S.save.club.finances;
      S.scope = { path: "club", name: S.save.club.name };
      const wages = S.save.players.reduce((a, p) => a + (p.contract?.wage || 0), 0);
      const pct = f.wageBudget ? Math.round((wages / f.wageBudget) * 100) : 0;
      return `
        <div class="cols">
          <div class="card">
            <div class="card-head">Bütçeler</div>
            <div class="card-body">
              ${moneyRow("Bakiye", f, "balance")}
              ${moneyRow("Transfer Bütçesi", f, "transferBudget")}
              ${moneyRow("Maaş Bütçesi (haftalık)", f, "wageBudget")}
              ${moneyRow("Sponsorluk (yıllık)", f, "sponsorship")}
              ${moneyRow("Borç", f, "debt")}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Maaş Yükü <span class="sub">kadro / bütçe</span></div>
            <div class="card-body pad">
              <div class="stat" style="border-left-color:${pct > 100 ? "var(--red)" : pct > 85 ? "var(--gold)" : "var(--green)"}">
                <div class="k">Haftalık Toplam</div>
                <div class="v">${fmt.money(wages)}</div>
                <div class="s">Bütçe ${fmt.money(f.wageBudget)} · %${pct} kullanım</div>
              </div>
              <div class="gauge ${pct > 100 ? "bad" : pct > 85 ? "warn" : ""}"><i style="width:${Math.min(100, pct)}%"></i></div>
              <div class="chips" style="margin-top:12px">
                <button class="btn" style="background:#241a3a" data-fix="wage">Bütçeyi kadroya eşitle</button>
                <button class="btn" style="background:#241a3a" data-fix="maxtransfer">Transfer bütçesi ×2</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Sezon Projeksiyonu</div>
            <div class="card-body">
              ${moneyRow("Beklenen Gelir", f, "projectedIncome")}
              ${moneyRow("Beklenen Gider", f, "projectedExpenditure")}
              ${numRow("Sezonluk Bilet", f, "seasonTicketPrice", { min: 0, max: 100000, unit: "€" })}
              <div class="row"><span class="label">Net</span>
                <span class="value mono" style="color:${f.projectedIncome - f.projectedExpenditure >= 0 ? "var(--green)" : "var(--red)"}">
                  ${fmt.money(f.projectedIncome - f.projectedExpenditure)}</span></div>
            </div>
          </div>
        </div>`;
    },

    competitions() {
      const comps = S.save.competitions;
      return `
        <div class="card">
          <div class="card-head">Müsabakalar</div>
          <table class="grid">
            <thead><tr>
              <th>Müsabaka</th><th class="num">Seviye</th><th class="num">İtibar</th>
              <th class="num">Takım</th><th class="num">Ödül Havuzu</th><th class="num">Tur Ödülü</th>
              <th>Katılım</th><th>Format</th>
            </tr></thead>
            <tbody>
              ${comps.map((c, i) => {
                S.scope = { path: `competitions.${i}`, name: c.name };
                return `<tr data-comp="${i}">
                  <td><b>${esc(c.name)}</b></td>
                  <td class="num">${stepperInline(c, "level", 1, 5, 1, "Seviye")}</td>
                  <td class="num">${stepperInline(c, "reputation", 1, 10000, 100, "İtibar")}</td>
                  <td class="num">${stepperInline(c, "teams", 2, 200, 1, "Takım")}</td>
                  <td class="num">${stepperInline(c, "prizeMoney", 0, 999999999, 1000000, "Ödül havuzu")}</td>
                  <td class="num">${stepperInline(c, "tierPrize", 0, 99999999, 100000, "Tur ödülü")}</td>
                  <td class="muted">${esc(c.qualification || "—")}</td>
                  <td class="muted">${esc(c.matchRules)}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-head">Lig Tablosu <span class="sub">sezon verisi</span></div>
          <table class="grid">
            <thead><tr><th>#</th><th>Takım</th><th class="num">O</th><th class="num">P</th><th class="num">AV</th></tr></thead>
            <tbody>
              ${S.save.leagueTable.map((r, i) => `<tr>
                <td class="num">${i + 1}</td>
                <td style="${r.team === S.save.club.name ? "color:#c4b5fd;font-weight:700" : ""}">${esc(r.team)}</td>
                <td class="num">${r.played}</td>
                <td class="num" style="font-weight:700">${r.points}</td>
                <td class="num">${r.gd > 0 ? "+" : ""}${r.gd}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    },

    sandbox() {
      const BULK = [
        { id: "maxattrs", icon: "▲", title: "Tüm nitelikleri 20 yap", desc: "Kadrodaki her oyuncunun 47 niteliği maksimuma çekilir." },
        { id: "paca", icon: "=", title: "PA = CA", desc: "Potansiyel kabiliyeti mevcut kabiliyete eşitler (gelişim durur, doğrulama uyarısı kalkar)." },
        { id: "heal", icon: "+", title: "Sakatlıkları ve cezaları temizle", desc: "Sakatlık, sarı/kırmızı kart ve maç cezaları sıfırlanır." },
        { id: "contracts", icon: "✎", title: "Sözleşmelere +3 yıl", desc: "Tüm oyuncuların sözleşme bitişi 3 yıl uzatılır." },
        { id: "wages", icon: "€", title: "Maaş bütçesini kadroya eşitle", desc: "Haftalık maaş bütçesi, kadronun toplam ücretine eşitlenir." },
        { id: "budget", icon: "◎", title: "Transfer bütçesi ×2", desc: "Mevcut transfer bütçesi iki katına çıkarılır." },
        { id: "morale", icon: "☺", title: "Moral + kondisyon maksimum", desc: "Tüm oyuncuların morali 'Çok İyi', kondisyonu %100 olur." },
        { id: "regen", icon: "🌱", title: "3 genç yetenek ekle", desc: "Altyapıdan 17–19 yaşında üç oyuncu kadroya eklenir." },
      ];
      return `
        <div class="hint-box warn">
          <span>⚙</span>
          <div><b>Sandbox toplu işlemleri.</b> Her işlem tek bir geri alınabilir kayıt olarak sahnelenir;
          inceleme çekmecesinden geri alabilirsin. Kaydetmeden oyun verisi değişmez.</div>
        </div>
        <div style="height:12px"></div>
        <div class="bulk-list">
          ${BULK.map((b) => `<div class="bulk-item">
            <div class="bi-icon">${b.icon}</div>
            <div><div class="bi-title">${esc(b.title)}</div><div class="bi-desc">${esc(b.desc)}</div></div>
            <button data-bulk="${b.id}">Uygula</button>
          </div>`).join("")}
        </div>`;
    },

    free() {
      const matches = S.treeQ ? treeMatches(S.treeQ) : null;
      return `
        <div class="hint-box">
          <span>⌘</span>
          <div>
            <b>Serbest JSON düzenleme.</b> Gerçek oyun kaydını içe aldığında alan adları tanınmasa bile
            buradan her değeri düzenleyebilirsin. Yaptığın değişiklikler aynı inceleme çekmecesinde görünür.
          </div>
        </div>

        <div class="card" style="margin-top:12px">
          <div class="card-head">
            <span>Kayıt Ağacı</span>
            <span class="sub">${fmt.num(Object.keys(S.save).length)} kök alan</span>
          </div>
          <div class="toolbar" style="display:flex;gap:8px;padding:10px;border-bottom:1px solid var(--line)">
            <input id="treeQ" class="tree-search" placeholder="Alan veya değer ara… (örn. wage, 0.5)" value="${esc(S.treeQ)}" />
            <button class="btn" style="background:#241a3a;height:26px" data-tree-expand="all">Tümünü aç</button>
            <button class="btn" style="background:#241a3a;height:26px" data-tree-expand="none">Kapat</button>
          </div>
          <div class="tree">
            ${matches
              ? (matches.length
                  ? matches.map((path) => {
                      const parts = path.split(".");
                      const key = parts.pop();
                      const value = getPath(S.save, path);
                      const type = typeof value;
                      return `<div class="tree-row leaf">
                        <span class="tree-caret ghost"></span>
                        <span class="tree-key" title="${esc(path)}">${esc(parts.join(".") || "kök")}<b>.${esc(key)}</b></span>
                        <span class="tree-val">
                          ${type === "boolean"
                            ? `<input type="checkbox" data-tree-path="${esc(path)}" data-tree-type="boolean" ${value ? "checked" : ""} />`
                            : `<input class="tree-input ${type === "number" ? "num" : ""}" data-tree-path="${esc(path)}" data-tree-type="${type}" value="${esc(value === null ? "" : value)}" ${type === "number" ? 'type="number" step="any"' : 'type="text"'} />`}
                        </span>
                      </div>`;
                    }).join("")
                  : `<div class="empty-state"><b>Eşleşme yok</b>Farklı bir anahtar dene.</div>`)
              : renderTree(S.save, "", 0)}
          </div>
        </div>`;
    },

    preferences() {
      return `
        <div class="cols">
          <div class="card">
            <div class="card-head">Editör Tercihleri</div>
            <div class="card-body">
              ${switchRow("Kaydetmeden çıkarken uyar", "confirmLeave", (v) => (S.prefs.confirmLeave = v))}
              ${switchRow("Nitelikleri renklendir (1–20)", "attrColors", (v) => (S.prefs.attrColors = v))}
              ${switchRow("Her düzenlemede otomatik kaydet", "autoSave", (v) => (S.prefs.autoSave = v))}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kayıt İşlemleri</div>
            <div class="card-body pad">
              <div class="chips">
                <button class="btn" style="background:#241a3a" id="exportBtn">JSON Dışa Aktar</button>
                <label class="btn" style="background:#241a3a;cursor:pointer">JSON İçe Al
                  <input type="file" id="importFile" accept=".json" hidden />
                </label>
                <button class="btn" style="background:#241a3a" id="resetBtn">Demo Kayda Dön</button>
              </div>
              <p class="muted" style="font-size:11.5px;line-height:1.55;margin-top:12px">
                Dışa aktarılan JSON, <span class="mono">tools/wsc-save.sh push</span> ile cihaza geri yazılabilir
                (root veya emülatör gerekir). Ayrıntı: <span class="mono">docs/ROOTSUZ-KURULUM.md</span>
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kısayollar</div>
            <div class="card-body">
              <div class="row"><span class="label">Geri al</span><span class="value mono">Ctrl + Z</span></div>
              <div class="row"><span class="label">Kaydet</span><span class="value mono">Ctrl + S</span></div>
              <div class="row"><span class="label">Bekleyen değişiklikler</span><span class="value mono">Ctrl + R</span></div>
              <div class="row"><span class="label">Listede gezinme</span><span class="value mono">↑ / ↓</span></div>
              <div class="row"><span class="label">Arama</span><span class="value mono">Ctrl + F</span></div>
            </div>
          </div>
        </div>`;
    },
  };

  /* ============================ oyuncu detayı ============================ */

  function playerDetail(p) {
    const idx = playerIndex(p);
    S.scope = { path: `players.${idx}`, name: p.name };
    const tab = S.playerTab;

    const tabHtml = {
      profile: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Kişisel Bilgiler</div>
            <div class="card-body">
              ${txtRow("Ad Soyad", p, "name")}
              ${numRow("Yaş", p, "age", { min: 15, max: 60 })}
              ${txtRow("Doğum Tarihi", p, "dob", "date")}
              ${txtRow("Uyruk", p, "nationality")}
              ${txtRow("İkinci Uyruk", p, "secondNationality")}
              ${selRow("Ana Pozisyon", p, "position", POSITIONS)}
              ${selRow("Kullandığı Ayak", p, "foot", ENUMS.foot)}
              ${numRow("Boy", p, "height", { min: 140, max: 220, unit: "cm" })}
              ${numRow("Kilo", p, "weight", { min: 40, max: 130, unit: "kg" })}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kabiliyet & İtibar</div>
            <div class="card-body">
              ${numRow("Mevcut Kabiliyet (CA)", p, "ca", { min: 1, max: 200, hint: true })}
              ${numRow("Potansiyel Kabiliyet (PA)", p, "pa", { min: 1, max: 200, hint: true })}
              ${numRow("İtibar — Mevcut", p.reputation, "current", { min: 1, max: 10000 })}
              ${numRow("İtibar — Ülke", p.reputation, "home", { min: 1, max: 10000 })}
              ${numRow("İtibar — Dünya", p.reputation, "world", { min: 1, max: 10000 })}
              ${moneyRow("Piyasa Değeri", p, "value")}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Pozisyon Uygunluğu <span class="sub">0–20</span></div>
            <div class="pos-grid">
              ${POSITIONS.map((pos) => {
                const v = p.positions[pos] ?? 0;
                const id = ctl(p.positions, pos, `${pos} uygunluğu`, { path: `positions.${pos}`, min: 0, max: 20 });
                return `<div class="pos-cell">
                  <div class="p">${pos}</div>
                  <input type="number" min="0" max="20" data-ctl="${id}" value="${v}"
                    style="color:${S.prefs.attrColors ? attrColor(v) : "inherit"}" title="${esc(POSITION_LABEL[pos])}" />
                </div>`;
              }).join("")}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kayıt Durumu</div>
            <div class="card-body">
              ${selRow("Kadro Statüsü", p, "squadStatus", ENUMS.squadStatus)}
              ${selRow("Yetişme Durumu", p.registration, "trained", window.FM.SQUAD_TRAINED)}
              ${numRow("Forma Numarası", p.registration, "squadNumber", { min: 0, max: 99 })}
              <div class="row"><span class="label">Kulüpte Yetişti</span>
                <span class="value"><label class="switch"><input type="checkbox" data-ctl="${ctl(p.registration, "homeGrown", "Kulüpte yetişti")}" ${p.registration.homeGrown ? "checked" : ""} /><span></span></label></span>
              </div>
            </div>
          </div>
        </div>`,

      attributes: `
        <div class="attrs">
          ${GROUPS.map((g) => `
            <div class="attr-group">
              <div class="card-head" style="height:30px">
                <span>${esc(g.title)}</span>
                <span class="head-actions">
                  <button data-attr-bulk="${g.id}" data-mode="max">maks</button>
                  <button data-attr-bulk="${g.id}" data-mode="avg">ortala</button>
                </span>
              </div>
              <div style="padding:6px 0 8px">
                ${g.keys.map((k) => attrRow(k, p.attributes, k)).join("")}
              </div>
            </div>`).join("")}
        </div>`,

      contract: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Sözleşme</div>
            <div class="card-body">
              ${txtRow("Kulüp", p, "club")}
              ${selRow("Sözleşme Türü", p.contract, "type", ENUMS.contractType)}
              ${txtRow("Bitiş Tarihi", p.contract, "expiry", "date")}
              ${moneyRow("Haftalık Ücret", p.contract, "wage")}
              ${moneyRow("İmza Bonusu", p.contract, "signingBonus")}
              ${moneyRow("Serbest Kalma Maddesi", p.contract, "releaseClause")}
            </div>
          </div>
          <div class="card">
            <div class="card-head">Transfer Durumu</div>
            <div class="card-body">
              ${selRow("Durum", p.contract, "status", ENUMS.transferStatus)}
              ${moneyRow("Piyasa Değeri", p, "value")}
              <div class="row"><span class="label">Kalan Süre</span>
                <span class="value mono">${monthsLeft(p.contract.expiry)} ay</span></div>
              <div class="row"><span class="label">Hızlı İşlem</span>
                <span class="value"><button class="btn" style="background:#241a3a;height:24px" data-quick="extend">+3 yıl uzat</button></span></div>
            </div>
          </div>
        </div>`,

      personal: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Durum</div>
            <div class="card-body">
              ${selRow("Moral", p, "morale", ENUMS.morale)}
              ${numRow("Kondisyon", p, "condition", { min: 0, max: 100, unit: "%" })}
              ${numRow("Yorgunluk", p, "jadedness", { min: 0, max: 100, unit: "%" })}
              ${numRow("Keskinlik", p, "sharpness", { min: 0, max: 100, unit: "%" })}
            </div>
          </div>
          <div class="card">
            <div class="card-head">Kişilik</div>
            <div class="card-body">
              ${selRow("Kişilik", p, "personality", ENUMS.personality)}
              ${selRow("Medya ile İlişki", p, "mediaHandling", ENUMS.media)}
            </div>
          </div>
        </div>`,

      traits: `
        <div class="card">
          <div class="card-head">Oyuncu Özellikleri <span class="sub">${(p.traits || []).length} seçili</span></div>
          <div class="trait-grid">
            ${TRAITS.map((t) => `<button class="trait-chip ${(p.traits || []).includes(t) ? "on" : ""}" data-trait="${esc(t)}">${esc(t)}</button>`).join("")}
          </div>
        </div>`,

      discipline: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Disiplin</div>
            <div class="card-body">
              ${numRow("Sarı Kart", p.discipline, "yellow", { min: 0, max: 50 })}
              ${numRow("Kırmızı Kart", p.discipline, "red", { min: 0, max: 20 })}
              ${numRow("Maç Cezası", p.discipline, "banMatches", { min: 0, max: 40, unit: "maç" })}
              ${numRow("Para Cezası", p.discipline, "fines", { min: 0, max: 50, unit: "kez" })}
            </div>
          </div>
          <div class="card">
            <div class="card-head">Sakatlık</div>
            <div class="card-body">
              ${selRow("Sakatlık Türü", p.injury, "type", INJURIES)}
              ${numRow("Kalan Süre", p.injury, "weeksLeft", { min: 0, max: 104, unit: "hafta" })}
              ${txtRow("Dönüş Tarihi", p.injury, "returnDate", "date")}
              <div class="row"><span class="label">Hızlı İşlem</span>
                <span class="value"><button class="btn" style="background:#241a3a;height:24px" data-quick="heal">Sakatlığı bitir</button></span></div>
            </div>
          </div>
        </div>`,

      relations: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Sevdiği Kulüpler</div>
            <table class="mini-table">
              ${(p.relations?.favouriteClubs || []).map((c, i) => `<tr><td>${esc(c)}</td>
                <td class="act"><button class="icon-btn" data-del-favclub="${i}">✕</button></td></tr>`).join("")
                || `<tr><td class="muted">Kayıt yok</td></tr>`}
            </table>
            <div class="add-row">
              <input id="favClub" placeholder="Kulüp adı" />
              <button class="btn" style="height:24px;background:#241a3a" data-add-favclub>Ekle</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Sevmediği Kulüpler</div>
            <table class="mini-table">
              ${(p.relations?.dislikedClubs || []).map((c, i) => `<tr><td>${esc(c)}</td>
                <td class="act"><button class="icon-btn" data-del-disclub="${i}">✕</button></td></tr>`).join("")
                || `<tr><td class="muted">Kayıt yok</td></tr>`}
            </table>
            <div class="add-row">
              <input id="disClub" placeholder="Kulüp adı" />
              <button class="btn" style="height:24px;background:#241a3a" data-add-disclub>Ekle</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Sevdiği Kişiler</div>
            <table class="mini-table">
              ${(p.relations?.favouritePeople || []).map((c, i) => `<tr><td>${esc(c)}</td>
                <td class="act"><button class="icon-btn" data-del-favperson="${i}">✕</button></td></tr>`).join("")
                || `<tr><td class="muted">Kayıt yok</td></tr>`}
            </table>
            <div class="add-row">
              <input id="favPerson" placeholder="İsim" />
              <button class="btn" style="height:24px;background:#241a3a" data-add-favperson>Ekle</button>
            </div>
          </div>
        </div>`,
    }[tab];

    return `<div>
      <div class="player-head">
        <div>
          <h2>${esc(p.name)}</h2>
          <div class="sub">
            ${p.age} yaş · ${esc(p.nationality)} · ${esc(POSITION_LABEL[p.position] || p.position)}
            · ${esc(p.club)} · ${esc(p.contract.type)}
          </div>
          <div class="chips" style="margin-top:8px">
            <span class="chip">Değer ${fmt.money(p.value)}</span>
            <span class="chip">Ücret ${fmt.money(p.contract.wage)}/h</span>
            <span class="chip ${p.contract.status === "Listede" ? "gold" : ""}">${esc(p.contract.status)}</span>
            <span class="chip">Sözleşme ${fmt.date(p.contract.expiry)}</span>
            <span class="chip purple">${esc(p.squadStatus || "—")}</span>
            ${p.injury?.type && p.injury.type !== "Sakatlık Yok" ? `<span class="pill-soft red">${esc(p.injury.type)} · ${p.injury.weeksLeft} hf</span>` : ""}
          </div>
        </div>
        <div class="ability">
          <div class="item"><div class="k">CA</div><div class="v" style="color:${abilityColor(p.ca)}">${p.ca}</div></div>
          <div class="item"><div class="k">PA</div><div class="v pa">${p.pa}</div></div>
          <div class="item"><div class="k">Yıldız</div>
            <div class="v" style="font-size:15px;color:var(--gold);letter-spacing:1px">${"★".repeat(starRating(p.ca))}${"☆".repeat(5 - starRating(p.ca))}</div>
          </div>
        </div>
      </div>

      <div class="subtabs">
        ${PLAYER_TABS.map(([k, l]) => `<button class="subtab ${tab === k ? "active" : ""}" data-ptab="${k}">${l}</button>`).join("")}
      </div>

      ${tabHtml}
    </div>`;
  }

  function filtersPanel() {
    const f = S.filters;
    const input = (key, label, type = "number") => `
      <label class="f"><span>${label}</span>
        <input data-filter="${key}" type="${type}" value="${esc(f[key])}" /></label>`;
    return `<div class="filters-panel">
      ${input("ageMin", "Yaş ≥")}
      ${input("ageMax", "Yaş ≤")}
      ${input("caMin", "CA ≥")}
      ${input("caMax", "CA ≤")}
      ${input("paMin", "PA ≥")}
      ${input("paMax", "PA ≤")}
      <label class="f"><span>Ayak</span>
        <select data-filter="foot"><option value="">Tümü</option>
          ${ENUMS.foot.map((o) => `<option ${f.foot === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
      <label class="f"><span>Yetişme</span>
        <select data-filter="trained"><option value="">Tümü</option>
          ${window.FM.SQUAD_TRAINED.map((o) => `<option ${f.trained === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
      <label class="f full"><span>Sözleşme bitiş yılı ≤</span>
        <input data-filter="year" type="number" value="${esc(f.year)}" placeholder="örn. 2028" /></label>
    </div>`;
  }

  function filteredPlayers() {
    const q = S.q.trim().toLocaleLowerCase("tr");
    const f = S.filters;
    const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    return S.save.players
      .filter((p) => {
        if (q && !p.name.toLocaleLowerCase("tr").includes(q)) return false;
        if (S.posFilter !== "ALL") {
          const pos = p.position;
          if (S.posFilter === "GK" && pos !== "GK") return false;
          if (S.posFilter === "DEF" && !["DC", "DL", "DR"].includes(pos)) return false;
          if (S.posFilter === "MID" && !["DM", "MC", "ML", "MR", "AMC", "AML", "AMR"].includes(pos)) return false;
          if (S.posFilter === "ATT" && pos !== "ST") return false;
        }
        if (num(f.ageMin) !== null && p.age < num(f.ageMin)) return false;
        if (num(f.ageMax) !== null && p.age > num(f.ageMax)) return false;
        if (num(f.caMin) !== null && p.ca < num(f.caMin)) return false;
        if (num(f.caMax) !== null && p.ca > num(f.caMax)) return false;
        if (num(f.paMin) !== null && p.pa < num(f.paMin)) return false;
        if (num(f.paMax) !== null && p.pa > num(f.paMax)) return false;
        if (f.foot && p.foot !== f.foot) return false;
        if (f.trained && p.registration?.trained !== f.trained) return false;
        if (num(f.year) !== null && Number(String(p.contract?.expiry || "").slice(0, 4)) > num(f.year)) return false;
        return true;
      })
      .sort((a, b) => {
        if (S.sort === "name") return a.name.localeCompare(b.name, "tr");
        if (S.sort === "value") return b.value - a.value;
        if (S.sort === "age") return a.age - b.age;
        if (S.sort === "pa") return b.pa - a.pa;
        return b.ca - a.ca;
      });
  }

  function starRating(ca) {
    const maxCa = Math.max(...S.save.players.map((p) => p.ca), 1);
    const ratio = Math.min(1, ca / maxCa);
    return Math.max(1, Math.min(5, Math.round(ratio * 4 + 1)));
  }

  function monthsLeft(expiry) {
    if (!expiry) return 0;
    const d = new Date(expiry);
    const now = new Date(S.save?.game?.date || Date.now());
    const m = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    return Math.max(0, m);
  }

  /* ============================ toplu işlemler ============================ */

  function bulk(label, fn) {
    const before = clone(S.save);
    fn(S.save);
    const diff = deepDiff(before, S.save, "", []);
    if (!diff.length) { toast("Değişiklik yok"); return; }
    S.patches.push({
      path: "(toplu)", label, structural: true, snapshot: before,
      count: diff.length, at: Date.now(),
    });
    S.history.push({ label, at: new Date() });
    if (S.prefs.autoSave) saveNow(true);
    paint();
    toast(`${label} uygulandı (${diff.length} alan)`);
  }

  function editPath(path, label, newValue) {
    const oldValue = clone(getPath(S.save, path));
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
    setPath(S.save, path, newValue);
    recordPatch({ path, label, oldValue, newValue: clone(newValue), scope: S.scope.name });
    paint();
  }

  function bulkOps(id) {
    switch (id) {
      case "maxattrs":
        bulk("Nitelikleri maksimuma çek", (s) => {
          s.players.forEach((p) => Object.keys(p.attributes).forEach((k) => { p.attributes[k] = 20; }));
        });
        break;
      case "paca":
        bulk("PA = CA", (s) => { s.players.forEach((p) => { p.pa = p.ca; }); });
        break;
      case "heal":
        bulk("Sakatlık ve cezaları temizle", (s) => {
          s.players.forEach((p) => {
            p.injury = { type: "Sakatlık Yok", weeksLeft: 0, returnDate: "" };
            p.discipline = { yellow: 0, red: 0, banMatches: 0, fines: 0 };
            p.condition = 100; p.jadedness = 0;
          });
        });
        break;
      case "contracts":
        bulk("Sözleşmelere +3 yıl", (s) => {
          s.players.forEach((p) => {
            const y = Number(String(p.contract.expiry).slice(0, 4)) + 3;
            p.contract.expiry = `${y}${String(p.contract.expiry).slice(4)}`;
          });
        });
        break;
      case "wages":
        bulk("Maaş bütçesini eşitle", (s) => {
          s.club.finances.wageBudget = s.players.reduce((a, p) => a + (p.contract.wage || 0), 0);
        });
        break;
      case "budget":
        bulk("Transfer bütçesi ×2", (s) => { s.club.finances.transferBudget = Math.round(s.club.finances.transferBudget * 2); });
        break;
      case "morale":
        bulk("Moral ve kondisyon", (s) => {
          s.players.forEach((p) => { p.morale = "Çok İyi"; p.condition = 100; p.sharpness = 100; p.jadedness = 0; });
        });
        break;
      case "regen":
        bulk("Genç yetenek ekle", (s) => {
          const base = Math.max(...s.players.map((p) => p.id)) + 1;
          const names = ["Yağız Kaan", "Boran Deniz", "Miraç Sarp"];
          const positions = ["AMC", "ST", "MC"];
          for (let i = 0; i < 3; i++) {
            const id = base + i;
            const attrs = {};
            Object.keys(s.players[0].attributes).forEach((k) => { attrs[k] = 6 + Math.floor(Math.random() * 9); });
            s.players.push({
              id, name: `${names[i]} ${["Ersoy", "Çelik", "Kaya"][i]}`, age: 17 + i,
              dob: `${2026 - 17 - i}-04-1${i}`, nationality: "Türkiye", secondNationality: "",
              position: positions[i], positions: { GK: 1, DC: 5, DL: 5, DR: 5, DM: 9, MC: 13, ML: 8, MR: 8, AMC: 14, AML: 10, AMR: 10, ST: 12 },
              foot: "Sağ", height: 176 + i, weight: 70 + i,
              ca: 92 + i * 5, pa: 165 + i * 4,
              reputation: { current: 1200, home: 900, world: 200 },
              morale: "İyi", condition: 95, jadedness: 0, sharpness: 70,
              personality: "Hırslı", mediaHandling: "Sakin",
              club: s.club.name,
              contract: { type: "Genç Sözleşmesi", expiry: "2029-06-30", wage: 6500, signingBonus: 0, releaseClause: 0, status: "Satılık Değil" },
              value: 850000 + i * 250000, attributes: attrs,
              squadStatus: "Yedek", traits: [], discipline: { yellow: 0, red: 0, banMatches: 0, fines: 0 },
              injury: { type: "Sakatlık Yok", weeksLeft: 0, returnDate: "" },
              registration: { homeGrown: true, trained: "Kulüpte Yetişti", squadNumber: 40 + i },
              relations: { favouriteClubs: [], favouritePeople: [], dislikedClubs: [] },
            });
          }
        });
        break;
      default:
        break;
    }
  }

  function attrBulk(groupId, mode) {
    const p = S.save.players.find((x) => x.id === S.playerId);
    if (!p) return;
    const group = GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const idx = playerIndex(p);
    bulk(`${p.name} · ${group.title} ${mode === "max" ? "maks" : "ortalama"}`, (save) => {
      const target = save.players[idx];
      group.keys.forEach((k) => {
        target.attributes[k] = mode === "max" ? 20 : Math.round((target.attributes[k] + target.ca / 2) / 2);
      });
    });
  }

  function quickAction(kind) {
    const p = S.save.players.find((x) => x.id === S.playerId);
    if (!p) return;
    if (kind === "extend") {
      bulk(`${p.name} · sözleşme +3 yıl`, (save) => {
        const t = save.players.find((x) => x.id === p.id);
        const y = Number(String(t.contract.expiry).slice(0, 4)) + 3;
        t.contract.expiry = `${y}${String(t.contract.expiry).slice(4)}`;
      });
    }
    if (kind === "heal") {
      bulk(`${p.name} · sakatlığı bitir`, (save) => {
        const t = save.players.find((x) => x.id === p.id);
        t.injury = { type: "Sakatlık Yok", weeksLeft: 0, returnDate: "" };
        t.condition = 100;
      });
    }
  }

  /* ============================ inceleme çekmecesi ============================ */

  function renderReview() {
    const body = $("#reviewBody");
    const sub = $("#reviewSub");
    if (!body) return;
    sub.textContent = `${S.patches.length} bekleyen düzenleme`;
    if (!S.patches.length) {
      body.innerHTML = `<div class="empty-state"><b>Bekleyen değişiklik yok</b>Tüm düzenlemeler kaydedildi.</div>`;
      return;
    }
    body.innerHTML = S.patches.map((p, i) => {
      const enabled = canRevert(i);
      const scope = p.scope || (p.structural ? "Toplu işlem" : "");
      const field = p.structural ? `${p.label} (${p.count} alan)` : p.label;
      return `<div class="patch ${p.structural ? "structural" : ""} ${enabled ? "" : "disabled"}">
        <div>
          <div class="p-scope">${esc(scope || "Kayıt")}</div>
          <div class="p-field">${esc(field)}</div>
          ${p.structural ? "" : `<div class="p-vals"><span class="p-old">${esc(short(p.oldValue))}</span> → <span class="p-new">${esc(short(p.newValue))}</span></div>`}
        </div>
        <div class="p-act">
          <button data-revert="${i}" ${enabled ? "" : "disabled title='Önce bu değişiklikten sonraki toplu işlemi geri al'"}>geri al</button>
        </div>
      </div>`;
    }).join("");
  }

  function openReview() {
    renderReview();
    $("#review").hidden = false;
    $("#scrim").hidden = false;
  }
  function closeReview() {
    const r = $("#review");
    const sc = $("#scrim");
    if (r) r.hidden = true;
    if (sc) sc.hidden = true;
  }

  /* ============================ çizim ============================ */

  function paint(opts = {}) {
    CTLS = [];
    const scrollY = window.scrollY;
    $("#tabs").innerHTML = TABS.map((t) => `<button class="tab ${S.route === t.id ? "active" : ""}" data-route="${t.id}">${t.label}</button>`).join("");
    if (S.foreign && S.route !== "free" && S.route !== "preferences") {
      $("#view").innerHTML = `
        <div class="hint-box warn">
          <span>⚠</span>
          <div>
            <b>Bu kayıt editör modeline eşlenmedi.</b> İçe aldığın dosya FM alan adlarını
            (<span class="mono">players</span>, <span class="mono">club.finances</span>…) kullanmıyor.
            Tüm değerleri <b>Serbest JSON</b> ağacından düzenleyebilirsin; ya da demo kayda dönüp
            biçimi inceleyebilirsin.
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" data-route="free">Serbest JSON'u aç</button>
          <button class="btn" style="background:#241a3a" id="reportReopen">Eşleme raporunu göster</button>
          <button class="btn" style="background:#241a3a" id="resetBtn">Demo kayda dön</button>
        </div>`;
      paintStatus();
      return;
    }
    $("#view").innerHTML = views[S.route]();
    const brandGame = S.save?.meta?.game || S.save?.meta?.generatedBy || "İçe alınan kayıt";
    const brandSeason = S.save?.game?.season || S.save?.career?.saveName || "";
    $("#brandSub").textContent = S.foreign ? `${brandGame} · yabancı şema` : `${brandGame} · ${brandSeason}`;
    paintStatus();
    if (S.patches.length && !$("#review").hidden) renderReview();
    try { window.scrollTo(0, scrollY); } catch (_) { /* yok say */ }

    const focusPath = opts.focus || S.focusPath;
    if (focusPath) {
      const el = [...document.querySelectorAll("[data-path]")].find((n) => n.dataset.path === focusPath);
      if (el) { el.focus(); if (el.select && el.type === "number") el.select(); }
      S.focusPath = null;
    }
  }

  function paintStatus() {
    const n = S.patches.length;
    const btn = $("#reviewBtn");
    btn.textContent = n ? `${n} bekleyen değişiklik` : "Kaydedildi";
    btn.classList.toggle("dirty", n > 0);
    $("#undoBtn").disabled = n === 0;
    $("#saveBtn").disabled = n === 0;

    $("#statusLeft").textContent = n ? `${n} bekleyen düzenleme` : "Tüm değişiklikler kaydedildi";
    const issues = S.foreign ? [] : validate();
    const errs = issues.filter((i) => i.level === "err").length;
    const warns = issues.filter((i) => i.level === "warn").length;
    $("#statusIssues").innerHTML = errs || warns
      ? `<span class="${errs ? "warn" : "ok"}">${errs} hata · ${warns} uyarı</span>`
      : `<span class="ok">doğrulama temiz</span>`;
    const mCount = $("#mCount");
    if (mCount) mCount.textContent = String(n);
    const mSave = $("#mSave");
    if (mSave) mSave.disabled = n === 0;
    const mUndo = $("#mUndo");
    if (mUndo) mUndo.disabled = n === 0;

    const clubLabel = S.save?.club?.name || S.save?.meta?.game || "İçe alınan kayıt";
    const season = S.save?.game?.season || "";
    const nPlayers = Array.isArray(S.save?.players) ? S.save.players.length : 0;
    $("#statusRight").textContent = S.foreign
      ? `${clubLabel} · yabancı şema · ${Object.keys(S.save || {}).length} üst düzey alan`
      : `${clubLabel} · ${season} · ${nPlayers} oyuncu · CA/PA 1–200 · nitelikler 1–20`;
  }

  /* ============================ olaylar ============================ */

  function wire() {
    document.addEventListener("click", (e) => {
      const t = e.target;

      if (S.palette.open && !t.closest("#palette") && !t.closest("#globalSearch")) {
        S.palette.open = false;
        paintPalette();
      }

      const tab = t.closest("[data-route]");
      if (tab) { S.route = tab.dataset.route; paint(); return; }

      const pl = t.closest("[data-player]");
      if (pl) { S.playerId = Number(pl.dataset.player); paint(); return; }

      const st = t.closest("[data-staff]");
      if (st) { S.staffId = Number(st.dataset.staff); paint(); return; }

      const pt = t.closest("[data-ptab]");
      if (pt) { S.playerTab = pt.dataset.ptab; paint(); return; }

      const pf = t.closest("[data-pos-filter]");
      if (pf) { S.posFilter = pf.dataset.posFilter; paint(); return; }

      if (t.closest("[data-toggle-filters]")) { S.showFilters = !S.showFilters; paint(); return; }

      const treeToggle = t.closest("[data-tree-toggle]");
      if (treeToggle) {
        const path = treeToggle.dataset.treeToggle;
        if (S.expanded.has(path)) S.expanded.delete(path); else S.expanded.add(path);
        paint();
        return;
      }

      const treeExpand = t.closest("[data-tree-expand]");
      if (treeExpand) {
        if (treeExpand.dataset.treeExpand === "all") {
          (function walk(node, path) {
            if (node === null || typeof node !== "object") return;
            S.expanded.add(path || "kök");
            Object.keys(node).forEach((k) => walk(node[k], path ? `${path}.${k}` : k));
          })(S.save, "");
          S.expanded.delete("kök");
        } else {
          S.expanded.clear();
        }
        paint();
        return;
      }

      const treeAdd = t.closest("[data-tree-add]");
      if (treeAdd) {
        const path = treeAdd.dataset.treeAdd;
        const arr = getPath(S.save, path);
        if (!Array.isArray(arr)) return;
        const template = arr.length ? clone(arr[arr.length - 1]) : (path === "players" ? {} : "");
        bulk(`Diziye öğe ekle: ${path}`, (save) => {
          const target = getPath(save, path);
          target.push(clone(template));
        });
        S.expanded.add(path);
        return;
      }

      const treeDel = t.closest("[data-tree-del]");
      if (treeDel) {
        const path = treeDel.dataset.treeDel;
        if (!confirm("Bu öğe silinsin mi?")) return;
        bulk(`Öğe sil: ${path}`, (save) => {
          const parts = path.split(".");
          const idx = Number(parts.pop());
          const parent = getPath(save, parts.join("."));
          if (Array.isArray(parent)) parent.splice(idx, 1);
        });
        return;
      }

      if (t.closest("#reportClose") || t.closest("#reportOk") || t.closest("#reportScrim")) { closeReport(); return; }
      if (t.closest("#reportReopen")) {
        showImportReport(S.save, "içe alınan kayıt");
        return;
      }
      if (t.closest("#reportRaw")) {
        S.route = "free";
        S.treeQ = S.report?.players?.path ? S.report.players.path.replace(/\[\d+\]/g, "").split(".").pop() : "";
        closeReport();
        paint();
        return;
      }

      const palItem = t.closest("[data-pal]");
      if (palItem) { runPalette(Number(palItem.dataset.pal)); return; }

      const issueBtn = t.closest("[data-issue-go]");
      if (issueBtn) {
        const go = JSON.parse(issueBtn.dataset.issueGo);
        S.route = go.route;
        if (go.playerId) S.playerId = go.playerId;
        paint();
        return;
      }

      const bulkBtn = t.closest("[data-bulk]");
      if (bulkBtn) { bulkOps(bulkBtn.dataset.bulk); return; }

      const fixBtn = t.closest("[data-fix]");
      if (fixBtn) { bulkOps(fixBtn.dataset.fix === "wage" ? "wages" : "budget"); return; }

      const ab = t.closest("[data-attr-bulk]");
      if (ab) { attrBulk(ab.dataset.attrBulk, ab.dataset.mode); return; }

      const qa = t.closest("[data-quick]");
      if (qa) { quickAction(qa.dataset.quick); return; }

      const tr = t.closest("[data-trait]");
      if (tr) {
        const p = S.save.players.find((x) => x.id === S.playerId);
        if (!p) return;
        const list = (p.traits || []).slice();
        const i = list.indexOf(tr.dataset.trait);
        if (i >= 0) list.splice(i, 1); else list.push(tr.dataset.trait);
        editPath(`players.${playerIndex(p)}.traits`, "Oyuncu özellikleri", list);
        return;
      }

      const sr = t.closest("[data-staff-resp]");
      if (sr) {
        const m = S.save.staff.find((x) => x.id === S.staffId);
        if (!m) return;
        const list = (m.responsibilities || []).slice();
        const i = list.indexOf(sr.dataset.staffResp);
        if (i >= 0) list.splice(i, 1); else list.push(sr.dataset.staffResp);
        editPath(`staff.${S.save.staff.indexOf(m)}.responsibilities`, "Sorumluluklar", list);
        return;
      }

      // ---- kulüp ilişkileri ----
      const p0 = pickPlayer();
      if (t.closest("[data-add-favclub]")) return addToPlayerList("favouriteClubs", "#favClub", "Sevdiği kulüpler");
      if (t.closest("[data-add-disclub]")) return addToPlayerList("dislikedClubs", "#disClub", "Sevmediği kulüpler");
      if (t.closest("[data-add-favperson]")) return addToPlayerList("favouritePeople", "#favPerson", "Sevdiği kişiler");
      const dfc = t.closest("[data-del-favclub]");
      if (dfc) return removeFromPlayerList("favouriteClubs", Number(dfc.dataset.delFavclub));
      const ddc = t.closest("[data-del-disclub]");
      if (ddc) return removeFromPlayerList("dislikedClubs", Number(ddc.dataset.delDisclub));
      const dfp = t.closest("[data-del-favperson]");
      if (dfp) return removeFromPlayerList("favouritePeople", Number(dfp.dataset.delFavperson));

      if (t.closest("[data-add-aff]")) return addClubItem("affiliations", "#affClub", "#affType");
      const daf = t.closest("[data-del-aff]");
      if (daf) return removeClubItem("affiliations", Number(daf.dataset.delAff));

      if (t.closest("[data-add-rival]")) return addRival();
      const drv = t.closest("[data-del-rival]");
      if (drv) return removeClubItem("rivals", Number(drv.dataset.delRival));

      if (t.closest("[data-add-legend]")) return addLegend();
      const dl = t.closest("[data-del-legend]");
      if (dl) return removeClubItem("legends", Number(dl.dataset.delLegend));

      // ---- inceleme çekmecesi ----
      const rv = t.closest("[data-revert]");
      if (rv) { revertPatch(Number(rv.dataset.revert)); renderReview(); return; }
      if (t.closest("#reviewBtn") || t.closest("#statusLeft") || t.closest("#mReview")) { openReview(); return; }
      if (t.closest("#reviewClose") || t.closest("#scrim")) { closeReview(); return; }
      if (t.closest("#revertAllBtn")) { revertAll(); renderReview(); return; }
      if (t.closest("#saveFromReview") || t.closest("#saveBtn") || t.closest("#mSave")) { saveNow(); return; }
      if (t.closest("#undoBtn") || t.closest("#mUndo")) { undo(); return; }

      if (t.closest("#exportBtn")) { exportJson(); return; }
      if (t.closest("#resetBtn")) {
        if (!confirm("Demo kayda dönülsün mü? Düzenlemeler kaybolur.")) return;
        S.save = clone(S.demo); S.patches = []; S.history = [];
        S.foreign = false;
        S.baseline = clone(S.save);
        localStorage.removeItem(LS_KEY);
        paint(); toast("Demo kayıt yüklendi");
        return;
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target.id === "sq") {
        S.staffQ = e.target.value;
        const pos2 = e.target.selectionStart;
        paint();
        const el2 = $("#sq");
        if (el2) { el2.focus(); el2.setSelectionRange(pos2, pos2); }
        return;
      }
      if (e.target.id === "pq") {
        S.q = e.target.value;
        const pos = e.target.selectionStart;
        paint();
        const el = $("#pq");
        if (el) { el.focus(); el.setSelectionRange(pos, pos); }
        return;
      }
      if (e.target.id === "psort") { S.sort = e.target.value; paint(); return; }
      if (e.target.id === "treeQ") {
        S.treeQ = e.target.value;
        const caret = e.target.selectionStart;
        paint();
        const el = $("#treeQ");
        if (el) { el.focus(); el.setSelectionRange(caret, caret); }
        return;
      }
      if (e.target.id === "globalSearch") {
        S.palette.items = paletteItems(e.target.value);
        S.palette.index = 0;
        S.palette.open = true;
        paintPalette();
        return;
      }
      const f = e.target.closest("[data-filter]");
      if (f) { S.filters[f.dataset.filter] = f.value; paint(); return; }
    });

    document.addEventListener("change", (e) => {
      const treeEl = e.target.closest("[data-tree-path]");
      if (treeEl) {
        const path = treeEl.dataset.treePath;
        const type = treeEl.dataset.treeType;
        let next;
        if (type === "boolean") next = treeEl.checked;
        else if (type === "number") next = Number(treeEl.value === "" ? 0 : treeEl.value);
        else if (type === "null") next = null;
        else next = treeEl.value;
        editPath(path, `Serbest düzenleme · ${path}`, next);
        return;
      }

      const el = e.target.closest("[data-ctl]");
      if (!el) return;
      applyCtl(Number(el.dataset.ctl), el.type === "checkbox" ? el.checked : el.value, false);
    });

    document.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveNow(); return; }
      if (mod && e.key.toLowerCase() === "r") { e.preventDefault(); openReview(); return; }
      if (mod && e.key.toLowerCase() === "f") { e.preventDefault(); $("#globalSearch")?.focus(); return; }
      if (e.key === "Escape") { closeReview(); S.palette.open = false; paintPalette(); return; }
      if (S.palette.open) {
        if (e.key === "ArrowDown") { e.preventDefault(); S.palette.index = Math.min(S.palette.items.length - 1, S.palette.index + 1); paintPalette(); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); S.palette.index = Math.max(0, S.palette.index - 1); paintPalette(); return; }
        if (e.key === "Enter") { e.preventDefault(); runPalette(S.palette.index); return; }
      }

      const row = e.target.closest?.(".list-row");
      if (row && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const rows = [...row.parentElement.querySelectorAll(".list-row")];
        const i = rows.indexOf(row);
        const next = rows[i + (e.key === "ArrowDown" ? 1 : -1)];
        if (next) {
          if (next.dataset.player) S.playerId = Number(next.dataset.player);
          if (next.dataset.staff) S.staffId = Number(next.dataset.staff);
          paint();
          const sel = document.querySelector(`.list-row[data-player="${S.playerId}"], .list-row[data-staff="${S.staffId}"]`);
          sel?.focus();
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.target.id === "affClub" || e.target.id === "rivalClub" || e.target.id === "legendName" ||
          e.target.id === "favClub" || e.target.id === "disClub" || e.target.id === "favPerson") {
        if (e.key === "Enter") {
          if (e.target.id === "affClub") addClubItem("affiliations", "#affClub", "#affType");
          else if (e.target.id === "rivalClub") addRival();
          else if (e.target.id === "legendName") addLegend();
          else if (e.target.id === "favClub") addToPlayerList("favouriteClubs", "#favClub", "Sevdiği kulüpler");
          else if (e.target.id === "disClub") addToPlayerList("dislikedClubs", "#disClub", "Sevmediği kulüpler");
          else if (e.target.id === "favPerson") addToPlayerList("favouritePeople", "#favPerson", "Sevdiği kişiler");
        }
      }
    });

    $("#importFile")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        applyImported(data);
        showImportReport(data, file.name);
        toast("Kayıt içe alındı — eşleme raporu açıldı");
      } catch (err) { toast("JSON okunamadı: " + err.message); }
      e.target.value = "";
    });

    window.addEventListener("beforeunload", (e) => {
      if (S.prefs.confirmLeave && dirty()) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  /* ---- liste düzenleme yardımcıları ---- */

  function pickPlayer() {
    return S.save.players.find((x) => x.id === S.playerId);
  }
  function addToPlayerList(key, inputSel, label) {
    const p = pickPlayer();
    const el = $(inputSel);
    if (!p || !el) return;
    const value = el.value.trim();
    if (!value) return;
    p.relations = p.relations || {};
    const list = (p.relations[key] || []).slice();
    if (list.includes(value)) { toast("Zaten listede"); return; }
    list.push(value);
    editPath(`players.${playerIndex(p)}.relations.${key}`, label, list);
  }
  function removeFromPlayerList(key, i) {
    const p = pickPlayer();
    if (!p) return;
    const list = (p.relations?.[key] || []).slice();
    list.splice(i, 1);
    editPath(`players.${playerIndex(p)}.relations.${key}`, "İlişki kaldırıldı", list);
  }
  function addClubItem(key, inputSel, typeSel) {
    const c = S.save.club;
    const input = $(inputSel);
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    const list = (c[key] || []).slice();
    if (key === "affiliations") list.push({ club: value, type: $(typeSel)?.value || "Bağlı Kulüp", since: S.save.game.date });
    else list.push({ club: value });
    S.scope = { path: "club", name: c.name };
    editPath(`club.${key}`, "Kulüp listesi", list);
  }
  function removeClubItem(key, i) {
    const list = (S.save.club[key] || []).slice();
    list.splice(i, 1);
    S.scope = { path: "club", name: S.save.club.name };
    editPath(`club.${key}`, "Kulüp listesi", list);
  }
  function addRival() {
    const club = ($("#rivalClub")?.value || "").trim();
    const note = ($("#rivalNote")?.value || "").trim();
    if (!club) return;
    const list = (S.save.club.rivals || []).slice();
    list.push({ club, intensity: 3, note });
    S.scope = { path: "club", name: S.save.club.name };
    editPath("club.rivals", "Rakip eklendi", list);
  }
  function addLegend() {
    const name = ($("#legendName")?.value || "").trim();
    const years = ($("#legendYears")?.value || "").trim();
    if (!name) return;
    const list = (S.save.club.legends || []).slice();
    list.push({ name, years, appearances: 0 });
    S.scope = { path: "club", name: S.save.club.name };
    editPath("club.legends", "Efsane eklendi", list);
  }

  function exportJson() {
    const name = `wsc-editor-${(S.save.club.name || "kulup").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.json`;
    const text = JSON.stringify(S.save, null, 2);
    if (window.WSCAndroid && window.WSCAndroid.exportFile) {
      window.WSCAndroid.exportFile(name, text);
      toast("Kayıt için konum seç…");
      return;
    }
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("JSON dışa aktarıldı");
  }

  /* ============================ şema tanıma raporu ============================ */

  function showImportReport(json, fileName) {
    const report = window.WSC_DETECT ? window.WSC_DETECT.detect(json) : null;
    if (!report) return;

    const row = (title, info, kind) => {
      if (!info) {
        return `<div class="detect-card miss">
          <div class="dc-head"><span class="dc-title">${esc(title)}</span>
            <span class="conf low">bulunamadı</span></div>
          <div class="dc-meta">Bu bölüm tanınamadı. Serbest JSON sekmesinden elle düzenleyebilirsin.</div>
        </div>`;
      }
      const conf = info.confidence === undefined ? null : info.confidence;
      const cls = conf === null ? "mid" : conf >= 70 ? "high" : conf >= 40 ? "mid" : "low";
      const fields = info.matchedFields
        ? Object.values(info.matchedFields).flat().slice(0, 14)
        : (info.fields || []).slice(0, 14);
      return `<div class="detect-card">
        <div class="dc-head">
          <span class="dc-title">${esc(title)}${info.count !== undefined ? ` · ${info.count} kayıt` : ""}</span>
          ${conf === null ? `<span class="conf ${cls}">eşleşti</span>` : `<span class="conf ${cls}">%${conf} güven</span>`}
        </div>
        <div class="dc-path">${esc(info.path || "(kök)")}</div>
        <div class="dc-fields">${fields.map((f) => `<span>${esc(f)}</span>`).join("")}</div>
      </div>`;
    };

    $("#reportSummary").textContent = `${fileName} · ${report.summary}`;
    $("#reportBody").innerHTML = [
      row("Oyuncular", report.players),
      row("Personel", report.staff),
      row("Finans", report.finances),
      row("Kulüp", report.club),
      report.unknownTopLevel.length
        ? `<div class="detect-card">
             <div class="dc-head"><span class="dc-title">Tanınmayan alanlar</span>
               <span class="conf mid">${report.unknownTopLevel.length}</span></div>
             <div class="dc-fields">${report.unknownTopLevel.slice(0, 24).map((k) => `<span>${esc(k)}</span>`).join("")}</div>
           </div>`
        : "",
    ].join("");

    S.report = report;
    $("#report").hidden = false;
    $("#reportScrim").hidden = false;
  }

  function closeReport() {
    const r = $("#report");
    const sc = $("#reportScrim");
    if (r) r.hidden = true;
    if (sc) sc.hidden = true;
  }

  /* APK köprüsü: Android tarafı dosya seçtirip bu fonksiyonu çağırır. */
  function applyImported(data) {
    S.save = data;
    S.patches = [];
    S.history = [];
    S.baseline = clone(data);
    S.foreign = !Array.isArray(data?.players);
    if (S.foreign) S.route = "free";
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) { /* kota */ }
    paint();
  }

  window.WSC_IMPORT_JSON = function (text) {
    try {
      const data = JSON.parse(text);
      applyImported(data);
      showImportReport(data, "android");
      toast("Kayıt içe alındı — eşleme raporu açıldı");
    } catch (err) {
      toast("JSON okunamadı: " + err.message);
    }
  };

  /* ============================ başlangıç ============================ */

  async function loadDemo() {
    try {
      const res = await fetch(DEMO_URL, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (_) { /* file:// veya asset ortamı */ }
    if (window.__DEMO_SAVE__) return window.__DEMO_SAVE__;
    throw new Error("demo-save.json yüklenemedi");
  }

  async function boot() {
    try {
      S.demo = await loadDemo();
      let local = null;
      try { local = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (_) { local = null; }
      S.save = local || clone(S.demo);
      S.baseline = clone(S.save);
      try {
        const storedPrefs = JSON.parse(localStorage.getItem(`${LS_KEY}-prefs`) || "null");
        if (storedPrefs) S.prefs = { ...S.prefs, ...storedPrefs };
      } catch (_) { /* yok say */ }
      S.playerId = S.save.players[0]?.id ?? null;
      S.staffId = S.save.staff[0]?.id ?? null;
      wire();
      paint();
    } catch (err) {
      document.body.innerHTML = `<pre style="padding:24px;color:#f88">Başlatma hatası: ${esc(err.message)}</pre>`;
    }
  }

  boot();
})();
