/* Tests du calcul des statistiques admin (stats.js) — Node, sans dépendance.
   node test_stats.js */
const M = require("./matching.js");
const S = require("./stats.js");

let fail = 0, n = 0;
function check(name, cond) { n++; if (cond) console.log("✓ " + name); else { fail++; console.log("✗ " + name); } }

const DAY = S.STATS_DAY;
const now = new Date(2026, 9, 13, 12, 0, 0).getTime();          // 13/10/2026 12:00
const t = d => now - d * DAY;                                     // il y a d jours
const k = d => S.dayKeyOf(t(d));
const base = { religion: "dati", intent: "serious", words: ["a", "b", "c"], shabbat: "x" };
const full = { kids: "want", shabbatStyle: "kodesh", pace: "mix", value: "heart", weekend: "sea", million: "save", langs: { he: true } };

const profiles = {
  m1: { ...base, ...full, no: 100, gender: "m", age: 30, city: "חיפה", createdAt: t(0) },
  m2: { ...base, no: 101, gender: "m", age: 45, city: "חיפה", createdAt: t(3) },
  f1: { ...base, ...full, no: 102, gender: "f", age: 28, city: "חיפה", createdAt: t(10), langs: { he: true, fr: true } },
  f2: { ...base, ...full, no: 103, gender: "f", age: 31, city: "Paris", createdAt: t(40), paused: true },
  f3: { ...base, no: 104, gender: "f", age: 60, city: "ירושלים", createdAt: t(2) }
};
const chats = {
  m1_f1: { from: "m1", to: "f1", fromNo: 100, toNo: 102, status: "active", opened: true, createdAt: t(0) },
  m2_f3: { from: "m2", to: "f3", fromNo: 101, toNo: 104, status: "ended", createdAt: t(20) }
};
const chatActivity = { m1_f1: { m1: true, f1: true }, m2_f3: { m2: true, intrus: true } };
const activity = {
  m1: { first: t(0), last: t(0), mobile: true, d: { [k(0)]: 3 } },
  f1: { first: t(10), last: t(1.2), mobile: false, d: { [k(10)]: 1, [k(1)]: 2 } },
  f2: { first: t(40), last: t(40), mobile: true, d: { [k(40)]: 1 } },
  v1: { first: t(2), last: t(2), mobile: true, d: { [k(2)]: 1 } }   // visiteur sans profil
};
const stats = {
  req_sent: { [k(1)]: { a: true, b: true }, [k(30)]: { c: true } },
  req_accepted: { [k(1)]: { a: true } },
  req_declined: { [k(1)]: { a: true, b: true, c: true } },
  reg_start: { [k(2)]: { a: true, b: true, c: true, d: true, e: true } },
  reg_done: { [k(2)]: { a: true } },
  reg_err_phone: { [k(2)]: { a: true, b: true } },
  tab_chats: { [k(0)]: { a: true } },
  err_msg: { [k(0)]: { a: true } }
};
const data = { profiles, chats, chatActivity, activity, stats, banned: {}, reports: {}, presence: { m1: true, v1: true } };
const range7 = S.periodRange("7", now);
const R = S.computeStats(data, { now, range: range7 }, M);

/* Périodes */
check("période 7 j : du début de J-6 à maintenant", range7.from === S.dayStart(t(6)) && range7.to === now && range7.days === 7);
check("période précédente : 7 j juste avant", R.prev.to === range7.from - 1 && R.prev.to - R.prev.from === range7.to - range7.from);
const today = S.periodRange("today", now);
check("aujourd'hui : depuis minuit", today.from === S.dayStart(now));

/* KPI inscriptions */
check("membres = 5", R.kpi.members === 5);
check("nouveaux aujourd'hui = 1 (m1)", R.kpi.newToday === 1);
check("nouveaux 7 j = 3 (m1, m2, f3)", R.kpi.newWeek === 3);
check("nouveaux 30 j = 4", R.kpi.newMonth === 4);
check("comparaison : période 3, précédente 1 (f1 à J-10)", R.kpi.newPeriod === 3 && R.kpi.newPrev === 1);
check("en pause = 1", R.kpi.paused === 1);
check("profils complétés = 3/5 (60 %)", Math.abs(R.kpi.completeRate - 0.6) < 1e-9);

/* Activité */
check("actifs 24 h = 1 (m1 ; visiteur v1 exclu)", R.kpi.active24 === 1);
check("actifs 7 j = 2 (m1, f1)", R.kpi.active7 === 2);
check("actifs 30 j = 2 (f2 à J-40 exclu)", R.kpi.active30 === 2);
check("en ligne = 2 dont 1 membre", R.kpi.online === 2 && R.kpi.onlineMembers === 1);
check("visiteurs arrivés dans la période = 2 (m1, v1)", R.kpi.visitorsPeriod === 2);
check("taux d'inscription = 1/2 (m1 inscrit, v1 non)", R.kpi.signupRate === 0.5);
check("rétention J7 : base 2 (f1, f2), revenus 1 (f1 revenu à J+9)", R.kpi.ret7.base === 2 && R.kpi.ret7.kept === 1);
check("rétention J30 : base 1 (f2), revenus 0", R.kpi.ret30.base === 1 && R.kpi.ret30.kept === 0 && R.kpi.ret30.rate === 0);

/* Membres */
check("genre 2 h / 3 f", R.members.gender.m === 2 && R.members.gender.f === 3);
check("âge moyen 38.8, médian 31", Math.abs(R.members.ageAvg - 38.8) < 1e-9 && R.members.ageMedian === 31);
check("villes : חיפה 3 en tête", R.members.cities[0][0] === "חיפה" && R.members.cities[0][1] === 3);
check("langues : he 3, fr 1, sans 2", R.members.langs.he === 3 && R.members.langs.fr === 1 && R.members.langs.none === 2);
check("questionnaire enfants : want 3, sans réponse 2", R.members.quiz.kids.want === 3 && R.members.quiz.kids._none === 2);
check("complétion : 2 profils à 0–33 %, 3 à 67–99 %", R.members.completion.find(c => c[0] === "0–33%")[1] === 2 && R.members.completion.find(c => c[0] === "67–99%")[1] === 3);

/* Segment */
const Rs = S.computeStats(data, { now, range: range7, segment: { gender: "f", ageMin: 25, ageMax: 35 } }, M);
check("segment femmes 25–35 : 2 (f1, f2)", Rs.members.n === 2 && Rs.members.gender.f === 2 && Rs.members.gender.m === 0);
check("segment n'affecte pas les KPI globaux", Rs.kpi.members === 5);

/* Matching (via matching.js) */
const expectMutual = (() => { let n = 0; const ids = Object.keys(profiles);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++)
    if (M.isCompatible(profiles[ids[i]], profiles[ids[j]]) && M.isCompatible(profiles[ids[j]], profiles[ids[i]])) n++; return n; })();
check(`paires réciproques = ${expectMutual} (recalcul indépendant)`, R.matching.mutual === expectMutual);
check("m1 ↔ f1 compatibles (30/28, même religion)", M.isCompatible(profiles.m1, profiles.f1) && R.matching.perProfile.m1.strict >= 1);
check("f2 en pause : jamais proposée", Object.keys(profiles).every(u => u === "f2" || !M.isCompatible(profiles[u], profiles.f2)));
check("profils décrits = 4 (f2 en pause exclue)", R.matching.described === 4);
check("histogramme des scores = nb de paires", Object.values(R.matching.hist).reduce((a, b) => a + b, 0) === expectMutual);
check("demandes envoyées 7 j = 2 (celle de J-30 exclue)", R.matching.requests === 2);
check("taux d'acceptation = 1/(1+3) = 25 %", R.matching.acceptRate === 0.25);
check("chats avec message = 2, réponse des deux = 1 (uid étranger ignoré)", R.matching.chatsWithMsg === 2 && R.matching.chatsBoth === 1);
check("taux de réponse = 50 %, rideau 1/2", R.matching.responseRate === 0.5 && R.matching.openRate === 0.5);
const city = R.matching.criteria.find(c => c.key === "same_city");
check("critère « même ville » : 1 chat (m1/f1), réponse et rideau 100 %", city.yes.n === 1 && city.yes.bothRate === 1 && city.yes.openRate === 1);

/* Usage */
const today0 = R.usage.series[R.usage.series.length - 1];
check("série : 7 jours", R.usage.series.length === 7);
check("aujourd'hui : 3 visites, 1 visiteur unique, 1 inscription, 1 chat", today0.visits === 3 && today0.unique === 1 && today0.registrations === 1 && today0.chats === 1);
check("appareils : 2 mobiles (m1, v1), 1 ordinateur (f1)", R.usage.mobile === 2 && R.usage.desktop === 1);
check("inscription : 5 commencées, 1 terminée", R.usage.regStart === 5 && R.usage.regDone === 1);
check("erreur de formulaire la plus fréquente : téléphone (2)", R.usage.regErrors[0][0] === "reg_err_phone" && R.usage.regErrors[0][1] === 2);
check("onglets séparés des fonctionnalités", R.usage.tabs.length === 1 && !R.usage.features.some(([e]) => e.startsWith("tab_")));
const f = Object.fromEntries(R.usage.funnel);
check("entonnoir : 2 visiteurs → 1 inscrit → 1 complet → 1 chat → 1 réponse → 1 rideau", f.visit === 2 && f.registered === 1 && f.complete === 1 && f.chat === 1 && f.answered === 1 && f.opened === 1);

/* Sans collecte : « données indisponibles » (null), pas de zéro inventé */
const R0 = S.computeStats({ profiles, chats }, { now, range: range7 }, M);
check("sans activité : actifs / rétention / entonnoir indisponibles (null)", R0.kpi.active7 === null && R0.kpi.signupRate === null && R0.usage.funnel === null);
check("sans compteurs : demandes et taux d'acceptation indisponibles", R0.matching.requests === null && R0.matching.acceptRate === null);

/* Insights */
const I = S.insights(R);
check("insight : nouvelle collecte non signalée quand il y a des données", !I.some(i => i.title.includes("איסוף")));
check("insight : abandon du formulaire (5 → 1) détecté", I.some(i => i.title.includes("נטישה")));
check("insight sans données : collecte en cours", S.insights(R0).some(i => i.title.includes("איסוף")));

console.log(fail ? `❌ ${fail}/${n} échec(s)` : `✅ ${n}/${n} tests passent`);
process.exit(fail ? 1 : 0);
