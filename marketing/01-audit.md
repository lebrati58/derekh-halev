# Phase A — Audit marketing de דרך הלב

*Audit fait le 14/10/2026 à partir du code de l'application (index.html, i18n.js, commun.js, database.rules.json), des logos et du README. Les comptes sociaux n'ont pas pu être consultés : instagram.com n'est pas joignable depuis mon environnement.*

## 1. Ce qui existe et fonctionne (vérifié dans le code)

| Élément | État | Ce qu'on peut en dire publiquement |
|---|---|---|
| Application web https://dereh-halev.web.app | En ligne, déploiement automatique | « זה אתר שעובד כמו אפליקציה », ajout à l'écran d'accueil possible |
| Inscription sans photo | Oui : genre, âge, ville, mode de vie (דתי/מסורתי/חילוני), intention, langues, 3 mots, shabbat idéal, questionnaire optionnel | « בלי תמונות » |
| Prénom et téléphone | Privés (`private/`), illisibles même par l'admin | « השם והטלפון לא מוצגים לאף אחד » |
| Propositions | Compatibilité calculée (`matching.js`), % et « למה אתם מתאימים » | « הצעות עם אחוז התאמה » |
| Demande → chat anonyme | Oui, avec question d'ouverture (icebreaker) | « שיחה אנונימית עם שאלת פתיחה » |
| « פתיחת המסך » | Nom et téléphone révélés seulement si les deux appuient ; l'autre ne sait pas si un seul a appuyé | Promesse centrale, vérifiée par les règles |
| Filtre anti-téléphone/liens dans le chat | Côté client | « בצ׳אט אי אפשר לשלוח טלפון או קישורים » (formulation prudente : c'est un filtre, pas une garantie absolue) |
| Messages | Lisibles par les 2 membres uniquement (règles) | « הצוות לא יכול לקרוא את השיחות » |
| Bloquer, signaler, pause, « לא בשבילי » | Oui | « חסימה ודיווח בלחיצה » |
| Code de conduite | Oui (8 règles) | Base du contenu « כללי הבית » |
| Langues | Hébreu, anglais, français | « עברית · English · Français » |
| Prix | Aucun paiement dans le code | « כרגע בחינם » — **à confirmer par toi** |
| Stats admin | Inscriptions, actifs, rétention, entonnoir, signalements (agrégés) | Base du futur tableau de bord marketing |

## 2. Identité existante

- **Logo** : cœur en dégradé pêche → framboise → rubis, traversé d'un chemin crème ; texte « דרך הלב » prune `#6D123E`. Fond crème. Seulement en PNG basse définition (600 px, cœur seul 256 px) → j'ai redessiné le cœur en vectoriel (`templates/logo-heart.svg`) pour les visuels. **À valider** : c'est une interprétation fidèle, pas le fichier source.
- **Univers de l'app** : nuit violette étoilée, or, rideau de théâtre en velours (« המסך עולה », « פתיחת המסך »). C'est l'actif le plus original de la marque.
- **Slogans existants** : « מכל הלב, דרך הלב! » ; « מתאהבים בשיחה — לפני שרואים את הפנים » ; « כאילו כל יום ט״ו באב ».
- **Typos de l'app** : Frank Ruhl Libre (titres), Rubik (texte).

## 3. Points de friction qui coûteront des conversions

1. **Pas de notifications** : l'utilisateur doit revenir de lui-même. Risque fort de « j'ai reçu une demande et je ne l'ai jamais vue ». → Le marketing doit installer un rituel (« פעם ביום »), Stories de rappel, et à terme une solution technique.
2. **Navigateur intégré d'Instagram** : le lien de la bio s'ouvre dans le navigateur d'Instagram. L'app le détecte (`inAppBrowser()` reconnaît Instagram), mais le texte du bandeau (`h097`) parle uniquement de **WhatsApp** → message déroutant pour un visiteur venu d'Instagram. Correctif simple proposé (3 langues).
3. **Identité liée au navigateur** : changer de navigateur = profil « perdu ». À expliquer dans la FAQ (fait : story FAQ 5).
4. **Aucune mesure de la source** : l'app ne lit pas les paramètres `utm_*` → impossible aujourd'hui de savoir combien d'inscrits viennent d'Instagram. Faisable **sans toucher aux règles** via les compteurs `stats/` existants (événement `src_instagram`, etc.).
5. **Aperçu WhatsApp/Instagram** : `og:image` = logo carré 600 px, correct. Pas de page « à propos » publique hors app.

## 4. Points de vigilance pour la communication

- **Ne pas dire** : « profils vérifiés » (aucune vérification d'identité), « 100 % anonyme » (âge, ville et textes du profil sont visibles des inscrits), « le plus grand / des milliers de membres » (chiffre non vérifié), « trouvez l'amour », « match garanti », « IA ».
- **Slogan « מתאהבים בשיחה »** : beau, mais promet implicitement de tomber amoureux. Je le garde dans l'app, mais pas dans les publicités ni la bio.
- **Marqueurs religieux** : le message de bienvenue contient « ב״ה » et « בעזרת השם ». Pour la communication publique, je reste neutre et respectueux (shabbat = élément culturel, pas religieux par défaut), pour parler aux trois publics.
- **Shabbat et fêtes** : une partie du public est pratiquante → ne rien publier entre l'allumage des bougies le vendredi et la sortie de shabbat, ni pendant les fêtes. C'est aussi un signe de respect qui crédibilise la marque.

## 5. Informations manquantes (décisions à prendre par toi)

| # | Question | Pourquoi c'est utile |
|---|---|---|
| 1 | L'app restera-t-elle gratuite ? Peut-on écrire « בחינם » ? | Argument fort de la bio, mais engageant |
| 2 | Taille du groupe WhatsApp, lien d'invitation public ou non, qui l'administre ? | Mettre ou non le groupe dans les liens Instagram ; message d'annonce |
| 3 | Qui gère le compte Instagram et à qui transférer les cas sensibles ? | Procédure de modération (phase C) |
| 4 | Adresse e-mail dédiée à la marque ? | Création sécurisée du compte |
| 5 | Le compte @dereh.halev (ou une variante) existe-t-il déjà ? | Je n'ai pas pu vérifier |
