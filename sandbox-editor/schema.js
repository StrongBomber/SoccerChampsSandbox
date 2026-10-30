/* Sandbox Editor — alan şeması, biçimlendirme ve sandbox araçları.
 *
 * Alan adları REA ile native `libWorldSoccerChamps.so` üzerinden çıkarılan
 * sınıf/anahtar isimlerine dayanır (docs/REA-ANALYSIS.md):
 *   Career, CareerManager, DataManager, DataPlayer, PlayerMarketValue,
 *   TransferBudget, TransferListed, PlayerLoans, ClubId, PlayerPosition, ...
 * Gerçek oyun serileştirmesi birebir doğrulanmadığı için eşleme "uyarlanabilir"
 * tutuldu: aynı alanlar farklı anahtar adlarıyla gelirse `ALIASES` kullanılır.
 */
(function (global) {
  "use strict";

  const POSITIONS = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

  // Olası gerçek anahtar adları -> editör alanı
  const ALIASES = {
    player: {
      id: ["id", "playerId", "PlayerId", "pid"],
      name: ["name", "playerName", "PlayerName", "fullName"],
      pos: ["pos", "position", "PlayerPosition", "Position"],
      age: ["age", "Age"],
      ovr: ["ovr", "rating", "Rating", "currentAbility", "ability"],
      pot: ["pot", "potential", "Potential", "potentialAbility"],
      value: ["value", "marketValue", "PlayerMarketValue", "price"],
      wage: ["wage", "salary", "Salary", "weeklyWage"],
      contract: ["contract", "contractEnd", "contractUntil", "Contract"],
      morale: ["morale", "Morale"],
      fitness: ["fitness", "condition", "Fitness"],
      form: ["form", "Form"],
      listed: ["listed", "transferListed", "TransferListed"],
      injuryWeeks: ["injuryWeeks", "injured", "injury"],
    },
  };

  const fmt = {
    money(v, currency) {
      const n = Number(v) || 0;
      const cur = currency || "EUR";
      const s = new Intl.NumberFormat("tr-TR", {
        style: "currency", currency: cur, maximumFractionDigits: 0,
      }).format(n);
      return s;
    },
    compact(v) {
      const n = Number(v) || 0;
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",") + " Mr";
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " M";
      if (Math.abs(n) >= 1e3) return Math.round(n / 1e3) + " B";
      return String(n);
    },
    num(v) {
      return new Intl.NumberFormat("tr-TR").format(Number(v) || 0);
    },
    date(v) {
      if (!v) return "—";
      const parts = String(v).split("-");
      if (parts.length !== 3) return String(v);
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    },
  };

  // Sandbox araçları — FM "in-game editor" mantığı: kalıcı veri üzerinde toplu düzenleme.
  const TOOLS = [
    {
      id: "money",
      icon: "💰",
      title: "Sınırsız Bütçe",
      desc: "Kulüp bakiyesi ve transfer bütçesini 1 milyar €'ya çeker. Board güveni etkilenmez.",
      stat: (s) => fmt.money(s.finances.balance, s.finances.currency),
      apply(save) {
        save.finances.balance = 1_000_000_000;
        save.finances.transferBudget = 1_000_000_000;
        save.finances.debt = 0;
        return "Bakiye ve transfer bütçesi 1.000.000.000 € yapıldı.";
      },
    },
    {
      id: "wages",
      icon: "📉",
      title: "Maaş Yükünü Sıfırla",
      desc: "Tüm oyuncuların haftalık maaşını 1.000 €'ya indirir; wage budget altında kalırsın.",
      stat: (s) => fmt.money(s.finances.weeklyWages, s.finances.currency) + " / hafta",
      apply(save) {
        save.players.forEach((p) => { p.wage = 1000; });
        save.finances.weeklyWages = save.players.reduce((a, p) => a + p.wage, 0);
        return `${save.players.length} oyuncunun maaşı güncellendi.`;
      },
    },
    {
      id: "superSquad",
      icon: "⭐",
      title: "Süper Kadro",
      desc: "Tüm oyuncuların güncel kabiliyetini 90, potansiyelini 99 yapar.",
      stat: (s) => "Ort. OVR " + (s.players.reduce((a, p) => a + p.ovr, 0) / Math.max(1, s.players.length)).toFixed(1),
      apply(save) {
        save.players.forEach((p) => { p.ovr = 90; p.pot = 99; });
        return `${save.players.length} oyuncu 90 OVR / 99 POT yapıldı.`;
      },
    },
    {
      id: "morale",
      icon: "🙂",
      title: "Mutlu Soyunma Odası",
      desc: "Moral 95, form 8.5, kondisyon 100. Sakatlıklar sıfırlanır.",
      stat: (s) => "Ort. moral " + Math.round(s.players.reduce((a, p) => a + (p.morale || 0), 0) / Math.max(1, s.players.length)),
      apply(save) {
        save.players.forEach((p) => {
          p.morale = 95; p.form = 8.5; p.fitness = 100; p.injuryWeeks = 0;
        });
        return "Moral, form, kondisyon düzeltildi; sakatlıklar temizlendi.";
      },
    },
    {
      id: "contracts",
      icon: "📝",
      title: "Sözleşme Kilidi",
      desc: "Tüm oyuncuların sözleşmesini 2031-06-30'a uzatır; bonservissiz kayıp riski kalmaz.",
      stat: (s) => {
        const soon = s.players.filter((p) => String(p.contract) < "2027-07-01").length;
        return soon + " oyuncunun sözleşmesi 1 yıl içinde bitiyor";
      },
      apply(save) {
        save.players.forEach((p) => { p.contract = "2031-06-30"; });
        return "Tüm sözleşmeler 2031-06-30 yapıldı.";
      },
    },
    {
      id: "values",
      icon: "💎",
      title: "Piyasa Değeri ×2",
      desc: "Tüm oyuncuların piyasa değerini ikiye katlar (satış geliri ve kadro değeri artar).",
      stat: (s) => fmt.money(s.players.reduce((a, p) => a + (p.value || 0), 0), s.finances.currency) + " kadro değeri",
      apply(save) {
        save.players.forEach((p) => { p.value = Math.round((p.value || 0) * 2); });
        return "Piyasa değerleri iki katına çıkarıldı.";
      },
    },
    {
      id: "youth",
      icon: "🌱",
      title: "Altyapı + Tesisi Full",
      desc: "Antrenman ve altyapı seviyesini 5'e çeker, kulüp itibarını 95 yapar.",
      stat: (s) => `Tesis ${s.club.trainingLevel}/5 · Altyapı ${s.club.youthLevel}/5`,
      apply(save) {
        save.club.trainingLevel = 5; save.club.youthLevel = 5; save.club.reputation = 95;
        return "Tesisler 5/5, itibar 95.";
      },
    },
    {
      id: "release",
      icon: "🔓",
      title: "Transfer Listesini Temizle",
      desc: "Transfer listesindeki oyuncuları çıkarır; kadro huzuru düzelir.",
      stat: (s) => s.players.filter((p) => p.listed).length + " oyuncu listede",
      apply(save) {
        let n = 0;
        save.players.forEach((p) => { if (p.listed) { p.listed = false; n++; } });
        return `${n} oyuncu transfer listesinden çıkarıldı.`;
      },
    },
  ];

  global.WSC = { POSITIONS, ALIASES, fmt, TOOLS };
})(window);
