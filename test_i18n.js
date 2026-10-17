/* דרך הלב — test_i18n.js : chaque texte de i18n.js a ses 3 langues (he, en, fr), non vides. */
const fs = require("fs");
const TEXTS = new Function(fs.readFileSync(__dirname + "/i18n.js", "utf8") + "; return TEXTS;")();
const bad = Object.entries(TEXTS).filter(([, v]) => !Array.isArray(v) || v.length !== 3 || v.some(s => typeof s !== "string" || !s.trim()));
const vars = Object.entries(TEXTS).filter(([, v]) => new Set(v.map(s => (s.match(/\{\w+\}/g) || []).sort().join())).size > 1);
if (bad.length) console.log("✗ textes sans leurs 3 langues :", bad.map(b => b[0]).join(", "));
if (vars.length) console.log("✗ variables {…} différentes selon la langue :", vars.map(b => b[0]).join(", "));
const ok = !bad.length && !vars.length;
console.log(`${ok ? "✅" : "❌"} ${Object.keys(TEXTS).length} textes, 3 langues chacun`);
process.exit(ok ? 0 : 1);
