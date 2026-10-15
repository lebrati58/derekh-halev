# CLAUDE.md — דרך הלב | Derekh HaLev

Application de rencontre anonyme pour un groupe WhatsApp de célibataires. Interface en hébreu (RTL), anglais et français (LTR), surtout utilisée sur mobile (souvent dans le navigateur intégré de WhatsApp).
Site statique HTML/CSS/JS sans build, hébergé sur **Firebase Hosting : https://dereh-halev.web.app** (GitHub Pages `lebrati58.github.io/derekh-halev` = ancienne adresse). Backend : Firebase Realtime Database, projet `dereh-halev`, plan Blaze (paiement à l'usage, usage dans la partie gratuite ; aucune Cloud Function utilisée : **toute la sécurité repose sur `database.rules.json`**). Authentification anonyme Firebase (un uid par navigateur).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | App participant (HTML + tout le JS inline) : inscription (formulaire réutilisé pour ✏️ l'édition du profil), conversation de bienvenue « 💗 צוות דרך הלב » (locale, jamais en base, clairement signée par l'équipe — **pas un faux profil**) + message ciblé « élargir la tranche d'âge » (`needsAgeTip()`) affiché seulement si aucun profil n'est compatible avec mes préférences, propositions, demandes, chat, ouverture du rideau, pause/blocage/signalement, suppression du profil, 📜 code de conduite (modale, lien sous la case 18 ans et en bas de l'accueil) |
| `admin.html` | Tableau de bord admin (connexion par PIN) : 6 tuiles clés + bouton « 📊 כל הסטטיסטיקות » vers une page à part (toutes les tuiles + graphiques : inscriptions/chats par jour, âges, villes, religion, intentions, langues, questionnaire, état des chats — calculés uniquement depuis `profiles`, `chats` (métadonnées), `reports`, `banned` ; charge `matching.js` pour les libellés `QUIZ`), signalements, bannissement, 🗑️ suppression d'un profil par numéro, annonce du jour |
| `commun.js` | Config Firebase, schéma de la base en commentaire, helpers partagés (auth anonyme, `nextProfileNo`, filtre anti-téléphone/liens `hasForbiddenContent`, `cardHTML`, modale, toast) |
| `i18n.js` | Traductions de l'interface he/en/fr (`I18N`, `t(clé, vars)`, `applyI18n()`, `setLang()`), langue choisie au 1er lancement et mémorisée (localStorage `mhm_uiLang`). Textes fixes du HTML : `data-i18n`/`-ph`/`-aria` (clés `hNNN`) ; textes du code : `t("clé")`. **Tout nouveau texte doit être ajouté dans les 3 langues.** `admin.html` reste en hébreu |
| `stats.js` | Calcul **pur** des statistiques admin (`computeStats`, `insights`, périodes, rétention, entonnoir, compatibilité via `matching.js`) — testé par `test_stats.js` |
| `admin-stats.js` | Interface du centre statistique de l'admin (`StatsUI`) : filtres période/segment, onglets, graphiques SVG, export CSV |
| `matching.js` | Moteur de compatibilité pur (sans Firebase) : filtres durs, score, %, raisons « למה אתם מתאימים », icebreakers |
| `style.css` | Styles partagés |
| `logo.png`, `logo-heart.png`, `apple-touch-icon.png` | Logo complet (aperçu WhatsApp `og:image`), cœur seul transparent (en-tête + icône d'onglet), icône écran d'accueil |
| `database.rules.json` | Règles de sécurité RTDB (source de vérité de la confidentialité) |
| `firebase.json` | Règles, Hosting (dossier `public/` généré au déploiement) + émulateurs database (9000) / hosting (5000) |
| `.github/workflows/firebase-hosting.yml` | Déploiement auto à chaque push sur `main` : règles (testées puis publiées) puis site dereh-halev.web.app (secret `FIREBASE_SERVICE_ACCOUNT`) ; copie la **liste blanche** des fichiers du site dans `public/` — tout nouveau fichier du site doit y être ajouté |
| `test_matching.js` | Tests du moteur de matching (Node, sans dépendance) |
| `test_stats.js` | Tests des calculs statistiques (Node, sans dépendance ; `npm test` lance les deux) |
| `test_rules.js` | Tests des règles sur l'émulateur (`@firebase/rules-unit-testing`) |
| `package.json` | Dépendances et scripts de **test uniquement** |
| `README.md` | Guide d'installation Firebase, déploiement, checklist de test manuel mobile |

## Schéma de la base (détail complet en commentaire en tête de `commun.js`)

- `config/adminPin` — PIN admin, saisi à la main dans la console, illisible par tous.
- `admins/{uid}` — copie du PIN écrite par admin.html ; vaut « admin » si égal à `config/adminPin`.
- `counters/profileNo` — compteur des numéros de profil (incrément +1 par transaction).
- `profiles/{uid}` — profil **public** : `no`, `gender`, `age`, `city`, `religion`, `intent`, `words[3]`, `shabbat`, `createdAt` + questionnaire v2 optionnel (`ageMin/ageMax`, `kids`, `shabbatStyle`, `pace`, `value`, `weekend`, `million`, `cantLiveWithout`) + `langs` (`{he,en,fr: true}`, langues parlées → drapeaux 🇮🇱🇬🇧🇫🇷 sur la carte) + `paused`.
- `profileNos/{no}: uid` — index d'unicité des numéros, réservé une fois à la création du profil.
- `private/{uid}` — `firstName`, `phone`.
- `blocks/{uid}/{targetUid}: true` — blocages personnels.
- `hidden/{uid}/{targetUid}: true` — profils « 🙈 pas pour moi » masqués de mes propositions (l'autre peut toujours m'envoyer une demande) ; lien « profils masqués (N) » en bas de l'accueil pour tout réafficher.
- `archived/{uid}/{chatId}: true` — conversations rangées dans « 🗄️ ארכיון » (pour moi seul ; proposé quand la conversation est terminée, réversible).
- `banned/{uid}: true` — profils bannis.
- **Statistiques (collecte sans contenu, écrite par `index.html`, `track()` / `trackVisit()`)** :
  - `activity/{uid}` — `first`, `last` (timestamps serveur), `mobile`, `d/{AAAAMMJJ}: nb de chargements ce jour-là` (visiteurs non inscrits compris).
  - `presence/{uid}: true` — en ligne maintenant (supprimé par `onDisconnect`).
  - `stats/{événement}/{AAAAMMJJ}/{pushId}: true` — compteurs d'actions anonymes : `req_sent`, `req_sent_soft`, `req_note`, `req_accepted`, `req_declined`, `msg_sent`, `reveal_press`, `wa_click`, `hide`, `unhide`, `archive`, `unarchive`, `block`, `report`, `pause_on/off`, `card_view`, `coc_open`, `welcome_open`, `agetip_open`, `agetip_edit`, `lang_change`, `profile_edit`, `profile_delete`, `reg_start`, `reg_done`, `reg_err_<champ>`, `tab_<onglet>`, `err_<action>`.
  - `chatActivity/{chatId}/{uid}: true` — ce membre a écrit au moins un message (taux de réponse, sans lire les messages).
- `announcements/current` — `{text, text_en?, text_fr?, ts}` publié par l'admin (hébreu obligatoire ; chaque utilisateur voit sa langue, repli sur l'hébreu).
- `inbox/{to}/{from}` et `outbox/{from}/{to}` — demandes : `fromNo`/`toNo`, `status` (pending/accepted/declined), `createdAt`, `chatId?`, `note?` (💌 petit mot facultatif ≤ 100 car., immuable, affiché avec la demande puis en tête de la conversation ; jamais dans `chats/`, que l'admin lit).
- `chats/{from_to}` — métadonnées : `from`, `to` (uids), `fromNo`, `toNo`, `status` (active/ended), `opened`, `icebreaker` (clé neutre type `weekend.sea`, traduite à l'affichage par `icebreakerText()` ; anciens chats : texte hébreu), `createdAt`.
- `userChats/{uid}/{chatId}: true` — index des chats de chacun.
- `messages/{chatId}/{msgId}` — `{from, text, ts}`.
- `readAt/{chatId}/{uid}: ts` — « lu jusqu'à » (timestamp du dernier message lu) → ✓ envoyé / ✓✓ bleus lus, comme WhatsApp ; la liste des conversations affiche aussi le nombre de non-lus (30 derniers messages), l'aperçu et l'heure.
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
| `profiles` | **tout inscrit** (admin compris) | admin : **suppression seule** ; soi, si non banni ; `no` immuable, ≤ compteur, et réservé à soi dans `profileNos` à la création ; champs inconnus refusés |
| `profileNos/{no}` | personne | soi, une seule fois (réécriture identique tolérée), si son profil a ce `no` ; non supprimable |
| `private/{uid}` | soi (jamais l'admin) | soi ; admin : **suppression seule** |
| `blocks/{uid}` | soi | soi |
| `hidden/{uid}` | soi | soi (valeurs `true` uniquement ; suppression de toute la liste permise) |
| `archived/{uid}` | soi | soi (valeurs `true` ; suppression permise) |
| `banned` | tout inscrit | admin |
| `activity/{uid}` | admin ; soi | soi (`first` immuable, dates ≤ maintenant, champs connus seulement) |
| `presence/{uid}` | admin | soi (`true`) |
| `stats/{event}/{day}/{id}` | admin | tout inscrit : **ajout seul** (`true`), nom d'événement `[a-z_]`, jour `AAAAMMJJ` ; ni modification ni suppression |
| `chatActivity/{chatId}/{uid}` | admin | soi, membre du chat (`true`) |
| `announcements/current` | tout inscrit | admin |
| `inbox/{to}` | destinataire | expéditeur (création `pending`, `fromNo` vérifié, ni banni ni bloqué) ; destinataire (mise à jour) |
| `outbox/{from}` | expéditeur | expéditeur (création, `toNo` vérifié) ; destinataire (mise à jour) |
| `chats` | les 2 membres **+ admin (tout le nœud)** | création par le destinataire d'une demande ; `status`→ended par membre ou admin ; `opened`→true si les 2 `reveal` sont à true |
| `userChats/{uid}` | soi | un membre du chat concerné |
| `messages/{chatId}` | les 2 membres seulement | membre, chat actif, non banni, `from` == soi, ≤ 500 car. |
| `readAt/{chatId}/{uid}` | les 2 membres seulement (jamais l'admin) | soi, membre, nombre ≤ maintenant |
| `reveal/{chatId}/{uid}` | soi seulement | soi, membre, chat actif |
| `secrets/{chatId}` | les 2 membres, **seulement si `opened`** | soi, membre, tant que non `opened` |
| `reports` | admin | un membre du chat (création) ; admin (tout) |

## Logique de matching

Toute la compatibilité vit dans `matching.js` (`isCompatible`, `matchScore`, `matchPercent`, `matchReasons`, `pickIcebreaker`, `kidsOk`…), chargé par `index.html` après `commun.js`. Elle tourne **côté client** : `computeProposals()` dans `index.html` charge tous les `profiles`, exclut soi/bannis/bloqués/masqués/demandes et chats existants, puis appelle `matching.js` (tous les profils compatibles, triés par score, suivis de tous les profils « découverte » hors préférences). L'icebreaker est calculé à l'acceptation et stocké dans `chats/{id}/icebreaker`.

## Tester en local

```bash
python3 -m http.server 8000      # puis http://localhost:8000 et /admin.html (Firebase Auth refuse file://)
node test_matching.js            # = npm test, aucune dépendance
npm install && npm run test:rules  # règles sur l'émulateur (projet fictif dereh-halev-test, nécessite Java)
```
Attention : le serveur local parle à la **vraie base de production** (`commun.js`). Pour simuler deux personnes : fenêtre normale + navigation privée. La checklist mobile manuelle est dans `README.md`.

## Déployer

- Front : push sur `main` → GitHub Action → Firebase Hosting (https://dereh-halev.web.app). GitHub Pages publie encore la même chose sur l'ancienne adresse. Pas de build.
- Cache mobile : `style.css`, `i18n.js`, `commun.js`, `matching.js` sont chargés avec `?v=AAAAMMJJ` (+ lettre si plusieurs fois le même jour) dans `index.html` et `admin.html`. **Changer ce numéro (dans les deux fichiers) à chaque modification de l'un d'eux**, sinon les téléphones gardent l'ancienne version.
- Règles : **déployées automatiquement** par la même GitHub Action, job `rules` (`npm test` + `npm run test:rules` sur l'émulateur, puis `firebase deploy --only database`) ; le site n'est publié qu'après (`deploy` dépend de `rules`). Le compte de service `FIREBASE_SERVICE_ACCOUNT` doit avoir le rôle **Firebase Realtime Database Admin** (Google Cloud → IAM). Secours manuel : coller `database.rules.json` dans la console (Realtime Database → Règles → Publier).
- Domaine GitHub Pages à garder dans Firebase Auth → Domaines autorisés.

## Règles de travail

- Règle absolue : aucun admin ne doit pouvoir lire prénom, téléphone, messages, conversations ou secrets de révélation. L'admin ne voit que le numéro anonyme du profil. Cette règle doit être garantie par database.rules.json, pas seulement par l'interface.
- Ne jamais dupliquer la logique de matching : toujours réutiliser matching.js.
- Pas de suppression ou migration de données sans confirmation explicite de ma part.
- Lire uniquement les fichiers nécessaires à la tâche en cours.
- Faire des modifications ciblées plutôt que réécrire des fichiers entiers.
- Ne jamais dire qu'une chose est testée si elle ne l'a pas été.
- « **yallah** » = « **fusionne** » : les deux mots veulent dire « ouvre la PR vers `main` et fusionne-la » (puis vérifier le déploiement).

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
16. Statistiques : l'admin voit, par uid (donc par numéro de profil), les jours de visite, l'appareil (mobile ou non), la présence en ligne et si la personne a écrit dans un chat donné. Aucun texte, nom ni téléphone, mais ce sont des métadonnées d'usage. Les compteurs `stats/` sont anonymes mais peuvent être gonflés par un inscrit malveillant (ajout libre de `true`). Un même humain sur 2 navigateurs = 2 uids (visiteurs comptés deux fois).
14. Les numéros de profil et uids sont visibles par tous dans `profiles/` ; `banned/` est lisible par tous les inscrits.
15. Préfixe localStorage `mhm_` (ancien nom du projet) à ne pas changer sans migration. (README mis à jour : adresse dereh-halev.web.app et déploiement auto.)
