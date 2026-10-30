/* Kayıt dosyası şema tanıma (best-effort heuristic mapping).
 *
 * Amaç: gerçek World Soccer Champs kaydı editörün beklediği alan adlarını
 * kullanmıyorsa bile hangi dizinin oyuncular, hangi nesnenin finans/kulüp
 * olduğunu tahmin edip kullanıcıya raporlamak. Hiçbir veri dönüştürülmez;
 * yalnızca yol (path) ve güven skoru üretilir.
 */
(function (global) {
  "use strict";

  const ALIASES = {
    name: ["name", "fullname", "playername", "displayname", "firstname", "lastname", "surname"],
    age: ["age", "years", "ageyears"],
    position: ["position", "pos", "role", "positioncode", "poscode", "primaryposition"],
    ability: ["ca", "currentability", "ability", "rating", "ovr", "quality", "level", "skill"],
    potential: ["pa", "potentialability", "potential", "ceiling", "upside"],
    value: ["value", "marketvalue", "price", "worth", "transfervalue", "cost"],
    wage: ["wage", "salary", "weeklywage", "income", "pay", "wages"],
    club: ["club", "clubname", "team", "teamname", "currentclub"],
    nation: ["nationality", "nation", "country", "citizenship"],
    finance: ["balance", "transferbudget", "wagebudget", "budget", "cash", "funds", "money", "debt"],
    clubMeta: ["stadium", "capacity", "reputation", "league", "division", "colors", "colours"],
  };

  const lower = (s) => String(s).toLocaleLowerCase("tr");

  function keyScore(keys, aliases) {
    let score = 0;
    const hits = [];
    keys.forEach((k) => {
      const lk = lower(k).replace(/[_\-\s]/g, "");
      if (aliases.some((a) => lk === a || lk.indexOf(a) === 0)) {
        score++;
        hits.push(k);
      }
    });
    return { score, hits };
  }

  function isObj(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  /** Ağaçtaki tüm dizileri ve nesneleri yol bilgisiyle toplar. */
  function collect(root, maxDepth = 8) {
    const arrays = [];
    const objects = [];
    (function walk(node, path, depth) {
      if (depth > maxDepth) return;
      if (Array.isArray(node)) {
        if (node.length && node.every(isObj)) arrays.push({ path, value: node });
        node.slice(0, 50).forEach((child, i) => walk(child, `${path}[${i}]`, depth + 1));
        return;
      }
      if (isObj(node)) {
        objects.push({ path, value: node });
        Object.keys(node).forEach((k) => walk(node[k], path ? `${path}.${k}` : k, depth + 1));
      }
    })(root, "", 0);
    return { arrays, objects };
  }

  function scorePlayersArray(entry) {
    const sample = entry.value.slice(0, 25);
    const keys = [...new Set(sample.flatMap((item) => Object.keys(item)))];
    const parts = {
      name: keyScore(keys, ALIASES.name),
      ability: keyScore(keys, ALIASES.ability),
      age: keyScore(keys, ALIASES.age),
      position: keyScore(keys, ALIASES.position),
      value: keyScore(keys, ALIASES.value),
      wage: keyScore(keys, ALIASES.wage),
    };
    const matched = Object.values(parts).filter((p) => p.score > 0).length;
    // Bir dizi "oyuncu listesi" olabilmesi için en az ad + 2 alan eşleşmeli.
    if (!parts.name.score || matched < 3) return null;
    const confidence = Math.min(1, (matched / 6) * 0.75 + Math.min(entry.value.length, 40) / 160);
    return {
      path: entry.path,
      count: entry.value.length,
      confidence: Math.round(confidence * 100),
      matchedFields: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.hits])),
      allKeys: keys.slice(0, 40),
    };
  }

  function scoreStaffArray(entry) {
    const sample = entry.value.slice(0, 20);
    const keys = [...new Set(sample.flatMap((item) => Object.keys(item)))];
    const name = keyScore(keys, ALIASES.name);
    const role = keyScore(keys, ["role", "job", "title", "position", "staffrole"]);
    if (!name.score || !role.score) return null;
    return { path: entry.path, count: entry.value.length, matchedFields: { name: name.hits, role: role.hits } };
  }

  function findFinances(objects) {
    let best = null;
    objects.forEach((o) => {
      const keys = Object.keys(o.value);
      const hit = keyScore(keys, ALIASES.finance);
      if (hit.score >= 2 && (!best || hit.score > best.score)) {
        best = { path: o.path, score: hit.score, fields: hit.hits };
      }
    });
    return best;
  }

  function findClub(objects) {
    let best = null;
    objects.forEach((o) => {
      const keys = Object.keys(o.value);
      const name = keyScore(keys, ["name", "clubname", "teamname", "shortname"]);
      const meta = keyScore(keys, ALIASES.clubMeta);
      if (!name.score || meta.score < 2) return;
      const score = name.score + meta.score;
      if (!best || score > best.score) best = { path: o.path, score, fields: [...name.hits, ...meta.hits] };
    });
    return best;
  }

  /**
   * @param {unknown} json içe alınan kayıt
   * @returns {{players:object|null, staff:object|null, finances:object|null, club:object|null,
   *            unknownTopLevel:string[], totalArrays:number, summary:string}}
   */
  function detect(json) {
    const { arrays, objects } = collect(json);

    let players = null;
    arrays.forEach((entry) => {
      const scored = scorePlayersArray(entry);
      if (scored && (!players || scored.confidence > players.confidence)) players = scored;
    });

    let staff = null;
    arrays.forEach((entry) => {
      if (players && entry.path === players.path) return;
      const scored = scoreStaffArray(entry);
      if (scored && (!staff || scored.count > staff.count)) staff = scored;
    });

    const finances = findFinances(objects);
    const club = findClub(objects);

    const knownPaths = new Set(
      [players?.path, staff?.path, finances?.path, club?.path].filter(Boolean)
    );
    const unknownTopLevel = Array.isArray(json) || !isObj(json)
      ? []
      : Object.keys(json).filter((k) => ![...knownPaths].some((p) => p === k || p.startsWith(`${k}.`) || p.startsWith(`${k}[`)));

    const parts = [];
    parts.push(players ? `${players.count} oyuncu kaydı bulundu (${players.path})` : "oyuncu listesi bulunamadı");
    if (staff) parts.push(`${staff.count} personel`);
    if (finances) parts.push(`finans (${finances.path})`);
    if (club) parts.push(`kulüp (${club.path})`);
    if (unknownTopLevel.length) parts.push(`${unknownTopLevel.length} tanınmayan üst düzey alan`);

    return {
      players, staff, finances, club, unknownTopLevel,
      totalArrays: arrays.length,
      summary: parts.join(" · "),
    };
  }

  global.WSC_DETECT = { detect, ALIASES };
})(typeof window !== "undefined" ? window : globalThis);
