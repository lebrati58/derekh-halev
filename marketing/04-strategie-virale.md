# Stratégie Instagram virale — דרך הלב

*Rédigé le 20/10/2026 après relecture du code de `main` (photos privées, recherche par numéro, liens de partage). Explications en français, contenus publics en hébreu.*

## 0. Ce qu'on a le droit de dire (vérifié dans le code)

| Fonctionnalité demandée dans le brief | État réel | Formulation autorisée |
|---|---|---|
| Pas de photo publique au départ | ✅ Les photos n'apparaissent **jamais** dans les cartes, propositions, recherche ni demandes | « בכרטיס אין תמונות » |
| Jusqu'à 4 photos (1 principale + 3) | ✅ `photos.js` (lancé récemment, commit « ESSAI ») | « אפשר להוסיף עד 4 תמונות » |
| Dévoilement jamais automatique | ✅ Chacun choisit, **après que les deux ont écrit** dans la conversation ; non réciproque ; révocable ; filigrane « נצפה ע״י פרופיל N » | « אתם מחליטים אם, מתי ועם מי. ואפשר לבטל. » |
| … | ⚠️ L'équipe d'admin peut voir les photos **pour la modération** (chaque consultation est journalisée), et l'app le dit | Ne **jamais** écrire « אף אחד חוץ ממי שבחרתם » ; écrire « רק מי שבחרתם (וצוות הניהול, רק למניעת שימוש לרעה) » dans la FAQ |
| … | ⚠️ Les captures d'écran ne peuvent pas être empêchées | Ne pas promettre « 100 % sécurisé » |
| Recherche par numéro de profil | ✅ « 🔍 מס׳ פרופיל », recherche exacte | « מצאתם מספר? חפשו אותו » |
| Recommandation par un proche **sans inscription** | ⚠️ **Partiel.** Un membre inscrit peut envoyer n'importe quelle carte (la sienne ou une autre) par un **lien secret** (WhatsApp, copie, partage natif). Toute personne qui reçoit le lien peut le **transférer** et **voir la carte avant de s'inscrire**. Mais un non-inscrit ne peut **pas** créer de recommandation, écrire un mot de recommandation, ni recommander quelqu'un qui n'est pas inscrit. | « קיבלתם קישור? אפשר להעביר אותו הלאה, גם בלי להירשם » ; « כל כרטיס אפשר לשלוח בקישור סודי — בלי שם, בלי טלפון ובלי תמונות » |
| Petit mot avec la demande | ✅ facultatif, 100 caractères | « אפשר לצרף מילה טובה לבקשה » |
| Nom + téléphone révélés | ✅ seulement si les deux appuient sur « פתיחת המסך » | inchangé |
| Notifications | ❌ aucune | Ne pas laisser croire qu'on est prévenu |
| Compte Instagram | ✅ l'app renvoie déjà vers **@dereh_halev** (bouton 🆘) | Utiliser @dereh_halev partout |

➡️ **Nouvelle signature disponible**, présente dans l'app : « **קודם הלב, אחר כך הפנים** ». Elle est plus juste que « בלי תמונות » maintenant que les photos privées existent. J'ai corrigé dans ce sens le plan Instagram (`03-instagram.md`).

➡️ **Idée produit, non promise** : un vrai mode « recommander quelqu'un » (un proche non inscrit écrit 2 lignes sur un ami, l'ami reçoit une invitation). C'est très cohérent avec la marque, mais ça n'existe pas : **aucun contenu ne doit le présenter comme disponible.**

Codes des publics utilisés plus bas : **S** = célibataires qui veulent du sérieux · **F** = fatigués des applis · **A** = amis qui « connaissent quelqu'un » · **M** = familles · **P** = « la personnalité d'abord ».

---

## 1. Analyse de 10 tendances

**Honnêteté sur les sources** : j'ai cherché des exemples récents. Les sources trouvées sont surtout des blogs d'outils marketing (chiffres non vérifiables) et aucune ne documente précisément le contenu « célibataires » israélien en 2026. Je sépare donc :
- **[V]** format vérifié dans une source récente ;
- **[É]** format établi et connu de longue date, sans source 2026 précise ;
- **[H]** hypothèse créative propre à Israël, à tester.

| # | Tendance | Mécanisme de viralité | Émotion | Public | Adaptation דרך הלב | Partage / Enreg. / Comm. |
|---|---|---|---|---|---|---|
| 1 | **Micro-sketch « POV »** [V] — texte « POV: … » sur une scène banale de la vie quotidienne (exemple cité : ~1 M de vues pour un compte de 519 abonnés, chiffre non vérifié) | Identification immédiate : « c'est moi » → envoi à un ami | Rire de reconnaissance | F, S | « POV: סבתא שלך בארוחת שישי » ; « POV: הוא קרא ✓✓ ולא ענה » | ★★★ / ★ / ★★ |
| 2 | **Faux documentaire assis** [V] — une personne face caméra, musique de documentaire, texte ironique (passé de TikTok à Instagram ; < 30 s conseillé) | Décalage solennel / sujet futile | Amusement, curiosité | F, P | « יום 12 בלי לדעת איך הוא נראה » : explique le concept sans pub | ★★ / ★ / ★★ |
| 3 | **Légende absurde + demande disproportionnée** [V] | L'humour naît de l'écart | Rire | F | « אני: מחפשת אהבת אמת / גם אני: מחליקה שמאלה בגלל חולצה » | ★★★ / – / ★★ |
| 4 | **Conversation de messagerie à l'écran** [É] — les bulles apparaissent au rythme d'un son | Suspense message par message, fin inattendue | Tension, rire | F, A | Groupe WhatsApp fictif « החבר׳ה » + lien de profil, **étiqueté « שיחה מבוימת »** | ★★★ / ★ / ★★★ |
| 5 | **Les amis entremetteurs** [É + tendance de fond] — « pitch » de l'ami célibataire, soirées PowerPoint ; d'après un article, les recherches « matchmaker » ont presque doublé entre janvier 2025 et janvier 2026 (chiffre de source unique) ; Tinder a lancé un mode « amis entremetteurs » en 2023 | Les gens taguent l'ami concerné → portée organique | Tendresse, humour | **A**, M, S | Notre fonctionnalité réelle : le lien secret de carte. « המצגת על החבר הרווק » | ★★★ / ★ / ★★★ |
| 6 | **Red flag / green flag** [É] | Débat en commentaires (chacun a son avis) | Indignation amusée | F, S | « דגל ירוק: שואל על השבת האידיאלית שלך » | ★★ / ★★ / ★★★ |
| 7 | **Remix / réaction** [É] (fonction Remix d'Instagram) | S'appuie sur une vidéo déjà virale | Complicité | F | Réagir à une vidéo virale de dating avec « אצלנו זה היה נגמר אחרת » (seulement des vidéos publiques, sans moquerie de la personne) | ★★ / – / ★★ |
| 8 | **Micro-trottoir** [É] | Réponses spontanées et inattendues | Curiosité, rire | Tous | « תתארו את עצמכם ב־3 מילים » dans la rue (Tel-Aviv, Jérusalem, Haïfa) — accord filmé des passants | ★★ / – / ★★★ |
| 9 | **« Comment vous vous êtes rencontrés ? » d'un couple âgé** [É] | Émotion authentique, contraste avec les applis | Émotion, nostalgie | M, S, P | Grands-parents **réels, consentants, pas des utilisateurs de l'app** : « אז איך הכרתם? » → « דרך חברים ». Lien naturel avec la recommandation | ★★★ / ★★ / ★★ |
| 10 | **Ras-le-bol des applis** [H, cohérent avec un sujet de Kan qui présentait en 2026 la rencontre en ligne comme « dépassée »] | Ressentiment partagé = partage militant | Soulagement | F, P | « האגודל שלי עשה יותר קילומטרים ממני » ; on ne dénigre pas de concurrents nommés | ★★★ / ★ / ★★ |

**Bonus local [H]** : le **dîner du vendredi**, rituel commun aux religieux, traditionalistes et laïcs. « נו, יש מישהו? » est une réplique que tout Israélien reconnaît. C'est notre meilleur ressort culturel et il ne réduit pas la marque à une communauté.

**Règle sur les sons** : sur un compte professionnel, on ne peut utiliser que la musique de la bibliothèque autorisée (« audio commercial ») ou des sons originaux. Les sons tendance durent environ 7 à 10 jours, les formats 3 à 4 semaines. On mise donc sur les **formats**.

### Les 5 meilleurs concepts de Reels

| | Titre | Accroche (< 10 mots) | Vidéo | Tournage | Émotion | Pourquoi on le partage | CTA |
|---|---|---|---|---|---|---|---|
| 1 | **ארוחת שישי** | ״נו, יש מישהו?״ — סבתא, כל שישי | Une actrice joue toute la famille (foulard, lunettes, casquette) qui pose la question rituelle ; chute : « יש. אבל אני עוד לא יודעת איך הוא נראה » | 1 personne, téléphone fixe, table de shabbat | Rire de reconnaissance | Tout le monde a une tante comme ça → on tague le cousin | « מה שואלים אתכם בשישי? 👇 » |
| 2 | **המצגת על החבר הרווק** | הכנתי מצגת. נושא: למה אתה צריך לפגוש אותו | Une amie présente « l'offre » de son meilleur ami en slides absurdes (« יודע להחזיר עגלה בסופר ») ; fin : « או שפשוט אשלח לך את הכרטיס שלו » | 2 personnes, salon, slides sur un ordinateur | Tendresse, rire | On l'envoie à l'ami à caser → tag | « תייגו את החבר שמגיעה לו מצגת » |
| 3 | **קרא ✓✓** | הוא קרא. ✓✓ ואז נעלם. | Écran de chat, les ✓✓ bleus, le temps qui passe (horloge, plantes qui fanent, saisons) ; fin : « מגיע לכם מישהו שעונה. ואם לא — פרידה יפה זה חלק מהכללים שלנו » | Plans d'inserts, 1 personne de dos | Frustration → soulagement | Vécu par tous | « כמה זמן חיכיתם לתשובה? 👇 » |
| 4 | **3 מילים ברחוב** | תתאר/י את עצמך ב־3 מילים. עכשיו. | Micro-trottoir ; réponses drôles, hésitations ; fin : « ככה מתחיל כרטיס בדרך הלב » | 1 intervieweur + téléphone, rue animée | Curiosité, sympathie | Les gens adorent les micros-trottoirs ; ils jouent le jeu en commentaire | « ואתם? 3 מילים בתגובות » |
| 5 | **יום 12 בלי פנים** | יום 12. אני עדיין לא יודעת איך הוא נראה. | Faux documentaire : une femme raconte sérieusement qu'elle parle depuis 12 jours avec quelqu'un sans photo ; elle « découvre » ce qu'elle sait de lui (il déteste la coriandre, il appelle sa mère le vendredi) | 1 personne assise, lumière douce, musique de doc | Amusement puis émotion | Concept insolite → « tu as vu ce truc ? » | « מה הייתם רוצים שיידעו עליכם לפני הפנים? » |

---

## 2. 10 frustrations → 10 accroches

| # | Frustration | Accroche (hébreu, < 10 mots) | Concept de Reel | Pourquoi ça fait réagir |
|---|---|---|---|---|
| 1 | Conversations qui ne mènent à rien | **שלושה שבועות של ״מה נשמע״. אפס דייטים.** | Montage accéléré de « מה נשמע / בסדר ואת? » qui défile ; arrêt net ; carte avec une **question d'ouverture** | Tout le monde a vécu ce ping-pong vide |
| 2 | Le ghosting | **הוא קרא. ✓✓ ונעלם.** | Concept n°3 ci-dessus | Blessure partagée, on veut témoigner |
| 3 | Jugement sur la photo | **שמאלה בגלל זווית. חבל, הוא היה מצחיק.** | Split-screen : à droite une photo floue jugée en 0,5 s ; à gauche ses 3 mots, son shabbat idéal | Culpabilité amusée (« moi aussi je fais ça ») |
| 4 | Fatigue du swipe | **האגודל שלי עשה יותר קילומטרים ממני.** | Gros plan d'un pouce qui « court » sur un tapis de course miniature, compteur de km | Image absurde, mémorable |
| 5 | Pression familiale | **״נו, יש מישהו?״ — סבתא, כל שישי.** | Concept n°1 | Réplique culte israélienne |
| 6 | « J'ai quelqu'un pour toi » sans suite | **״יש לי מישהו בשבילך!״ ואז… כלום.** | L'amie promet, la personne attend devant le téléphone ; fin : « פעם הבאה, שתשלח לך את הכרטיס שלו » (lien secret) | On tague l'ami qui promet toujours |
| 7 | Manque de sérieux | **״לא מחפש משהו רציני״. אחרי חודש.** | Calendrier qui tourne, révélation tardive ; fin : sur la carte, on voit l'intention dès le départ (« 💍 קשר רציני » / « 🌊 נזרום ונראה ») | Colère légitime, débat en commentaires |
| 8 | Toujours les mêmes profils | **שוב הוא? ראיתי אותו בשלוש אפליקציות.** | La même personne (acteur) apparaît dans des écrans différents comme un running gag | Rire de reconnaissance |
| 9 | Photos trompeuses | **התמונה מ־2019. הפגישה ב־2026.** | Avant/après humoristique (même acteur avec perruque) ; fin : « אצלנו מכירים קודם את הלב. את התמונות — מי שבוחר מראה » | Ressenti très répandu, autodérision |
| 10 | Bloqué devant le 1er message | **כתבתי ״היי״. מחקתי. כתבתי ״היי!״. מחקתי.** | Écran : tape / efface en boucle ; fin : la question d'ouverture proposée par l'app + le « petit mot » de la demande | Malaise universel, très « envoyable » |

---

## 3. Les 5 scripts complets (~30 s)

Règles communes : sous-titres incrustés (Rubik, blanc sur bandeau prune ou nuit), logo cœur en bas, dernier plan = carte de fin du kit (`post2-7`). Tournage vertical 9:16, téléphone posé, lumière naturelle. Musique : bibliothèque commerciale d'Instagram, piste douce.

### Script 1 — HUMOUR : « ארוחת שישי »
**Durée** 30 s · **1 actrice** · **Décor** : table de shabbat (bougies, ‘hallot), plan fixe.

| Temps | Plan | Action / dialogue (hébreu) | Texte à l'écran | Effet / son |
|---|---|---|---|---|
| 0–2 s | Plan serré, l'actrice (« דנה ») sourit, fourchette en main | — | **POV: ארוחת שישי אצל המשפחה** | Bruit de couverts |
| 2–7 s | Elle met un foulard → « סבתא » | סבתא: ״נו, דנה׳לה… יש מישהו?״ | — | Zoom rapide (effet « comédie ») |
| 7–12 s | Lunettes → « אמא » ; casquette → « אח » | אמא: ״הבת של רחל כבר מתחתנת…״ / אח: ״אולי תורידי קצת את הסטנדרטים?״ | — | Coupe sèche à chaque personnage |
| 12–17 s | Dana, calme | דנה: ״יש מישהו.״ | — | **Silence total**, la musique s'arrête |
| 17–22 s | Tous les personnages en coupes rapides, figés | סבתא: ״…נו? איך הוא נראה?״ / דנה: ״אין לי מושג.״ | — | Effet « record scratch » (son de bibliothèque) |
| 22–27 s | Dana montre son téléphone (écran = `post7-carte-exemple`, version masculine **étiquetée כרטיס לדוגמה**) | דנה: ״אבל אני יודעת שהוא מצחיק, שהוא מתקשר לאמא שלו בשישי, ושהוא שונא כוסברה.״ | — | — |
| 27–30 s | Foulard → Savta, très sérieuse | סבתא: ״שונא כוסברה? …תביאי אותו לשישי הבא.״ | **קודם הלב, אחר כך הפנים 💗** + logo | Musique reprend |

**Légende** :
```
מה שואלים אתכם בארוחת שישי? 👇😅

בדרך הלב מכירים קודם את הלב:
3 מילים, השבת האידיאלית, שיחה אנונימית.
התמונות? רק אם תבחרו להראות, אחרי ששניכם כתבתם.

תייגו את מי שהסבתא שלו שואלת כל שבוע 👇
קישור בביו 💗

#דרךהלב #ארוחתשישי #רווקים #רווקות #סבתא #היכרויות
```
**Montage** : CapCut, coupes toutes les 2 à 3 s, sous-titres automatiques corrigés à la main.

### Script 2 — ÉMOTION : « מה רואים קודם »
**Durée** 30 s · **1 personne, jamais de visage** · voix off posée.

| Temps | Plan | Voix off (hébreu) | Texte à l'écran | Effet / son |
|---|---|---|---|---|
| 0–2 s | Main qui fait défiler très vite des visages floutés sur un écran | ״חצי שנייה.״ | **חצי שנייה.** | Bruit de swipe |
| 2–7 s | L'écran s'arrête sur un flou | ״זה הזמן שלקח למישהו להחליט שאני לא מתאימה.״ | — | Piano doux |
| 7–13 s | Mains qui écrivent sur un carnet, à la terrasse d'un café | ״הוא לא ידע שאני צוחקת בקול רם בסרטים. שאני מכינה שקשוקה לכל השכונה בשישי.״ | — | — |
| 13–19 s | Mains qui tiennent 3 petits papiers : « צוחקת · נדיבה · עקשנית » | ״אז מה אם, בפעם הבאה, מישהו יכיר את זה קודם?״ | **3 מילים. לא תמונה.** | Les mots apparaissent un par un |
| 19–25 s | Écran du téléphone : bouton « 📷 שיתוף התמונות שלי » (son propre compte) | ״ואת הפנים שלי? אני אחליט מתי. ואם בכלל.״ | **התמונות — רק אם תבחרו** | — |
| 25–30 s | Mains qui posent le téléphone ; deux tasses de café sur la table | ״קודם הלב.״ | **קודם הלב, אחר כך הפנים 💗** | Fin du piano |

**Légende** :
```
חצי שנייה. ככה מחליטים עלינו, לפי תמונה אחת.

בדרך הלב, הכרטיס שלך הוא 3 מילים, השבת האידיאלית שלך, ומה שאת/ה לא יכול/ה לחיות בלי.
את התמונות את/ה מראה רק למי שתבחר/י, אחרי שיחה. ואפשר לבטל בכל רגע.

מה הייתם רוצים שיידעו עליכם, לפני הפנים? 👇

#דרךהלב #קודםהלב #היכרויות #רווקים #רווקות
```
**Montage** : couleurs chaudes, transitions en fondu, pas de musique tendance (ton intime).

### Script 3 — CONVERSATION WHATSAPP MISE EN SCÈNE : « יש לי מישהו בשבילך »
**Durée** 28 s · **enregistrement d'écran** d'une conversation créée sur un 2ᵉ téléphone ou dans un générateur de capture, **bandeau permanent « שיחה מבוימת · כל הדמויות בדיוניות »**.

Groupe : **״הבנות 🍕״** — personnages : נועה (la célibataire), שירה, מאיה.

| Temps | Messages qui apparaissent | Texte à l'écran | Son |
|---|---|---|---|
| 0–2 s | שירה: ״בנות. יש לי מישהו בשביל נועה.״ | **כולם מכירים את ההודעה הזאת 👀** | Notification |
| 2–7 s | מאיה: ״מי???״ / שירה: ״חבר של בן דוד שלי. מהמם.״ / נועה: ״איך קוראים לו?״ / שירה: ״…רגע אני בודקת״ | — | Bips de messages |
| 7–12 s | Ellipse « 3 ימים אחר כך » ; נועה: ״נו??״ / שירה: ״וואי שכחתי 🙈״ | **3 ימים אחר כך** | Grillon (comique) |
| 12–18 s | מאיה: ״רגע, אני בדרך הלב. ראיתי כרטיס שהוא בדיוק את.״ → elle envoie le **vrai format du message de partage** de l'app : « ❤️ דרך הלב / רוצה להראות לך פרופיל שאולי יכול להתאים! / 👤 מספר פרופיל: לדוגמה / לצפייה בפרופיל: … » | — | Swoosh |
| 18–24 s | נועה: ״רגע… אין תמונה?״ / מאיה: ״יש 3 מילים: ׳סקרן, מצחיק, רגיש׳. והשבת האידיאלית שלו זה ים בשש בבוקר.״ / נועה: ״…טוב. זה קצת מושלם.״ | — | — |
| 24–28 s | נועה: ״פתחתי. אפשר לראות את הכרטיס גם בלי להירשם 😳״ / שירה: ״אני עדיין בודקת איך קוראים לבחור שלי״ 🤦‍♀️ | **פעם הבאה — שלחו כרטיס 💌** + logo | Rire |

**Légende** :
```
״יש לי מישהו בשבילך!״ … ואז שלושה ימים של שקט 😅

בדרך הלב כל כרטיס אפשר לשלוח בקישור סודי — בלי שם, בלי טלפון ובלי תמונות.
מי שמקבל את הקישור רואה את הכרטיס גם לפני שנרשם.

(שיחה מבוימת, כל הדמויות בדיוניות)

תייגו את השירה של החבר׳ה 👇

#דרךהלב #יששלימישהובשבילך #חברות #רווקות #היכרויות
```
**Montage** : enregistrement d'écran, zoom sur chaque nouveau message, sous-titres inutiles (le texte est dans les messages). **Ne jamais montrer un vrai numéro de profil ni un vrai lien.**

### Script 4 — UN AMI RAPPROCHE DEUX PERSONNES : « לא בשבילי. בשבילך. »
**Durée** 30 s · **2 acteurs** : אורי (inscrit, célibataire) et sa sœur מיכל (non inscrite) · conforme au fonctionnement réel.

| Temps | Plan | Dialogue / action | Texte à l'écran | Son |
|---|---|---|---|---|
| 0–2 s | Ori sur le canapé, fait défiler ses propositions, s'arrête net | — | **הכרטיס הכי מתאים שראיתי… לא בשבילי.** | Musique légère |
| 2–8 s | Gros plan téléphone (carte **לדוגמה**) : « חוקרת, מצחיקה, טבעונית בקטע מגזים » ; Ori réfléchit | אורי (à lui-même): ״רגע… זה החבר של מיכל. זה בדיוק אלון.״ | — | — |
| 8–13 s | Il appuie sur 🔗 → « שיתוף בוואטסאפ » | אורי: ״אני לא שדכן. אבל זה מתבקש.״ | **🔗 שיתוף כרטיס — בלי שם, בלי טלפון, בלי תמונות** | Swoosh |
| 13–19 s | Cuisine : Michal reçoit, montre à son ami Alon (de dos) | מיכל: ״אורי שלח לך משהו. תפתח.״ / אלון: ״אני לא רשום לזה.״ / מיכל: ״לא צריך בשביל לראות.״ | — | — |
| 19–25 s | Alon lit, sourit malgré lui | אלון: ״׳הסופ״ש החלומי: טבע׳… טוב, היא בסדר.״ / מיכל: ״׳היא בסדר׳ אצלך זה הצעת נישואין.״ | — | Rire |
| 25–30 s | Alon sort son téléphone, commence l'inscription | — | **החברים שלך מכירים אותך. תנו להם לעזור 💗** + logo | Fin musique |

⚠️ Message d'éthique en légende : on partage la carte d'un tiers **sans** nom, téléphone ni photo ; c'est la personne destinataire qui décide.

**Légende** :
```
הכרטיס הכי מתאים שראית… פשוט לא בשבילך? 👀
שלחו אותו למי שכן.

בדרך הלב כל כרטיס אפשר לשתף בקישור סודי (בלי שם, בלי טלפון ובלי תמונות).
מי שמקבל אותו רואה את הכרטיס גם בלי להירשם — ומחליט לבד אם לשלוח בקשה.

למי הייתם שולחים כרטיס? תייגו 👇

#דרךהלב #שדכנים #חברים #רווקים #רווקות #היכרויות
```

### Script 5 — POURQUOI C'EST DIFFÉRENT (subtil) : « יום 12 »
**Durée** 30 s · **1 actrice** · format faux documentaire (tendance n°2).

| Temps | Plan | Dialogue | Texte à l'écran | Son |
|---|---|---|---|---|
| 0–2 s | Assise, plan fixe frontal, lumière de doc | — | **יום 12. אני עדיין לא יודעת איך הוא נראה.** | Musique de documentaire grave |
| 2–8 s | Même plan | ״התחלנו לדבר לפני 12 יום. אין לי מושג אם הוא גבוה. אני יודעת שהוא מקפל גרביים בזוגות.״ | — | — |
| 8–14 s | Plan de coupe : ses mains, une tasse | ״הוא שלח לי בקשה עם מילה אחת: ׳גם אני חושב שחומוס זה ארוחת בוקר׳. עניתי תוך שתי דקות. אני לא עונה תוך שתי דקות לאמא שלי.״ | **💌 בקשה + מילה טובה** | — |
| 14–20 s | Retour face caméra, plus sérieuse | ״אתמול הוא שאל אם אני רוצה לראות תמונות. אמרתי ׳עוד לא׳. והוא אמר ׳בכיף׳.״ | **התמונות — רק כששניכם כתבתם, ורק אם תבחרו** | La musique s'adoucit |
| 20–26 s | Petit sourire | ״אני חושבת שזו הפעם הראשונה שמישהו רצה להכיר אותי… לפני שהוא החליט אם אני ׳הטיפוס שלו׳.״ | — | — |
| 26–30 s | Elle se lève, caméra fixe | ״יום 13. נראה.״ | **קודם הלב, אחר כך הפנים 💗** + logo | Silence |

**Légende** :
```
יום 12. עדיין לא יודעת איך הוא נראה. ויודעת עליו יותר מעל כל מי שראיתי בתמונה 🙃

ככה זה עובד בדרך הלב:
💌 בקשה לשיחה (אפשר עם מילה טובה)
💬 שיחה אנונימית
📷 תמונות — רק אחרי ששניכם כתבתם, ורק אם תבחרו
✨ שם וטלפון — רק אם שניכם לוחצים ״פתיחת המסך״

(דמות בדיונית, סיפור מבוים)

#דרךהלב #קודםהלב #היכרויות #רווקים #רווקות
```

---

## 4. Cinq contenus de crédibilité

| # | Format | Accroche (< 10 mots) | Comment le produire sans tricher | Données à collecter |
|---|---|---|---|---|
| 1 | **Démo réelle de l'écran** (Reel 30 s, enregistrement d'écran) | **ככה זה נראה באמת. בלי פילטרים.** | Filmer **uniquement ton propre compte** : formulaire, ta carte, « 📷 התמונות שלי », conversation de bienvenue. **Ne jamais filmer les propositions** : ce sont de vrais membres. Pour le chat : les maquettes « לדוגמה » | — |
| 2 | **Comment marche le lien de recommandation** (carrousel) | **איך ממליצים על מישהו בלי לחשוף אותו?** | Captures de l'écran de partage (🔗) depuis ta carte ; le texte du message tel qu'il est envoyé | — |
| 3 | **Gestion des photos** (Reel + story à la une « בטיחות ») | **מי רואה את התמונות שלך? רק מי שתבחרו.** | Ton compte avec 1 à 2 photos de toi **ou** des photos d'objets ; montrer « מי יכול לראות את התמונות שלי? », la révocation, le filigrane. **Dire aussi** : l'équipe peut voir pour modérer | — |
| 4 | **Coulisses** (vidéo face caméra ou voix off) | **בנינו את זה בגלל קבוצת וואטסאפ אחת.** | L'histoire vraie du projet (groupe de célibataires → app), par toi, avec ou sans visage | Ton histoire, datée ; captures de l'évolution (anciens écrans) |
| 5 | **Témoignage authentique** (story à la une « סיפורי היכרות », puis post) | **הם הסכימו לספר. אנחנו רק מקשיבים.** | Uniquement avec **accord écrit**, anonymisé par défaut (voix, mains, prénoms d'emprunt si demandé) ; relecture du contenu par les personnes avant publication | Voir ci-dessous |

**Données à collecter avant de publier un chiffre** (toutes agrégées, déjà calculables dans l'admin) :
- nombre total d'inscrits à une date donnée (`profiles`) ;
- conversations ouvertes (`chats`) et conversations où **les deux** ont écrit (`chatActivity`) ;
- « rideaux ouverts » (`chats.opened`) — à ne publier que si le chiffre est significatif ;
- clics sur WhatsApp après ouverture (`stats/wa_click`).
Chaque chiffre publié s'écrit avec sa date (« נכון ל־1.11.2026 ») et sans arrondi flatteur.

**Recueil de témoignages** : un formulaire simple (Google Forms) avec 1) récit libre, 2) cases d'accord séparées (publication du texte / de la voix / de l'image), 3) prénom affiché ou non, 4) accord de **l'autre personne** s'il s'agit d'un couple. Rien sans les deux accords.

---

## 5. Cinq contenus à enregistrer (conseils)

| # | Titre (≤ 12 mots) | Conseil concret | Visuel | Pourquoi on l'enregistre |
|---|---|---|---|---|
| 1 | **איך פותחים שיחה בלי ״היי״: הנוסחה של 3 החלקים** | 1) un **détail précis** de sa carte, 2) une **question ouverte** dessus, 3) un **petit truc sur vous**. Ex. : « ראיתי שהשבת האידיאלית שלך זה ים. בוקר או שקיעה? אני צוות שקיעה 🌅 » | Carrousel : 3 bulles annotées, 3 exemples | Une recette réutilisable à chaque nouvelle conversation |
| 2 | **איך ממליצים על חבר/ה בלי להביך אף אחד** | Demander d'abord à la personne concernée ; envoyer en privé, jamais dans le groupe ; dire **pourquoi** (« כי שניכם מכינים קפה כמו מדענים ») ; laisser une porte de sortie (« לא מתאים? הכול טוב ») | Carrousel « 4 כללים » + exemple de message | Mode d'emploi pour le prochain « j'ai quelqu'un pour toi » |
| 3 | **מתי להציע להיפגש: לצאת מהצ׳אט לפני שהוא מתייבש** | Quand la conversation est fluide depuis quelques jours (pas de règle magique), proposer **concret** : un lieu, un moment, une durée courte. « קפה ביום שלישי, חצי שעה? » plutôt que « ניפגש מתישהו » | Statique : « מתישהו ✗ / שלישי, 18:00, קפה ✓ » | Évite la conversation éternelle |
| 4 | **3 שאלות שמגלות התאמה יותר מכל תמונה** | « איך נראה אצלך שישי בערב? » (rythme, famille, tradition) ; « מיליון נפל עלייך — לאן? » (rapport à l'argent) ; « מה עשית בפעם האחרונה שכעסת? » (gestion des conflits) | Carrousel, une question par slide + ce qu'elle révèle | Liste à garder pour le prochain rendez-vous |
| 5 | **פגישה ראשונה: קצרה, ציבורית, עם דרך יציאה** | 45 à 60 min, en journée, dans un lieu public ; prévenir un(e) ami(e) ; venir par ses propres moyens ; « אם זה טוב, תמיד אפשר להאריך » | Statique checklist ✓ (reprend le code de conduite de l'app) | Checklist de sécurité, utile et rassurante |

---

## 6. Une idée, trois formats : « ומה אם האהבה הבאה שלך תגיע מהמלצה? »

*Formulé comme une question, sans promesse.*

### A. Reel 7 secondes
| Temps | Image | Texte à l'écran |
|---|---|---|
| 0–1,5 s | Pouce qui swipe frénétiquement | **אלגוריתם: אינסוף פרופילים.** |
| 1,5–4 s | **Surprise** : l'écran de swipe se fige, une bulle WhatsApp tombe d'en haut, en gros : « תסתכלי על הכרטיס הזה 👀 — מאיה » | **חברה אחת: כרטיס אחד.** |
| 4–7 s | Le téléphone est posé, le logo cœur apparaît | **מי מכיר אותך טוב יותר? 💗** |

Légende : « מי מכיר אותך טוב יותר — האלגוריתם או החברה הכי טובה שלך? 👇 #דרךהלב »

### B. Carrousel 5 slides
1. **תחשבו על הזוג האהוב עליכם. איך הם הכירו?**
2. **לפעמים זה התחיל במשפט אחד: ״יש לי מישהו בשבילך.״**
3. **כי חבר טוב רואה מה שתמונה לא מראה: את הצחוק, את הלב, את הדרך.**
4. **בדרך הלב אפשר לשלוח כל כרטיס בקישור סודי — בלי שם, בלי טלפון ובלי תמונות. מי שמקבל רואה את הכרטיס גם בלי להירשם.**
5. **מכירים מישהו שמגיע לו מישהו טוב? שלחו לו את הפוסט הזה 💌**

### C. Publication statique
- **Concept visuel** : sur fond crème, une seule grande bulle WhatsApp blanche avec « יש לי מישהו בשבילך 💗 », et en dessous, petit, l'heure « 21:47 ✓✓ ».
- **Phrase** : **החברים שלך כבר יודעים.**
- **Légende** :
```
החברים שלך כבר יודעים מה את/ה מחפש/ת. לפעמים יותר טוב ממך 🙃

בדרך הלב, כל כרטיס אפשר לשלוח בקישור סודי — בלי שם, בלי טלפון ובלי תמונות.
אז אם מישהו כבר אמר לך ״יש לי מישהו בשבילך״ — בקש/י ממנו את הקישור.

מי השדכן/ית של החבר׳ה שלכם? תייגו 👇

#דרךהלב #יששלימישהובשבילך #חברים #היכרויות
```

Les visuels B et C sont générés : `visuels/reco-1.jpg` … `reco-5.jpg` et `visuels/reco-statique.jpg`.

---

## 7. Dix appels à l'action (< 10 mots)

**Commentaires**
1. מה הייתה הודעת הפתיחה הכי טובה שקיבלתם?
2. 3 מילים עליכם — בתגובות 👇
3. מה שואלים אתכם בארוחת שישי?
4. דגל ירוק או אדום? תחליטו בתגובות

**Partages**
5. שלחו לחבר/ה שעדיין מחכה ל״יש לי מישהו״
6. תייגו את השדכן/ית של החבר׳ה
7. שלחו לרווק/ה שנמאס לו/ה להחליק

**Enregistrements**
8. שמרו לפני ההודעה הראשונה הבאה 🔖
9. שמרו לפני שאתם ממליצים על מישהו
10. שמרו לדייט הראשון הבא שלכם 🔖

---

## 8. Calendrier 30 jours

→ `05-calendrier-30-jours.md`

## 9. Les 3 premières vidéos à produire

| Ordre | Vidéo | Pourquoi d'abord |
|---|---|---|
| 1 | **Script 3 — « יש לי מישהו בשבילך » (WhatsApp mis en scène)** | Production la plus simple (enregistrement d'écran, aucun acteur). Elle met en avant la fonctionnalité la plus « partageable » (le lien secret) et pousse au tag, qui est le principal moteur de portée hors abonnés. Elle teste aussi l'appétit pour l'angle « amis entremetteurs ». |
| 2 | **Script 1 — « ארוחת שישי »** | Le ressort culturel le plus fort (la question du vendredi), compris par tous les publics, religieux comme laïcs. Une seule actrice. Le potentiel de reconnaissance et de partage est le plus élevé. |
| 3 | **Script 5 — « יום 12 »** | Une fois l'attention captée par l'humour, il explique tout le parcours (demande, chat, photos au choix, rideau) sans ressembler à une pub. C'est le Reel qu'on épinglera pour convertir les nouveaux visiteurs. |

**Critère d'évaluation** (à 7 jours, sans fixer de seuil arbitraire avant d'avoir une référence) : partages par 1 000 vues, enregistrements, visites du profil, clics sur le lien. Le meilleur des trois oriente les 2 semaines suivantes. **Aucun résultat n'est garanti** : ce sont des paris argumentés, à mesurer.

---

Sources consultées (20/10/2026) :
- [async.com — 5 Instagram Reels formats to try in 2026](https://async.com/blog/instagram-reels-formats/) (POV, faux documentaire)
- [Virlo — What's trending on Instagram](https://virlo.ai/blog/whats-trending-on-instagram) (humour de la disproportion ; chiffres non vérifiés)
- [Buffer — How to find trending Reels in 2026](https://buffer.com/resources/instagram-trending-reels/)
- [Global Dating Insights — Gen Z dating app burnout drives surge in matchmaker interest](https://www.globaldatinginsights.com/news/gen-z-dating-app-burnout-drives-surge-in-matchmaker-interest/)
- [TechCrunch — Tinder lets friends play matchmaker (2023)](https://techcrunch.com/2023/10/23/tinders-app-gets-more-social-by-letting-friends-play-matchmaker)
- [Kan — sujet 2026 sur la rencontre hors applications](https://www.kan.org.il/content/kan-news/newstv/p-963853/s2/998864/)
