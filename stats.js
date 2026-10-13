/* ==========================================================================
   דרך הלב — stats.js
   Calcul PUR des statistiques de l'admin (aucune dépendance Firebase, aucun DOM).
   Entrée : les nœuds que l'admin a le droit de lire (profiles, chats, reports,
   banned, activity, presence, stats, chatActivity). Jamais de messages, prénoms,
   téléphones ni secrets. La compatibilité réutilise matching.js (isCompatible,
   isSoftCompatible, matchPercent…) — aucune logique de matching dupliquée ici.
   Testable en Node : node test_stats.js
   ========================================================================== */

const STATS_DAY = 864e5;

/* ---------- Dates ---------- */
function dayKeyOf(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function keyToTs(k) { return new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8)).getTime(); }
/* Liste des jours (début de journée) de from à to inclus */
function daysBetween(from, to) {
  const out = [];
  for (let d = dayStart(from); d <= to; d = dayStart(d + STATS_DAY * 1.5)) out.push(d);
  return out;
}

/* Période : { from, to } en ms. preset : today | 7 | 30 | 90 | 365 | custom */
function periodRange(preset, now, customFrom, customTo) {
  const end = now;
  if (preset === "today") return { from: dayStart(now), to: end, days: 1 };
  if (preset === "custom" && customFrom && customTo) {
    const from = dayStart(Math.min(customFrom, customTo)), to = Math.min(end, dayStart(Math.max(customFrom, customTo)) + STATS_DAY - 1);
    return { from, to, days: Math.round((dayStart(to) - from) / STATS_DAY) + 1 };
  }
  const n = +preset || 30;
  return { from: dayStart(now - (n - 1) * STATS_DAY), to: end, days: n };
}
/* Période précédente de même durée (pour les comparaisons) */
function previousRange(r) { const len = r.to - r.from; return { from: r.from - len - 1, to: r.from - 1, days: r.days }; }
const inRange = (ts, r) => typeof ts === "number" && ts >= r.from && ts <= r.to;

/* ---------- Petits outils ---------- */
const ratio = (a, b) => (b ? a / b : null);              // null = non calculable (division par 0)
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const mean = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const ageBucket = a => (a < 25 ? "18–24" : a < 30 ? "25–29" : a < 35 ? "30–34" : a < 40 ? "35–39" : a < 45 ? "40–44" : a < 50 ? "45–49" : a < 60 ? "50–59" : "60+");
const AGE_BUCKETS = ["18–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–59", "60+"];

/* Complétion du profil : champs facultatifs remplis sur 9
   (fourchette d'âge, enfants, shabbat, rythme, valeur, week-end, million, langues, « je ne peux pas vivre sans ») */
const COMPLETION_FIELDS = [
  p => !!(p.ageMin || p.ageMax), p => !!p.kids, p => !!p.shabbatStyle, p => !!p.pace, p => !!p.value,
  p => !!p.weekend, p => !!p.million, p => !!(p.langs && Object.keys(p.langs).length), p => !!p.cantLiveWithout
];
function completion(p) { return COMPLETION_FIELDS.filter(f => f(p)).length / COMPLETION_FIELDS.length; }
/* « Profil complété » = questionnaire rempli (enfants, shabbat, rythme, valeur, week-end, million) + langues */
const isComplete = p => !!(p.kids && p.shabbatStyle && p.pace && p.value && p.weekend && p.million && p.langs);

/* ---------- Filtre de segment (membres) ---------- */
function matchSegment(p, seg) {
  if (!seg) return true;
  if (seg.gender && p.gender !== seg.gender) return false;
  if (seg.ageMin && !(+p.age >= seg.ageMin)) return false;
  if (seg.ageMax && !(+p.age <= seg.ageMax)) return false;
  if (seg.city && (p.city || "").trim() !== seg.city) return false;
  if (seg.religion && p.religion !== seg.religion) return false;
  if (seg.intent && p.intent !== seg.intent) return false;
  if (seg.lang && !(p.langs && p.langs[seg.lang])) return false;
  return true;
}

/* ---------- Activité (collecte depuis la mise en place du suivi) ---------- */
function activeDays(a) { return Object.keys((a && a.d) || {}).map(keyToTs); }
/* actif dans la plage = au moins un jour de visite dans la plage (ou « last » dedans) */
function wasActive(a, r) {
  if (!a) return false;
  if (inRange(a.last, r)) return true;
  return activeDays(a).some(d => d + STATS_DAY - 1 >= r.from && d <= r.to);
}
/* Rétention Jn : parmi ceux dont la 1re visite date d'au moins n jours,
   part revenue un AUTRE jour, n jours ou plus après la 1re visite. */
function retention(activity, n, now) {
  let base = 0, kept = 0;
  Object.values(activity || {}).forEach(a => {
    if (typeof a.first !== "number" || now - a.first < n * STATS_DAY) return;
    base++;
    const f = dayStart(a.first);
    if (activeDays(a).some(d => d >= f + n * STATS_DAY) || (typeof a.last === "number" && dayStart(a.last) >= f + n * STATS_DAY)) kept++;
  });
  return { base, kept, rate: ratio(kept, base) };
}

/* ---------- Compteurs d'événements : stats/{event}/{day}/{id}: true ---------- */
function eventCount(events, name, r) {
  const days = (events && events[name]) || {};
  let n = 0;
  Object.entries(days).forEach(([k, v]) => { const t = keyToTs(k); if (t + STATS_DAY - 1 >= r.from && t <= r.to) n += Object.keys(v || {}).length; });
  return n;
}
function eventTotals(events, r, prefix = "") {
  return Object.keys(events || {}).filter(e => e.startsWith(prefix))
    .map(e => [e, eventCount(events, e, r)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
}
function trackingSince(data) {
  const t = [];
  Object.values(data.activity || {}).forEach(a => { if (typeof a.first === "number") t.push(a.first); });
  Object.values(data.stats || {}).forEach(days => Object.keys(days || {}).forEach(k => t.push(keyToTs(k))));
  return t.length ? Math.min(...t) : null;
}

/* ---------- Compatibilité (via matching.js) ---------- */
/* Pour chaque profil visible (non banni, non en pause) : nombre de propositions strictes
   qu'il verrait (isCompatible, sens « moi → l'autre », comme computeProposals),
   + paires réciproques et distribution des % de compatibilité. O(n²) : ok jusqu'à quelques milliers. */
function compatibility(profiles, banned, seg, M) {
  const ids = Object.keys(profiles || {}).filter(u => !(banned || {})[u]);
  const perProfile = {};
  let mutual = 0, mutualSoft = 0;
  const scores = [];
  ids.forEach(u => { perProfile[u] = { strict: 0, soft: 0 }; });
  for (let i = 0; i < ids.length; i++) {
    const a = profiles[ids[i]];
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const b = profiles[ids[j]];
      if (M.isCompatible(a, b)) perProfile[ids[i]].strict++;
      else if (M.isSoftCompatible(a, b)) perProfile[ids[i]].soft++;
      if (j > i) {
        if (M.isCompatible(a, b) && M.isCompatible(b, a)) { mutual++; scores.push(M.matchPercent(a, b)); }
        else if (M.isSoftCompatible(a, b) && M.isSoftCompatible(b, a)) mutualSoft++;
      }
    }
  }
  // Seuls les profils du segment (et non en pause) sont décrits ; leurs candidats viennent de toute la base
  const inSeg = ids.filter(u => !profiles[u].paused && matchSegment(profiles[u], seg));
  const counts = inSeg.map(u => perProfile[u].strict);
  const dist = { "0": 0, "1–2": 0, "3–5": 0, "6–10": 0, "11+": 0 };
  counts.forEach(n => { dist[n === 0 ? "0" : n <= 2 ? "1–2" : n <= 5 ? "3–5" : n <= 10 ? "6–10" : "11+"]++; });
  const hist = {}; for (let b = 0; b < 100; b += 10) hist[`${b}–${b + 9}`] = 0; hist["100"] = 0;
  scores.forEach(s => { const k = s >= 100 ? "100" : `${Math.floor(s / 10) * 10}–${Math.floor(s / 10) * 10 + 9}`; hist[k] = (hist[k] || 0) + 1; });
  // Groupes (genre × tranche d'âge) : propositions moyennes et part sans aucune proposition stricte
  const groups = {};
  inSeg.forEach(u => {
    const p = profiles[u]; if (p.gender !== "m" && p.gender !== "f") return;
    const k = p.gender + "|" + ageBucket(+p.age);
    (groups[k] = groups[k] || { gender: p.gender, bucket: ageBucket(+p.age), n: 0, sum: 0, zero: 0 });
    groups[k].n++; groups[k].sum += perProfile[u].strict; if (!perProfile[u].strict) groups[k].zero++;
  });
  return {
    perProfile, mutual, mutualSoft, scores, hist, dist,
    avgScore: mean(scores), medianScore: median(scores),
    avgProposals: mean(counts), medianProposals: median(counts), zeroProposals: counts.filter(n => !n).length, described: inSeg.length,
    groups: Object.values(groups).map(g => ({ ...g, avg: g.sum / g.n, zeroRate: g.zero / g.n }))
      .sort((a, b) => (a.gender < b.gender ? -1 : a.gender > b.gender ? 1 : AGE_BUCKETS.indexOf(a.bucket) - AGE_BUCKETS.indexOf(b.bucket)))
  };
}

/* ---------- Conversations ---------- */
/* chatActivity/{chatId}/{uid}: true → « a écrit au moins un message » (collecte récente) */
function chatOutcomes(chats, chatActivity) {
  const list = Object.entries(chats || {}).map(([id, c]) => {
    const w = Object.keys((chatActivity || {})[id] || {}).filter(u => u === c.from || u === c.to);
    return { id, c, writers: w.length };
  });
  return list;
}
/* Critères associés aux résultats : pour chaque critère, part de conversations
   où les deux ont écrit et où le rideau s'est levé. Association ≠ causalité. */
function criteriaAssociation(chats, chatActivity, profiles, M) {
  const rows = [];
  const outs = chatOutcomes(chats, chatActivity).filter(o => profiles[o.c.from] && profiles[o.c.to]);
  const crit = [
    ["same_city", "אותה עיר", (a, b) => (a.city || "").trim() === (b.city || "").trim()],
    ["same_religion", "אותו אורח חיים", (a, b) => a.religion === b.religion],
    ["shared_lang", "שפה משותפת מלבד עברית", (a, b) => M.sharedLangs(a, b).length > 0],
    ["score80", "התאמה 80% ומעלה", (a, b) => M.matchPercent(a, b) >= 80],
    ["age_gap3", "פער גילאים עד 3 שנים", (a, b) => Math.abs(+a.age - +b.age) <= 3],
    ["same_intent", "אותה כוונה (רציני / נראה)", (a, b) => a.intent === b.intent]
  ];
  crit.forEach(([key, label, f]) => {
    const g = { yes: { n: 0, both: 0, opened: 0 }, no: { n: 0, both: 0, opened: 0 } };
    outs.forEach(o => {
      const k = f(profiles[o.c.from], profiles[o.c.to]) ? "yes" : "no";
      g[k].n++; if (o.writers >= 2) g[k].both++; if (o.c.opened) g[k].opened++;
    });
    rows.push({ key, label, yes: { ...g.yes, bothRate: ratio(g.yes.both, g.yes.n), openRate: ratio(g.yes.opened, g.yes.n) },
      no: { ...g.no, bothRate: ratio(g.no.both, g.no.n), openRate: ratio(g.no.opened, g.no.n) } });
  });
  return rows;
}

/* ---------- Tout le calcul ---------- */
function computeStats(data, opts, M) {
  const now = opts.now || Date.now();
  const r = opts.range, prev = previousRange(r);
  const seg = opts.segment || null;
  const P = data.profiles || {}, C = data.chats || {}, A = data.activity || {}, E = data.stats || {}, CA = data.chatActivity || {};
  const banned = data.banned || {};
  const uids = Object.keys(P);
  const profs = uids.map(u => P[u]);
  const segUids = uids.filter(u => matchSegment(P[u], seg));
  const segProfs = segUids.map(u => P[u]);
  const hasActivity = Object.keys(A).length > 0;
  const hasEvents = Object.keys(E).length > 0;
  const since = trackingSince(data);

  const created = (list, rr) => list.filter(x => inRange(x.createdAt, rr)).length;
  const chatsArr = Object.values(C);
  const lastN = n => ({ from: dayStart(now - (n - 1) * STATS_DAY), to: now });
  const activeMembers = rr => uids.filter(u => wasActive(A[u], rr)).length;

  // Visiteurs (uid avec activité, inscrit ou non) arrivés dans la période → inscription
  const visitorsIn = rr => Object.entries(A).filter(([, a]) => inRange(a.first, rr)).map(([u]) => u);
  const funnelFor = rr => {
    const v = visitorsIn(rr);
    const reg = v.filter(u => P[u]);
    const comp = reg.filter(u => isComplete(P[u]));
    const inChat = new Set(); const answered = new Set(); const opened = new Set();
    chatOutcomes(C, CA).forEach(o => {
      [o.c.from, o.c.to].forEach(u => { inChat.add(u); if (o.writers >= 2) answered.add(u); if (o.c.opened) opened.add(u); });
    });
    return [
      ["visit", v.length], ["registered", reg.length], ["complete", comp.length],
      ["chat", reg.filter(u => inChat.has(u)).length], ["answered", reg.filter(u => answered.has(u)).length],
      ["opened", reg.filter(u => opened.has(u)).length]
    ];
  };

  const ret = n => retention(A, n, now);
  const compat = compatibility(P, banned, seg, M);
  const outs = chatOutcomes(C, CA);
  const chatsWithMsg = outs.filter(o => o.writers >= 1).length;
  const chatsBoth = outs.filter(o => o.writers >= 2).length;
  const ev = (name, rr = r) => eventCount(E, name, rr);
  const accepted = ev("req_accepted"), declined = ev("req_declined");

  // Séries quotidiennes de la période
  const days = daysBetween(r.from, r.to);
  const series = days.map(d => {
    const k = dayKeyOf(d), dr = { from: d, to: d + STATS_DAY - 1 };
    let visits = 0, unique = 0, uniqueMembers = 0;
    Object.entries(A).forEach(([u, a]) => { const n = (a.d || {})[k]; if (n) { visits += n; unique++; if (P[u]) uniqueMembers++; } });
    return { day: d, key: k, registrations: created(profs, dr), chats: created(chatsArr, dr), visits, unique, uniqueMembers,
      requests: eventCount(E, "req_sent", dr) + eventCount(E, "req_sent_soft", dr) };
  });

  // Sessions et appareils (sur la période)
  const activeInR = Object.entries(A).filter(([, a]) => wasActive(a, r));
  const sessionsPer = activeInR.map(([, a]) => Object.entries(a.d || {}).filter(([k]) => { const t = keyToTs(k); return t + STATS_DAY - 1 >= r.from && t <= r.to; }).reduce((s, [, n]) => s + n, 0)).filter(n => n > 0);
  const daysPer = activeInR.map(([, a]) => activeDays(a).filter(t => t + STATS_DAY - 1 >= r.from && t <= r.to).length).filter(n => n > 0);
  const mobile = activeInR.filter(([, a]) => a.mobile === true).length, desktop = activeInR.filter(([, a]) => a.mobile === false).length;

  const ages = segProfs.map(p => +p.age).filter(a => a > 0);
  const countBy = (arr, f) => arr.reduce((o, x) => { const k = f(x); if (k != null && k !== "") o[k] = (o[k] || 0) + 1; return o; }, {});

  return {
    now, range: r, prev, since, hasActivity, hasEvents,
    kpi: {
      members: profs.length, banned: Object.keys(banned).length, paused: profs.filter(p => p.paused).length,
      newToday: created(profs, { from: dayStart(now), to: now }), newWeek: created(profs, lastN(7)), newMonth: created(profs, lastN(30)),
      newPeriod: created(profs, r), newPrev: created(profs, prev),
      active24: hasActivity ? uids.filter(u => A[u] && typeof A[u].last === "number" && now - A[u].last <= STATS_DAY).length : null,
      active7: hasActivity ? activeMembers(lastN(7)) : null, active30: hasActivity ? activeMembers(lastN(30)) : null,
      activePeriod: hasActivity ? activeMembers(r) : null, activePrev: hasActivity ? activeMembers(prev) : null,
      online: data.presence ? Object.keys(data.presence).length : (hasActivity ? 0 : null),
      onlineMembers: data.presence ? Object.keys(data.presence).filter(u => P[u]).length : null,
      visitorsPeriod: hasActivity ? visitorsIn(r).length : null,
      signupRate: hasActivity ? ratio(visitorsIn(r).filter(u => P[u]).length, visitorsIn(r).length) : null,
      completeRate: ratio(profs.filter(isComplete).length, profs.length),
      mutualPairs: compat.mutual,
      chatsTotal: chatsArr.length, chatsPeriod: created(chatsArr, r), chatsPrev: created(chatsArr, prev),
      openedTotal: chatsArr.filter(c => c.opened).length,
      ret1: ret(1), ret7: ret(7), ret30: ret(30)
    },
    members: {
      n: segProfs.length,
      gender: { m: segProfs.filter(p => p.gender === "m").length, f: segProfs.filter(p => p.gender === "f").length,
        other: segProfs.filter(p => p.gender !== "m" && p.gender !== "f").length },
      ageAvg: mean(ages), ageMedian: median(ages), ageMin: ages.length ? Math.min(...ages) : null, ageMax: ages.length ? Math.max(...ages) : null,
      ageBuckets: AGE_BUCKETS.map(b => ({ b, m: segProfs.filter(p => p.gender === "m" && ageBucket(+p.age) === b).length, f: segProfs.filter(p => p.gender === "f" && ageBucket(+p.age) === b).length })),
      cities: Object.entries(countBy(segProfs, p => (p.city || "").trim())).sort((a, b) => b[1] - a[1]),
      religion: countBy(segProfs, p => p.religion), intent: countBy(segProfs, p => p.intent),
      langs: { he: segProfs.filter(p => p.langs && p.langs.he).length, en: segProfs.filter(p => p.langs && p.langs.en).length,
        fr: segProfs.filter(p => p.langs && p.langs.fr).length, none: segProfs.filter(p => !p.langs).length },
      quiz: Object.fromEntries(Object.keys(M.QUIZ).map(k => [k, { ...countBy(segProfs, p => p[k]), _none: segProfs.filter(p => !p[k]).length }])),
      completion: [["0–33%", 0, 0.34], ["34–66%", 0.34, 0.67], ["67–99%", 0.67, 0.999], ["100%", 0.999, 2]]
        .map(([l, a, b]) => [l, segProfs.filter(p => completion(p) >= a && completion(p) < b).length]),
      completeCount: segProfs.filter(isComplete).length,
      active30: hasActivity ? segUids.filter(u => wasActive(A[u], lastN(30))).length : null,
      paused: segProfs.filter(p => p.paused).length
    },
    matching: {
      ...compat,
      requests: hasEvents ? ev("req_sent") + ev("req_sent_soft") : null, requestsSoft: hasEvents ? ev("req_sent_soft") : null,
      accepted: hasEvents ? accepted : null, declined: hasEvents ? declined : null,
      acceptRate: hasEvents ? ratio(accepted, accepted + declined) : null,
      chats: chatsArr.length, chatsWithMsg, chatsBoth, opened: chatsArr.filter(c => c.opened).length,
      ended: chatsArr.filter(c => c.status === "ended").length,
      responseRate: ratio(chatsBoth, chatsWithMsg), openRate: ratio(chatsArr.filter(c => c.opened).length, chatsArr.length),
      hasChatActivity: Object.keys(CA).length > 0,
      criteria: criteriaAssociation(C, CA, P, M)
    },
    usage: {
      series, sessionsMedian: median(sessionsPer), sessionsAvg: mean(sessionsPer), daysMedian: median(daysPer),
      mobile, desktop, unknownDevice: activeInR.length - mobile - desktop,
      features: eventTotals(E, r).filter(([e]) => !e.startsWith("tab_") && !e.startsWith("reg_err_") && !e.startsWith("err_")),
      tabs: eventTotals(E, r, "tab_"), regErrors: eventTotals(E, r, "reg_err_"), techErrors: eventTotals(E, r, "err_"),
      techErrorsPrev: eventTotals(E, prev, "err_"),
      regStart: ev("reg_start"), regDone: ev("reg_done"),
      funnel: hasActivity ? funnelFor(r) : null
    }
  };
}

/* ---------- Insights : règles simples, fondées uniquement sur les données mesurées ---------- */
function insights(S) {
  const out = [], k = S.kpi, pct = x => Math.round(x * 100) + "%";
  const add = (level, title, detail, reco) => out.push({ level, title, detail, reco });
  if (k.newPrev >= 3 && k.newPeriod < k.newPrev * 0.5)
    add("warn", "ירידה בהרשמות", `${k.newPeriod} הרשמות בתקופה לעומת ${k.newPrev} בתקופה הקודמת.`, "לפרסם שוב את הקישור בקבוצה / לבקש מחברים להזמין חברים.");
  if (k.newPrev >= 1 && k.newPeriod >= k.newPrev * 1.5 && k.newPeriod >= 5)
    add("good", "עלייה בהרשמות", `${k.newPeriod} הרשמות לעומת ${k.newPrev} בתקופה הקודמת.`, "לבדוק מה עבד (הודעה, אירוע…) ולחזור על זה.");
  const g = S.members.gender, tot = g.m + g.f;
  if (tot >= 6 && Math.min(g.m, g.f) / tot < 0.35) {
    const few = g.m < g.f ? "גברים" : "נשים";
    add("warn", `מעט ${few}`, `${g.m} גברים / ${g.f} נשים (${pct(Math.min(g.m, g.f) / tot)} ${few}).`, `לגייס ${few}: הודעה ממוקדת בקבוצה, בקשה להזמין חבר/ה.`);
  }
  const m = S.matching;
  if (m.described >= 3 && m.zeroProposals / m.described >= 0.25)
    add("warn", "פרופילים בלי אף הצעה מתאימה", `${m.zeroProposals} מתוך ${m.described} פרופילים (${pct(m.zeroProposals / m.described)}) לא מקבלים אף הצעה לפי ההעדפות שלהם.`,
      "הם רואים רק הצעות ״מחוץ להעדפות״. אפשר להציע להם להרחיב את טווח הגילאים בעריכת הפרופיל.");
  m.groups.filter(gr => gr.n >= 2 && gr.zeroRate >= 0.5).forEach(gr =>
    add("info", `קבוצה עם מעט התאמות: ${gr.gender === "m" ? "גברים" : "נשים"} ${gr.bucket}`, `${gr.zero} מתוך ${gr.n} בלי הצעה מתאימה (ממוצע ${gr.avg.toFixed(1)} הצעות).`,
      "לגייס פרופילים מהצד השני בטווח הגילאים המתאים."));
  if (m.chats >= 5 && m.openRate !== null && m.openRate < 0.1)
    add("info", "מעט מסכים נפתחים", `${m.opened} מתוך ${m.chats} שיחות (${pct(m.openRate)}) הגיעו לפתיחת מסך.`, "להזכיר בהודעת היום שאפשר ללחוץ ״פתיחת המסך״ כשמרגישים שיש משהו.");
  if (m.hasChatActivity && m.chatsWithMsg >= 5 && m.responseRate !== null && m.responseRate < 0.4)
    add("info", "שיחות בלי תשובה", `רק ${pct(m.responseRate)} מהשיחות שבהן נכתבה הודעה קיבלו תשובה מהצד השני.`, "להציע בהודעת היום שאלת פתיחה / להזכיר לבדוק את לשונית השיחות.");
  if (m.acceptRate !== null && (m.accepted + m.declined) >= 5 && m.acceptRate < 0.3)
    add("info", "מעט בקשות מתקבלות", `${pct(m.acceptRate)} מהבקשות שנענו התקבלו.`, "לעודד מילוי מלא של הכרטיס (3 מילים, שבת אידיאלית) — זה מה שהצד השני רואה.");
  const u = S.usage;
  if (u.regStart >= 5 && u.regDone / u.regStart < 0.5)
    add("warn", "נטישה בטופס ההרשמה", `${u.regStart} התחילו למלא, ${u.regDone} סיימו (${pct(u.regDone / u.regStart)}).`,
      u.regErrors.length ? `השדה שעוצר הכי הרבה: ${u.regErrors[0][0].replace("reg_err_", "")} (${u.regErrors[0][1]} פעמים).` : "לבדוק את הטופס בטלפון.");
  const errs = u.techErrors.reduce((s, [, n]) => s + n, 0), errsPrev = u.techErrorsPrev.reduce((s, [, n]) => s + n, 0);
  if (errs >= 5 && errs > errsPrev * 1.5)
    add("warn", "שגיאות טכניות חוזרות", `${errs} שגיאות בתקופה (${u.techErrors.map(([e, n]) => `${e}: ${n}`).join(", ")}).`, "לבדוק שהחוקים ב־Firebase פורסמו ושהאתר עובד בטלפון.");
  if (k.ret7.base >= 5 && k.ret7.rate < 0.2)
    add("info", "מעט חוזרים אחרי שבוע", `${pct(k.ret7.rate)} חזרו לפחות 7 ימים אחרי הביקור הראשון.`, "אין התראות באפליקציה: הודעה שבועית בקבוצה מזכירה לחזור לבדוק.");
  if (!S.hasActivity)
    add("info", "איסוף נתוני שימוש התחיל עכשיו", "נתוני ביקורים, פעילים, שימור ומשפך יופיעו אחרי שמשתמשים ייכנסו לגרסה החדשה.", "לחזור לבדוק בעוד כמה ימים.");
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { computeStats, insights, periodRange, previousRange, retention, completion, isComplete, matchSegment, compatibility,
    criteriaAssociation, eventCount, dayKeyOf, dayStart, keyToTs, median, mean, ageBucket, AGE_BUCKETS, STATS_DAY };
}
