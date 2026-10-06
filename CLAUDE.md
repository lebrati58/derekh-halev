# CLAUDE.md — דרך הלב | Derekh HaLev

Application de rencontre anonyme pour un groupe WhatsApp de célibataires. Interface en hébreu (RTL), surtout utilisée sur mobile (souvent dans le navigateur intégré de WhatsApp).
Site statique HTML/CSS/JS sans build, hébergé sur GitHub Pages. Backend : Firebase Realtime Database, projet `dereh-halev`, plan Spark (pas de Cloud Functions : **toute la sécurité repose sur `database.rules.json`**). Authentification anonyme Firebase (un uid par navigateur).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | App participant (HTML + tout le JS inline) : inscription, propositions, demandes, chat, ouverture du rideau, pause/blocage/signalement, suppression du profil |
| `admin.html` | Tableau de bord admin (connexion par PIN) : stats, signalements, bannissement, annonce du jour |
| `commun.js` | Config Firebase, schéma de la base en commentaire, helpers partagés (auth anonyme, `nextProfileNo`, filtre anti-téléphone/liens `hasForbiddenContent`, `cardHTML`, modale, toast) |
| `matching.js` | Moteur de compatibilité pur (sans Firebase) : filtres durs, score, %, raisons « למה אתם מתאימים », icebreakers |
| `style.css` | Styles partagés |
| `database.rules.json` | Règles de sécurité RTDB (source de vérité de la confidentialité) |
| `firebase.json` | Pointe vers les règles + config de l'émulateur database (port 9000) |
| `test_matching.js` | Tests du moteur de matching (Node, sans dépendance) |
| `test_rules.js` | Tests des règles sur l'émulateur (`@firebase/rules-unit-testing`) |
| `package.json` | Dépendances et scripts de **test uniquement** |
| `README.md` | Guide d'installation Firebase, déploiement, checklist de test manuel mobile |

## Schéma de la base (détail complet en commentaire en tête de `commun.js`)

- `config/adminPin` — PIN admin, saisi à la main dans la console, illisible par tous.
- `admins/{uid}` — copie du PIN écrite par admin.html ; vaut « admin » si égal à `config/adminPin`.
- `counters/profileNo` — compteur des numéros de profil (incrément +1 par transaction).
- `profiles/{uid}` — profil **public** : `no`, `gender`, `age`, `city`, `religion`, `intent`, `words[3]`, `shabbat`, `createdAt` + questionnaire v2 optionnel (`ageMin/ageMax`, `kids`, `shabbatStyle`, `pace`, `value`, `weekend`, `million`, `cantLiveWithout`) + `paused`.
- `profileNos/{no}: uid` — index d'unicité des numéros, réservé une fois à la création du profil.
- `private/{uid}` — `firstName`, `phone`.
- `blocks/{uid}/{targetUid}: true` — blocages personnels.
- `banned/{uid}: true` — profils bannis.
- `announcements/current` — `{text, ts}` publié par l'admin.
- `inbox/{to}/{from}` et `outbox/{from}/{to}` — demandes : `fromNo`/`toNo`, `status` (pending/accepted/declined), `createdAt`, `chatId?`.
- `chats/{from_to}` — métadonnées : `from`, `to` (uids), `fromNo`, `toNo`, `status` (active/ended), `opened`, `icebreaker`, `createdAt`.
- `userChats/{uid}/{chatId}: true` — index des chats de chacun.
- `messages/{chatId}/{msgId}` — `{from, text, ts}`.
- `reveal/{chatId}/{uid}: true` — « j'ouvre le rideau ».
- `secrets/{chatId}/{uid}` — `{firstName, phone}` déposés au moment du reveal.
- `reports/{pushId}` — `chatId`, `reporterUid`, `reporterNo`, `reportedUid`, `reportedNo`, `reason`, `createdAt`, `resolved?`.

## Qui lit / écrit quoi (règles actuelles)

« Admin » = utilisateur dont `admins/{uid}` == `config/adminPin`. Tout le reste exige `auth != null`.

| Nœud | Lecture | Écriture |
|---|---|---|
| `config` | personne | personne (console uniquement) |
| `admins/{uid}` | soi | soi, seulement si valeur == PIN |
| `counters/profileNo` | tout inscrit | tout inscrit non banni, +1 strict, non supprimable |
| `profiles` | **tout inscrit** (admin compris) | soi, si non banni ; `no` immuable, ≤ compteur, et réservé à soi dans `profileNos` à la création ; champs inconnus refusés |
| `profileNos/{no}` | personne | soi, une seule fois (réécriture identique tolérée), si son profil a ce `no` ; non supprimable |
| `private/{uid}` | soi | soi |
| `blocks/{uid}` | soi | soi |
| `banned` | tout inscrit | admin |
| `announcements/current` | tout inscrit | admin |
| `inbox/{to}` | destinataire | expéditeur (création `pending`, `fromNo` vérifié, ni banni ni bloqué) ; destinataire (mise à jour) |
| `outbox/{from}` | expéditeur | expéditeur (création, `toNo` vérifié) ; destinataire (mise à jour) |
| `chats` | les 2 membres **+ admin (tout le nœud)** | création par le destinataire d'une demande ; `status`→ended par membre ou admin ; `opened`→true si les 2 `reveal` sont à true |
| `userChats/{uid}` | soi | un membre du chat concerné |
| `messages/{chatId}` | les 2 membres seulement | membre, chat actif, non banni, `from` == soi, ≤ 500 car. |
| `reveal/{chatId}/{uid}` | soi seulement | soi, membre, chat actif |
| `secrets/{chatId}` | les 2 membres, **seulement si `opened`** | soi, membre, tant que non `opened` |
| `reports` | admin | un membre du chat (création) ; admin (tout) |

## Logique de matching

Toute la compatibilité vit dans `matching.js` (`isCompatible`, `matchScore`, `matchPercent`, `matchReasons`, `pickIcebreaker`, `kidsOk`…), chargé par `index.html` après `commun.js`. Elle tourne **côté client** : `computeProposals()` dans `index.html` charge tous les `profiles`, exclut soi/bannis/bloqués/demandes et chats existants, puis appelle `matching.js` (3 propositions max, complétées par des profils « découverte » hors préférences si besoin). L'icebreaker est calculé à l'acceptation et stocké dans `chats/{id}/icebreaker`.

## Tester en local

```bash
python3 -m http.server 8000      # puis http://localhost:8000 et /admin.html (Firebase Auth refuse file://)
node test_matching.js            # = npm test, aucune dépendance
npm install && npm run test:rules  # règles sur l'émulateur (projet fictif dereh-halev-test, nécessite Java)
```
Attention : le serveur local parle à la **vraie base de production** (`commun.js`). Pour simuler deux personnes : fenêtre normale + navigation privée. La checklist mobile manuelle est dans `README.md`.

## Déployer

- Front : push sur `main` → GitHub Pages (Deploy from branch `main` / root). Pas de build.
- Cache mobile : `style.css`, `commun.js`, `matching.js` sont chargés avec `?v=AAAAMMJJ` (+ lettre si plusieurs fois le même jour) dans `index.html` et `admin.html`. **Changer ce numéro (dans les deux fichiers) à chaque modification de l'un d'eux**, sinon les téléphones gardent l'ancienne version.
- Règles : **non déployées automatiquement**. Coller `database.rules.json` dans la console Firebase (Realtime Database → Règles → Publier), ou `firebase deploy --only database --project dereh-halev`. À refaire à chaque modification des règles.
- Domaine GitHub Pages à garder dans Firebase Auth → Domaines autorisés.

## Règles de travail

- Règle absolue : aucun admin ne doit pouvoir lire prénom, téléphone, messages, conversations ou secrets de révélation. L'admin ne voit que le numéro anonyme du profil. Cette règle doit être garantie par database.rules.json, pas seulement par l'interface.
- Ne jamais dupliquer la logique de matching : toujours réutiliser matching.js.
- Pas de suppression ou migration de données sans confirmation explicite de ma part.
- Lire uniquement les fichiers nécessaires à la tâche en cours.
- Faire des modifications ciblées plutôt que réécrire des fichiers entiers.
- Ne jamais dire qu'une chose est testée si elle ne l'a pas été.

## Points d'attention (constatés, non corrigés)

**Confidentialité / règle absolue**
1. L'admin lit tout `chats/` : il voit qui parle avec qui (`from`/`to`, `fromNo`/`toNo`), l'icebreaker et si le rideau s'est ouvert. Ce ne sont pas les messages, mais ce sont des métadonnées de conversation.
2. L'admin, comme tout inscrit, lit `profiles/` en entier (âge, ville, genre, textes libres), pas seulement le numéro. Les `reports` lui exposent aussi des uids et une `reason` libre où le signaleur peut recopier des messages.
3. Les profils publics contiennent du texte libre (`words`, `shabbat`, `city`, `cantLiveWithout`) : le filtre anti-téléphone/liens est uniquement côté client, les règles ne vérifient que la longueur. Un téléphone ou un nom peut donc atterrir dans un profil public.
4. ~~Rideau asymétrique~~ — corrigé dans les règles : `opened` exige désormais les deux `reveal` **et** les deux `secrets` (test « reveal SANS secret » dans `test_rules.js`). À republier dans la console Firebase.
5. `secrets` n'est pas lié à `private/` : on peut y déposer n'importe quel prénom/téléphone.
6. Un chat peut être créé directement avec `opened: true` (la règle de `opened` n'est vérifiée qu'en mise à jour). Pas de fuite constatée, mais incohérent.

**Intégrité**
7. ~~Numéro de profil non unique~~ — corrigé : index `profileNos/{no}` réservé à la création du profil (tests « Numéro de profil unique »). **Reste ouvert tant que l'index n'est pas rempli pour les profils créés avant** : leurs numéros ne sont pas réservés et peuvent encore être pris.
8. `reports` : `reporterNo`/`reportedNo` non vérifiés, champs inconnus acceptés. `chats` accepte aussi des champs inconnus à la création.
9. Le PIN admin est attaquable par force brute (la validation sert d'oracle) — limite déjà notée dans le README.
10. Un banni peut encore écrire dans `private/`, `blocks/`, `reveal/` et `secrets/`. Tout inscrit non banni peut faire grimper `counters/profileNo` sans créer de profil.

**Code / données**
11. ~~Duplication partielle du matching~~ — corrigé : le complément « découverte » utilise `isSoftCompatible()` et `softReasons()` de `matching.js`.
12. `acceptRequest()` enchaîne 5 écritures non atomiques (alors que `sendRequest()` utilise un update multi-path) → demi-états possibles si la connexion lâche.
13. La suppression de profil ne retire que `profiles/` et `private/` : `secrets/` (prénom + téléphone), `inbox`/`outbox`, `messages`, `blocks`, `reports` restent indéfiniment.
14. Les numéros de profil et uids sont visibles par tous dans `profiles/` ; `banned/` est lisible par tous les inscrits.
15. README partiellement daté (« Envoie les 6 fichiers », déploiement des règles uniquement par copier-coller). Préfixe localStorage `mhm_` (ancien nom du projet) à ne pas changer sans migration.
