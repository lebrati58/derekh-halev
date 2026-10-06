/* ==========================================================================
   דרך הלב — Derekh HaLev — commun.js
   Config Firebase + helpers partagés (index.html & admin.html)
   ==========================================================================

   STRUCTURE FIREBASE REALTIME DATABASE
   ------------------------------------
   Chaque participant est identifié par un uid Firebase Auth ANONYME
   (aucun email, aucun mot de passe — invisible pour l'utilisateur).
   C'est ce qui permet aux règles de sécurité de protéger prénoms et téléphones.

   config/
     adminPin: "4829"                 ← PIN admin, saisi à la main dans la console.
                                        Illisible par tous (règles : .read false).
   admins/{uid}: "4829"               ← écrit par admin.html ; accepté seulement si = config/adminPin

   counters/
     profileNo: 27                    ← compteur incrémenté par transaction (numéros uniques).
                                        Non supprimable (règles v3) — sinon reset → numéros en double.

   profiles/{uid}                     ← PUBLIC (lisible par tout inscrit) — jamais de nom ni téléphone
     no: 12                           ← « פרופיל 12 »
     gender: "m" | "f"
     age: 34
     city: "תל אביב"
     religion: "dati" | "masorti" | "hiloni"
     intent: "serious" | "see"
     words: ["סקרן", "מצחיק", "רגיש"]
     shabbat: "ארוחה ארוכה ואז שנ״צ"
     createdAt: <timestamp>
     — Questionnaire v2 (optionnel, anciens profils sans) :
     ageMin, ageMax: 25, 40            ← fourchette d'âge recherchée
     kids: "have"|"want"|"no"|"flow"
     shabbatStyle: "kodesh"|"massoret"|"regular"
     pace: "home"|"out"|"mix"
     value: "heart"|"humor"|"stable"|"open"
     weekend: "nature"|"sea"|"movie"|"friends"|"explore"
     million: "travel"|"invest"|"spoil"|"save"
     cantLiveWithout: "קפה של בוקר"
     paused: true                      ← mode pause (invisible dans les suggestions)

   profileNos/{no}: uid               ← index d'unicité des numéros : réservé une seule fois, en même temps
                                        que la création du profil (règles). Illisible par tous.

   blocks/{uid}/{targetUid}: true     ← blocage personnel (lisible/éditable par uid seul)
   announcements/current {text, ts}   ← activité du jour publiée par l'admin, lisible par tous

   private/{uid}                      ← PRIVÉ (lisible uniquement par son propriétaire)
     firstName: "דני"
     phone: "0521234567"

   banned/{uid}: true                 ← écrit par l'admin

   inbox/{toUid}/{fromUid}            ← demandes reçues (lisible par le destinataire)
     fromNo, status: "pending"|"accepted"|"declined", createdAt, chatId?
     — règles v3 : fromNo doit = profiles/{fromUid}/no (anti-usurpation), champs inconnus refusés
   outbox/{fromUid}/{toUid}           ← demandes envoyées (lisible par l'expéditeur)
     toNo, status, createdAt, chatId?
     — règles v3 : toNo doit = profiles/{toUid}/no, champs inconnus refusés

   chats/{chatId}                     ← métadonnées (membres + admin) — chatId = "{fromUid}_{toUid}"
     from, to, fromNo, toNo            — règles v3 : fromNo/toNo vérifiés contre profiles/ (anti-usurpation)
     status: "active" | "ended"       ← aucune trace de QUI a terminé
     opened: false | true             ← ne peut passer à true que si les DEUX reveal/ sont à true
     createdAt
   userChats/{uid}/{chatId}: true     ← index des chats de chaque participant

   messages/{chatId}/{msgId}          ← membres UNIQUEMENT (l'admin n'y a pas accès)
     from: uid, text, ts

   reveal/{chatId}/{uid}: true        ← « j'ouvre le rideau » — lisible seulement par soi-même,
                                        donc l'autre ne sait jamais qu'on a appuyé
   secrets/{chatId}/{uid}             ← {firstName, phone} déposés en appuyant ;
                                        lisibles par l'autre SEULEMENT quand chats/{chatId}/opened == true

   reports/{pushId}                   ← signalements (lisibles par l'admin)
     chatId, reporterUid, reporterNo, reportedUid, reportedNo, reason, createdAt, resolved?
   ========================================================================== */

// 👉 COLLE ICI TA CONFIG FIREBASE (Console Firebase → Paramètres du projet → Tes applications → Web)
const firebaseConfig = {
  apiKey: "AIzaSyA5FbFvwQyEh5nw8tw-DLCNJAJNFHJrcNg",
  authDomain: "dereh-halev.firebaseapp.com",
  databaseURL: "https://dereh-halev-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dereh-halev",
  storageBucket: "dereh-halev.firebasestorage.app",
  messagingSenderId: "722139818863",
  appId: "1:722139818863:web:fe677e93a8ccf9dc52569a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const TS = firebase.database.ServerValue.TIMESTAMP;

/* ---------- Libellés ---------- */
const LABELS = {
  gender: { m: "גבר", f: "אישה" },
  religion: {
    dati:    { m: "דתי",    f: "דתייה" },
    masorti: { m: "מסורתי", f: "מסורתית" },
    hiloni:  { m: "חילוני", f: "חילונית" }
  },
  intent: { serious: "💍 מחפש/ת קשר רציני", see: "🌊 נזרום ונראה" }
};
const religionLabel = (r, g) => (LABELS.religion[r] || {})[g] || "";
const profileName = no => `פרופיל ${no}`;
const HEART = '<img class="heart-ico" src="logo-heart.png" alt="">';   // logo cœur (remplace 🎭)

/* ---------- DOM & utilitaires ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtTime(ts) {
  if (!ts || typeof ts !== "number") return "";
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }) + " " +
      d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

/* localStorage protégé (navigateurs in-app WhatsApp, mode privé…) */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem("mhm_" + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem("mhm_" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("mhm_" + k); } catch (e) {} },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith("mhm_")).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
};

/* ---------- Auth anonyme ---------- */
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

function ensureAuth() {
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) { unsub(); resolve(user); }
      else auth.signInAnonymously().catch(err => { unsub(); reject(err); });
    });
  });
}

/* ---------- Numéro de profil (transaction = pas de doublon) ---------- */
async function nextProfileNo() {
  const res = await db.ref("counters/profileNo").transaction(c => (c || 0) + 1);
  if (!res.committed) throw new Error("counter-not-committed");
  return res.snapshot.val();
}

/* ---------- Matching ----------
   Toute la logique de compatibilité (filtres durs, score, raisons,
   icebreakers) vit dans matching.js — pur, sans Firebase, testé par
   test_matching.js. index.html charge matching.js après ce fichier. */

/* ---------- Anti-fuite : téléphones & liens ---------- */
function hasForbiddenContent(text) {
  const s = String(text).normalize("NFKC");
  if (/(?:\d[\s\-–—.()\/_*,]*){7,}/.test(s)) return true;         // suite de 7+ chiffres (avec séparateurs)
  if ((s.match(/\d/g) || []).length >= 9) return true;               // chiffres éparpillés
  if (/(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|chat\.whatsapp)/i.test(s)) return true;
  if (/\b[a-z0-9-]+\s?\.\s?(com|net|org|il|io|me|ly|fr|co|app|link|info|biz|gg|to)\b/i.test(s)) return true;
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s)) return true;           // email
  if (/(^|\s)@[a-z0-9_.]{3,}/i.test(s)) return true;                 // @pseudo insta/telegram
  return false;
}

/* ---------- Détection navigateur intégré (WhatsApp & co) ---------- */
function inAppBrowser() {
  const ua = navigator.userAgent || "";
  if (/WhatsApp/i.test(ua)) return "whatsapp";
  if (/FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(ua)) return "meta";
  if (/Telegram/i.test(ua)) return "telegram";
  if (/Android.*; wv\)/.test(ua)) return "webview";
  // iOS WebView : iPhone/iPad sans « Safari/ » dans l'UA (Chrome iOS = CriOS, Firefox = FxiOS)
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return "webview";
  return null;
}

/* ---------- Téléphone → lien WhatsApp ---------- */
function waLink(phone) {
  let d = String(phone || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "972" + d.slice(1);
  return "https://wa.me/" + d;
}

/* ---------- Carte mystère ---------- */
/* Couleur de carte/avatar : palette bleue (m) ou rose (f) selon le genre, 3 nuances chacune */
function colorClass(p) {
  const no = (p && p.no) || 0;
  return p && (p.gender === "m" || p.gender === "f") ? p.gender + (no % 3) : "g" + (no % 6);
}

function cardHTML(p, opts = {}) {
  if (!p) return "";
  const words = (Array.isArray(p.words) ? p.words : Object.values(p.words || {}))
    .filter(Boolean).map(w => `<span>${esc(w)}</span>`).join('<i>✦</i>');
  return `
  <div class="mystery-card ${colorClass(p)} ${opts.small ? "small" : ""}">
    <div class="mc-shine"></div>
    <div class="mc-top">
      <span class="mc-mask">${HEART}</span>
      <span class="mc-ids">
        ${p.gender === "m" || p.gender === "f" ? `<span class="mc-gender ${p.gender}">${p.gender === "f" ? "👩" : "👨"} ${esc(LABELS.gender[p.gender])}</span>` : ""}
        <span class="mc-no">${esc(profileName(p.no))}</span>
      </span>
    </div>
    <div class="mc-words">${words}</div>
    <div class="mc-meta">${esc(p.age)} · ${esc(p.city)} · ${esc(religionLabel(p.religion, p.gender))}</div>
    <div class="mc-intent">${esc(LABELS.intent[p.intent] || "")}</div>
    ${p.shabbat && !opts.noShabbat ? `<div class="mc-shabbat"><b>השבת האידיאלית:</b> ״${esc(p.shabbat)}״</div>` : ""}
    ${p.cantLiveWithout ? `<div class="mc-shabbat"><b>לא חי/ה בלי:</b> ${esc(p.cantLiveWithout)}</div>` : ""}
  </div>`;
}

/* ---------- Toast ---------- */
function toast(msg, ms = 2800) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), ms);
}

/* ---------- Modale (remplace alert/confirm/prompt) ---------- */
function showModal({ title = "", body = "", input = false, placeholder = "", okText = "אישור", cancelText = "ביטול", danger = false }) {
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        ${title ? `<h3>${esc(title)}</h3>` : ""}
        ${body ? `<p>${body}</p>` : ""}
        ${input ? `<textarea rows="3" maxlength="300" placeholder="${esc(placeholder)}"></textarea>` : ""}
        <div class="modal-actions">
          ${cancelText ? `<button class="btn ghost" data-a="cancel">${esc(cancelText)}</button>` : ""}
          <button class="btn ${danger ? "danger" : "gold"}" data-a="ok">${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    const ta = $("textarea", wrap);
    if (ta) setTimeout(() => ta.focus(), 50);
    const close = val => { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); resolve(val); };
    wrap.addEventListener("click", e => {
      const a = e.target.getAttribute && e.target.getAttribute("data-a");
      if (a === "ok") close(input ? (ta.value.trim() || null) : true);
      else if (a === "cancel" || e.target === wrap) close(null);
    });
  });
}
