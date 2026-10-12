/* ==========================================================================
   דרך הלב — matching.js
   Moteur de compatibilité PUR (aucune dépendance Firebase) —
   chargé par index.html et testable en Node (test_matching.js).
   ========================================================================== */

/* ---------- Libellés du questionnaire ---------- */
const QUIZ = {
  kids: { have: "יש לי 👶", want: "רוצה בעתיד", no: "לא בשבילי", flow: "נזרום" },
  shabbatStyle: { kodesh: "קודש 🕯️", massoret: "מסורת ונחת", regular: "יום רגיל" },
  pace: { home: "בית וספה 🛋️", out: "בחוץ כל הזמן 🎉", mix: "תלוי בשבוע" },
  value: { heart: "לב חם ❤️", humor: "הומור 😄", stable: "יציבות 🏡", open: "ראש פתוח 🌍" },
  weekend: { nature: "טבע ⛰️", sea: "ים 🌊", movie: "סרט ושמיכה 🎬", friends: "חברים ואוכל 🍲", explore: "לגלות מקום חדש ✈️" },
  million: { travel: "טיול גדול בעולם ✈️", invest: "דירה והשקעה 🏠", spoil: "פינוקים לאהובים 🎁", save: "חוסך/ת, שיהיה 🐷" }
};

/* ---------- Textes courts par langue (he = référence) ---------- */
const MSG = {
  he: { soft_mine: "גיל מחוץ לטווח שבחרת", soft_his: "את/ה מחוץ לטווח הגילאים שלו", soft_hers: "את/ה מחוץ לטווח הגילאים שלה",
        soft_gap: "פער גילאים של {n} שנים", soft_rel: "אורח חיים שונה (דתי ↔ חילוני)", same_city: "שניכם מ{city}",
        same_lang: "שניכם מדברים {lang} {flag}", same_rel: "אורח חיים דומה", same_age: "גיל דומה" },
  en: { soft_mine: "Age outside the range you chose", soft_his: "You're outside his age range", soft_hers: "You're outside her age range",
        soft_gap: "{n}-year age gap", soft_rel: "Different lifestyles (religious ↔ secular)", same_city: "You're both from {city}",
        same_lang: "You both speak {lang} {flag}", same_rel: "Similar lifestyle", same_age: "Similar age" },
  fr: { soft_mine: "Âge hors de votre tranche", soft_his: "Vous êtes hors de sa tranche d'âge", soft_hers: "Vous êtes hors de sa tranche d'âge",
        soft_gap: "{n} ans d'écart", soft_rel: "Modes de vie différents (religieux ↔ laïque)", same_city: "Vous êtes tous les deux de {city}",
        same_lang: "Vous parlez tous les deux {lang} {flag}", same_rel: "Mode de vie proche", same_age: "Âge proche" }
};
function _msg(lang, key, vars) {
  let s = ((MSG[lang] || MSG.he)[key]) || MSG.he[key];
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}

/* Langues parlées (profil.langs = { he: true, fr: true, … }) */
const LANGS = { he: { flag: "🇮🇱", name: "עברית" }, en: { flag: "🇬🇧", name: "אנגלית" }, fr: { flag: "🇫🇷", name: "צרפתית" } };
const LANG_NAMES = { he: { he: "עברית", en: "אנגלית", fr: "צרפתית" }, en: { he: "Hebrew", en: "English", fr: "French" }, fr: { he: "hébreu", en: "anglais", fr: "français" } };
function langList(p) { const l = (p && p.langs) || {}; return Object.keys(LANGS).filter(k => l[k] === true); }
function langFlags(p) { return langList(p).map(l => LANGS[l].flag).join(" "); }
/* Langues communes autres que l'hébreu (parlé par presque tous) */
function sharedLangs(a, b) { const lb = langList(b); return langList(a).filter(l => l !== "he" && lb.includes(l)); }

function _num(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; }

/* ---------- Filtres durs ---------- */
function religionOk(a, b) {
  if (a === "masorti" || b === "masorti") return true;   // traditionnel ↔ tous
  return a === b;
}

function ageOk(me, p) {
  const meMin = _num(me.ageMin), meMax = _num(me.ageMax);
  const pMin = _num(p.ageMin), pMax = _num(p.ageMax);
  if (meMin && p.age < meMin) return false;
  if (meMax && p.age > meMax) return false;
  if (pMin && me.age < pMin) return false;
  if (pMax && me.age > pMax) return false;
  // aucun des deux n'a de fourchette → fallback historique : écart ≤ 8 ans
  if (!meMin && !meMax && !pMin && !pMax) return Math.abs(me.age - p.age) <= 8;
  return true;
}

function kidsOk(me, p) {
  const a = me.kids, b = p.kids;
  if (!a || !b) return true;                              // anciens profils
  if ((a === "want" && b === "no") || (a === "no" && b === "want")) return false;
  return true;
}

function isCompatible(me, p) {
  return !!(me && p) &&
    (p.gender === "m" || p.gender === "f") &&
    me.gender !== p.gender &&
    !p.paused &&
    ageOk(me, p) &&
    kidsOk(me, p) &&
    religionOk(me.religion, p.religion);
}

/* ---------- Découverte (hors préférences) ----------
   Filtres durs relâchés (âge et religion) : genre opposé, pas en pause,
   pas de désaccord sur les enfants. */
function isSoftCompatible(me, p) {
  return !!(me && p) &&
    (p.gender === "m" || p.gender === "f") &&
    me.gender !== p.gender &&
    !p.paused &&
    kidsOk(me, p);
}

/* Pourquoi un profil « découverte » n'est pas un match strict (textes affichés) */
function softReasons(me, p, lang = "he") {
  const out = [];
  if (!me || !p) return out;
  const meMin = _num(me.ageMin), meMax = _num(me.ageMax);
  const pMin = _num(p.ageMin), pMax = _num(p.ageMax);
  if ((meMin && p.age < meMin) || (meMax && p.age > meMax)) out.push(_msg(lang, "soft_mine"));
  if ((pMin && me.age < pMin) || (pMax && me.age > pMax)) out.push(_msg(lang, p.gender === "f" ? "soft_hers" : "soft_his"));
  if (!meMin && !meMax && !pMin && !pMax && !ageOk(me, p)) out.push(_msg(lang, "soft_gap", { n: Math.abs(me.age - p.age) }));
  if (!religionOk(me.religion, p.religion)) out.push(_msg(lang, "soft_rel"));
  return out;
}

/* ---------- Score ---------- */
function matchScore(me, p) {
  let s = 50;
  if (me.intent && me.intent === p.intent) s += 10;
  if (me.religion === p.religion) s += 8;
  else if (me.religion === "masorti" || p.religion === "masorti") s += 3;

  const a = me.shabbatStyle, b = p.shabbatStyle;
  if (a && b) {
    if (a === b) s += 10;
    else if ((a === "kodesh" && b === "regular") || (a === "regular" && b === "kodesh")) s -= 25;
    else s += 4;                                          // massoret adjacent aux deux
  }
  if (me.kids && p.kids) {
    if (me.kids === p.kids) s += 8;
    else if (me.kids === "flow" || p.kids === "flow") s += 3;
  }
  if (me.pace && p.pace) {
    if (me.pace === p.pace) s += 6;
    else if (me.pace === "mix" || p.pace === "mix") s += 3;
  }
  if (me.value && me.value === p.value) s += 6;
  if (me.weekend && me.weekend === p.weekend) s += 6;
  if (me.million && me.million === p.million) s += 5;
  if ((me.city || "").trim() && me.city.trim() === (p.city || "").trim()) s += 5;
  if (sharedLangs(me, p).length) s += 4;
  s -= Math.min(10, Math.max(0, Math.abs((me.age || 0) - (p.age || 0)) - 2));
  return s;
}

/* % affiché (jamais 100 — on laisse de la place au mystère) */
function matchPercent(me, p) {
  return Math.max(45, Math.min(99, Math.round(matchScore(me, p))));
}

/* ---------- « למה אתם מתאימים » ---------- */
const WHY = {
  intent: { serious: "שניכם מחפשים קשר רציני 💍", see: "שניכם בראש של לזרום 🌊" },
  shabbatStyle: { kodesh: "שבת קודש — אצל שניכם 🕯️", massoret: "מסורת ונחת אצל שניכם 🕯️", regular: "סגנון שבת דומה" },
  kids: { want: "שניכם רוצים ילדים 👶", have: "לשניכם יש ילדים 👶", flow: "שניכם זורמים לגבי ילדים" },
  weekend: {
    nature: "שניכם אנשים של טבע ⛰️", sea: "שניכם אנשים של ים 🌊", movie: "סרט ושמיכה — שניכם 🎬",
    friends: "חברים ואוכל זה הקטע של שניכם 🍲", explore: "שניכם אוהבים לגלות מקומות חדשים ✈️"
  },
  pace: { home: "שניכם אנשים של בית ונחת 🛋️", out: "שניכם אוהבים לצאת 🎉", mix: "קצב חיים דומה" },
  value: { heart: "לב חם חשוב לשניכם ❤️", humor: "הומור חשוב לשניכם 😄", stable: "יציבות חשובה לשניכם 🏡", open: "ראש פתוח חשוב לשניכם 🌍" },
  million: { travel: "המיליון הדמיוני של שניכם טס לחו״ל ✈️", invest: "שניכם הייתם משקיעים בדירה 🏠", spoil: "שניכם הייתם מפנקים את האהובים 🎁", save: "שניכם חוסכים, שיהיה 🐷" }
};

const WHY_I18N = {
  he: WHY,
  en: {
    intent: { serious: "You're both looking for something serious 💍", see: "You're both going with the flow 🌊" },
    shabbatStyle: { kodesh: "A holy Shabbat — for both of you 🕯️", massoret: "Tradition & calm for both of you 🕯️", regular: "Similar Shabbat style" },
    kids: { want: "You both want kids 👶", have: "You both have kids 👶", flow: "You're both open about kids" },
    weekend: { nature: "You're both nature people ⛰️", sea: "You're both sea people 🌊", movie: "Movie & blanket — both of you 🎬",
      friends: "Friends & food is your thing 🍲", explore: "You both love discovering new places ✈️" },
    pace: { home: "You're both homebodies 🛋️", out: "You both love going out 🎉", mix: "Similar pace of life" },
    value: { heart: "A warm heart matters to you both ❤️", humor: "Humor matters to you both 😄", stable: "Stability matters to you both 🏡", open: "An open mind matters to you both 🌍" },
    million: { travel: "Your imaginary million flies abroad ✈️", invest: "You'd both invest in an apartment 🏠", spoil: "You'd both spoil your loved ones 🎁", save: "You'd both save it, just in case 🐷" }
  },
  fr: {
    intent: { serious: "Vous cherchez tous les deux du sérieux 💍", see: "Vous êtes tous les deux dans le « on verra » 🌊" },
    shabbatStyle: { kodesh: "Un Shabbat sacré — pour vous deux 🕯️", massoret: "Tradition et calme pour vous deux 🕯️", regular: "Un style de Shabbat proche" },
    kids: { want: "Vous voulez tous les deux des enfants 👶", have: "Vous avez tous les deux des enfants 👶", flow: "Vous êtes tous les deux ouverts sur les enfants" },
    weekend: { nature: "Vous êtes tous les deux nature ⛰️", sea: "Vous êtes tous les deux mer 🌊", movie: "Film et plaid — tous les deux 🎬",
      friends: "Amis et bonne bouffe, c'est votre truc 🍲", explore: "Vous adorez tous les deux découvrir de nouveaux endroits ✈️" },
    pace: { home: "Vous êtes tous les deux casaniers 🛋️", out: "Vous aimez tous les deux sortir 🎉", mix: "Un rythme de vie proche" },
    value: { heart: "Un cœur chaleureux compte pour vous deux ❤️", humor: "L'humour compte pour vous deux 😄", stable: "La stabilité compte pour vous deux 🏡", open: "L'ouverture d'esprit compte pour vous deux 🌍" },
    million: { travel: "Votre million imaginaire part en voyage ✈️", invest: "Vous investiriez tous les deux dans un appartement 🏠", spoil: "Vous gâteriez tous les deux vos proches 🎁", save: "Vous l'épargneriez tous les deux 🐷" }
  }
};

function matchReasons(me, p, max = 3, lang = "he") {
  const WHY = WHY_I18N[lang] || WHY_I18N.he;
  const out = [];
  const same = k => me[k] && me[k] === p[k];
  // Langue commune en premier : c'est ce qui permet vraiment de se parler
  sharedLangs(me, p).forEach(l => out.push(_msg(lang, "same_lang", { lang: (LANG_NAMES[lang] || LANG_NAMES.he)[l], flag: LANGS[l].flag })));
  if (same("intent") && WHY.intent[me.intent]) out.push(WHY.intent[me.intent]);
  if (same("shabbatStyle") && WHY.shabbatStyle[me.shabbatStyle]) out.push(WHY.shabbatStyle[me.shabbatStyle]);
  if (same("kids") && WHY.kids[me.kids]) out.push(WHY.kids[me.kids]);
  if (same("weekend")) out.push(WHY.weekend[me.weekend]);
  if (same("pace") && WHY.pace[me.pace]) out.push(WHY.pace[me.pace]);
  if (same("value")) out.push(WHY.value[me.value]);
  if (same("million")) out.push(WHY.million[me.million]);
  if ((me.city || "").trim() && me.city.trim() === (p.city || "").trim()) out.push(_msg(lang, "same_city", { city: me.city.trim() }));
  if (me.religion === p.religion && out.length < max) out.push(_msg(lang, "same_rel"));
  if (Math.abs((me.age || 0) - (p.age || 0)) <= 3 && out.length < max) out.push(_msg(lang, "same_age"));
  return out.slice(0, max);
}

/* ---------- Icebreakers automatiques ---------- */
const ICEBREAKERS = {
  weekend: {
    nature: "המסלול הכי יפה שעשיתם בארץ? ⛰️",
    sea: "חוף בארץ או חוף בחו״ל? 🌊",
    movie: "סרט שאתם מסוגלים לראות שוב ושוב? 🎬",
    friends: "המנה שאתם הכי גאים בה? 🍲",
    explore: "המקום הבא ברשימה שלכם? ✈️"
  },
  million: {
    travel: "יעד ראשון בטיול הגדול — איפה? ✈️",
    invest: "באיזו עיר הייתם קונים דירה? 🏠",
    spoil: "הפינוק הכי שווה שנתתם פעם למישהו? 🎁",
    save: "הקנייה הכי משתלמת שעשיתם בחיים? 😄"
  },
  value: {
    humor: "מה הדבר האחרון שגרם לכם לצחוק בקול רם? 😄",
    heart: "המחווה הכי מרגשת שקיבלתם פעם? ❤️",
    stable: "בוקר מושלם נראה כמו…? ☕",
    open: "דעה שהשתנתה אצלכם בשנים האחרונות? 🌍"
  },
  pace: {
    home: "ערב מושלם בבית — מה חייב להיות בו? 🛋️",
    out: "המקום הכי שווה שיצאתם אליו לאחרונה? 🎉"
  },
  generic: [
    "אם הייתם נפגשים מחר לקפה — איפה? ☕",
    "מה גורם לכם לחייך בלי סיבה? 🙂",
    "הדבר הכי ספונטני שעשיתם אי פעם? ✨",
    "שאלה שתמיד רציתם שישאלו אתכם? 💭",
    "מה בטוח יהיה בפלייליסט של הדרך שלכם? 🎵"
  ]
};

const ICEBREAKERS_I18N = {
  he: ICEBREAKERS,
  en: {
    weekend: { nature: "The most beautiful hike you've done in Israel? ⛰️", sea: "A beach in Israel or abroad? 🌊", movie: "A movie you could watch again and again? 🎬",
      friends: "The dish you're most proud of? 🍲", explore: "The next place on your list? ✈️" },
    million: { travel: "First stop on the big trip — where? ✈️", invest: "Which city would you buy an apartment in? 🏠",
      spoil: "The best treat you ever gave someone? 🎁", save: "The best-value purchase you ever made? 😄" },
    value: { humor: "What last made you laugh out loud? 😄", heart: "The most touching gesture you ever received? ❤️",
      stable: "A perfect morning looks like…? ☕", open: "An opinion that changed for you in recent years? 🌍" },
    pace: { home: "A perfect evening at home — what must be in it? 🛋️", out: "The best place you went out to lately? 🎉" },
    generic: ["If you met tomorrow for coffee — where? ☕", "What makes you smile for no reason? 🙂", "The most spontaneous thing you ever did? ✨",
      "A question you always wished someone would ask you? 💭", "What's sure to be on your road-trip playlist? 🎵"]
  },
  fr: {
    weekend: { nature: "La plus belle randonnée que vous ayez faite en Israël ? ⛰️", sea: "Une plage en Israël ou à l'étranger ? 🌊", movie: "Un film que vous pourriez revoir encore et encore ? 🎬",
      friends: "Le plat dont vous êtes le plus fier/fière ? 🍲", explore: "Le prochain endroit sur votre liste ? ✈️" },
    million: { travel: "Première étape du grand voyage — où ? ✈️", invest: "Dans quelle ville achèteriez-vous un appartement ? 🏠",
      spoil: "Le plus beau cadeau que vous ayez fait ? 🎁", save: "Le meilleur achat de votre vie ? 😄" },
    value: { humor: "La dernière chose qui vous a fait rire aux éclats ? 😄", heart: "Le geste le plus touchant que vous ayez reçu ? ❤️",
      stable: "Un matin parfait, ça ressemble à… ? ☕", open: "Une opinion qui a changé chez vous ces dernières années ? 🌍" },
    pace: { home: "Une soirée parfaite à la maison — qu'est-ce qu'il faut absolument ? 🛋️", out: "Le meilleur endroit où vous êtes sorti·e récemment ? 🎉" },
    generic: ["Si vous vous retrouviez demain pour un café — où ? ☕", "Qu'est-ce qui vous fait sourire sans raison ? 🙂", "La chose la plus spontanée que vous ayez faite ? ✨",
      "Une question que vous rêvez qu'on vous pose ? 💭", "Qu'y aura-t-il à coup sûr dans votre playlist de route ? 🎵"]
  }
};

/* Clé neutre (ex. "weekend.sea", "generic.2") : stockée dans le chat,
   pour que chacun lise la question dans sa langue. */
function pickIcebreakerKey(a, b) {
  if (a && b) {
    for (const k of ["weekend", "million", "value", "pace"]) {
      if (a[k] && a[k] === b[k] && ICEBREAKERS[k][a[k]]) return `${k}.${a[k]}`;
    }
  }
  const seed = ((a && a.no) || 0) + ((b && b.no) || 0);
  return `generic.${seed % ICEBREAKERS.generic.length}`;
}
/* Texte d'une clé dans une langue. Anciens chats : le texte hébreu stocké est rendu tel quel. */
function icebreakerText(key, lang = "he") {
  const T = ICEBREAKERS_I18N[lang] || ICEBREAKERS_I18N.he;
  const m = /^(weekend|million|value|pace|generic)\.(\w+)$/.exec(String(key || ""));
  if (!m) return String(key || "");
  const v = T[m[1]] && T[m[1]][m[2]];
  return v != null ? v : String(key);
}
function pickIcebreaker(a, b, lang = "he") { return icebreakerText(pickIcebreakerKey(a, b), lang); }

/* ---------- Export Node (tests) ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { QUIZ, religionOk, ageOk, kidsOk, isCompatible, isSoftCompatible, softReasons, LANGS, langList, langFlags, sharedLangs, matchScore, matchPercent, matchReasons, pickIcebreaker, pickIcebreakerKey, icebreakerText, ICEBREAKERS, ICEBREAKERS_I18N, WHY, WHY_I18N, MSG };
}
