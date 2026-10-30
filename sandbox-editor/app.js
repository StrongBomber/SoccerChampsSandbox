/* Sandbox Editor — uygulama mantığı (bağımlılıksız, tek sayfa). */
(function () {
  "use strict";

  const { POSITIONS, fmt, TOOLS } = window.WSC;
  const LS_KEY = "wsc-sandbox-save-v1";
  const DEMO_URL = "./demo-save.json";

  const state = {
    save: null,
    demo: null,
    changes: [],
    route: "overview",
    squad: { q: "", pos: "", listedOnly: false, sort: { key: "ovr", dir: -1 } },
    focusPath: null,
  };

  const NAV = [
    { id: "overview", icon: "◈", label: "Genel Bakış" },
    { id: "squad", icon: "👥", label: "Kadro" },
    { id: "finances", icon: "€", label: "Finans" },
    { id: "transfers", icon: "⇄", label: "Transferler" },
    { id: "staff", icon: "🎓", label: "Personel" },
    { id: "sandbox", icon: "⚙", label: "Sandbox Araçları" },
    { id: "raw", icon: "{ }", label: "Ham JSON" },
  ];

  /* ---------------- yardımcılar ---------------- */

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function getPath(obj, path) {
    return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((acc, k) => acc[k], obj);
    target[last] = value;
  }

  function diffObjects(a, b, prefix = "", out = []) {
    const isObj = (v) => v && typeof v === "object";
    if (!isObj(a) || !isObj(b)) {
      if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: prefix || "(kök)", from: a, to: b });
      return out;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((k) => {
      const p = prefix ? `${prefix}.${k}` : k;
      if (!(k in a)) out.push({ path: p, from: undefined, to: b[k] });
      else if (!(k in b)) out.push({ path: p, from: a[k], to: undefined });
      else diffObjects(a[k], b[k], p, out);
    });
    return out;
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state.save)); } catch (_) { /* kota */ }
  }

  function commit(label, mutate) {
    const before = clone(state.save);
    mutate(state.save);
    const after = clone(state.save);
    const diff = diffObjects(before, after);
    if (!diff.length) return false;
    state.changes.push({ label, before, after, diff, at: Date.now() });
    persist();
    paint();
    return true;
  }

  /* ---------------- veri ---------------- */

  function normalise(save) {
    // Eksik alanları güvenli varsayılanlarla doldur (gerçek kayıt içe alındığında da çalışır).
    save.club = save.club || {};
    save.finances = save.finances || {};
    save.season = save.season || {};
    save.players = Array.isArray(save.players) ? save.players : [];
    save.staff = Array.isArray(save.staff) ? save.staff : [];
    save.transferTargets = Array.isArray(save.transferTargets) ? save.transferTargets : [];
    save.finances.currency = save.finances.currency || "EUR";
    save.players.forEach((p, i) => {
      p.id = p.id ?? i + 1;
      p.pos = (p.pos || "CM").toUpperCase();
      ["age", "ovr", "pot", "value", "wage", "morale", "fitness"].forEach((k) => {
        if (typeof p[k] !== "number") p[k] = Number(p[k]) || 0;
      });
      p.listed = Boolean(p.listed);
    });
    return save;
  }

  async function loadDemo() {
    const res = await fetch(DEMO_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("demo-save.json yüklenemedi");
    state.demo = normalise(await res.json());
    state.save = clone(state.demo);
    state.changes = [];
  }

  function restoreLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      state.save = normalise(JSON.parse(raw));
      state.changes = [];
      return true;
    } catch (_) {
      return false;
    }
  }

  /* ---------------- görünümler ---------------- */

  const views = {
    overview() {
      const s = state.save;
      const squadValue = s.players.reduce((a, p) => a + (p.value || 0), 0);
      const wages = s.players.reduce((a, p) => a + (p.wage || 0), 0);
      s.finances.weeklyWages = wages;
      const avgOvr = s.players.length ? s.players.reduce((a, p) => a + p.ovr, 0) / s.players.length : 0;
      const injured = s.players.filter((p) => p.injuryWeeks > 0);
      const listed = s.players.filter((p) => p.listed);
      const wagePct = s.finances.wageBudget ? Math.round((wages / s.finances.wageBudget) * 100) : 0;

      const top = [...s.players].sort((a, b) => b.value - a.value).slice(0, 5);
      const byPos = POSITIONS.map((pos) => ({ pos, n: s.players.filter((p) => p.pos === pos).length }));

      return `
        <div class="grid-kpi">
          <div class="kpi"><div class="label">Kadro Değeri</div><div class="value">${fmt.money(squadValue, s.finances.currency)}</div><div class="sub">${s.players.length} oyuncu · ort. OVR ${avgOvr.toFixed(1)}</div></div>
          <div class="kpi blue"><div class="label">Bakiye</div><div class="value">${fmt.money(s.finances.balance, s.finances.currency)}</div><div class="sub">Transfer bütçesi: ${fmt.money(s.finances.transferBudget, s.finances.currency)}</div></div>
          <div class="kpi ${wagePct > 100 ? "red" : "amber"}"><div class="label">Haftalık Maaş</div><div class="value">${fmt.money(wages, s.finances.currency)}</div><div class="sub">Bütçenin %${wagePct}'i ${wagePct > 100 ? "· AŞIM!" : "kullanıldı"}</div></div>
          <div class="kpi"><div class="label">Sıralama</div><div class="value">${s.season.position ?? "—"}.</div><div class="sub">${esc(s.season.label || "")} · ${s.season.points ?? 0} puan · ${esc(s.season.phase || "")}</div></div>
        </div>

        <div class="cols-2">
          <div class="panel">
            <div class="panel-head"><h2>En Değerli Oyuncular</h2><span class="hint">piyasa değeri</span></div>
            <div class="panel-body flush"><div class="list" style="padding:14px 16px">
              ${top.map((p) => `
                <div class="list-row">
                  <div class="who"><span class="pos ${esc(p.pos)}">${esc(p.pos)}</span><div><strong>${esc(p.name)}</strong><div class="muted" style="font-size:12px">${p.ovr} OVR · ${p.age} yaş · ${esc(p.nationality || "")}</div></div></div>
                  <div class="right mono">${fmt.money(p.value, s.finances.currency)}</div>
                </div>`).join("")}
            </div></div>
          </div>

          <div class="panel">
            <div class="panel-head"><h2>Kadro Durumu</h2><span class="hint">pozisyon dağılımı</span></div>
            <div class="panel-body">
              <div class="list">
                ${byPos.map(({ pos, n }) => `
                  <div class="list-row" style="grid-template-columns:64px 1fr auto;background:transparent;border:none;padding:4px 0">
                    <span class="pos ${pos}">${pos}</span>
                    <div class="bar ${n === 0 ? "low" : n < 2 ? "mid" : ""}"><i style="width:${Math.min(100, n * 20)}%"></i></div>
                    <strong class="mono">${n}</strong>
                  </div>`).join("")}
              </div>
              <hr style="border:none;border-top:1px solid var(--line);margin:14px 0" />
              <div class="muted" style="display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px">
                <span>🚑 ${injured.length} sakat</span>
                <span>📋 ${listed.length} transfer listesinde</span>
                <span>🎯 ${s.transferTargets.length} izlenen oyuncu</span>
              </div>
            </div>
          </div>
        </div>

        <div class="banner">
          <span>ℹ️</span>
          <div>
            <strong>Bu kayıt demo verisidir.</strong> Gerçek bir World Soccer Champs kaydını
            <em>İçe Al</em> ile yükleyebilirsin; editör aynı alan adlarını (<span class="mono">players</span>,
            <span class="mono">finances</span>, <span class="mono">club</span>) arar, bulamazsa
            <em>Ham JSON</em> sekmesinden her alanı düzenleyebilirsin. Alan adları REA ile
            <span class="mono">libWorldSoccerChamps.so</span> içinden çıkarıldı — ayrıntı:
            <span class="mono">docs/REA-ANALYSIS.md</span>.
          </div>
        </div>`;
    },

    squad() {
      const s = state.save;
      const { q, pos, listedOnly, sort } = state.squad;
      let rows = s.players.map((p, i) => ({ ...p, i }));
      if (q) {
        const needle = q.toLocaleLowerCase("tr");
        rows = rows.filter((p) => p.name.toLocaleLowerCase("tr").includes(needle) || String(p.id) === q);
      }
      if (pos) rows = rows.filter((p) => p.pos === pos);
      if (listedOnly) rows = rows.filter((p) => p.listed);
      rows.sort((a, b) => {
        const A = a[sort.key], B = b[sort.key];
        if (typeof A === "string") return A.localeCompare(B, "tr") * sort.dir;
        return ((A || 0) - (B || 0)) * sort.dir;
      });

      const head = [
        ["name", "Oyuncu"], ["pos", "Poz"], ["age", "Yaş"], ["ovr", "OVR"], ["pot", "POT"],
        ["value", "Değer"], ["wage", "Maaş"], ["contract", "Sözleşme"], ["morale", "Moral"],
        ["form", "Form"], ["injuryWeeks", "Sakat"], ["listed", "Liste"],
      ];
      const arrow = (k) => (sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : "");

      return `
        <div class="panel">
          <div class="toolbar">
            <input class="search" id="sq-q" placeholder="Oyuncu ara (isim veya ID)…" value="${esc(q)}" />
            <select class="ctl" id="sq-pos">
              <option value="">Tüm pozisyonlar</option>
              ${POSITIONS.map((p) => `<option value="${p}" ${p === pos ? "selected" : ""}>${p}</option>`).join("")}
            </select>
            <label class="chip" style="display:flex;gap:8px;align-items:center;cursor:pointer">
              <input type="checkbox" id="sq-listed" ${listedOnly ? "checked" : ""} /> sadece listede
            </label>
            <span class="chip">${rows.length} / ${s.players.length} oyuncu</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th class="num">#</th>
                ${head.map(([k, label]) => `<th data-sort="${k}" class="${["age","ovr","pot","value","wage","morale","form","injuryWeeks"].includes(k) ? "num" : ""}">${label}${arrow(k)}</th>`).join("")}
              </tr></thead>
              <tbody>
              ${rows.map((p) => `
                <tr>
                  <td class="num muted">${p.i + 1}</td>
                  <td>
                    <div class="name-cell">
                      <span class="avatar">${esc(p.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}</span>
                      <div><div>${esc(p.name)}</div><div class="muted" style="font-size:11px">${esc(p.nationality || "—")}</div></div>
                    </div>
                  </td>
                  <td><span class="pos ${esc(p.pos)}">${esc(p.pos)}</span></td>
                  <td class="num">${numCell(`players.${p.i}.age`, p.age, 15, 45)}</td>
                  <td class="num">${numCell(`players.${p.i}.ovr`, p.ovr, 1, 99)}</td>
                  <td class="num">${numCell(`players.${p.i}.pot`, p.pot, 1, 99)}</td>
                  <td class="num">${numCell(`players.${p.i}.value`, p.value, 0, 999_000_000, "wide", fmt.compact(p.value))}</td>
                  <td class="num">${numCell(`players.${p.i}.wage`, p.wage, 0, 5_000_000, "wide", fmt.compact(p.wage))}</td>
                  <td><input class="cell-input wide" type="date" data-path="players.${p.i}.contract" value="${esc(p.contract || "")}" /></td>
                  <td class="num">${numCell(`players.${p.i}.morale`, p.morale, 0, 100)}</td>
                  <td class="num">${numCell(`players.${p.i}.form`, p.form, 1, 10, "", p.form, "float")}</td>
                  <td class="num">${numCell(`players.${p.i}.injuryWeeks`, p.injuryWeeks || 0, 0, 52)}</td>
                  <td><label class="switch"><input type="checkbox" data-path="players.${p.i}.listed" ${p.listed ? "checked" : ""}/><span></span></label></td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    },

    finances() {
      const s = state.save;
      const f = s.finances;
      const wages = s.players.reduce((a, p) => a + (p.wage || 0), 0);
      const pct = f.wageBudget ? Math.min(140, Math.round((wages / f.wageBudget) * 100)) : 0;
      return `
        <div class="cols-2">
          <div class="panel">
            <div class="panel-head"><h2>Kulüp Finansı</h2><span class="hint">${esc(f.currency)}</span></div>
            <div class="panel-body">
              <div class="list">
                ${moneyField("Bakiye", "finances.balance", f.balance)}
                ${moneyField("Transfer Bütçesi", "finances.transferBudget", f.transferBudget)}
                ${moneyField("Maaş Bütçesi (haftalık)", "finances.wageBudget", f.wageBudget)}
                ${moneyField("Sponsorluk (yıllık)", "finances.sponsorship", f.sponsorship)}
                ${moneyField("Borç", "finances.debt", f.debt)}
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Maaş Yükü</h2><span class="hint">kadro toplamı / bütçe</span></div>
            <div class="panel-body">
              <div class="kpi ${pct > 100 ? "red" : pct > 85 ? "amber" : ""}" style="margin-bottom:14px">
                <div class="label">Haftalık Toplam</div>
                <div class="value">${fmt.money(wages, f.currency)}</div>
                <div class="sub">${pct}% kullanım · bütçe ${fmt.money(f.wageBudget, f.currency)}</div>
              </div>
              <div class="bar ${pct > 100 ? "low" : pct > 85 ? "mid" : ""}" style="height:10px"><i style="width:${Math.min(100, pct)}%"></i></div>
              <p class="muted" style="font-size:12.5px;line-height:1.5;margin-top:16px">
                FM'deki "wage budget" mantığı: toplam maaş bütçeyi aşarsa yeni sözleşme imzalanamaz.
                <strong>Sandbox Araçları → Maaş Yükünü Sıfırla</strong> ile tek tıkla düşürebilirsin.
              </p>
            </div>
          </div>
        </div>`;
    },

    transfers() {
      const s = state.save;
      const listed = s.players.map((p, i) => ({ ...p, i })).filter((p) => p.listed);
      const targets = s.transferTargets;
      return `
        <div class="cols-2">
          <div class="panel">
            <div class="panel-head"><h2>Transfer Listesindekiler</h2><span class="hint">satışa açık</span></div>
            <div class="panel-body">
              ${listed.length ? `<div class="list">
                ${listed.map((p) => `
                  <div class="list-row">
                    <div class="who"><span class="pos ${esc(p.pos)}">${esc(p.pos)}</span>
                      <div><strong>${esc(p.name)}</strong><div class="muted" style="font-size:12px">${p.ovr} OVR · ${fmt.money(p.value, s.finances.currency)}</div></div>
                    </div>
                    <button class="btn small" data-action="sell" data-i="${p.i}">%90'ına sat</button>
                  </div>`).join("")}
              </div>` : `<p class="muted">Transfer listesinde oyuncu yok.</p>`}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><h2>İzleme Listesi</h2><span class="hint">scout hedefleri</span></div>
            <div class="panel-body">
              ${targets.length ? `<div class="list">
                ${targets.map((t, ti) => `
                  <div class="list-row">
                    <div class="who"><span class="pos ${esc(t.pos)}">${esc(t.pos)}</span>
                      <div><strong>${esc(t.name)}</strong>
                        <div class="muted" style="font-size:12px">${esc(t.club || "")} · ${t.ovr}/${t.pot} · ${fmt.money(t.value, s.finances.currency)} · ilgi ${t.interest}%</div>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button class="btn small ghost" data-action="interest" data-ti="${ti}">+20 ilgi</button>
                      <button class="btn small primary" data-action="sign" data-ti="${ti}">İmzala</button>
                    </div>
                  </div>`).join("")}
              </div>` : `<p class="muted">İzleme listesi boş.</p>`}
            </div>
          </div>
        </div>`;
    },

    staff() {
      const s = state.save;
      return `
        <div class="panel">
          <div class="panel-head"><h2>Personel</h2><span class="hint">${s.staff.length} kişi</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>İsim</th><th>Görev</th><th class="num">Puan</th><th class="num">Maaş</th><th>Sözleşme</th></tr></thead>
            <tbody>
            ${s.staff.map((m, i) => `
              <tr>
                <td>${esc(m.name)}</td>
                <td class="muted">${esc(m.role)}</td>
                <td class="num">
                  <select class="ctl" data-path="staff.${i}.rating" style="padding:4px 6px">
                    ${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${Number(m.rating) === n ? "selected" : ""}>${"★".repeat(n)}</option>`).join("")}
                  </select>
                </td>
                <td class="num">${numCell(`staff.${i}.wage`, m.wage, 0, 10_000_000, "wide", fmt.compact(m.wage))}</td>
                <td><input class="cell-input wide" type="date" data-path="staff.${i}.contract" value="${esc(m.contract || "")}" /></td>
              </tr>`).join("")}
            </tbody>
          </table></div>
        </div>`;
    },

    sandbox() {
      const s = state.save;
      return `
        <div class="banner warn">
          <span>⚙</span>
          <div><strong>Sandbox modu:</strong> aşağıdaki araçlar kayıt verisini toplu değiştirir; her işlem
          geri alınabilir ve <em>Değişiklikler</em> panelinde tek tek görünür.</div>
        </div>
        <div class="cards">
          ${TOOLS.map((t) => `
            <div class="tool" data-tool="${t.id}">
              <h3><span>${t.icon}</span>${esc(t.title)}</h3>
              <p>${esc(t.desc)}</p>
              <div class="muted mono" style="font-size:11.5px">${esc(safeStat(t, s))}</div>
              <div class="foot">
                <button class="btn primary small" data-action="tool" data-id="${t.id}">Uygula</button>
              </div>
            </div>`).join("")}
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Kayıt</h2><span class="hint">yerel</span></div>
          <div class="panel-body" style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn" data-action="reset-demo">Demo kayda dön</button>
            <button class="btn" data-action="clear-local">Yerel kaydı sil</button>
            <button class="btn ghost" data-action="open-diff">Değişiklik günlüğü (${state.changes.length})</button>
          </div>
        </div>`;
    },

    raw() {
      return `
        <div class="panel">
          <div class="panel-head"><h2>Ham JSON</h2><span class="hint">doğrudan düzenle</span></div>
          <div class="panel-body">
            <textarea class="json" id="rawJson" spellcheck="false">${esc(JSON.stringify(state.save, null, 2))}</textarea>
            <div style="display:flex;gap:10px;margin-top:12px">
              <button class="btn primary" data-action="raw-apply">JSON'u uygula</button>
              <button class="btn ghost" data-action="raw-revert">Geri yükle</button>
              <span class="chip" id="rawStatus">geçerli JSON</span>
            </div>
          </div>
        </div>`;
    },
  };

  function safeStat(tool, save) {
    try { return tool.stat(save); } catch (_) { return ""; }
  }

  function numCell(path, value, min, max, extra = "", display, type = "int") {
    const step = type === "float" ? "0.1" : "1";
    return `<input class="cell-input ${extra}" type="number" step="${step}" min="${min}" max="${max}"
      data-path="${path}" data-type="${type}" value="${value ?? 0}" title="${display ? esc(display) : ""}" />`;
  }

  function moneyField(label, path, value) {
    return `<div class="field">
      <label>${label}</label>
      <div class="row">
        <input class="cell-input wide" style="width:100%" type="number" step="10000" data-path="${path}" data-type="int" value="${value ?? 0}" />
        <span class="muted mono">${fmt.compact(value)}</span>
      </div>
    </div>`;
  }

  /* ---------------- çizim ---------------- */

  function paint() {
    const s = state.save;
    if (!s) return;

    $("#clubName").textContent = s.club.name || "Bilinmeyen Kulüp";
    $("#clubSub").textContent = [s.club.league, s.club.country, s.season?.label].filter(Boolean).join(" · ");
    $("#clubCrest").textContent = s.club.shortName || (s.club.name || "??").slice(0, 3).toUpperCase();

    $("#nav").innerHTML = NAV.map((n) => `
      <button class="nav-item ${state.route === n.id ? "active" : ""}" data-route="${n.id}">
        <span class="ico">${n.icon}</span><span>${n.label}</span>
      </button>`).join("");

    const changelog = state.changes.length;
    const chip = $("#changeChip");
    chip.textContent = `${changelog} değişiklik`;
    chip.classList.toggle("dirty", changelog > 0);
    $("#undoBtn").disabled = changelog === 0;

    $("#view").innerHTML = views[state.route]();
    $("#drawerBody").innerHTML = renderDiff();

    // odak geri yükleme (tablo hücresi düzenlerken DOM yenileniyor)
    if (state.focusPath) {
      const el = document.querySelector(`[data-path="${state.focusPath}"]`);
      if (el) { el.focus(); if (el.select) el.select(); }
      state.focusPath = null;
    }

    const status = $("#rawStatus");
    if (status) status.textContent = "geçerli JSON";
  }

  function renderDiff() {
    if (!state.changes.length) return `<p class="muted">Henüz değişiklik yok.</p>`;
    return [...state.changes].reverse().map((c, idx) => `
      <div class="diff-row">
        <div class="path">${esc(c.label)}</div>
        ${c.diff.slice(0, 6).map((d) => `
          <div class="val"><span class="muted mono">${esc(d.path)}</span><br/>
            <span class="from">${esc(short(d.from))}</span> → <span class="to">${esc(short(d.to))}</span></div>`).join("")}
        ${c.diff.length > 6 ? `<div class="muted">+${c.diff.length - 6} alan daha…</div>` : ""}
        <div style="margin-top:8px"><button class="btn small ghost" data-action="undo-to" data-idx="${state.changes.length - 1 - idx}">buna kadar geri al</button></div>
      </div>`).join("");
  }

  function short(v) {
    if (v === undefined) return "(yok)";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return s.length > 42 ? s.slice(0, 42) + "…" : s;
  }

  /* ---------------- etkileşim ---------------- */

  function wire() {
    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("[data-route]");
      if (navBtn) { state.route = navBtn.dataset.route; paint(); return; }

      const sortTh = e.target.closest("[data-sort]");
      if (sortTh) {
        const key = sortTh.dataset.sort;
        const s = state.squad.sort;
        s.dir = s.key === key ? -s.dir : -1;
        s.key = key;
        paint();
        return;
      }

      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === "tool") {
        const tool = TOOLS.find((t) => t.id === btn.dataset.id);
        if (!tool) return;
        const ok = commit(`${tool.icon} ${tool.title}`, (save) => { tool.apply(save); });
        toast(ok ? `${tool.title} uygulandı` : "Değişiklik yok");
      }

      if (action === "sell") {
        const i = Number(btn.dataset.i);
        const p = state.save.players[i];
        if (!p) return;
        commit(`💸 ${p.name} satıldı`, (save) => {
          const price = Math.round((p.value || 0) * 0.9);
          save.finances.balance += price;
          save.finances.transferBudget += price;
          save.players = save.players.filter((x) => x.id !== p.id);
        });
        toast(`${p.name} %90 bedelle satıldı`);
      }

      if (action === "sign") {
        const ti = Number(btn.dataset.ti);
        const t = state.save.transferTargets[ti];
        if (!t) return;
        if (state.save.finances.transferBudget < t.value) { toast("Transfer bütçesi yetersiz"); return; }
        commit(`✍ ${t.name} transfer edildi`, (save) => {
          save.finances.transferBudget -= t.value;
          save.finances.balance -= t.value;
          save.players.push({
            id: t.id, name: t.name, pos: t.pos, age: t.age, ovr: t.ovr, pot: t.pot,
            value: t.value, wage: t.wage, contract: "2029-06-30", nationality: t.nationality || "—",
            morale: 80, fitness: 95, form: 7, listed: false, injuryWeeks: 0,
          });
          save.transferTargets = save.transferTargets.filter((x) => x.id !== t.id);
        });
        toast(`${t.name} kadroya katıldı`);
      }

      if (action === "interest") {
        const ti = Number(btn.dataset.ti);
        commit(`🎯 ${state.save.transferTargets[ti].name} ilgisi arttı`, (save) => {
          save.transferTargets[ti].interest = Math.min(100, save.transferTargets[ti].interest + 20);
        });
      }

      if (action === "undo-to") {
        const idx = Number(btn.dataset.idx);
        state.changes = state.changes.slice(idx, idx + 1);
        state.save = clone(state.changes[0].before);
        state.changes = state.changes.slice(1);
        persist(); paint();
      }

      if (action === "reset-demo") {
        if (!confirm("Demo kayda dönülsün mü? Mevcut düzenlemeler kaybolur.")) return;
        state.changes = [];
        state.save = clone(state.demo);
        persist(); paint(); toast("Demo kayıt yüklendi");
      }

      if (action === "clear-local") {
        localStorage.removeItem(LS_KEY);
        toast("Yerel kayıt silindi");
      }

      if (action === "open-diff") { $("#drawer").hidden = false; }
      if (action === "raw-apply") {
        try {
          const next = normalise(JSON.parse($("#rawJson").value));
          const before = clone(state.save);
          const diff = diffObjects(before, next);
          if (!diff.length) { toast("Fark yok"); return; }
          state.changes.push({ label: "✎ Ham JSON düzenlemesi", before, after: next, diff, at: Date.now() });
          state.save = next;
          persist(); paint(); toast("JSON uygulandı");
        } catch (err) {
          const st = $("#rawStatus");
          if (st) { st.textContent = "hatalı JSON: " + err.message; st.classList.add("dirty"); }
        }
      }
      if (action === "raw-revert") { paint(); toast("Geri yüklendi"); }
    });

    document.addEventListener("change", (e) => {
      const el = e.target.closest("[data-path]");
      if (!el) return;
      const path = el.dataset.path;
      let value;
      if (el.type === "checkbox") value = el.checked;
      else if (el.dataset.type === "float") value = parseFloat(el.value) || 0;
      else if (el.type === "date") value = el.value;
      else value = parseInt(el.value, 10);
      if (Number.isNaN(value)) return;
      const from = getPath(state.save, path);
      if (from === value) return;
      state.focusPath = path;
      const label = `✎ ${path}`;
      commit(label, (save) => setPath(save, path, value));
    });

    document.addEventListener("input", (e) => {
      if (e.target.id === "sq-q") {
        state.squad.q = e.target.value;
        const wrap = e.target.closest(".view");
        const pos = e.target.selectionStart;
        paint();
        const again = $("#sq-q");
        if (again) { again.focus(); again.setSelectionRange(pos, pos); }
        return;
      }
      if (e.target.id === "sq-pos") { state.squad.pos = e.target.value; paint(); }
      if (e.target.id === "sq-listed") { state.squad.listedOnly = e.target.checked; paint(); }
    });

    $("#undoBtn").addEventListener("click", undo);
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    });

    $("#diffBtn").addEventListener("click", () => { $("#drawer").hidden = false; });
    $("#drawerClose").addEventListener("click", () => { $("#drawer").hidden = true; });

    $("#exportBtn").addEventListener("click", () => {
      const s = state.save;
      const name = `wsc-sandbox-${(s.club.name || "kulup").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${s.season?.label?.replace("/", "-") || "kayit"}.json`;
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Kayıt dışa aktarıldı");
    });

    $("#importFile").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = normalise(JSON.parse(await file.text()));
        const before = clone(state.save);
        const diff = diffObjects(before, data);
        state.changes.push({ label: `↧ ${file.name} içe alındı`, before, after: data, diff, at: Date.now() });
        state.save = data;
        persist(); paint();
        toast("Kayıt içe alındı");
      } catch (err) {
        toast("JSON okunamadı: " + err.message);
      }
      e.target.value = "";
    });
  }

  function undo() {
    const last = state.changes.pop();
    if (!last) { toast("Geri alınacak değişiklik yok"); return; }
    state.save = clone(last.before);
    persist();
    paint();
    toast("Geri alındı: " + last.label);
  }

  /* ---------------- başlat ---------------- */

  async function boot() {
    try {
      await loadDemo();
      if (restoreLocal()) toast("Yerel kayıt geri yüklendi");
    } catch (err) {
      document.body.innerHTML = `<pre style="padding:24px;color:#f88">Başlatma hatası: ${esc(err.message)}</pre>`;
      return;
    }
    wire();
    paint();
  }

  boot();
})();
