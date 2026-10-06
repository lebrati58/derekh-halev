/* ==========================================================================
   דרך הלב — test_rules.js
   Tests des règles de sécurité (database.rules.json) via l'émulateur Firebase.

   Lancement :
     npm install                 (une fois — télécharge firebase-tools + émulateur)
     npm run test:rules          (= firebase emulators:exec --only database
                                    --project dereh-halev-test "node test_rules.js")

   Nécessite Java (l'émulateur Realtime Database tourne en JVM).
   Chaque test répond à la question : « que peut faire quelqu'un qui appelle
   Firebase directement depuis la console JS avec un compte anonyme ? »
   ========================================================================== */

const fs = require("fs");
const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { ref, get, set, update, remove, push } = require("firebase/database");

let pass = 0, fail = 0;
async function allowed(name, fn) {
  try { await fn(); pass++; console.log("✓ (autorisé)", name); }
  catch (e) { fail++; console.log("✗", name, "— aurait dû passer :", String(e.message || e).slice(0, 100)); }
}
async function denied(name, fn) {
  try { await fn(); fail++; console.log("✗", name, "— aurait dû être REFUSÉ"); }
  catch (e) { pass++; console.log("✓ (refusé)  ", name); }
}

(async () => {
  const env = await initializeTestEnvironment({
    projectId: "dereh-halev-test",
    database: { rules: fs.readFileSync(__dirname + "/database.rules.json", "utf8") }
  });

  // ---------- Graine (règles désactivées) ----------
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.database();
    await set(ref(db, "/"), {
      config: { adminPin: "test-pin-123" },
      counters: { profileNo: 5 },
      profiles: {
        alice:   { no: 1, gender: "f", age: 30, city: "חולון",   religion: "masorti", intent: "serious", words: ["א", "ב", "ג"], shabbat: "רגוע", createdAt: 1 },
        bob:     { no: 2, gender: "m", age: 33, city: "בת ים",   religion: "dati",    intent: "serious", words: ["א", "ב", "ג"], shabbat: "שקט", createdAt: 1 },
        charlie: { no: 3, gender: "m", age: 28, city: "תל אביב", religion: "hiloni",  intent: "see",     words: ["א", "ב", "ג"], shabbat: "ים", createdAt: 1 },
        dave:    { no: 4, gender: "m", age: 40, city: "חולון",   religion: "masorti", intent: "see",     words: ["א", "ב", "ג"], shabbat: "טבע", createdAt: 1 },
        mallory: { no: 5, gender: "m", age: 35, city: "אילת",    religion: "hiloni",  intent: "see",     words: ["א", "ב", "ג"], shabbat: "-", createdAt: 1 }
      },
      private: {
        alice: { firstName: "אליס", phone: "0501111111" },
        bob:   { firstName: "בוב",  phone: "0502222222" }
      },
      profileNos: { 1: "alice", 2: "bob", 3: "charlie", 4: "dave", 5: "mallory" },
      banned: { mallory: true },
      blocks: { bob: { dave: true } }
    });
  });

  const A = env.authenticatedContext("alice").database();   // femme, no 1
  const B = env.authenticatedContext("bob").database();     // homme, no 2
  const C = env.authenticatedContext("charlie").database(); // homme, no 3
  const D = env.authenticatedContext("dave").database();    // bloqué par bob
  const M = env.authenticatedContext("mallory").database(); // banni
  const E = env.authenticatedContext("eve").database();     // sans profil
  const ADMIN = env.authenticatedContext("moriah").database();
  const ANON = env.unauthenticatedContext().database();

  /* ---------- Profils & privé ---------- */
  await denied ("non connecté : lire profiles",            () => get(ref(ANON, "profiles")));
  await allowed("inscrit : lire le profil d'un autre",     () => get(ref(A, "profiles/bob")));
  await denied ("écrire le profil d'un AUTRE",             () => set(ref(A, "profiles/bob/age"), 99));
  await allowed("lire son propre private",                 () => get(ref(A, "private/alice")));
  await denied ("lire le private (téléphone) d'un autre",  () => get(ref(A, "private/bob")));
  await denied ("banni : modifier son profil",             () => set(ref(M, "profiles/mallory/city"), "חיפה"));
  await denied ("profil : champ inconnu (hack)",           () => update(ref(A, "profiles/alice"), { hack: true }));

  /* ---------- Compteur de numéros ---------- */
  await allowed("compteur : incrément +1",                 () => set(ref(E, "counters/profileNo"), 6));
  await denied ("compteur : saut à +3",                    () => set(ref(E, "counters/profileNo"), 9));
  await denied ("compteur : SUPPRESSION (reset → doublons)", () => remove(ref(E, "counters/profileNo")));
  await denied ("compteur : lecture sans auth",            () => get(ref(ANON, "counters/profileNo")));

  /* ---------- Numéro de profil unique (index profileNos) ---------- */
  const F = env.authenticatedContext("frank").database();  // nouveau venu
  const eveProfile = no => ({ no, gender: "f", age: 29, city: "רמת גן", religion: "masorti", intent: "see", words: ["א", "ב", "ג"], shabbat: "-", createdAt: 1 });
  await denied ("eve se crée avec le numéro de bob (2) sans index", () => set(ref(E, "profiles/eve"), eveProfile(2)));
  await denied ("profil créé SANS réserver son numéro",    () => set(ref(E, "profiles/eve"), eveProfile(6)));
  await denied ("eve prend le numéro de bob (2, déjà pris)", () => update(ref(E), { "profiles/eve": eveProfile(2), "profileNos/2": "eve" }));
  await denied ("eve écrase la réservation de bob",        () => set(ref(E, "profileNos/2"), "eve"));
  await denied ("réserver un numéro sans profil",          () => set(ref(E, "profileNos/6"), "eve"));
  await denied ("réserver un numéro au nom d'un autre",    () => update(ref(E), { "profiles/eve": eveProfile(6), "profileNos/6": "frank" }));
  await denied ("numéro au-delà du compteur (7)",          () => update(ref(E), { "profiles/eve": eveProfile(7), "profileNos/7": "eve" }));
  await allowed("eve crée son profil + réserve le 6",      () => update(ref(E), { "profiles/eve": eveProfile(6), "profileNos/6": "eve" }));
  await allowed("reprise : même écriture rejouée",         () => update(ref(E), { "profiles/eve": eveProfile(6), "profileNos/6": "eve" }));
  await denied ("eve réserve un 2e numéro (pas le sien)",  () => set(ref(E, "profileNos/3"), "eve"));
  await denied ("frank prend le 6 (déjà à eve)",           () => update(ref(F), { "profiles/frank": eveProfile(6), "profileNos/6": "frank" }));
  await denied ("eve supprime sa réservation",             () => remove(ref(E, "profileNos/6")));
  await denied ("lire l'index des numéros",                () => get(ref(E, "profileNos")));

  /* ---------- Demandes (inbox / outbox) ---------- */
  await allowed("demande alice→bob (fromNo correct)",      () => set(ref(A, "inbox/bob/alice"), { fromNo: 1, status: "pending", createdAt: 1 }));
  await allowed("outbox alice→bob (toNo correct)",         () => set(ref(A, "outbox/alice/bob"), { toNo: 2, status: "pending", createdAt: 1 }));
  await denied ("demande charlie→alice avec fromNo USURPÉ (2)", () => set(ref(C, "inbox/alice/charlie"), { fromNo: 2, status: "pending", createdAt: 1 }));
  await denied ("outbox charlie→alice avec toNo mensonger", () => set(ref(C, "outbox/charlie/alice"), { toNo: 99, status: "pending", createdAt: 1 }));
  await denied ("demande avec champ parasite",             () => set(ref(C, "inbox/alice/charlie"), { fromNo: 3, status: "pending", createdAt: 1, hack: "x" }));
  await denied ("re-demande alice→bob (déjà existante)",   () => set(ref(A, "inbox/bob/alice"), { fromNo: 1, status: "pending", createdAt: 2 }));
  await denied ("demande de dave→bob (dave est bloqué)",   () => set(ref(D, "inbox/bob/dave"), { fromNo: 4, status: "pending", createdAt: 1 }));
  await denied ("demande du banni mallory→alice",          () => set(ref(M, "inbox/alice/mallory"), { fromNo: 5, status: "pending", createdAt: 1 }));
  await denied ("écrire une demande AU NOM d'un autre",    () => set(ref(C, "inbox/bob/alice"), { fromNo: 1, status: "pending", createdAt: 1 }));
  await denied ("lire l'inbox d'un autre",                 () => get(ref(C, "inbox/bob")));

  /* ---------- Création du chat (par le destinataire) ---------- */
  const chatOk = { from: "alice", to: "bob", fromNo: 1, toNo: 2, status: "active", opened: false, createdAt: 1 };
  await denied ("chat créé par l'EXPÉDITEUR (alice)",      () => set(ref(A, "chats/alice_bob"), chatOk));
  await denied ("chat avec toNo usurpé (bob ment : 99)",   () => set(ref(B, "chats/alice_bob"), { ...chatOk, toNo: 99 }));
  await denied ("chat avec fromNo usurpé",                 () => set(ref(B, "chats/alice_bob"), { ...chatOk, fromNo: 3 }));
  await denied ("chat sans demande préalable (charlie)",   () => set(ref(C, "chats/alice_charlie"), { from: "alice", to: "charlie", fromNo: 1, toNo: 3, status: "active", opened: false, createdAt: 1 }));
  await allowed("chat créé par le destinataire (bob)",     () => set(ref(B, "chats/alice_bob"), { ...chatOk, icebreaker: "שאלה" }));
  await allowed("userChats des deux membres",              () => update(ref(B), { "userChats/bob/alice_bob": true, "userChats/alice/alice_bob": true }));
  await allowed("inbox passe à accepted + chatId",         () => update(ref(B, "inbox/bob/alice"), { status: "accepted", chatId: "alice_bob" }));

  /* ---------- Messages ---------- */
  await allowed("message d'un membre du chat",             () => push(ref(A, "messages/alice_bob"), { from: "alice", text: "שלום", ts: 1 }));
  await denied ("message d'un NON-membre (eve)",           () => push(ref(E, "messages/alice_bob"), { from: "eve", text: "hack", ts: 1 }));
  await denied ("message signé d'un autre uid",            () => push(ref(B, "messages/alice_bob"), { from: "alice", text: "faux", ts: 1 }));
  await denied ("message > 500 caractères",                () => push(ref(A, "messages/alice_bob"), { from: "alice", text: "א".repeat(501), ts: 1 }));
  await denied ("message avec champ parasite",             () => push(ref(A, "messages/alice_bob"), { from: "alice", text: "hi", ts: 1, img: "x" }));
  await denied ("lire les messages sans être membre",      () => get(ref(E, "messages/alice_bob")));
  await denied ("ADMIN : lire les messages",               () => get(ref(ADMIN, "messages/alice_bob")));

  /* ---------- Rideau (reveal / secrets) ---------- */
  await allowed("alice dépose son secret",                 () => set(ref(A, "secrets/alice_bob/alice"), { firstName: "אליס", phone: "0501111111" }));
  await allowed("alice coche reveal",                      () => set(ref(A, "reveal/alice_bob/alice"), true));
  await denied ("bob lit le reveal d'alice (suspense !)",  () => get(ref(B, "reveal/alice_bob/alice")));
  await denied ("opened=true avec UN seul reveal",         () => set(ref(A, "chats/alice_bob/opened"), true));
  await denied ("bob lit le secret d'alice AVANT ouverture", () => get(ref(B, "secrets/alice_bob/alice")));
  await allowed("bob dépose secret + reveal",              async () => { await set(ref(B, "secrets/alice_bob/bob"), { firstName: "בוב", phone: "0502222222" }); await set(ref(B, "reveal/alice_bob/bob"), true); });
  await allowed("opened=true quand les DEUX ont coché",    () => set(ref(B, "chats/alice_bob/opened"), true));
  await allowed("bob lit le secret d'alice APRÈS ouverture", () => get(ref(B, "secrets/alice_bob/alice")));
  await allowed("un membre termine la שיחה",               () => set(ref(A, "chats/alice_bob/status"), "ended"));

  /* ---------- Rideau : reveal SANS secret (faille asymétrique) ---------- */
  await env.withSecurityRulesDisabled(async ctx => {
    await set(ref(ctx.database(), "chats/alice_dave"), { from: "alice", to: "dave", fromNo: 1, toNo: 4, status: "active", opened: false, createdAt: 1 });
  });
  await allowed("alice dépose secret + reveal (chat dave)", async () => { await set(ref(A, "secrets/alice_dave/alice"), { firstName: "אליס", phone: "0501111111" }); await set(ref(A, "reveal/alice_dave/alice"), true); });
  await allowed("dave coche reveal SANS déposer de secret", () => set(ref(D, "reveal/alice_dave/dave"), true));
  await denied ("dave force opened=true sans son secret",  () => set(ref(D, "chats/alice_dave/opened"), true));
  await denied ("dave lit le secret d'alice (pas ouvert)", () => get(ref(D, "secrets/alice_dave/alice")));
  await allowed("dave dépose enfin son secret",            () => set(ref(D, "secrets/alice_dave/dave"), { firstName: "דייב", phone: "0504444444" }));
  await allowed("opened=true une fois les DEUX secrets là", () => set(ref(D, "chats/alice_dave/opened"), true));

  /* ---------- Admin ---------- */
  await denied ("mauvais PIN → pas admin",                 () => set(ref(E, "admins/eve"), "0000"));
  await denied ("lire config/adminPin",                    () => get(ref(E, "config/adminPin")));
  await denied ("inscrit normal : lire les signalements",  () => get(ref(A, "reports")));
  await denied ("inscrit normal : bannir quelqu'un",       () => set(ref(A, "banned/bob"), true));
  await denied ("inscrit normal : publier une annonce",    () => set(ref(A, "announcements/current"), { text: "spam", ts: 1 }));
  await allowed("bon PIN → admin",                         () => set(ref(ADMIN, "admins/moriah"), "test-pin-123"));
  await allowed("admin : lire les signalements",           () => get(ref(ADMIN, "reports")));
  await allowed("admin : publier une annonce",             () => set(ref(ADMIN, "announcements/current"), { text: "שאלת היום 😉", ts: 1 }));
  await allowed("admin : bannir un profil",                () => set(ref(ADMIN, "banned/charlie"), true));

  /* ---------- Signalements ---------- */
  await allowed("membre signale son interlocuteur",        () => push(ref(A, "reports"), { chatId: "alice_bob", reporterUid: "alice", reportedUid: "bob", reportedNo: 2, reason: "טקסט", createdAt: 1 }));
  await denied ("signaler quelqu'un HORS de ses chats",    () => push(ref(C, "reports"), { chatId: "alice_bob", reporterUid: "charlie", reportedUid: "bob", reportedNo: 2, reason: "x", createdAt: 1 }));

  await env.cleanup();
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass}/${pass + fail} tests de règles passent`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error("Erreur fatale:", e); process.exit(2); });
