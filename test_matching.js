/* Tests du moteur de matching — sans Firebase. Lancer : node test_matching.js */
const M = require("./matching.js");

let n = 0, fail = 0;
function check(name, cond) {
  n++;
  if (cond) console.log("  ✓ " + name);
  else { fail++; console.error("  ✗ " + name); }
}

const base = { no: 1, gender: "f", age: 32, city: "תל אביב", religion: "masorti", intent: "serious" };
const guy = { no: 2, gender: "m", age: 34, city: "חולון", religion: "masorti", intent: "serious" };

console.log("— Filtres durs —");
check("couple compatible de base", M.isCompatible(base, guy));
check("même genre → incompatible", !M.isCompatible(base, { ...guy, gender: "f" }));
check("dati ↔ hiloni → incompatible", !M.isCompatible({ ...base, religion: "dati" }, { ...guy, religion: "hiloni" }));
check("masorti ↔ dati → compatible", M.isCompatible(base, { ...guy, religion: "dati" }));
check("fallback âge : écart 9 ans sans fourchettes → incompatible", !M.isCompatible(base, { ...guy, age: 41 }));
check("fourchette me : lui 45, moi max 40 → incompatible", !M.isCompatible({ ...base, ageMin: 28, ageMax: 40 }, { ...guy, age: 45 }));
check("fourchette me : lui 45, moi max 50 → compatible", M.isCompatible({ ...base, ageMin: 28, ageMax: 50 }, { ...guy, age: 45 }));
check("fourchette lui : moi 32, lui min 35 → incompatible", !M.isCompatible(base, { ...guy, ageMin: 35, ageMax: 45 }));
check("kids want ↔ no → incompatible", !M.isCompatible({ ...base, kids: "want" }, { ...guy, kids: "no" }));
check("kids no ↔ want → incompatible (symétrie)", !M.isCompatible({ ...base, kids: "no" }, { ...guy, kids: "want" }));
check("kids flow ↔ no → compatible", M.isCompatible({ ...base, kids: "flow" }, { ...guy, kids: "no" }));
check("kids absent (ancien profil) → compatible", M.isCompatible({ ...base, kids: "want" }, guy));
check("profil en pause → exclu", !M.isCompatible(base, { ...guy, paused: true }));
check("profil incomplet ne crashe pas", (() => { try { M.isCompatible(base, { gender: "m", age: 30 }); return true; } catch (e) { return false; } })());

console.log("— Score & % —");
const rich1 = { ...base, kids: "want", shabbatStyle: "massoret", pace: "mix", value: "heart", weekend: "sea", million: "travel" };
const rich2 = { ...guy, kids: "want", shabbatStyle: "massoret", pace: "mix", value: "heart", weekend: "sea", million: "travel" };
check("profils jumeaux > profils neutres", M.matchScore(rich1, rich2) > M.matchScore(base, guy));
check("kodesh ↔ regular pénalisé", M.matchScore({ ...rich1, shabbatStyle: "kodesh" }, { ...rich2, shabbatStyle: "regular" }) < M.matchScore(rich1, rich2) - 20);
check("score symétrique", M.matchScore(rich1, rich2) === M.matchScore(rich2, rich1));
const pct = M.matchPercent(rich1, rich2);
check("% borné 45–99 (ici " + pct + ")", pct >= 45 && pct <= 99);
check("% jamais > 99 même score énorme", M.matchPercent(rich1, rich2) <= 99);
check("% sur anciens profils ne crashe pas", (() => { try { return M.matchPercent(base, guy) >= 45; } catch (e) { return false; } })());

console.log("— Raisons —");
const why = M.matchReasons(rich1, rich2);
check("max 3 raisons", why.length === 3);
check("raisons en hébreu non vides", why.every(w => typeof w === "string" && w.length > 2));
check("intent serious en premier", why[0].includes("רציני"));
check("anciens profils → raisons quand même", M.matchReasons(base, guy).length >= 1);
check("aucun point commun → tableau (peut être vide) sans crash", Array.isArray(M.matchReasons({ ...base, religion: "dati", intent: "see", city: "א" }, { ...guy, religion: "masorti", intent: "serious", city: "ב", age: 40 })));

console.log("— Découverte (hors préférences) —");
check("dati ↔ hiloni : découverte OK", M.isSoftCompatible({ ...base, religion: "dati" }, { ...guy, religion: "hiloni" }));
check("découverte : même genre exclu", !M.isSoftCompatible(base, { ...guy, gender: "f" }));
check("découverte : profil en pause exclu", !M.isSoftCompatible(base, { ...guy, paused: true }));
check("découverte : enfants want ↔ no exclu", !M.isSoftCompatible({ ...base, kids: "want" }, { ...guy, kids: "no" }));
check("raison religion", M.softReasons({ ...base, religion: "dati" }, { ...guy, religion: "hiloni" }).includes("אורח חיים שונה (דתי ↔ חילוני)"));
check("raison : hors de MA tranche", M.softReasons({ ...base, ageMin: 25, ageMax: 30 }, { ...guy, age: 40 }).includes("גיל מחוץ לטווח שבחרת"));
check("raison : je suis hors de SA tranche (homme)", M.softReasons(base, { ...guy, ageMin: 20, ageMax: 28 }).includes("את/ה מחוץ לטווח הגילאים שלו"));
check("raison : je suis hors de SA tranche (femme)", M.softReasons(guy, { ...base, ageMin: 20, ageMax: 28 }).includes("את/ה מחוץ לטווח הגילאים שלה"));
check("raison : écart > 8 ans sans tranches", M.softReasons(base, { ...guy, age: 45 }).includes("פער גילאים של 13 שנים"));
check("match strict → aucune raison", M.softReasons(base, guy).length === 0);
check("chaque profil découverte non strict a au moins une raison", [
  [{ ...base, religion: "dati" }, { ...guy, religion: "hiloni" }], [base, { ...guy, age: 45 }], [{ ...base, ageMax: 30 }, guy]
].every(([a, b]) => M.isSoftCompatible(a, b) && !M.isCompatible(a, b) && M.softReasons(a, b).length > 0));

console.log("— Icebreakers —");
check("weekend commun → question ים", M.pickIcebreaker(rich1, rich2) === M.ICEBREAKERS.weekend.sea);
check("sans points communs → générique déterministe", M.ICEBREAKERS.generic.includes(M.pickIcebreaker(base, guy)));
check("profils null ne crashent pas", typeof M.pickIcebreaker(null, null) === "string");
check("icebreaker ≤ 200 chars (règle Firebase)", M.pickIcebreaker(rich1, rich2).length <= 200);

console.log(fail ? `\n❌ ${fail}/${n} échecs` : `\n✅ ${n}/${n} tests passent`);
process.exit(fail ? 1 : 0);
