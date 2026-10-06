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
function softReasons(me, p) {
  const out = [];
  if (!me || !p) return out;
  const meMin = _num(me.ageMin), meMax = _num(me.ageMax);
  const pMin = _num(p.ageMin), pMax = _num(p.ageMax);
  if ((meMin && p.age < meMin) || (meMax && p.age > meMax)) out.push("גיל מחוץ לטווח שבחרת");
  if ((pMin && me.age < pMin) || (pMax && me.age > pMax)) out.push(p.gender === "f" ? "את/ה מחוץ לטווח הגילאים שלה" : "את/ה מחוץ לטווח הגילאים שלו");
  if (!meMin && !meMax && !pMin && !pMax && !ageOk(me, p)) out.push(`פער גילאים של ${Math.abs(me.age - p.age)} שנים`);
  if (!religionOk(me.religion, p.religion)) out.push("אורח חיים שונה (דתי ↔ חילוני)");
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

function matchReasons(me, p, max = 3) {
  const out = [];
  const same = k => me[k] && me[k] === p[k];
  if (same("intent") && WHY.intent[me.intent]) out.push(WHY.intent[me.intent]);
  if (same("shabbatStyle") && WHY.shabbatStyle[me.shabbatStyle]) out.push(WHY.shabbatStyle[me.shabbatStyle]);
  if (same("kids") && WHY.kids[me.kids]) out.push(WHY.kids[me.kids]);
  if (same("weekend")) out.push(WHY.weekend[me.weekend]);
  if (same("pace") && WHY.pace[me.pace]) out.push(WHY.pace[me.pace]);
  if (same("value")) out.push(WHY.value[me.value]);
  if (same("million")) out.push(WHY.million[me.million]);
  if ((me.city || "").trim() && me.city.trim() === (p.city || "").trim()) out.push("שניכם מ" + me.city.trim());
  if (me.religion === p.religion && out.length < max) out.push("אורח חיים דומה");
  if (Math.abs((me.age || 0) - (p.age || 0)) <= 3 && out.length < max) out.push("גיל דומה");
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

function pickIcebreaker(a, b) {
  if (a && b) {
    if (a.weekend && a.weekend === b.weekend && ICEBREAKERS.weekend[a.weekend]) return ICEBREAKERS.weekend[a.weekend];
    if (a.million && a.million === b.million && ICEBREAKERS.million[a.million]) return ICEBREAKERS.million[a.million];
    if (a.value && a.value === b.value && ICEBREAKERS.value[a.value]) return ICEBREAKERS.value[a.value];
    if (a.pace && a.pace === b.pace && ICEBREAKERS.pace[a.pace]) return ICEBREAKERS.pace[a.pace];
  }
  const seed = ((a && a.no) || 0) + ((b && b.no) || 0);
  return ICEBREAKERS.generic[seed % ICEBREAKERS.generic.length];
}

/* ---------- Export Node (tests) ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { QUIZ, religionOk, ageOk, kidsOk, isCompatible, isSoftCompatible, softReasons, matchScore, matchPercent, matchReasons, pickIcebreaker, ICEBREAKERS, WHY };
}
