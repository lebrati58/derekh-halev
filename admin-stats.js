/* ==========================================================================
   דרך הלב — admin-stats.js
   Interface du centre statistique de l'admin (page « 📊 סטטיסטיקות »).
   Tous les calculs sont dans stats.js (pur, testé) ; la compatibilité vient de
   matching.js. Ici : chargement des nœuds de suivi, filtres, onglets,
   graphiques SVG interactifs, export CSV. Ne lit jamais messages / secrets / private.
   ========================================================================== */
const StatsUI = (() => {
  const C_M = "#4f8fe8", C_F = "#d4618f", C_1 = "#b8892c";        // validés (validate_palette, fond sombre)
  const NODES = ["activity", "presence", "stats", "chatActivity"];
  const extra = {}, denied = {};
  let subscribed = false, isOpen = false, timer = null, last = null;
  const st = { preset: "30", from: "", to: "", tab: "overview", seg: {} };
  try { Object.assign(st, JSON.parse(localStorage.getItem("mhm_admin_stats") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem("mhm_admin_stats", JSON.stringify(st)); } catch (e) {} };

  /* ---------- Format ---------- */
  const N = v => (v == null ? null : Number.isInteger(v) ? String(v) : v.toFixed(1));
  const P = v => (v == null ? null : Math.round(v * 100) + "%");
  const NA = "אין נתונים";
  const dateHe = ts => new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" });
  const shortDay = ts => new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  const ltr = s => "⁦" + s + "⁩";      // nombres / plages lisibles dans du texte RTL

  /* ---------- Données ---------- */
  function subscribe() {
    if (subscribed) return; subscribed = true;
    NODES.forEach(n => db.ref(n).on("value", s => { extra[n] = s.val() || {}; delete denied[n]; schedule(); },
      err => { denied[n] = err && err.code; extra[n] = null; schedule(); }));
  }
  function schedule() { if (!isOpen) return; clearTimeout(timer); timer = setTimeout(renderContent, 120); }
  const M = () => ({ isCompatible, isSoftCompatible, matchPercent, sharedLangs, QUIZ });
  function range() {
    const f = st.from ? new Date(st.from).getTime() : null, t = st.to ? new Date(st.to).getTime() : null;
    return periodRange(st.preset, Date.now(), f, t);
  }
  function compute() {
    const data = { profiles, chats, reports, banned, activity: extra.activity || {}, presence: denied.presence ? null : extra.presence,
      stats: extra.stats || {}, chatActivity: extra.chatActivity || {} };
    const seg = Object.fromEntries(Object.entries(st.seg).filter(([, v]) => v !== "" && v != null));
    ["ageMin", "ageMax"].forEach(k => { if (seg[k]) seg[k] = +seg[k]; });
    return computeStats(data, { now: Date.now(), range: range(), segment: Object.keys(seg).length ? seg : null }, M());
  }

  /* ---------- Composants ---------- */
  function kpi(label, value, opts = {}) {
    const na = value == null;
    let delta = "";
    if (!na && opts.prev != null && typeof opts.cur === "number") {
      const d = opts.cur - opts.prev;
      const rel = opts.prev ? ` (${d >= 0 ? "+" : ""}${Math.round(100 * d / opts.prev)}%)` : "";
      delta = `<div class="kpi-d ${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "▲" : d < 0 ? "▼" : "="} ${ltr((d >= 0 ? "+" : "") + d + rel)} <span>מול התקופה הקודמת</span></div>`;
    }
    return `<div class="kpi ${na ? "na" : ""}"><div class="kpi-l">${esc(label)}</div>
      <div class="kpi-v">${na ? NA : esc(/^\d+–\d+$/.test(value) ? ltr(value) : value)}</div>${delta}
      ${opts.sub ? `<div class="kpi-s">${esc(opts.sub)}</div>` : ""}
      ${opts.f ? `<div class="kpi-f">ⓘ ${esc(opts.f)}</div>` : ""}</div>`;
  }
  const kpis = cards => `<div class="kpis">${cards.join("")}</div>`;
  const card = (title, body, opts = {}) => `<section class="panel an-card"><div class="an-card-h"><h3>${esc(title)}</h3>
    ${opts.csv ? `<button class="btn link small an-csv" data-csv="${esc(opts.csv)}">⬇️ CSV</button>` : ""}</div>
    ${opts.note ? `<p class="an-note">${esc(opts.note)}</p>` : ""}${body}</section>`;
  const unavailable = why => `<div class="an-na">📭 ${NA}${why ? ` — ${esc(why)}` : ""}</div>`;
  const legend = items => `<div class="an-legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join("")}</div>`;

  /* Barres horizontales. rows : [libellé, n, détail?] ; total = base des % */
  function bars(rows, total, color = C_1) {
    rows = rows.filter(r => r[1] > 0);
    if (!rows.length) return unavailable();
    const max = Math.max(...rows.map(r => r[1]));
    return rows.map(([l, n, d]) => `<div class="bar-row" title="${esc(`${l}: ${n}${total ? ` (${P(n / total)})` : ""}`)}">
      <span class="bar-l">${esc(/[א-ת]/.test(l) ? l : ltr(l))}</span>
      <span class="bar-track"><span class="bar" style="width:${Math.max(2, 100 * n / max)}%;background:${color}"></span></span>
      <span class="bar-n">${esc(n)}${total ? ` <small>${esc(P(n / total))}</small>` : ""}</span>
      ${d ? `<span class="bar-d">${esc(d)}</span>` : ""}</div>`).join("");
  }
  /* Barres appariées hommes / femmes */
  function pairBars(rows) {
    if (!rows.some(r => r.m || r.f)) return unavailable();
    const max = Math.max(...rows.map(r => Math.max(r.m, r.f)), 1);
    return legend([[C_M, "גברים"], [C_F, "נשים"]]) + rows.map(r => `<div class="pair-row" title="${esc(`${r.l}: גברים ${r.m} · נשים ${r.f}`)}">
      <span class="bar-l">${esc(ltr(r.l))}</span><span class="pair-bars">
      <span class="bar-track"><span class="bar" style="width:${r.m ? Math.max(2, 100 * r.m / max) : 0}%;background:${C_M}"></span></span>
      <span class="bar-track"><span class="bar" style="width:${r.f ? Math.max(2, 100 * r.f / max) : 0}%;background:${C_F}"></span></span></span>
      <span class="bar-n">${r.m} · ${r.f}</span></div>`).join("");
  }
  /* Anneau (≤ 3 parts) avec légende + valeurs */
  function donut(parts) {
    const tot = parts.reduce((a, p) => a + p[1], 0);
    if (!tot) return unavailable();
    let acc = 0; const R = 42, L = 2 * Math.PI * R;
    const segs = parts.filter(p => p[1]).map(([l, n, c]) => {
      const len = L * n / tot, gap = parts.filter(p => p[1]).length > 1 ? 2 : 0;
      const s = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${c}" stroke-width="16" stroke-dasharray="${Math.max(0, len - gap)} ${L}" stroke-dashoffset="${-acc}"><title>${esc(`${l}: ${n} (${P(n / tot)})`)}</title></circle>`;
      acc += len; return s;
    }).join("");
    return `<div class="donut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(parts.map(p => `${p[0]} ${p[1]}`).join(", "))}">
      <g transform="rotate(-90 60 60)">${segs}</g><text x="60" y="66" text-anchor="middle" class="donut-t">${tot}</text></svg>
      <div>${parts.map(([l, n, c]) => `<div class="donut-l"><i style="background:${c}"></i>${esc(l)} <b>${n}</b> <small>${esc(P(n / tot))}</small></div>`).join("")}</div></div>`;
  }
  /* Courbes quotidiennes (axe unique : des comptes), survol = ligne + bulle */
  function lines(id, series, keys) {
    if (!series.length || !keys.some(([k]) => series.some(d => d[k]))) return unavailable("אין פעילות בתקופה הזו");
    const W = 320, H = 130, pad = { l: 4, r: 4, t: 10, b: 18 };
    const max = Math.max(1, ...series.flatMap(d => keys.map(([k]) => d[k] || 0)));
    const x = i => pad.l + (series.length === 1 ? (W - pad.l - pad.r) / 2 : i * (W - pad.l - pad.r) / (series.length - 1));
    const y = v => H - pad.b - (v / max) * (H - pad.t - pad.b);
    const grid = [0, 0.5, 1].map(f => `<line x1="0" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" class="grid"/><text x="${W - 2}" y="${y(max * f) - 2}" text-anchor="end" class="axis">${Math.round(max * f)}</text>`).join("");
    const paths = keys.map(([k, , c]) => `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" points="${series.map((d, i) => `${x(i).toFixed(1)},${y(d[k] || 0).toFixed(1)}`).join(" ")}"/>` +
      (series.length <= 31 ? series.map((d, i) => d[k] ? `<circle cx="${x(i)}" cy="${y(d[k])}" r="2.5" fill="${c}"/>` : "").join("") : "")).join("");
    const step = Math.ceil(series.length / 6);
    const xl = series.map((d, i) => i % step === 0 || i === series.length - 1 ? `<text x="${x(i)}" y="${H - 4}" text-anchor="middle" class="axis">${shortDay(d.day)}</text>` : "").join("");
    return legend(keys.map(([, l, c]) => [c, l])) +
      `<div class="lc" data-lc="${id}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${paths}${xl}<line class="cross" x1="0" x2="0" y1="${pad.t}" y2="${H - pad.b}" style="display:none"/></svg><div class="tip" style="display:none"></div></div>`;
  }
  function wireLines(root, id, series, keys) {
    const el = root.querySelector(`[data-lc="${id}"]`); if (!el) return;
    const svg = el.querySelector("svg"), tip = el.querySelector(".tip"), cross = el.querySelector(".cross");
    const move = e => {
      const r = svg.getBoundingClientRect(), fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const i = Math.round(fx * (series.length - 1)), d = series[i]; if (!d) return;
      const xv = series.length === 1 ? 160 : 4 + i * (312 / (series.length - 1));
      cross.setAttribute("x1", xv); cross.setAttribute("x2", xv); cross.style.display = "";
      tip.innerHTML = `<b>${shortDay(d.day)}</b>` + keys.map(([k, l, c]) => `<div><i style="background:${c}"></i>${esc(l)}: <b>${d[k] || 0}</b></div>`).join("");
      tip.style.display = ""; tip.style.left = Math.min(r.width - 130, Math.max(0, fx * r.width - 65)) + "px";
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerdown", move);
    // souris : la bulle suit et disparaît en sortant ; doigt : elle reste après l'appui (sinon elle s'efface aussitôt)
    el.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { tip.style.display = "none"; cross.style.display = "none"; } });
  }
  /* Histogramme (colonnes) */
  function columns(entries, color = C_1) {
    if (!entries.some(e => e[1])) return unavailable();
    const max = Math.max(1, ...entries.map(e => e[1]));
    return `<div class="cols">${entries.map(([l, n]) => `<div class="col" title="${esc(`${l}: ${n}`)}"><span class="col-n">${n || ""}</span>
      <span class="col-bar" style="height:${n ? Math.max(3, 100 * n / max) : 0}%;background:${color}"></span><span class="col-l">${esc(l)}</span></div>`).join("")}</div>`;
  }
  /* Entonnoir : chaque étape, % de l'étape précédente et du départ */
  function funnel(steps) {
    const first = steps[0][1];
    if (!first) return unavailable("אין עדיין מבקרים חדשים בתקופה");
    return `<div class="funnel">${steps.map(([l, n], i) => `<div class="fn-row" title="${esc(`${l}: ${n}`)}">
      <span class="fn-bar" style="width:${Math.max(4, 100 * n / first)}%"></span>
      <span class="fn-t">${esc(l)} <b>${n}</b> <small>${i ? `${P(n / (steps[i - 1][1] || 1)) || "—"} מהשלב הקודם · ${P(n / first)} מההתחלה` : "100%"}</small></span></div>`).join("")}</div>`;
  }
  function table(head, rows) {
    return `<div class="an-table"><table class="ptable"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c == null ? "—" : c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  /* ---------- CSV ---------- */
  let csvData = {};
  function downloadCSV(name) {
    const d = csvData[name]; if (!d) return;
    const cell = v => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const text = "﻿" + [d.head, ...d.rows].map(r => r.map(cell).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = `derekh-halev-${name}-${dayKeyOf(Date.now())}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Squelette (filtres + onglets), rendu une fois ---------- */
  const TABS = [["overview", "סקירה"], ["members", "חברים"], ["matching", "התאמות"], ["usage", "שימוש"], ["insights", "תובנות"], ["whatsapp", "וואטסאפ ובוט"], ["events", "אירועים"]];
  const PRESETS = [["today", "היום"], ["7", "7 ימים"], ["30", "30 ימים"], ["90", "90 ימים"], ["365", "שנה"], ["custom", "תאריכים"]];
  function skeleton() {
    const root = $("#stats-root");
    root.innerHTML = `
      <div class="an-filters">
        <div class="chips" id="an-presets">${PRESETS.map(([k, l]) => `<button class="an-chip" data-p="${k}">${l}</button>`).join("")}</div>
        <div class="an-custom hidden" id="an-custom"><label>מ־ <input type="date" id="an-from"></label><label>עד <input type="date" id="an-to"></label></div>
        <details class="an-seg" id="an-segbox"><summary>🔎 סינון חברים <span id="an-segsum"></span></summary>
          <div class="an-seg-grid">
            <label>מגדר<select data-seg="gender"><option value="">הכל</option><option value="m">גברים</option><option value="f">נשים</option></select></label>
            <label>גיל מ־<input type="number" min="18" max="99" inputmode="numeric" data-seg="ageMin"></label>
            <label>עד<input type="number" min="18" max="99" inputmode="numeric" data-seg="ageMax"></label>
            <label>עיר<select data-seg="city" id="an-city"><option value="">הכל</option></select></label>
            <label>אורח חיים<select data-seg="religion"><option value="">הכל</option><option value="dati">דתי/ה</option><option value="masorti">מסורתי/ת</option><option value="hiloni">חילוני/ת</option></select></label>
            <label>מחפשים<select data-seg="intent"><option value="">הכל</option>${Object.entries(LABELS.intent).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label>
            <label>שפה<select data-seg="lang"><option value="">הכל</option><option value="he">עברית</option><option value="en">אנגלית</option><option value="fr">צרפתית</option></select></label>
          </div>
          <p class="an-note">הסינון חל על לשוניות ״חברים״ ו״התאמות״. מקור הרשמה ואירוע — אין נתונים (לא נאסף).</p>
          <button class="btn ghost small" id="an-segclear">ניקוי הסינון</button>
        </details>
      </div>
      <nav class="an-tabs" id="an-tabs">${TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join("")}</nav>
      <div id="an-alert"></div>
      <div id="an-content"></div>`;
    $("#an-presets").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return; st.preset = b.dataset.p; save(); syncControls(); renderContent(); });
    ["an-from", "an-to"].forEach(id => $("#" + id).addEventListener("change", () => { st.from = $("#an-from").value; st.to = $("#an-to").value; save(); renderContent(); }));
    $("#an-tabs").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b) return; st.tab = b.dataset.t; save(); syncControls(); renderContent(); });
    root.querySelectorAll("[data-seg]").forEach(el => el.addEventListener("change", () => { st.seg[el.dataset.seg] = el.value; save(); syncControls(); renderContent(); }));
    $("#an-segclear").addEventListener("click", () => { st.seg = {}; save(); syncControls(); renderContent(); });
    root.addEventListener("click", e => { const b = e.target.closest("[data-csv]"); if (b) downloadCSV(b.dataset.csv); });
    syncControls();
  }
  function syncControls() {
    $$("#an-presets [data-p]").forEach(b => b.classList.toggle("active", b.dataset.p === st.preset));
    $("#an-custom").classList.toggle("hidden", st.preset !== "custom");
    $("#an-from").value = st.from || ""; $("#an-to").value = st.to || "";
    $$("#an-tabs [data-t]").forEach(b => b.classList.toggle("active", b.dataset.t === st.tab));
    const cities = [...new Set(Object.values(profiles).map(p => (p.city || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
    const sel = $("#an-city"), cur = st.seg.city || "";
    sel.innerHTML = `<option value="">הכל</option>` + cities.map(c => `<option${c === cur ? " selected" : ""}>${esc(c)}</option>`).join("");
    $$("#stats-root [data-seg]").forEach(el => { if (el.id !== "an-city") el.value = st.seg[el.dataset.seg] || ""; });
    const n = Object.values(st.seg).filter(v => v !== "" && v != null).length;
    $("#an-segsum").textContent = n ? `(${n} פעילים)` : "";
  }

  /* ---------- Contenu des onglets ---------- */
  function renderContent() {
    if (!isOpen || !$("#an-content")) return;
    const S = compute(); last = S; csvData = {};
    const r = S.range;
    const per = st.preset === "today" ? "היום" : `${dateHe(r.from)}–${dateHe(r.to)}`;
    const deniedList = Object.keys(denied);
    $("#an-alert").innerHTML =
      (deniedList.length ? `<div class="an-banner warn">⚠️ אין הרשאה לקרוא ${esc(deniedList.join(", "))} — צריך לפרסם את החוקים החדשים (database.rules.json) בקונסולת Firebase.</div>` : "") +
      `<div class="an-banner">📅 תקופה: ${esc(ltr(per))} · ${S.since ? `נתוני שימוש נאספים מאז ${esc(ltr(dateHe(S.since)))}` : "נתוני שימוש: האיסוף עוד לא התחיל"}</div>`;
    const html = { overview, members, matching, usage, insightsTab, whatsapp, events }[st.tab === "insights" ? "insightsTab" : st.tab] || overview;
    $("#an-content").innerHTML = html(S);
    if (st.tab === "overview") { wireLines($("#an-content"), "growth", S.usage.series, GROWTH); wireLines($("#an-content"), "visits", S.usage.series, VISITS); }
    if (st.tab === "usage") wireLines($("#an-content"), "visits2", S.usage.series, VISITS);
  }
  const GROWTH = [["registrations", "הרשמות", C_1], ["chats", "שיחות חדשות", C_M]];
  const VISITS = [["unique", "מבקרים ייחודיים", C_1], ["visits", "כניסות", C_M]];

  function overview(S) {
    const k = S.kpi;
    return kpis([
      kpi("נרשמים", N(k.members), { sub: `${k.paused} בהשהיה · ${k.banned} מורחקים` }),
      kpi("נרשמו בתקופה", N(k.newPeriod), { cur: k.newPeriod, prev: k.newPrev }),
      kpi("חדשים: היום · 7 ימים · 30 ימים", `${k.newToday} · ${k.newWeek} · ${k.newMonth}`),
      kpi("פעילים: 24 ש׳ · 7 ימים · 30 ימים", k.active24 == null ? null : `${k.active24} · ${k.active7} · ${k.active30}`, { f: "נרשמים שנכנסו לאפליקציה בחלון הזמן (כל נרשם נספר פעם אחת)" }),
      kpi("פעילים בתקופה", N(k.activePeriod), { cur: k.activePeriod, prev: k.activePrev }),
      kpi("מחוברים עכשיו", N(k.online), { sub: k.onlineMembers != null ? `${k.onlineMembers} מהם רשומים` : "", f: "חלונות פתוחים של האפליקציה ברגע זה" }),
      kpi("שיעור הרשמה", P(k.signupRate), { f: "מבקרים חדשים בתקופה שיצרו פרופיל ÷ כל המבקרים החדשים בתקופה" }),
      kpi("פרופילים מלאים", P(k.completeRate), { f: "פרופילים שענו על כל השאלון + שפות ÷ כל הפרופילים" }),
      kpi("התאמות הדדיות אפשריות", N(k.mutualPairs), { f: "זוגות שכל אחד מתאים להעדפות של השני (matching.js), כל זוג נספר פעם אחת" }),
      kpi("שיחות שנפתחו בתקופה", N(k.chatsPeriod), { cur: k.chatsPeriod, prev: k.chatsPrev, sub: `${k.chatsTotal} בסה״כ` }),
      kpi("מסכים שנפתחו ✨", N(k.openedTotal), { f: "שיחות שבהן שני הצדדים לחצו ״פתיחת המסך״" }),
      kpi("פגישות שהתקיימו", null, { f: "לא נאסף באפליקציה" }),
      kpi("חזרו אחרי 7 ימים", P(k.ret7.rate), { sub: k.ret7.base ? `${k.ret7.kept} מתוך ${k.ret7.base}` : "", f: "מבקרים שהביקור הראשון שלהם לפני 7+ ימים וחזרו ביום אחר, 7 ימים או יותר אחריו" }),
      kpi("חזרו אחרי 30 ימים", P(k.ret30.rate), { sub: k.ret30.base ? `${k.ret30.kept} מתוך ${k.ret30.base}` : "", f: "כנ״ל, 30 ימים" })
    ]) +
      card("📈 הרשמות ושיחות חדשות ליום", lines("growth", S.usage.series, GROWTH), { csv: "daily" }) +
      card("👀 כניסות ומבקרים ליום", S.hasActivity ? lines("visits", S.usage.series, VISITS) : unavailable("האיסוף התחיל עם הגרסה הזו")) +
      dailyCSV(S);
  }
  function dailyCSV(S) {
    csvData.daily = { head: ["day", "registrations", "new_chats", "visits", "unique_visitors", "unique_members", "requests_sent"],
      rows: S.usage.series.map(d => [new Date(d.day).toISOString().slice(0, 10), d.registrations, d.chats, d.visits, d.unique, d.uniqueMembers, d.requests]) };
    return "";
  }

  function members(S) {
    const m = S.members, n = m.n;
    const quizTitles = { kids: "👶 ילדים", shabbatStyle: "🕯️ סגנון שבת", pace: "🛋️ קצב חיים", value: "❤️ מה הכי חשוב", weekend: "⛰️ סופ״ש אידיאלי", million: "💰 מה עושים עם מיליון" };
    csvData.cities = { head: ["city", "members"], rows: m.cities };
    csvData.ages = { head: ["age_range", "men", "women"], rows: m.ageBuckets.map(b => [b.b, b.m, b.f]) };
    const kidsWant = (m.quiz.kids || {}).want || 0;
    return kpis([
      kpi("חברים (לפי הסינון)", N(n)),
      kpi("גיל ממוצע", m.ageAvg == null ? null : m.ageAvg.toFixed(1)),
      kpi("גיל חציוני", N(m.ageMedian)),
      kpi("טווח גילאים", m.ageMin == null ? null : `${m.ageMin}–${m.ageMax}`),
      kpi("פעילים ב־30 יום", N(m.active30), { sub: m.active30 != null ? `${n - m.active30} לא פעילים` : "", f: "נכנסו לאפליקציה ב־30 הימים האחרונים" }),
      kpi("רוצים ילדים", N(kidsWant), { sub: n ? `${P(kidsWant / n)} מהחברים` : "" }),
      kpi("פרופילים מלאים", N(m.completeCount), { sub: n ? P(m.completeCount / n) : "" }),
      kpi("מצב משפחתי", null, { f: "לא נשאל בהרשמה" })
    ]) +
      card("⚧️ מגדר", donut([["גברים", m.gender.m, C_M], ["נשים", m.gender.f, C_F]].concat(m.gender.other ? [["אחר / לא צוין", m.gender.other, C_1]] : []))) +
      card("🎂 גילאים לפי מגדר", pairBars(m.ageBuckets.map(b => ({ l: b.b, m: b.m, f: b.f }))), { csv: "ages" }) +
      card("📍 ערים", bars(m.cities.slice(0, 15), n), { csv: "cities", note: `${m.cities.length} ערים שונות${m.cities.length > 15 ? " — 15 המובילות (הכל בקובץ CSV)" : ""}` }) +
      card("✡️ אורח חיים", bars(["dati", "masorti", "hiloni"].map(r => [religionLabel(r, "m") + " / " + religionLabel(r, "f"), m.religion[r] || 0]), n)) +
      card("💍 מה מחפשים", bars(Object.entries(LABELS.intent).map(([k, l]) => [l, m.intent[k] || 0]), n)) +
      card("🗣️ שפות מדוברות", bars([["🇮🇱 עברית", m.langs.he], ["🇬🇧 אנגלית", m.langs.en], ["🇫🇷 צרפתית", m.langs.fr], ["לא צוין", m.langs.none]], n), { note: "אחוז מכלל החברים — אפשר לסמן כמה שפות" }) +
      card("📝 השלמת הפרופיל", bars(m.completion, n), { note: "שדות רשות שמולאו מתוך 9: טווח גילאים, ילדים, שבת, קצב, ערך, סופ״ש, מיליון, שפות, ״לא יכול/ה בלי״" }) +
      `<h3 class="sub-h">📝 השאלון</h3>` +
      Object.keys(QUIZ).map(k => card(quizTitles[k] || k, bars(Object.entries(QUIZ[k]).map(([v, l]) => [l, (m.quiz[k] || {})[v] || 0]).concat([["לא ענו", (m.quiz[k] || {})._none || 0]]), n))).join("");
  }

  function matching(S) {
    const m = S.matching;
    csvData.groups = { head: ["gender", "age_range", "members", "avg_strict_proposals", "without_proposal", "without_proposal_rate"],
      rows: m.groups.map(g => [g.gender, g.bucket, g.n, g.avg.toFixed(2), g.zero, Math.round(g.zeroRate * 100) + "%"]) };
    csvData.criteria = { head: ["criterion", "chats_yes", "both_wrote_yes", "curtain_yes", "chats_no", "both_wrote_no", "curtain_no"],
      rows: m.criteria.map(c => [c.key, c.yes.n, P(c.yes.bothRate), P(c.yes.openRate), c.no.n, P(c.no.bothRate), P(c.no.openRate)]) };
    return kpis([
      kpi("התאמות הדדיות אפשריות", N(m.mutual), { f: "זוגות שמתאימים זה לזה בשני הכיוונים (מסננים קשיחים של matching.js)" }),
      kpi("ציון התאמה ממוצע", m.avgScore == null ? null : Math.round(m.avgScore) + "%", { sub: m.medianScore != null ? `חציון ${Math.round(m.medianScore)}%` : "", f: "matchPercent על כל הזוגות ההדדיים" }),
      kpi("בקשות שנשלחו בתקופה", N(m.requests), { sub: m.requestsSoft ? `${m.requestsSoft} מהן ״מחוץ להעדפות״` : "", f: "נספר מרגע הוספת האיסוף" }),
      kpi("בקשות שהתקבלו / נדחו", m.accepted == null ? null : `${m.accepted} / ${m.declined}`),
      kpi("שיעור קבלה", P(m.acceptRate), { f: "התקבלו ÷ (התקבלו + נדחו) בתקופה — בקשות שעוד לא נענו לא נספרות" }),
      kpi("שיחות (התאמות הדדיות שנוצרו)", N(m.chats), { f: "כל שיחה = בקשה שהתקבלה, כלומר התאמה הדדית" }),
      kpi("שיחות עם הודעה", m.hasChatActivity ? N(m.chatsWithMsg) : null, { f: "לפחות צד אחד כתב (נספר מרגע הוספת האיסוף, בלי לקרוא את ההודעות)" }),
      kpi("שיעור תשובה", m.hasChatActivity ? P(m.responseRate) : null, { f: "שיחות ששני הצדדים כתבו בהן ÷ שיחות שמישהו כתב בהן" }),
      kpi("פתיחת מסך", P(m.openRate), { sub: `${m.opened} מתוך ${m.chats}`, f: "שיחות שהמסך נפתח בהן ÷ כל השיחות" }),
      kpi("פגישות שהתקיימו", null, { f: "לא נאסף" }),
      kpi("סיבות לכישלון", null, { sub: `${m.ended} שיחות הסתיימו · ${m.declined ?? "?"} בקשות נדחו`, f: "האפליקציה לא שואלת למה — רק מה קרה" })
    ]) +
      card("📊 התפלגות ציוני ההתאמה", columns(Object.entries(m.hist)), { note: `${m.scores.length} זוגות הדדיים` }) +
      card("🎯 כמה הצעות מתאימות כל חבר/ה מקבל/ת", bars(Object.entries(m.dist), m.described), { note: `הצעות ״לפי ההעדפות״ (בלי ״מחוץ להעדפות״). ממוצע ${m.avgProposals == null ? "—" : m.avgProposals.toFixed(1)}, ${m.zeroProposals} בלי אף הצעה. לפי הסינון, בלי פרופילים בהשהיה.` }) +
      card("👥 קבוצות: מגדר × גיל", m.groups.length ? table(["מגדר", "גיל", "חברים", "הצעות בממוצע", "בלי הצעה"], m.groups.map(g => [g.gender === "m" ? "גברים" : "נשים", ltr(g.bucket), g.n, g.avg.toFixed(1), `${g.zero} (${P(g.zeroRate)})`])) : unavailable(), { csv: "groups" }) +
      card("🔍 מה קשור לשיחות טובות יותר?", table(["קריטריון", "כן: שיחות · תשובה · מסך", "לא: שיחות · תשובה · מסך"],
        m.criteria.map(c => [c.label, `${c.yes.n} · ${P(c.yes.bothRate) || "—"} · ${P(c.yes.openRate) || "—"}`, `${c.no.n} · ${P(c.no.bothRate) || "—"} · ${P(c.no.openRate) || "—"}`])),
        { csv: "criteria", note: "״תשובה״ = שני הצדדים כתבו. זה קשר סטטיסטי בלבד, לא סיבה ותוצאה — ומתחת ל־10 שיחות בכל צד, ההבדל לא אמין." });
  }

  function usage(S) {
    const u = S.usage, k = S.kpi, ser = u.series;
    const visits = ser.reduce((a, d) => a + d.visits, 0);
    const uniq = S.hasActivity ? Object.values(extra.activity || {}).filter(a => a && Object.keys(a.d || {}).some(key => { const t = keyToTs(key); return t + 864e5 - 1 >= S.range.from && t <= S.range.to; })).length : null;
    const FN = { visit: "ביקור ראשון", registered: "נרשמו", complete: "פרופיל מלא", chat: "התאמה (שיחה נפתחה)", answered: "שני הצדדים כתבו", opened: "המסך נפתח ✨" };
    csvData.features = { head: ["event", "count"], rows: u.features.concat(u.tabs, u.regErrors, u.techErrors) };
    const evLabel = { req_sent: "💌 בקשה (לפי ההעדפות)", req_sent_soft: "💌 בקשה (מחוץ להעדפות)", req_note: "💌 בקשה עם הודעה", req_accepted: "✅ קבלת בקשה", req_declined: "❌ דחיית בקשה", msg_sent: "💬 הודעה נשלחה",
      reveal_press: "💗 לחיצה על פתיחת מסך", wa_click: "📱 כפתור WhatsApp", hide: "🙈 לא בשבילי", unhide: "👁️ החזרת מוסתרים", archive: "🗄️ העברה לארכיון", unarchive: "📤 הוצאה מהארכיון", block: "🚫 חסימה", report: "🚩 דיווח",
      pause_on: "⏸️ השהיה", pause_off: "▶️ חזרה מהשהיה", card_view: "👤 צפייה בכרטיס", coc_open: "📜 קוד התנהגות", welcome_open: "💗 הודעת ברוכים הבאים", agetip_open: "💌 הודעת צוות: הרחבת גילאים (נקראה)", agetip_edit: "✏️ לחצו להרחבת גילאים",
      lang_change: "🌐 החלפת שפה", profile_edit: "✏️ עריכת פרופיל", profile_delete: "🗑️ מחיקת פרופיל", reg_start: "📝 התחלת הרשמה", reg_done: "🎉 סיום הרשמה",
      tab_proposals: "✨ הצעות", tab_requests: "💌 בקשות", tab_chats: "💬 שיחות", err_reg: "הרשמה", err_msg: "שליחת הודעה", err_request: "שליחת בקשה", err_accept: "קבלת בקשה" };
    const regField = { name: "שם", phone: "טלפון", gender: "מגדר", age: "גיל", city: "עיר", words: "3 מילים", shabbat: "שבת אידיאלית", religion: "אורח חיים", intent: "כוונה",
      langs: "שפות", kids: "ילדים", shstyle: "סגנון שבת", pace: "קצב", value: "ערך", weekend: "סופ״ש", million: "מיליון", forbidden: "טלפון/קישור בטקסט", ok: "אישור תנאים" };
    return kpis([
      kpi("כניסות בתקופה", S.hasActivity ? N(visits) : null, { f: "פתיחות של האפליקציה (כל טעינה = כניסה)" }),
      kpi("מבקרים ייחודיים", N(uniq), { f: "דפדפנים שונים שנכנסו בתקופה — אדם עם 2 דפדפנים נספר פעמיים" }),
      kpi("כניסות לחבר/ה (חציון)", N(u.sessionsMedian), { sub: u.daysMedian != null ? `${u.daysMedian} ימי פעילות (חציון)` : "" }),
      kpi("משך ביקור חציוני", null, { f: "לא נמדד (כדי לא לשלוח נתונים כל דקה)" }),
      kpi("נייד / מחשב", S.hasActivity ? `${u.mobile} / ${u.desktop}` : null),
      kpi("התחילו / סיימו הרשמה", S.hasEvents ? `${u.regStart} / ${u.regDone}` : null, { sub: u.regStart ? `נטישה ${P(1 - Math.min(1, u.regDone / u.regStart))}` : "", f: "התחלה = נגיעה ראשונה בטופס (פעם אחת לדפדפן)" }),
      kpi("חזרו אחרי יום", P(k.ret1.rate), { sub: k.ret1.base ? `${k.ret1.kept} מתוך ${k.ret1.base}` : "" }),
      kpi("חזרו אחרי 7 / 30 ימים", k.ret7.rate == null && k.ret30.rate == null ? null : `${P(k.ret7.rate) || "—"} / ${P(k.ret30.rate) || "—"}`)
    ]) +
      card("🧭 המסלול: ביקור ← הרשמה ← פרופיל מלא ← התאמה ← שיחה ← מסך", u.funnel ? funnel(u.funnel.map(([k2, n]) => [FN[k2], n])) : unavailable("האיסוף התחיל עם הגרסה הזו"),
        { note: "מבקרים שהגיעו לראשונה בתקופה, ומה קרה איתם עד היום. כל אדם נספר פעם אחת בכל שלב." }) +
      card("👀 כניסות ומבקרים ליום", S.hasActivity ? lines("visits2", ser, VISITS) : unavailable()) +
      card("📱 מכשירים", donut([["נייד", u.mobile, C_F], ["מחשב", u.desktop, C_M]].concat(u.unknownDevice ? [["לא ידוע", u.unknownDevice, C_1]] : []))) +
      card("🗂️ לשוניות שנפתחו", bars(u.tabs.map(([e, n]) => [evLabel[e] || e, n])), {}) +
      card("⚡ פעולות בתקופה", bars(u.features.map(([e, n]) => [evLabel[e] || e, n])), { csv: "features" }) +
      card("📝 איפה ההרשמה נעצרת", bars(u.regErrors.map(([e, n]) => [regField[e.replace("reg_err_", "")] || e, n])), { note: "כמה פעמים כל שדה עצר את שליחת הטופס" }) +
      card("🐞 שגיאות טכניות", bars(u.techErrors.map(([e, n]) => [evLabel[e] || e, n])), {}) +
      card("📄 דפים הכי נצפים", unavailable("האפליקציה היא דף אחד — ראו ״לשוניות שנפתחו״"));
  }

  function insightsTab(S) {
    const list = insights(S);
    if (!list.length) return card("💡 תובנות", `<div class="an-na">✅ לא זוהתה בעיה מיוחדת בתקופה הזו.</div>`);
    return list.map(i => `<section class="panel an-card insight ${i.level}"><h3>${i.level === "warn" ? "⚠️" : i.level === "good" ? "✅" : "💡"} ${esc(i.title)}</h3>
      <p>${esc(i.detail)}</p><p class="reco">👉 ${esc(i.reco)}</p></section>`).join("") +
      `<p class="an-note">התובנות מחושבות רק מנתונים שנאספו בפועל, לפי כללים פשוטים (למשל ירידה של 50%+ בהרשמות מול התקופה הקודמת).</p>`;
  }

  function whatsapp(S) {
    const wa = eventCount(S.hasEvents ? (extra.stats || {}) : {}, "wa_click", S.range);
    return kpis([kpi("לחיצות על כפתור WhatsApp", S.hasEvents ? N(wa) : null, { f: "אחרי פתיחת מסך — הכפתור שפותח שיחה עם הצד השני" })]) +
      card("💬 וואטסאפ ובוט", `<p>אין באפליקציה בוט ואין חיבור ל־WhatsApp: הקבוצה מנוהלת ב־WhatsApp עצמו, ו־WhatsApp לא נותן גישה לנתוני קבוצות או להודעות פרטיות.</p>
        <p>לכן: חיבורי WhatsApp, הודעות בוט, זמני תגובה, שאלות נפוצות ועלויות API — <b>${NA}</b>.</p>
        <p class="an-note">הדבר היחיד שנמדד הוא הלחיצה על כפתור ה־WhatsApp שמופיע אחרי פתיחת המסך.</p>`);
  }
  function events() {
    return card("🎉 אירועים וערבים", `<p>${NA}: אין עדיין אירועים באפליקציה (אין הרשמה לאירוע, נוכחות או הצבעות).</p>
      <p class="an-note">אם תרצו לנהל אירועים דרך האפליקציה, צריך קודם להוסיף את הפיצ׳ר עצמו — ואז הסטטיסטיקות יתווספו כאן.</p>`);
  }

  return {
    open() { isOpen = true; subscribe(); if (!$("#an-tabs")) skeleton(); else syncControls(); renderContent(); },
    close() { isOpen = false; },
    refresh() { if (isOpen) { syncControls(); schedule(); } },
    last: () => last
  };
})();
