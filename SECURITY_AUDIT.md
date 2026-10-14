# 🛡️ Audit de sécurité — דרך הלב (Derekh HaLev)

- **Date** : 14/10/2026 · **Périmètre** : dépôt `lebrati58/derekh-halev` (code, règles RTDB, config Hosting, CI).
- **Méthode** : lecture du code (SAST manuel), `npm audit` (SCA), recherche de secrets, **preuves de concept sur l'émulateur Firebase local** (projet fictif `dereh-halev-test`, données inventées). **Aucun test n'a été fait sur la production** (`dereh-halev.web.app`, base `dereh-halev`).
- **Reproduire** : `npm install && npx firebase emulators:exec --only database --project dereh-halev-test "node poc_audit.js"` (affiche quelles attaques passent encore) · `npm run test:rules` (non-régression, 156 tests).

---

## 1. Cartographie (phase 1)

| Élément | Constat |
|---|---|
| Technologies | HTML/CSS/JS statique sans build ; Firebase JS SDK 10.12.2 *compat* chargé depuis `www.gstatic.com` (sans SRI) |
| Hébergement | Firebase Hosting (`dereh-halev.web.app`), redirection depuis GitHub Pages ; déploiement par GitHub Action à chaque push sur `main` |
| Backend | Realtime Database uniquement, **aucune Cloud Function** → toute la sécurité est dans `database.rules.json` |
| Authentification | Firebase Auth **anonyme** (1 uid par navigateur). Admin = uid dont `admins/{uid}` == `config/adminPin` |
| Routes | `/` (participant), `/admin.html` (admin, `noindex`). Pas d'API maison : l'« API » est le SDK RTDB, appelable par n'importe qui avec la clé web publique |
| Entrées utilisateur | formulaire d'inscription (texte libre : ville, 3 mots, chabbat, « je ne peux pas vivre sans »), messages, motif de signalement, annonce admin |
| Données sensibles | `private/` (prénom, téléphone), `secrets/` (prénom + téléphone déposés au « rideau »), `messages/` |
| Services externes | gstatic (SDK), wa.me (lien sortant). Aucune IA, aucun fichier téléversé, aucun stockage de fichiers |
| Secrets | `commun.js` contient la **config web Firebase** (clé API) : ce n'est **pas** un secret (identifiant public par conception). Aucun autre secret dans le dépôt ; le compte de service est dans les secrets GitHub (non visibles d'ici) |

**Zones critiques** : (1) authentification admin, (2) règles RTDB (seul rempart), (3) texte libre public, (4) abus par comptes anonymes illimités.

---

## 2. Vulnérabilités (phases 2 à 4)

Légende : ✅ **confirmée** (PoC exécutée sur l'émulateur) · 🔎 **suspectée** (analyse, non démontrée) · 🛠️ **corrigée sur cette branche** (tests de non-régression ajoutés) · ⏳ **ouverte**.
Les scores CVSS v4.0 sont des **estimations** (vecteur donné, score non recalculé avec le calculateur officiel).

### 🔴 CRITIQUE

#### SEC-01 — PIN admin à 4 chiffres attaquable par force brute → prise de contrôle admin · ✅ ⏳
- **Où** : `database.rules.json` → `admins/$uid` (`.validate: newData.val() === config/adminPin`) ; `admin.html` (formulaire PIN).
- **Description** : tout visiteur obtient un compte anonyme, puis écrit `admins/{son uid}` avec chaque PIN possible. L'écriture n'est acceptée **que** si le PIN est bon : la règle sert d'**oracle**, sans limite de débit. Le PIN est numérique à 4 chiffres (placeholder `••••`, exemple `4829` dans `commun.js`), donc 10 000 combinaisons au maximum.
- **Preuve** : `poc_audit.js` (V1) → *« PIN trouvé (4829) en 4830 essais, 8,3 s → accès admin »* sur l'émulateur ; puis lecture de tout `chats/` et **suppression d'un profil** réussies. En production, la latence réseau ralentit l'attaque (de l'ordre de quelques minutes en parallélisant), sans l'empêcher.
- **Impact** : bannir/débannir n'importe qui, supprimer profils et `private/`, publier une **annonce visible par tous** (hameçonnage : « envoyez votre numéro à… »), lire toutes les métadonnées de chats, l'activité, la présence et les signalements (avec les motifs en texte libre). Pas d'accès aux messages, téléphones ni secrets : les règles tiennent sur ce point (test « ADMIN : lire les messages/secrets » refusé).
- **CVSS 4.0 (estimé)** : `AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:H/VA:H/SC:N/SI:N/SA:N`, environ 9.
- **Correction immédiate, sans code (à faire aujourd'hui)** : dans la console Firebase, remplacer `config/adminPin` par une **chaîne aléatoire longue**, par exemple 24 caractères générés par un gestionnaire de mots de passe, et la coller dans le champ PIN. Avec plus de 128 bits d'entropie, la force brute devient impossible. Tous les `admins/{uid}` écrits avec l'ancien PIN perdent instantanément leurs droits, y compris un éventuel attaquant.
- **Correction de fond proposée (à valider, non appliquée)** : supprimer l'oracle. L'admin est défini par une **liste d'uids écrite à la main dans la console** :
  ```jsonc
  // database.rules.json — remplacer partout l'expression admin par :
  "root.child('config/adminUids/' + auth.uid).val() === true"
  // et retirer le nœud "admins" (plus aucune écriture client).
  ```
  `admin.html` afficherait alors l'uid du navigateur (avec un bouton « copier »), à coller dans `config/adminUids/{uid}: true`. Effets de bord : un uid par navigateur, donc à refaire si les données du navigateur sont effacées ; il n'y a plus de « déconnexion » (on retire l'uid dans la console). Ce changement modifie le mode de connexion admin : il a été **préparé mais pas appliqué** et attend ton accord. Une alternative plus robuste est la connexion Google réservée à l'admin (app Firebase nommée séparément, pour ne pas écraser l'uid anonyme du participant).
- **Test de vérification** : `poc_audit.js` V1 doit afficher « bloqué » ; dans `test_rules.js`, remplacer le PIN de la graine par `config/adminUids/moriah: true` et vérifier qu'aucune écriture dans `admins/` n'accorde de droits.

### 🟠 ÉLEVÉ

#### SEC-02 — Bannissement contournable (identité = uid anonyme jetable) · 🔎 ⏳
- **Où** : modèle d'auth (`ensureAuth()` dans `commun.js`) et `banned/{uid}`.
- **Description** : un banni vide ses données de navigation (ou ouvre une navigation privée), obtient un nouvel uid et se réinscrit. Rien ne lie deux uids à la même personne. Les tests de règles montrent qu'un nouvel uid peut créer un profil ; la réinscription complète n'a pas été faite dans un vrai navigateur.
- **Impact** : un harceleur revient sous un nouveau numéro. C'est le risque principal pour une app de rencontre.
- **Correction recommandée** : lier l'inscription à un facteur coûteux à renouveler. Le plus simple est **Firebase Phone Auth** (SMS, le téléphone est déjà demandé), avec `banned` indexé par un hash du téléphone. Sans cela : App Check (SEC-04) et modération humaine. Ce changement d'architecture est à décider.

#### SEC-03 — Aucune journalisation des actions admin, aucune ré-authentification · ✅ (constat) ⏳
- **Où** : `admin.html` (bannir, supprimer, annonce).
- **Description** : aucune trace de qui a banni ou supprimé quoi, ni quand. Une suppression ne demande qu'une confirmation dans une modale.
- **Correction proposée** : nœud `adminLog/{pushId}` `{uid, action, target, ts: now}`, **ajout seul**, lisible et créable par l'admin seulement, sans modification ni suppression. Limite à connaître : sans Cloud Function, la journalisation est faite par le client. Un admin malveillant qui appelle Firebase directement peut sauter l'étape, mais il ne peut pas effacer ce qui a été écrit. À implémenter avec SEC-01 (même zone de code).

### 🟡 MOYEN

| ID | Titre | Statut | Où | Preuve | Correction |
|---|---|---|---|---|---|
| SEC-04 | **Pas d'App Check ni de limitation de débit** : tout script muni de la clé web publique peut créer des comptes anonymes et écrire en masse (« denial of wallet » sur le plan Blaze) | ✅ V6b : un compte **non inscrit** pousse 200 entrées dans `stats/` · ⏳ | règles `stats`, `blocks`, `messages` ; console | PoC V6b | Activer **App Check** (reCAPTCHA Enterprise) en mode surveillance, puis imposé sur RTDB ; **alerte budgétaire** GCP ; restreindre la clé API aux domaines (console GCP) |
| SEC-05 | Profils publics lisibles par **n'importe quel visiteur anonyme non inscrit** (scraping âge, ville, religion, textes) + liste `banned` | ✅ V10 · ⏳ | `profiles/.read`, `banned/.read` | PoC V10 | Exiger un profil pour lire : `".read": "auth != null && root.child('profiles/' + auth.uid).exists()"`. Effet de bord : le formulaire d'inscription ne pourra plus rien lire avant la création. À tester avant de publier ; non appliqué |
| SEC-06 | Téléphone / lien dans le texte public ou les messages (le filtre n'existait que côté client) | ✅ V9 · 🛠️ | `profiles/{city,words,shabbat,cantLiveWithout}`, `messages` | V9 → bloqué | Regex dans les règles (7 chiffres ou plus avec séparateurs, chiffres arabes, persans et pleine largeur ; `http:`, `www.`, `wa.me`, `t.me`…). Le filtre client est aligné |
| SEC-07 | Chat créé directement `opened:true`, `status:ended` ou avec des champs inconnus (stockage libre, chargé par l'admin) | ✅ V2 · 🛠️ | `chats/$chatId` | V2 → bloqué | À la création : `status === 'active'`, `opened === false`, `$other: false` |
| SEC-08 | Un membre efface la conversation de la **liste de sa victime** (elle ne peut plus la rouvrir ni la signaler) | ✅ V4 · 🛠️ | `userChats/$uid/$chatId` | V4 → bloqué | Suppression réservée au propriétaire de la liste |
| SEC-09 | Signalements : `reporterNo` / `reportedNo` falsifiables (l'admin voit un faux numéro), champs inconnus et taille libre | ✅ V5 · 🛠️ | `reports/$id` | V5 → bloqué | Numéros vérifiés contre `chats/{chatId}/fromNo|toNo`, `$other: false`, `resolved` booléen |
| SEC-10 | Squat de numéro : un inscrit supprime puis recrée son profil avec le numéro que quelqu'un vient de tirer, ce qui fait échouer l'inscription de l'autre (DoS) | ✅ V7 · ⏳ | `profiles/$uid/no`, `profileNos` | PoC V7 | Index `userNo/{uid}` immuable (un uid ne détient jamais qu'un numéro). Cela ne règle pas l'attaque avec des uids jetables : la vraie correction est une attribution côté serveur (Cloud Function) ou App Check |
| SEC-11 | Métadonnées visibles par l'admin : qui parle avec qui (`chats/`), activité et présence par uid, `chatActivity` | ✅ (règles) · ⏳ | `chats/.read` admin, `activity`, `presence` | tests existants « ADMIN : lire chats/activity » | Contraire à l'esprit de la règle absolue. Les statistiques pourraient se contenter d'agrégats. Décision produit à prendre |
| SEC-12 | Rétention : la suppression d'un profil laisse `secrets/` (prénom + téléphone), `messages`, `inbox/outbox`, `reports` | 🔎 (lecture du code) · ⏳ | `index.html` « supprimer mon profil » | — | Supprimer aussi `secrets/{chatId}/{moi}` de mes chats (règle : soi, tant que non `opened`, à élargir pour la suppression). Purge des données = **décision et confirmation de ta part** |

### 🔵 FAIBLE

| ID | Titre | Statut | Correction |
|---|---|---|---|
| SEC-13 | Le destinataire réécrivait `outbox` de l'expéditeur (`toNo`, `chatId` arbitraires) | ✅ V3 · 🛠️ | `toNo` et `createdAt` immuables, `chatId === $from_$to` (inbox et outbox) |
| SEC-14 | `hidden/` acceptait n'importe quelle clé (stockage non borné) | ✅ V6 · 🛠️ | Cible = profil existant |
| SEC-15 | Messages datés dans le futur (restent « non lus » en tête de liste) | ✅ V9c · 🛠️ | `ts <= now` |
| SEC-16 | Injection de formules dans les exports CSV admin (ville `=HYPERLINK(…)`) | 🔎 (code) · 🛠️ | Préfixe `'` devant `= + - @ tab CR` (`admin-stats.js`) |
| SEC-17 | Pas d'en-têtes de sécurité, admin « framable » (clickjacking) | 🔎 · 🛠️ | `firebase.json` : `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'; object-src 'none'; base-uri 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS. Vérifié sur l'émulateur Hosting |
| SEC-18 | Pas de CSP `script-src` ni de SRI sur les scripts gstatic (chaîne d'approvisionnement) | 🔎 · ⏳ | Hash SRI impossible à calculer ici (réseau bloqué). Ensuite : sortir les scripts inline (`index.html` en contient beaucoup, plus des `onclick`) pour une CSP stricte |
| SEC-19 | GitHub Action non épinglée par SHA (`action-hosting-deploy@v0`), pas de bloc `permissions:` | 🔎 · ⏳ | Épingler par SHA de commit, ajouter `permissions: contents: read` (à tester sur un déploiement) |
| SEC-20 | Un banni peut encore écrire dans `private/`, `blocks/`, `reveal/`, `secrets/`, `reports/` et tout lire | ✅ V8 · ⏳ | Ajouter `!root.child('banned/' + auth.uid).exists()` à ces écritures (risque faible : ses chats sont fermés par l'admin) |
| SEC-21 | `secrets` n'est pas lié à `private/` : on peut révéler un faux prénom ou numéro | 🔎 · ⏳ | Valider `secrets/{chat}/{uid}` == `private/{uid}` dans les règles (`newData.child('phone').val() === root.child('private/' + $uid + '/phone').val()`) |
| SEC-22 | Numéros des profils antérieurs à `profileNos` non réservés | 🔎 · ⏳ | Remplir l'index (migration de données : **à confirmer**) |
| SEC-23 | `npm audit` : 32 vulnérabilités (1 critique) dans les **dépendances de test** (`firebase-tools`…) | ✅ · ⏳ | Non déployées (`npm audit --omit=dev` → 0). Mettre à jour `firebase-tools` quand possible |

### Vérifié sans faille trouvée
- **XSS** : tous les rendus `innerHTML` de `index.html`, `admin.html` et `admin-stats.js` passent par `esc()` ou `textContent` (cartes, messages, signalements, annonces, icebreaker, prénom/téléphone révélés, villes et libellés des graphiques). `waLink()` ne garde que des chiffres. Aucune XSS confirmée.
- **Injection** (SQL, NoSQL, commande, SSRF, path traversal, upload) : non applicable (pas de serveur, pas de requêtes construites, pas de fichiers).
- **Messages / téléphones / secrets** : illisibles par l'admin et par les non-membres ; `secrets` lisibles seulement après les deux `reveal` **et** les deux dépôts (tests existants).
- **Open redirect** : la seule redirection (GitHub Pages → web.app) a un hôte fixe.

---

## 3. Corrections appliquées sur cette branche (phase 5)

| Fichier | Changement | Effets de bord évalués |
|---|---|---|
| `database.rules.json` | SEC-06/07/08/09/13/14/15 (voir ci-dessus) | Le client n'utilisait aucun des comportements désormais refusés (vérifié dans `acceptRequest`, `sendRequest`, signalement, masquage). Un ancien profil dont le texte contient déjà un téléphone ne pourra pas être **modifié** tant que ce texte reste. Le filtre client l'empêchait déjà |
| `commun.js` | Le filtre anti-téléphone compte aussi les chiffres arabes et persans (même règle que le serveur) | Message d'erreur clair au lieu d'un échec générique |
| `admin-stats.js` | CSV sans injection de formules | Une valeur commençant par `-` est préfixée d'une apostrophe dans le CSV |
| `firebase.json` | En-têtes de sécurité | Les pages ne peuvent plus être affichées dans une iframe (aucun usage connu) |
| `index.html`, `admin.html` | `?v=20261014a` (cache mobile) | — |
| `test_rules.js` | +26 tests de non-régression « Audit sécurité 2026-10 » | — |
| `poc_audit.js` | PoC reproductibles (émulateur uniquement) | Non déployé (hors liste blanche) |

⚠️ **Les règles ne sont pas déployées automatiquement** : après validation, publie `database.rules.json` dans la console (Realtime Database → Règles → Publier).

---

## 4. Audit spécial administrateur (phase 6)

| Exigence | État |
|---|---|
| Un utilisateur normal ne peut jamais accéder aux fonctions admin | ❌ **Non garanti** : PIN 4 chiffres cassable (SEC-01) |
| Cacher un bouton n'est pas un contrôle d'accès | ✅ Toutes les actions admin sont contrôlées par les règles (tests « inscrit normal : bannir/annonce/lire signalements » refusés) |
| Opérations admin autorisées côté serveur | ✅ Règles RTDB |
| Données privées non récupérables en changeant un identifiant (IDOR) | ✅ `private`, `messages`, `secrets`, `reveal`, `inbox/outbox`, `blocks`, `hidden` sont scopés à `auth.uid` ou aux membres (testés) |
| Journalisation des actions sensibles | ❌ Absente (SEC-03) |
| Ré-authentification pour les actions critiques | ❌ Absente |
| Journaux non modifiables par un utilisateur ordinaire | — (pas de journal) |
| Exports protégés | ✅ Le CSV est généré localement à partir de données lisibles par l'admin seul ; injection de formules corrigée |
| Permissions appliquées à chaque requête | ✅ Règles évaluées à chaque lecture et écriture |

## 5. Onglet « Sécurité » proposé (phase 7) — non implémenté, dépend de SEC-01/03

Données **réelles uniquement**, lisibles par l'admin seul :
- **Actions admin récentes** ← `adminLog` (SEC-03).
- **Signalements** : ouverts / 7 jours, profils les plus signalés ← `reports`.
- **Fuites résiduelles** : profils existants dont le texte public déclenche `hasForbiddenContent()` ← `profiles` (détection réelle sur les données déjà en base).
- **Anomalies de volume** : jours où `stats/req_sent`, `report`, `block`, `err_*` dépassent 3× la médiane ← `stats`.
- **Configuration** : règles publiées à jour ? (test : une écriture que les nouvelles règles refusent, sur un nœud de l'admin). App Check : à vérifier dans la console.
- **Dernier audit / état des vulnérabilités** : repris de ce fichier (étiqueté comme document, pas comme mesure).
- **Échecs de connexion / accès non autorisés** : **impossible à mesurer de façon fiable sans serveur**. Avec une liste d'uids, il n'y a d'ailleurs plus de mot de passe à « échouer ». Un compteur écrit par le client serait falsifiable : je préfère ne pas l'afficher plutôt que montrer un chiffre trompeur.

---

## 6. Rapport final (phase 8)

**Seconde analyse** : `poc_audit.js` relancé après correction. Les attaques V2, V3, V4, V5, V6, V9, V9b et V9c sont désormais **bloquées**. V1, V6b, V7, V8 et V10 passent encore : ce sont des points ouverts. Tests : `npm test` 59/59 + 48/48, `npm run test:rules` **156/156**.

### Score de maturité : **54 / 100** (48 avant corrections)

| Domaine (10 pts chacun) | Avant | Après | Justification |
|---|---|---|---|
| Confidentialité messages, téléphones, secrets | 9 | 9 | Règles solides et testées |
| Authentification et accès admin | 2 | 2 | SEC-01 ouvert (passe à environ 8 une fois corrigé) |
| Intégrité et validation des écritures | 5 | 7 | SEC-07/08/09/13/14/15 corrigés ; SEC-10/20/21 ouverts |
| Minimisation des données personnelles | 5 | 5 | SEC-05, 11, 12 |
| Injection / XSS | 8 | 9 | Échappement systématique ; CSV corrigé |
| Anti-abus, bots, limitation de débit | 2 | 2 | Pas d'App Check, bannissement contournable |
| En-têtes, CSP, transport | 3 | 5 | En-têtes ajoutés ; pas de CSP `script-src` ni de SRI |
| Chaîne d'approvisionnement et CI | 5 | 5 | 0 dépendance en production ; action non épinglée |
| Journalisation et supervision | 2 | 2 | SEC-03 |
| Tests de sécurité automatisés | 7 | 8 | 156 tests de règles + PoC reproductibles |

L'application n'est **pas** « 100 % sécurisée » : il reste 1 point critique, 2 élevés et 7 moyens ouverts.

### Tests NON exécutés (et pourquoi)
- Rien sur la **production** (base, Hosting, Auth) : hors périmètre autorisé et données réelles.
- **Parcours dans un vrai navigateur** : le SDK Firebase (gstatic) est inaccessible depuis l'environnement d'audit (proxy 403). Les règles sont testées, l'interface ne l'est pas : refaire la checklist mobile du README avant mise en ligne.
- **En-têtes sur `dereh-halev.web.app`** et **hash SRI** : réseau bloqué. Les en-têtes sont vérifiés sur l'émulateur Hosting.
- **Console Firebase et GCP** (App Check, restrictions de la clé API, domaines autorisés, sauvegardes RTDB, alertes budgétaires, droits du compte de service) : pas d'accès.
- **Score CVSS** non recalculé avec le calculateur officiel.

### Priorités avant (re)mise en production
1. **Aujourd'hui** : remplacer `config/adminPin` par une chaîne aléatoire de plus de 20 caractères (SEC-01, sans code).
2. Publier les nouvelles règles après relecture, puis vérifier dans l'app : inscription, demande, acceptation, message, rideau, signalement.
3. Valider la correction de fond SEC-01 et le journal admin SEC-03.
4. App Check, restriction de la clé API, alerte budgétaire (SEC-04).
5. Décider de la stratégie anti-réinscription des bannis (SEC-02) et de la lecture des profils réservée aux inscrits (SEC-05).
6. Rétention et purge (SEC-12) et lien `secrets` ↔ `private` (SEC-21).
