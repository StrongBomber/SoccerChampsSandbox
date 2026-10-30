/* In-Game Editor — Football Manager oyun içi editörünün birebir muadili.
 * Ekran akışı: Genel Bakış → Kulüp / Oyuncular / Personel / Finans / Müsabakalar / Tercihler
 * Düzenleme modeli: değişiklikler sahnelenir, "Değişiklikleri Kaydet" ile kalıcılaşır.
 */
(function () {
  "use strict";

  const { POSITIONS, POSITION_LABEL, GROUPS, STAFF_ATTRS, ENUMS, attrColor, abilityColor, fmt } = window.FM;

  const LS_KEY = "wsc-fm-editor-v1";
  const DEMO_URL = "./demo-save.json";

  const TABS = [
    { id: "overview", label: "Genel Bakış" },
    { id: "club", label: "Kulüp" },
    { id: "players", label: "Oyuncular" },
    { id: "staff", label: "Personel" },
    { id: "finances", label: "Finans" },
    { id: "competitions", label: "Müsabakalar" },
    { id: "preferences", label: "Tercihler" },
  ];

  const S = {
    save: null,
    demo: null,
    saved: null,
    route: "overview",
    playerId: null,
    playerTab: "profile",
    staffId: null,
    q: "",
    posFilter: "ALL",
    sort: "ca",
    changes: [],
    history: [],
    prefs: { confirmLeave: true, attrColors: true, showAbility: true, autoSave: false },
    focusKey: null,
  };

  /* ---------------- temel yardımcılar ---------------- */

  const $ = (s, r = document) => r.querySelector(s);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let CTLS = [];
  function ctl(get, set) { CTLS.push({ get, set }); return CTLS.length - 1; }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2000);
  }

  function dirty() {
    return JSON.stringify(S.save) !== JSON.stringify(S.saved);
  }

  function commit(label, mutate) {
    const before = clone(S.save);
    mutate(S.save);
    if (JSON.stringify(before) === JSON.stringify(S.save)) return false;
    const entry = { label, before, at: new Date() };
    S.changes.push(entry);
    S.history.push(entry);
    if (S.prefs.autoSave) persist();
    paint();
    return true;
  }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S.save)); } catch (_) { /* kota */ }
    S.saved = clone(S.save);
    S.changes = [];            // kaydedilen düzenlemeler geri alınabilir yığından çıkar
    paintStatus();
  }

  /* ---------------- kontrol üreticileri ---------------- */

  function numRow(label, getter, setter, opt = {}) {
    const { min = 0, max = 999999999, step = 1, unit = "", hint = false } = opt;
    const v = Number(getter()) || 0;
    const id = ctl(getter, setter);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value">
        <span class="stepper ${opt.wide ? "wide" : ""}">
          <button type="button" data-step="-1" data-ctl="${id}" tabindex="-1">−</button>
          <input type="number" data-ctl="${id}" value="${v}" min="${min}" max="${max}" step="${step}" />
          <button type="button" data-step="1" data-ctl="${id}" tabindex="-1">+</button>
        </span>
        <span class="unit">${esc(unit)}</span>
      </span>
    </div>`;
  }

  function selRow(label, getter, setter, options, hint = false) {
    const v = getter();
    const id = ctl(getter, setter);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value">
        <select class="field" data-ctl="${id}">
          ${options.map((o) => `<option value="${esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("")}
        </select>
      </span>
    </div>`;
  }

  function txtRow(label, getter, setter, type = "text", hint = false) {
    const id = ctl(getter, setter);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value"><input class="field" type="${type}" data-ctl="${id}" value="${esc(getter())}" /></span>
    </div>`;
  }

  function moneyRow(label, getter, setter, hint = false) {
    const id = ctl(getter, setter);
    return `<div class="row ${hint ? "hint" : ""}">
      <span class="label">${esc(label)}</span>
      <span class="value">
        <span class="stepper wide">
          <button type="button" data-step="-100000" data-ctl="${id}" tabindex="-1">−</button>
          <input type="number" data-ctl="${id}" value="${Number(getter()) || 0}" step="100000" />
          <button type="button" data-step="100000" data-ctl="${id}" tabindex="-1">+</button>
        </span>
        <span class="unit">${esc(fmt.money(getter()))}</span>
      </span>
    </div>`;
  }

  /* ---------------- görünümler ---------------- */

  const views = {
    /* ===== GENEL BAKIŞ ===== */
    overview() {
      const s = S.save;
      const squadValue = s.players.reduce((a, p) => a + (p.value || 0), 0);
      const wages = s.players.reduce((a, p) => a + (p.contract?.wage || 0), 0);
      const avgCa = s.players.length ? Math.round(s.players.reduce((a, p) => a + p.ca, 0) / s.players.length) : 0;
      const expiring = s.players.filter((p) => String(p.contract?.expiry) < "2027-07-01").length;
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
          <div class="stat"><div class="k">Haftalık Maaş</div><div class="v">${fmt.money(wages)}</div><div class="s">Bütçenin %${wagePct}'i</div></div>
          <div class="stat"><div class="k">Sözleşmesi Biten</div><div class="v">${expiring}</div><div class="s">1 yıl içinde</div></div>
        </div>

        <div style="height:12px"></div>

        <div class="cols">
          <div class="card">
            <div class="card-head">Son Düzenlemeler <span class="sub">${S.history.length} değişiklik</span></div>
            <div class="card-body">
              ${S.history.length ? S.history.slice(-8).reverse().map((c) => `
                <div class="row"><span class="label">${esc(c.label)}</span>
                <span class="value muted mono">${c.at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")
                : `<div class="row"><span class="label muted">Henüz düzenleme yapılmadı.</span><span class="value"></span></div>`}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Hızlı Erişim</div>
            <div class="card-body pad">
              <div class="chips">
                <button class="btn" style="background:#2a2a36" data-goto="players">Kadroyu Düzenle</button>
                <button class="btn" style="background:#2a2a36" data-goto="club">Kulüp Bilgisi</button>
                <button class="btn" style="background:#2a2a36" data-goto="finances">Finans</button>
                <button class="btn" style="background:#2a2a36" data-goto="staff">Personel</button>
                <button class="btn" style="background:#2a2a36" data-goto="competitions">Müsabakalar</button>
              </div>
              <p class="muted" style="font-size:11.5px;line-height:1.55;margin:12px 0 0">
                Bu ekran Football Manager'ın <b>In-Game Editor</b> akışını izler: değerler sahnelenir,
                sağ üstteki <b>Değişiklikleri Kaydet</b> ile kalıcılaşır, <b>Geri Al</b> ile son düzenleme geri alınır.
              </p>
            </div>
          </div>
        </div>`;
    },

    /* ===== KULÜP ===== */
    club() {
      const c = S.save.club;
      return `
        <div class="cols">
          <div class="card">
            <div class="card-head">Kulüp Bilgisi</div>
            <div class="card-body">
              ${txtRow("Ad", () => c.name, (v) => (c.name = v))}
              ${txtRow("Kısa Ad", () => c.shortName, (v) => (c.shortName = v))}
              ${txtRow("Lig", () => c.league, (v) => (c.league = v))}
              ${txtRow("Ülke", () => c.country, (v) => (c.country = v))}
              ${selRow("Statü", () => c.status, (v) => (c.status = v), ENUMS.clubStatus)}
              ${numRow("İtibar", () => c.reputation, (v) => (c.reputation = v), { min: 1, max: 10000, unit: "/ 10.000", hint: true })}
              ${txtRow("Stadyum", () => c.stadium, (v) => (c.stadium = v))}
              ${numRow("Kapasite", () => c.capacity, (v) => (c.capacity = v), { min: 0, max: 200000, step: 500, unit: "kişi" })}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Tesisler</div>
            <div class="card-body">
              ${numRow("Antrenman Tesisi", () => c.trainingFacilities, (v) => (c.trainingFacilities = v), { min: 1, max: 20, hint: true })}
              ${numRow("Altyapı Tesisi", () => c.youthFacilities, (v) => (c.youthFacilities = v), { min: 1, max: 20 })}
              ${numRow("Genç Oyuncu Keşfi", () => c.youthRecruitment, (v) => (c.youthRecruitment = v), { min: 1, max: 20 })}
              ${numRow("Genç Antrenörlük", () => c.juniorCoaching, (v) => (c.juniorCoaching = v), { min: 1, max: 20 })}
              ${txtRow("Antrenman Sahası", () => c.trainingGround, (v) => (c.trainingGround = v))}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Finans Özeti <span class="sub">Kulüp</span></div>
            <div class="card-body">
              ${moneyRow("Bakiye", () => c.finances.balance, (v) => (c.finances.balance = v))}
              ${moneyRow("Transfer Bütçesi", () => c.finances.transferBudget, (v) => (c.finances.transferBudget = v))}
              ${moneyRow("Maaş Bütçesi", () => c.finances.wageBudget, (v) => (c.finances.wageBudget = v))}
              ${moneyRow("Sponsorluk", () => c.finances.sponsorship, (v) => (c.finances.sponsorship = v))}
              ${moneyRow("Borç", () => c.finances.debt, (v) => (c.finances.debt = v))}
              ${numRow("Sezonluk Bilet", () => c.finances.seasonTicketPrice, (v) => (c.finances.seasonTicketPrice = v), { min: 0, max: 100000, unit: "€" })}
            </div>
          </div>
        </div>`;
    },

    /* ===== OYUNCULAR ===== */
    players() {
      const s = S.save;
      const list = filteredPlayers();
      if (!list.some((p) => p.id === S.playerId)) S.playerId = list[0]?.id ?? s.players[0]?.id ?? null;
      const p = s.players.find((x) => x.id === S.playerId);

      return `<div class="split">
        <div class="list-panel">
          <div class="list-toolbar">
            <input id="pq" type="search" placeholder="Oyuncu ara…" value="${esc(S.q)}" />
            <div class="filters">
              ${[["ALL", "Tümü"], ["GK", "KL"], ["DEF", "DEF"], ["MID", "ORT"], ["ATT", "FOR"]].map(([k, l]) => `
                <button data-pos-filter="${k}" class="${S.posFilter === k ? "active" : ""}">${l}</button>`).join("")}
            </div>
            <select id="psort">
              ${[["ca", "CA'ya göre"], ["name", "İsme göre"], ["value", "Değere göre"], ["age", "Yaşa göre"]].map(([k, l]) => `
                <option value="${k}" ${S.sort === k ? "selected" : ""}>${l}</option>`).join("")}
            </select>
          </div>
          <div class="list">
            ${list.map((x) => `
              <div class="list-row ${x.id === S.playerId ? "active" : ""}" data-player="${x.id}">
                <span class="badge-pos ${esc(x.position)}">${esc(x.position)}</span>
                <div>
                  <div class="nm">${esc(x.name)}</div>
                  <div class="sub">${x.age} yaş · ${esc(x.nationality)}</div>
                </div>
                <div class="ca-mini" style="color:${abilityColor(x.ca)}">${x.ca}<small> / ${x.pa}</small></div>
              </div>`).join("")}
            ${list.length ? "" : `<div class="list-row"><span></span><div class="nm muted">Sonuç yok</div><span></span></div>`}
          </div>
        </div>

        ${p ? playerDetail(p) : `<div class="card"><div class="card-body pad muted">Oyuncu seçilmedi.</div></div>`}
      </div>`;
    },

    /* ===== PERSONEL ===== */
    staff() {
      const s = S.save;
      if (!s.staff.some((x) => x.id === S.staffId)) S.staffId = s.staff[0]?.id ?? null;
      const m = s.staff.find((x) => x.id === S.staffId);

      return `<div class="split">
        <div class="list-panel">
          <div class="list-toolbar"><input placeholder="Personel ara…" value="" disabled /></div>
          <div class="list">
            ${s.staff.map((x) => `
              <div class="list-row ${x.id === S.staffId ? "active" : ""}" data-staff="${x.id}">
                <span class="badge-pos" style="background:#2a2140;color:#cfc7ee">${x.role.slice(0, 3).toUpperCase()}</span>
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
                ${selRow("Görev", () => m.role, (v) => (m.role = v), ENUMS.staffRole)}
                ${numRow("Yaş", () => m.age, (v) => (m.age = v), { min: 18, max: 90 })}
                ${numRow("Mevcut Kabiliyet (CA)", () => m.ca, (v) => (m.ca = v), { min: 1, max: 200 })}
                ${numRow("Potansiyel Kabiliyet (PA)", () => m.pa, (v) => (m.pa = v), { min: 1, max: 200 })}
                ${numRow("İtibar", () => m.reputation, (v) => (m.reputation = v), { min: 1, max: 10000 })}
                ${moneyRow("Maaş", () => m.wage, (v) => (m.wage = v))}
                ${txtRow("Sözleşme Bitişi", () => m.contract, (v) => (m.contract = v), "date")}
              </div>
            </div>

            <div class="card">
              <div class="card-head">Nitelikler</div>
              <div class="card-body">
                ${STAFF_ATTRS.map((k) => attrRow(k, () => m.attributes[k], (v) => (m.attributes[k] = v))).join("")}
              </div>
            </div>
          </div>
        </div>` : `<div class="card"><div class="card-body pad muted">Personel seçilmedi.</div></div>`}
      </div>`;
    },

    /* ===== FİNANS ===== */
    finances() {
      const f = S.save.club.finances;
      const wages = S.save.players.reduce((a, p) => a + (p.contract?.wage || 0), 0);
      const pct = f.wageBudget ? Math.round((wages / f.wageBudget) * 100) : 0;
      return `
        <div class="cols">
          <div class="card">
            <div class="card-head">Bütçeler</div>
            <div class="card-body">
              ${moneyRow("Bakiye", () => f.balance, (v) => (f.balance = v))}
              ${moneyRow("Transfer Bütçesi", () => f.transferBudget, (v) => (f.transferBudget = v))}
              ${moneyRow("Maaş Bütçesi (haftalık)", () => f.wageBudget, (v) => (f.wageBudget = v))}
              ${moneyRow("Sponsorluk (yıllık)", () => f.sponsorship, (v) => (f.sponsorship = v))}
              ${moneyRow("Borç", () => f.debt, (v) => (f.debt = v))}
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
            </div>
          </div>

          <div class="card">
            <div class="card-head">Sezon Projeksiyonu</div>
            <div class="card-body">
              ${moneyRow("Beklenen Gelir", () => f.projectedIncome, (v) => (f.projectedIncome = v))}
              ${moneyRow("Beklenen Gider", () => f.projectedExpenditure, (v) => (f.projectedExpenditure = v))}
              ${numRow("Sezonluk Bilet", () => f.seasonTicketPrice, (v) => (f.seasonTicketPrice = v), { min: 0, max: 100000, unit: "€" })}
              <div class="row"><span class="label">Net</span><span class="value mono" style="color:${f.projectedIncome - f.projectedExpenditure >= 0 ? "var(--green)" : "var(--red)"}">
                ${fmt.money(f.projectedIncome - f.projectedExpenditure)}</span></div>
            </div>
          </div>
        </div>`;
    },

    /* ===== MÜSABAKALAR ===== */
    competitions() {
      const comps = S.save.competitions;
      return `
        <div class="card">
          <div class="card-head">Müsabakalar</div>
          <table class="grid">
            <thead><tr><th>Müsabaka</th><th class="num">Seviye</th><th class="num">İtibar</th><th class="num">Takım</th><th class="num">Ödül Havuzu</th><th>Format</th></tr></thead>
            <tbody>
              ${comps.map((c, i) => `<tr>
                <td>${esc(c.name)}</td>
                <td class="num">${stepperInline(ctl(() => c.level, (v) => (c.level = v)), c.level, 1, 5)}</td>
                <td class="num">${stepperInline(ctl(() => c.reputation, (v) => (c.reputation = v)), c.reputation, 1, 10000, 100)}</td>
                <td class="num">${stepperInline(ctl(() => c.teams, (v) => (c.teams = v)), c.teams, 2, 200)}</td>
                <td class="num">${stepperInline(ctl(() => c.prizeMoney, (v) => (c.prizeMoney = v)), c.prizeMoney, 0, 999999999, 1000000)}</td>
                <td class="muted">${esc(c.matchRules)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-head">Lig Tablosu <span class="sub">salt okunur — sezon verisi</span></div>
          <table class="grid">
            <thead><tr><th>#</th><th>Takım</th><th class="num">O</th><th class="num">P</th><th class="num">AV</th></tr></thead>
            <tbody>
              ${S.save.leagueTable.map((r, i) => `<tr>
                <td class="num">${i + 1}</td><td>${esc(r.team)}</td>
                <td class="num">${r.played}</td>
                <td class="num" style="font-weight:700">${r.points}</td>
                <td class="num">${r.gd > 0 ? "+" : ""}${r.gd}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    },

    /* ===== TERCİHLER ===== */
    preferences() {
      const p = S.prefs;
      return `
        <div class="cols">
          <div class="card">
            <div class="card-head">Editör Tercihleri</div>
            <div class="card-body">
              ${switchRow("Kaydetmeden çıkarken uyar", p.confirmLeave, (v) => (p.confirmLeave = v))}
              ${switchRow("Nitelikleri renklendir (1–20)", p.attrColors, (v) => (p.attrColors = v))}
              ${switchRow("CA / PA sütunlarını göster", p.showAbility, (v) => (p.showAbility = v))}
              ${switchRow("Her düzenlemede otomatik kaydet", p.autoSave, (v) => (p.autoSave = v))}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kayıt İşlemleri</div>
            <div class="card-body pad">
              <div class="chips">
                <button class="btn" style="background:#2a2a36" id="exportBtn">JSON Dışa Aktar</button>
                <label class="btn" style="background:#2a2a36;cursor:pointer">JSON İçe Al
                  <input type="file" id="importFile" accept=".json" hidden />
                </label>
                <button class="btn" style="background:#2a2a36" id="resetBtn">Demo Kayda Dön</button>
              </div>
              <p class="muted" style="font-size:11.5px;line-height:1.55;margin-top:12px">
                Dışa aktarılan JSON, <span class="mono">tools/wsc-save.sh push</span> ile cihaza geri yazılabilir
                (root veya emülatör gerekir). Ayrıntı: <span class="mono">docs/ROOTSUZ-KURULUM.md</span>
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Hakkında</div>
            <div class="card-body pad">
              <div class="hint-box">
                <span>ℹ</span>
                <div>
                  Alan adları (CA/PA, nitelikler, itibar, tesisler, sözleşme) Football Manager'ın
                  In-Game Editor başlıklarıyla eşleşir. Veri kaynağı World Soccer Champs 2026.12'dir;
                  gerçek kayıt şeması REA analizinde (<span class="mono">docs/REA-ANALYSIS.md</span>) çıkarılan
                  sınıf/anahtar isimlerine dayanır.
                </div>
              </div>
            </div>
          </div>
        </div>`;
    },
  };

  /* ---------------- oyuncu detayı ---------------- */

  function playerDetail(p) {
    const tab = S.playerTab;
    const body = {
      profile: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Kişisel Bilgiler</div>
            <div class="card-body">
              ${txtRow("Ad Soyad", () => p.name, (v) => (p.name = v))}
              ${numRow("Yaş", () => p.age, (v) => (p.age = v), { min: 15, max: 60 })}
              ${txtRow("Doğum Tarihi", () => p.dob, (v) => (p.dob = v), "date")}
              ${txtRow("Uyruk", () => p.nationality, (v) => (p.nationality = v))}
              ${txtRow("İkinci Uyruk", () => p.secondNationality || "", (v) => (p.secondNationality = v))}
              ${selRow("Ana Pozisyon", () => p.position, (v) => { p.position = v; }, POSITIONS)}
              ${selRow("Kullandığı Ayak", () => p.foot, (v) => (p.foot = v), ENUMS.foot)}
              ${numRow("Boy", () => p.height, (v) => (p.height = v), { min: 140, max: 220, unit: "cm" })}
              ${numRow("Kilo", () => p.weight, (v) => (p.weight = v), { min: 40, max: 130, unit: "kg" })}
            </div>
          </div>

          <div class="card">
            <div class="card-head">Kabiliyet & İtibar</div>
            <div class="card-body">
              ${numRow("Mevcut Kabiliyet (CA)", () => p.ca, (v) => (p.ca = v), { min: 1, max: 200, hint: true })}
              ${numRow("Potansiyel Kabiliyet (PA)", () => p.pa, (v) => (p.pa = v), { min: 1, max: 200, hint: true })}
              ${numRow("İtibar — Mevcut", () => p.reputation.current, (v) => (p.reputation.current = v), { min: 1, max: 10000 })}
              ${numRow("İtibar — Ülke", () => p.reputation.home, (v) => (p.reputation.home = v), { min: 1, max: 10000 })}
              ${numRow("İtibar — Dünya", () => p.reputation.world, (v) => (p.reputation.world = v), { min: 1, max: 10000 })}
              <div class="row"><span class="label">Pi̇yasa Değeri</span>
                <span class="value mono">${fmt.money(p.value)}</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Pozisyon Uygunluğu <span class="sub">0–20</span></div>
            <div class="pos-grid">
              ${POSITIONS.map((pos) => {
                const id = ctl(() => p.positions[pos] ?? 0, (v) => (p.positions[pos] = v));
                const v = p.positions[pos] ?? 0;
                return `<div class="pos-cell">
                  <div class="p">${pos}</div>
                  <input type="number" min="0" max="20" data-ctl="${id}" value="${v}"
                    style="color:${S.prefs.attrColors ? attrColor(v) : "inherit"}" title="${esc(POSITION_LABEL[pos])}" />
                </div>`;
              }).join("")}
            </div>
          </div>
        </div>`,

      attributes: `
        <div class="attrs">
          ${GROUPS.map((g) => `
            <div class="attr-group">
              <h3>${esc(g.title)}${g.id === "gk" ? " · Kaleci" : ""}</h3>
              <div style="padding:6px 0 8px">
                ${g.keys.map((k) => attrRow(k, () => p.attributes[k] ?? 0, (v) => (p.attributes[k] = v))).join("")}
              </div>
            </div>`).join("")}
        </div>`,

      contract: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Sözleşme</div>
            <div class="card-body">
              ${txtRow("Kulüp", () => p.club, (v) => (p.club = v))}
              ${selRow("Sözleşme Türü", () => p.contract.type, (v) => (p.contract.type = v), ENUMS.contractType)}
              ${txtRow("Bitiş Tarihi", () => p.contract.expiry, (v) => (p.contract.expiry = v), "date")}
              ${moneyRow("Haftalık Ücret", () => p.contract.wage, (v) => (p.contract.wage = v))}
              ${moneyRow("İmza Bonusu", () => p.contract.signingBonus, (v) => (p.contract.signingBonus = v))}
              ${moneyRow("Serbest Kalma Maddesi", () => p.contract.releaseClause, (v) => (p.contract.releaseClause = v))}
            </div>
          </div>
          <div class="card">
            <div class="card-head">Transfer Durumu</div>
            <div class="card-body">
              ${selRow("Durum", () => p.contract.status, (v) => (p.contract.status = v), ENUMS.transferStatus)}
              ${moneyRow("Piyasa Değeri", () => p.value, (v) => (p.value = v))}
              <div class="row"><span class="label">Kalan Süre</span>
                <span class="value mono">${monthsLeft(p.contract.expiry)} ay</span></div>
            </div>
          </div>
        </div>`,

      personal: `
        <div class="cols">
          <div class="card">
            <div class="card-head">Durum</div>
            <div class="card-body">
              ${selRow("Moral", () => p.morale, (v) => (p.morale = v), ENUMS.morale)}
              ${numRow("Kondisyon", () => p.condition, (v) => (p.condition = v), { min: 0, max: 100, unit: "%" })}
              ${numRow("Yorgunluk", () => p.jadedness, (v) => (p.jadedness = v), { min: 0, max: 100, unit: "%" })}
              ${numRow("Keskinlik", () => p.sharpness, (v) => (p.sharpness = v), { min: 0, max: 100, unit: "%" })}
              ${numRow("Sakatlık", () => p.injuryWeeks, (v) => (p.injuryWeeks = v), { min: 0, max: 52, unit: "hafta" })}
            </div>
          </div>
          <div class="card">
            <div class="card-head">Kişilik</div>
            <div class="card-body">
              ${selRow("Kişilik", () => p.personality, (v) => (p.personality = v), ENUMS.personality)}
              ${selRow("Medya ile İlişki", () => p.mediaHandling, (v) => (p.mediaHandling = v), ENUMS.media)}
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
          </div>
        </div>
        <div class="ability">
          <div class="item"><div class="k">CA</div><div class="v" style="color:${abilityColor(p.ca)}">${p.ca}</div></div>
          <div class="item"><div class="k">PA</div><div class="v pa">${p.pa}</div></div>
        </div>
      </div>

      <div class="subtabs">
        ${[["profile", "Profil"], ["attributes", "Nitelikler"], ["contract", "Sözleşme"], ["personal", "Kişisel"]].map(([k, l]) => `
          <button class="subtab ${tab === k ? "active" : ""}" data-ptab="${k}">${l}</button>`).join("")}
      </div>

      ${body}
    </div>`;
  }

  function attrRow(label, getter, setter) {
    const v = Number(getter()) || 0;
    const id = ctl(getter, setter);
    const c = S.prefs.attrColors ? attrColor(v) : "inherit";
    return `<div class="attr">
      <span class="n">${esc(label)}</span>
      <span class="meter">
        <i><b style="width:${Math.min(100, (v / 20) * 100)}%;background:${c === "inherit" ? "#6b7280" : c}"></b></i>
        <input type="number" min="1" max="20" data-ctl="${id}" value="${v}" style="color:${c}" />
      </span>
    </div>`;
  }

  function stepperInline(id, value, min, max, step = 1) {
    return `<span class="stepper">
      <button type="button" data-step="-${step}" data-ctl="${id}" tabindex="-1">−</button>
      <input type="number" data-ctl="${id}" value="${value}" min="${min}" max="${max}" step="${step}" style="width:86px" />
      <button type="button" data-step="${step}" data-ctl="${id}" tabindex="-1">+</button>
    </span>`;
  }

  function switchRow(label, value, setter) {
    const id = ctl(() => value, setter);
    return `<div class="switch-row">
      <span>${esc(label)}</span>
      <label class="switch"><input type="checkbox" data-ctl="${id}" ${value ? "checked" : ""} /><span></span></label>
    </div>`;
  }

  function monthsLeft(expiry) {
    if (!expiry) return 0;
    const d = new Date(expiry);
    const now = new Date(S.save.game.date);
    const m = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    return Math.max(0, m);
  }

  function filteredPlayers() {
    const q = S.q.trim().toLocaleLowerCase("tr");
    return S.save.players
      .filter((p) => {
        if (q && !p.name.toLocaleLowerCase("tr").includes(q)) return false;
        if (S.posFilter === "ALL") return true;
        if (S.posFilter === "GK") return p.position === "GK";
        if (S.posFilter === "DEF") return ["DC", "DL", "DR"].includes(p.position);
        if (S.posFilter === "MID") return ["DM", "MC", "ML", "MR", "AMC", "AML", "AMR"].includes(p.position);
        if (S.posFilter === "ATT") return p.position === "ST";
        return true;
      })
      .sort((a, b) => {
        if (S.sort === "name") return a.name.localeCompare(b.name, "tr");
        if (S.sort === "value") return b.value - a.value;
        if (S.sort === "age") return a.age - b.age;
        return b.ca - a.ca;
      });
  }

  /* ---------------- çizim / olaylar ---------------- */

  function paintTabs() {
    $("#tabs").innerHTML = TABS.map((t) => `
      <button class="tab ${S.route === t.id ? "active" : ""}" data-route="${t.id}">${t.label}</button>`).join("");
  }

  function paintStatus() {
    const d = dirty();
    const pill = $("#dirtyPill");
    pill.textContent = d ? "Kaydedilmedi" : "Kaydedildi";
    pill.classList.toggle("dirty", d);
    $("#undoBtn").disabled = S.changes.length === 0;
    $("#saveBtn").disabled = !d;
    const staged = S.changes.length;
    $("#statusLeft").textContent =
      `${staged ? staged + " bekleyen düzenleme" : "bekleyen düzenleme yok"} · ${d ? "kaydedilmedi" : "kayıtlı"} · toplam ${S.history.length}`;
    const p = S.save;
    $("#statusRight").textContent =
      `${p.club.name} · ${p.game.season} · ${p.players.length} oyuncu · CA/PA 1–200 · nitelikler 1–20`;
  }

  function paint() {
    CTLS = [];
    paintTabs();
    $("#view").innerHTML = views[S.route]();
    $("#brandSub").textContent = `${S.save.meta.game} · ${S.save.game.season}`;
    paintStatus();
    if (S.focusKey) {
      const el = document.querySelector(`[data-focus="${S.focusKey}"]`);
      S.focusKey = null;
    }
  }

  function applyCtl(id, raw, isStep) {
    const c = CTLS[id];
    if (!c) return;
    const cur = Number(c.get());
    let next;
    if (isStep) next = cur + Number(raw);
    else if (typeof c.get() === "boolean") next = raw;
    else if (typeof c.get() === "number") next = Number(raw);
    else next = raw;
    if (typeof c.get() === "number" && Number.isNaN(next)) return;
    const label = `Değer güncellendi`;
    commit(label, () => c.set(next));
  }

  function wire() {
    document.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-route]");
      if (tab) { S.route = tab.dataset.route; paint(); return; }

      const goto = e.target.closest("[data-goto]");
      if (goto) { S.route = goto.dataset.goto; paint(); return; }

      const pl = e.target.closest("[data-player]");
      if (pl) { S.playerId = Number(pl.dataset.player); paint(); return; }

      const st = e.target.closest("[data-staff]");
      if (st) { S.staffId = Number(st.dataset.staff); paint(); return; }

      const pt = e.target.closest("[data-ptab]");
      if (pt) { S.playerTab = pt.dataset.ptab; paint(); return; }

      const pf = e.target.closest("[data-pos-filter]");
      if (pf) { S.posFilter = pf.dataset.posFilter; paint(); return; }

      const stepBtn = e.target.closest("[data-step]");
      if (stepBtn) {
        e.preventDefault();
        applyCtl(Number(stepBtn.dataset.ctl), stepBtn.dataset.step, true);
        return;
      }

      if (e.target.closest("#undoBtn")) { undo(); return; }
      if (e.target.closest("#saveBtn")) { persist(); toast("Değişiklikler kaydedildi"); return; }
      if (e.target.closest("#exportBtn")) { exportJson(); return; }
      if (e.target.closest("#resetBtn")) {
        if (!confirm("Demo kayda dönülsün mü? Düzenlemeler kaybolur.")) return;
        S.save = clone(S.demo); S.changes = []; S.history = []; persist(); paint(); toast("Demo kayıt yüklendi");
        return;
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target.id === "globalSearch") { S.q = e.target.value; if (S.route !== "players") { S.route = "players"; } paint(); $("#globalSearch").focus(); return; }
      if (e.target.id === "pq") { S.q = e.target.value; const pos = e.target.selectionStart; paint(); const el = $("#pq"); if (el) { el.focus(); el.setSelectionRange(pos, pos); } return; }
      if (e.target.id === "psort") { S.sort = e.target.value; paint(); return; }
    });

    document.addEventListener("change", (e) => {
      const el = e.target.closest("[data-ctl]");
      if (!el) return;
      const raw = el.type === "checkbox" ? el.checked : el.value;
      applyCtl(Number(el.dataset.ctl), raw, false);
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); persist(); toast("Değişiklikler kaydedildi"); }
    });

    $("#importFile")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        S.save = data; S.changes = []; S.history = []; persist(); paint(); toast("Kayıt içe alındı");
      } catch (err) { toast("JSON okunamadı: " + err.message); }
      e.target.value = "";
    });

    window.addEventListener("beforeunload", (e) => {
      if (S.prefs.confirmLeave && dirty()) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  function undo() {
    const last = S.changes.pop();
    if (!last) { toast("Geri alınacak düzenleme yok"); return; }
    S.save = clone(last.before);
    paint();
    toast("Geri alındı");
  }

  function exportJson() {
    const name = `wsc-editor-${(S.save.club.name || "kulup").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.json`;
    const blob = new Blob([JSON.stringify(S.save, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("JSON dışa aktarıldı");
  }

  async function boot() {
    try {
      const res = await fetch(DEMO_URL, { cache: "no-store" });
      S.demo = await res.json();
      let local = null;
      try { local = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (_) { local = null; }
      S.save = local || clone(S.demo);
      S.saved = clone(S.save);
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
