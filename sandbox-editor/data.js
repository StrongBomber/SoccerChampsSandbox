/* Football Manager tarzı In-Game Editor — veri sözlüğü.
 * Alan adları FM'nin oyun içi editöründeki başlıklarla eşleşir:
 * Current/Potential Ability, Reputation, Facilities, Contract, Attributes (1-20)...
 */
(function (global) {
  "use strict";

  const POSITIONS = ["GK", "DC", "DL", "DR", "DM", "MC", "ML", "MR", "AMC", "AML", "AMR", "ST"];

  const POSITION_LABEL = {
    GK: "Kaleci", DC: "Stoper", DL: "Sol Bek", DR: "Sağ Bek", DM: "Defansif Orta Saha",
    MC: "Merkez Orta Saha", ML: "Sol Kanat Orta Saha", MR: "Sağ Kanat Orta Saha",
    AMC: "Ofansif Orta Saha", AML: "Sol Kanat", AMR: "Sağ Kanat", ST: "Santrfor",
  };

  const GROUPS = [
    { id: "tech", title: "Teknik", keys: ["Korner", "Orta", "Dribling", "Bitiricilik", "İlk Dokunuş", "Serbest Vuruş", "Kafa Vuruşu", "Uzaktan Şut", "Uzun Taç", "Markaj", "Pas", "Penaltı", "Top Kapma", "Teknik"] },
    { id: "ment", title: "Zihinsel", keys: ["Agresiflik", "Öngörü", "Cesaret", "Soğukkanlılık", "Konsantrasyon", "Karar Verme", "Azim", "Yaratıcılık", "Liderlik", "Topsuz Oyun", "Pozisyon Alma", "Takım Oyunu", "Vizyon", "Çalışkanlık"] },
    { id: "phys", title: "Fiziksel", keys: ["Hızlanma", "Çeviklik", "Denge", "Sıçrama", "Doğal Kondisyon", "Hız", "Dayanıklılık", "Güç"] },
    { id: "gk", title: "Kaleci", keys: ["Hava Toplarına Hakimiyet", "Ceza Sahası Hakimiyeti", "İletişim", "Eksantriklik", "Top Tutma", "Ayakla Oyun Kurma", "Bire Bir", "Refleks", "Çıkışlar", "Yumruk Tercihi", "Top Atma"] },
  ];

  const STAFF_ATTRS = ["Antrenörlük", "Taktik Bilgisi", "Kişi Yönetimi", "Zihinsel Antrenörlük", "Teknik Antrenörlük", "Fiziksel Antrenörlük", "Gençlerle Çalışma"];


  /* FM "Player Traits" (PPM) listesi. */
  const TRAITS = [
    "Kanattan İçeri Kat Eder", "Kanatta Kalır", "Kanat Değiştirir", "Orta Sahaya Girer",
    "Ceza Sahasına Girer", "Arkadan Bindirir", "Ofsayt Taktiği Uygular", "Markajdan Kaçar",
    "Uzun Pas Dener", "Kısa Pas Dener", "Şut Çeker", "Uzaktan Şut Çeker",
    "Topla Oynar", "Topu Hemen Bırakır", "Çalıma Girer", "Pas Yerine Şut Dener",
    "Agresif Pres Yapar", "Sert Müdahale Eder", "Hava Toplarında Öne Çıkar",
    "Penaltıları Kullanır", "Serbest Vuruşları Kullanır", "Kornerleri Kullanır",
    "Kaleci: Topu Uzağa Fırlatır", "Kaleci: Riskli Pas Dener",
  ];

  const INJURIES = [
    "Sakatlık Yok", "Kas Zorlanması", "Burkulma", "Kırık", "Kafa Sarsıntısı",
    "Diz Bağı Zedelenmesi", "Ayak Bileği Burkulması", "Bel Ağrısı", "Grip",
  ];

  const FORMATIONS = ["4-4-2", "4-2-3-1", "4-3-3", "4-1-4-1", "3-5-2", "3-4-3", "5-3-2", "4-4-1-1"];
  const COACHING_STYLES = ["Topa Sahip Olma", "Yüksek Pres", "Kontra Atak", "Dengeli", "Uzun Top", "Kanat Oyunu"];
  const RESPONSIBILITIES = ["Antrenman", "Taktik", "Transfer", "Scout", "Genç Gelişim", "Fiziksel Hazırlık"];
  const AFFILIATION_TYPES = ["Ana Kulüp", "Bağlı Kulüp", "İş Birliği"];
  const SQUAD_TRAINED = ["Kulüpte Yetişti", "Ülkede Yetişti", "Yabancı"];

  const ENUMS = {
    foot: ["Sağ", "Sol", "Her ikisi"],
    morale: ["Çok İyi", "İyi", "Normal", "Düşük", "Çok Düşük"],
    contractType: ["Profesyonel", "Genç Sözleşmesi", "Kiralık", "Amateur", "Yarı Profesyonel"],
    transferStatus: ["Satılık Değil", "Listede", "Kiralık Listesinde", "Kiralık", "Ayrılmak İstiyor"],
    personality: ["Dengeli", "Profesyonel", "Hırslı", "Lider", "Sadık", "Tutkulu", "Sakin", "Kararlı", "Sporcu", "Çekişmeci"],
    media: ["Ölçülü", "Ateşli", "Sakin", "Çekingen", "Konuşkan", "Kavgacı"],
    clubStatus: ["Profesyonel", "Yarı Profesyonel", "Amatör"],
    staffRole: ["Menajer", "Yardımcı Antrenör", "Kaleci Antrenörü", "Baş Scout", "Scout", "Fizyoterapist", "Gençlik Sorumlusu", "Veri Analisti"],
    squadStatus: ["Kadro Dışı", "Yedek", "Rotasyon", "İlk 11", "Kilit Oyuncu", "Yıldız Oyuncu"],
  };

  /** FM nitelik renk skalası (1-20). */
  function attrColor(v) {
    const n = Number(v) || 0;
    if (n <= 5) return "#d9534f";
    if (n <= 9) return "#e0873f";
    if (n <= 13) return "#d9c04a";
    if (n <= 16) return "#8bc46a";
    return "#3fbf6f";
  }

  /** CA/PA 1-200 ölçeği için renk. */
  function abilityColor(v) {
    const n = Number(v) || 0;
    if (n < 100) return "#9aa0aa";
    if (n < 130) return "#8bc46a";
    if (n < 155) return "#3fbf6f";
    if (n < 180) return "#33c9a0";
    return "#e8b339";
  }

  const fmt = {
    money(v, cur = "EUR") {
      const n = Number(v) || 0;
      const abs = Math.abs(n);
      if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + " milyar €";
      if (abs >= 1e6) return (n / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(".", ",") + " M €";
      if (abs >= 1e3) return Math.round(n / 1e3) + " B €";
      return n + " €";
    },
    num(v) { return new Intl.NumberFormat("tr-TR").format(Number(v) || 0); },
    date(v) {
      if (!v) return "—";
      const p = String(v).split("-");
      return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : String(v);
    },
    stars(v) {
      const n = Math.max(1, Math.min(5, Math.round(Number(v) || 1)));
      return "★".repeat(n) + "☆".repeat(5 - n);
    },
  };

  global.FM = {
    POSITIONS, POSITION_LABEL, GROUPS, STAFF_ATTRS, ENUMS, TRAITS, INJURIES,
    FORMATIONS, COACHING_STYLES, RESPONSIBILITIES, AFFILIATION_TYPES, SQUAD_TRAINED,
    attrColor, abilityColor, fmt,
  };
})(window);
