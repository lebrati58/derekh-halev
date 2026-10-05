# 🎭 Derekh HaLev — דרך הלב

*Le chemin du cœur* — mini web-app de rencontre anonyme pour un groupe WhatsApp de célibataires.
On tombe amoureux d'une conversation **avant** de voir le visage.

100 % statique (HTML/CSS/JS vanilla), hébergée sur GitHub Pages, avec Firebase Realtime Database comme backend.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | App participant : inscription, carte mystère, propositions, demandes, chat, ouverture du rideau |
| `admin.html` | Tableau de bord admin (PIN) : stats, signalements, bannissement. **Ne peut pas lire les conversations.** |
| `commun.js` | Config Firebase, structure de la base (en commentaire), helpers, filtre anti-téléphone/liens |
| `matching.js` | Moteur de compatibilité v2 (filtres durs, score, « pourquoi vous matchez », icebreakers) — pur, sans Firebase |
| `test_matching.js` | Tests du moteur (`node test_matching.js`) |
| `style.css` | Design partagé (violet nuit / doré, rideau de théâtre) |
| `database.rules.json` | Règles de sécurité Realtime Database (à coller dans la console) |

---

## 1. Créer le projet Firebase (≈ 10 min)

1. Va sur <https://console.firebase.google.com> → **Ajouter un projet** (Analytics : inutile).
2. **Build → Realtime Database → Créer une base de données**
   - Emplacement : `europe-west1` (le plus proche d'Israël).
   - Démarre en **mode verrouillé** (on colle nos règles juste après).
3. **Build → Authentication → Commencer → onglet « Sign-in method » → Anonyme → Activer.**
   > ⚠️ Indispensable. Les participants ne voient rien (pas d'email, pas de mot de passe) : Firebase leur attribue un identifiant invisible, mémorisé dans le navigateur. C'est ce qui permet aux règles de garantir que **personne ne peut lire le prénom ou le téléphone d'un autre** tant que les deux n'ont pas ouvert le rideau. Sans ça, n'importe qui pourrait aspirer toute la base.
4. **Paramètres du projet (⚙️) → Général → Tes applications → icône Web `</>`** → donne un nom → **Enregistrer**. Copie l'objet `firebaseConfig`.

## 2. Coller la config

Ouvre `commun.js` et remplace l'objet `firebaseConfig` en haut du fichier par le tien.
Vérifie que `databaseURL` est bien présent (ex. `https://ton-projet-default-rtdb.europe-west1.firebasedatabase.app`). S'il manque, copie-le depuis la page Realtime Database.

## 3. Règles de sécurité

**Realtime Database → onglet Règles** → efface tout → colle le contenu de `database.rules.json` → **Publier**.

> ⚠️ **À refaire après chaque mise à jour de `database.rules.json`** (ex. v2 : questionnaire, `blocks/`, `announcements/`, `paused` · v3 : durcissement — compteur non supprimable, `fromNo`/`toNo` vérifiés contre `profiles/`, champs inconnus refusés dans `inbox`/`outbox`/`messages`). Tant que les nouvelles règles ne sont pas publiées, l'app fonctionne en mode dégradé : profils enregistrés sans questionnaire, blocage/pause/annonces refusés.

Ce que garantissent ces règles :

- **Profils publics** (`profiles/`) : lisibles uniquement par les inscrits ; jamais de nom ni de téléphone dedans.
- **Prénom + téléphone** (`private/`) : lisibles **uniquement par leur propriétaire**.
- **Ouvrir le rideau** : chacun dépose ses coordonnées dans `secrets/{chat}` et coche `reveal/{chat}/{moi}` — que **l'autre ne peut pas lire** (il ne sait donc pas qu'on a appuyé). Le chat ne peut passer en `opened: true` que si **les deux** cases sont cochées ; seulement alors `secrets/` devient lisible par les deux.
- **Messages** : lisibles et écrivables uniquement par les deux membres du chat, tant qu'il est actif. **L'admin n'y a pas accès.**
- **Chat** : ne peut être créé que par le destinataire d'une vraie demande.
- **Profils bannis** : ne peuvent plus écrire (messages, demandes, profil).
- **Admin** : reconnu uniquement si le PIN saisi = `config/adminPin`, qui n'est **lisible par personne**.
- **Anti-usurpation (v3)** : le numéro de profil annoncé dans une demande ou un chat (`fromNo`/`toNo`) doit correspondre au vrai numéro du profil ; le compteur de numéros ne peut pas être supprimé/réinitialisé ; aucun champ inconnu accepté dans `inbox`/`outbox`/`messages`.

> 🔒 Limite connue : le PIN admin peut être essayé en boucle par un compte anonyme (pas de limitation de tentatives côté Realtime Database). Choisis un PIN long (8+ caractères, pas une date).

## 4. Définir le PIN admin

**Realtime Database → onglet Données** → survole la racine → **+** :
- Clé : `config` → puis ajoute un enfant clé `adminPin`, valeur `"4829"` (ton code).

(Le PIN peut être saisi en texte ou en nombre, `admin.html` gère les deux. Évite de commencer par 0 si tu le saisis comme nombre.)

Pour changer le PIN : modifie la valeur → tous les admins actuels sont automatiquement déconnectés.

## Tests

```bash
node test_matching.js    # moteur de compatibilité (pur, sans Firebase)
npm install              # une fois — dépendances de test uniquement (l'app reste 100% statique)
npm run test:rules       # règles de sécurité sur l'émulateur Firebase (nécessite Java)
```

`test_rules.js` vérifie, avec de vrais comptes anonymes simulés, que chaque scénario d'attaque « console JS » est refusé : lecture des téléphones d'autrui, usurpation de numéro de profil, reset du compteur, messages hors chat, lecture admin des conversations, PIN erroné…

## Checklist de test manuel (mobile réel)

À faire sur **Safari iPhone**, **Chrome Android** et le **navigateur intégré WhatsApp** (impossible à automatiser ici) :

- [ ] Inscription complète (questionnaire + téléphone) — arrivée sur ✨ הצעות avec des profils visibles
- [ ] Inscription avec réseau faible : couper le wifi au moment de « 🎭 יוצאים לדרך » → message d'erreur avec code → réessayer → pas de doublon de numéro
- [ ] Fermer/rouvrir le navigateur → l'identité est retrouvée (pas de ré-inscription)
- [ ] Envoyer 💌 → l'autre reçoit la demande → accepter → chat ouvert avec שאלת פתיחה
- [ ] Écrire un téléphone / lien dans un message → bloqué avant envoi
- [ ] Rideau : un seul côté appuie → rien ne se passe côté B ; les deux → animation + nom + bouton WhatsApp fonctionnel
- [ ] ⏸️ Pause → disparaît des propositions de l'autre ; retour → réapparaît
- [ ] 🚫 Blocage → disparaît des deux côtés, demandes refusées
- [ ] 🚩 Signalement → visible dans admin.html ; הרחקה → écran « הורחקת » côté banni, chats fermés
- [ ] Suppression du profil → carte disparaît, chats terminés, retour à l'écran d'inscription
- [ ] Clavier mobile : le composer du chat reste visible quand le clavier est ouvert
- [ ] RTL correct partout (chiffres, téléphone en LTR dans sa bulle)

## 5. Tester en local

Firebase Auth ne fonctionne pas en `file://`. Depuis le dossier :

```bash
python3 -m http.server 8000
```

puis ouvre <http://localhost:8000> (participant) et <http://localhost:8000/admin.html>.
Pour simuler deux personnes : une fenêtre normale + une fenêtre de navigation privée (ou deux navigateurs).

## 6. Déployer sur GitHub Pages

1. Crée un dépôt GitHub (ex. `derekh-halev`), public.
2. Envoie les 6 fichiers à la racine (bouton **Add file → Upload files** suffit).
3. **Settings → Pages → Source : Deploy from a branch → Branch : `main` / `(root)` → Save.**
4. Après ~1 min : `https://TON-PSEUDO.github.io/derekh-halev/`
5. Dans Firebase : **Authentication → Settings → Domaines autorisés → Ajouter** `TON-PSEUDO.github.io`.

Le lien à poster dans le groupe WhatsApp : l'URL ci-dessus. Garde `admin.html` pour toi.

> La clé `apiKey` visible dans `commun.js` n'est pas un secret (c'est normal pour Firebase côté web) : la sécurité repose entièrement sur les règles.

---

## Comment ça marche

**Inscription** → prénom et téléphone (privés), genre, âge, ville, religieux/traditionnel/laïc, intention, 3 mots, « ton shabbat idéal ? ». Chacun reçoit un numéro unique (`פרופיל 12`) via une transaction Firebase, et une carte mystère en CSS. L'identité est gardée dans le navigateur (Firebase Auth + `localStorage`) : on revient sans se réinscrire.

**Matching v2** (100 % côté client, `matching.js`) → jusqu'à 3 suggestions avec **% de compatibilité** et **« למה אתם מתאימים »** (3 points communs).
- *Filtres durs* : genre opposé ; fourchettes d'âge personnelles mutuelles (`ageMin`/`ageMax`, sinon écart ≤ 8 ans) ; ילדים « veut ↔ n'en veut pas » exclu ; religieux ↔ laïc exclu (traditionnel ↔ tous) ; profils en pause, bloqués ou bannis exclus.
- *Score* : intention, shabbat (קודש ↔ יום רגיל = gros malus), enfants, rythme, valeur, week-end, million, ville, proximité d'âge.
- Les anciens profils (sans questionnaire) restent compatibles — score sur les champs de base.

**Questionnaire v2** à l'inscription (tout en un clic) : fourchette d'âge recherchée, ילדים, style de shabbat, rythme, valeur principale, week-end rêvé, « le million tombé du ciel », « אני לא יכול/ה לחיות בלי… ».

**Icebreaker automatique** → à l'ouverture d'un chat, une « שאלת פתיחה » basée sur leurs réponses communes apparaît comme bulle système (stockée dans `chats/{id}/icebreaker`).

**Sécurité v2** → 🚫 **blocage personnel** (`blocks/{uid}/{target}` : il disparaît de mes listes, et les règles refusent ses nouvelles demandes ; discret, il n'est pas prévenu — limite : son profil peut encore me voir dans *ses* listes tant qu'il ne m'a pas contactée, le blocage agit à la demande) · ⏸️ **mode pause** (`profiles/{uid}/paused` : invisible dans les suggestions, chats conservés).

**📣 פעילות היום** → l'admin publie une annonce (`announcements/current`) affichée en bannière à tous les participants ; bannière « 💌 יש לך בקשות » à l'ouverture.

**Demande → acceptation → chat** anonyme `פרופיל 12 ↔ פרופיל 27`. Le filtre bloque les suites de chiffres (téléphones), liens, emails et @pseudos avec le message « שומרים על המסתורין 🎭 ».

**🎭 פתיחת המסך** → quand les deux ont appuyé : animation de rideau, prénoms + téléphones + bouton WhatsApp direct. Si un seul appuie, l'autre n'en sait rien.

**Terminer** → « השיחה הסתיימה 🌙 » des deux côtés, sans dire qui a arrêté. **Signaler** → part à l'admin, qui peut bannir (ce qui ferme aussi tous les chats actifs du profil).

## Limites à connaître

- **Pas de notifications push** (app statique) : les participants doivent revenir sur le lien. Astuce : l'admin peut poster un petit rappel dans le groupe (« 3 nouveaux profils ce soir 🎭 »).
- **Le filtre anti-téléphone est côté client** : il arrête 99 % des cas, mais un petit malin pourrait écrire « zéro-cinq-deux… ». Le bouton signaler est là pour ça.
- **Changement de navigateur/téléphone** = nouvelle identité (l'app le signale et propose de se réinscrire). Le navigateur intégré de WhatsApp conserve normalement ses données, mais conseiller d'ouvrir le lien dans Chrome/Safari est plus sûr.
- Le matching charge tous les profils : parfait jusqu'à quelques milliers d'inscrits, largement suffisant pour un groupe WhatsApp.
- Les numéros de profil sont uniques mais pas forcément consécutifs (une inscription abandonnée « consomme » un numéro).

נבנה באהבה לט״ו באב 💜
