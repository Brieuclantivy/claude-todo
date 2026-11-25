---
name: todo
description: TODO, points de réunion et réunions récurrentes du user, par projet, dans ~/todo/. À utiliser dès que le user veut ajouter, lister, cocher une tâche ou un point à aborder en réunion, créer/annuler/déplacer une réunion, préparer une réunion, ranger ses notes de réunion ou retrouver d'anciennes notes — ex. "ajoute ça à ma todo", "note ça pour la réunion avec Ahmed", "ajoute ce point dans mes demandes client", "donne-moi ma todo list", "qu'est-ce que j'ai à faire sur qspresse ?", "qu'est-ce que je dois préparer pour jeudi ?", "prépare mon weekly", "crée une réunion tous les mardis avec X", "la réunion de jeudi est annulée", "voici mes notes de la réunion", "qu'est-ce qu'on avait dit le 25 novembre ?", "marque la 12 comme faite", "le client a répondu X à la 13".
---

# TODO, points de réunion et réunions

Tout est dans `~/todo/`, en Markdown que le user peut modifier à la main. Relis donc un fichier avant chaque écriture.

```
~/todo/
  TODO.md                         tâches et points de réunion, par projet
  reunions.md                     définition des réunions récurrentes
  docs/<id>.md                    document détaillé d'une entrée
  reunions/<slug>/AAAA-MM-JJ.md   une séance : préparation, ordre du jour, notes, décisions, actions
```

Rien n'existe tant que le user ne l'a pas créé : sans `reunions.md`, le skill fonctionne comme une simple TODO.

## TODO.md

```markdown
# TODO

## qspresse

### Tâches
- [ ] #12 Porter envoiPenalite en TS (ajouté 2026-11-23)
  - ctx : `src/resultats/Resultats.ts:1199`, legacy `Resultats.php` non porté
- [x] #9 Corriger le suffixe du bucket hebdo (ajouté 2026-11-17) ✅ 2026-11-20

### Réunion
- [ ] #13 Neutralisation : le délai PHR doit-il être plafonné à -1 ? (ajouté 2026-11-23) [réunion ahmed] [prio]
  - ctx : M2026-07, `calcDelai`, 3 plis concernés
  - doc : docs/13.md
- [x] #10 Samedi = jour limite de distribution ? (ajouté 2026-11-12) [réunion ahmed] ✅ 2026-11-26
  - réponse (2026-11-26) : oui, pour tous les titres
```

Règles :
- Une section `## <projet>` par projet, avec deux sous-sections fixes : `### Tâches` (ce que le user doit faire lui-même) et `### Réunion` (ce qu'il doit dire ou demander à quelqu'un : questions client, informations à transmettre, validations à obtenir). Crée-les à la première entrée du projet.
- Chaque entrée est une ligne `- [ ] #<id> <résumé> (ajouté AAAA-MM-JJ)`, en colonne 0. Le hook de rappel ne compte que ces lignes.
- Les détails vont en sous-puces indentées de 2 espaces : `ctx :` (fichier:ligne, branche, période, cas particulier, ce qui a été essayé), `réponse (date) :`, `doc : docs/<id>.md`.
- Les ids sont globaux, uniques et jamais réutilisés. Prochain id = max + 1 : `grep -o '^- \[.\] #[0-9]*' ~/todo/TODO.md | grep -o '[0-9]*$' | sort -n | tail -1`.
- Options en fin de ligne : `[réunion <slug>]` (voir plus bas), et seulement si le user les donne, `[prio]` et `[échéance AAAA-MM-JJ]`.

## Projet

- Le projet vient de la racine git du dossier courant (`basename "$(git rev-parse --show-toplevel)"`). Hors dépôt git, c'est le nom du dossier courant.
- Si le user nomme un projet (« sur qspresse… », « pour geoSoulte »), c'est celui-là qui compte. Pour une liste, accepte un nom approchant (casse, tirets) et prends la section existante qui correspond.

## Réunions récurrentes : reunions.md

```markdown
# Réunions

## ahmed
- nom : Point qspresse avec Ahmed
- quand : hebdo jeudi 14h
- durée : 1h
- projets : qspresse
- participants : Ahmed
- exceptions :
  - 2026-12-24 annulée
  - 2026-12-31 → 2027-01-02 10h

## weekly
- nom : Weekly équipe
- quand : hebdo mardi 12h
- projets : tous
- préparation : synthèse en quelques phrases de mon avancement sur tous les projets depuis le weekly précédent
```

- Le titre `## <slug>` est l'identifiant : court, en minuscules, sans espace ni accent (`ahmed`, `daily`, `copil-e3n`). C'est lui qu'on met dans `[réunion <slug>]` et dans `reunions/<slug>/`.
- `quand` accepte exactement : `quotidien` (lundi à vendredi), `hebdo <jour>[,<jour>…]` (ex. `hebdo mardi,mercredi,jeudi,vendredi`), `2-semaines <jour> depuis <AAAA-MM-JJ>` (date d'une séance réelle), `mensuel <1er|2e|3e|4e|dernier> <jour>`, suivi d'une heure facultative (`14h`, `9h30`).
- `projets` : un ou plusieurs projets séparés par des virgules, ou `tous`. Un daily peut couvrir plusieurs projets.
- `préparation` (facultatif) : consigne libre du user sur ce qu'il faut préparer pour chaque séance. Suis-la à la lettre quand il prépare la réunion (voir « Préparation de réunion »).
- `durée`, `participants` et tout autre champ : informatifs, garde-les tels quels.
- `exceptions` : une sous-puce par séance modifiée, désignée par sa date prévue : `annulée`, ou `→ <nouvelle date> [heure]` pour un déplacement.
- La prochaine séance de chaque réunion se calcule avec `~/.claude/skills/todo/reunions.sh [AAAA-MM-JJ]`. Il affiche `slug  date  heure  nom` (tabulations), à partir d'aujourd'hui ou de la date donnée. Ne calcule jamais une date de tête : utilise toujours ce script.

**Créer une réunion** (« crée une réunion tous les mardis avec X ») : il faut la récurrence et le ou les projets. Demande ce qui manque en une question. Ajoute la section à `reunions.md` (crée le fichier avec `# Réunions` s'il n'existe pas), lance `reunions.sh` pour vérifier que la prochaine date sort, puis confirme : `Réunion « ahmed » créée : prochaine séance jeudi 2026-11-26 14h`.

**Annuler, déplacer** (« la réunion de jeudi est annulée », « on décale la réunion Ahmed à vendredi ») : retrouve la date prévue de la séance concernée avec `reunions.sh`, ajoute la sous-puce sous `exceptions :`, puis donne la nouvelle prochaine séance. Les points de réunion ne bougent pas : ils suivent la réunion, pas la date.

**Modifier ou supprimer** une réunion : modifie sa section. Ne supprime une réunion que sur demande explicite. Dans ce cas, garde `reunions/<slug>/` (historique) et demande ce que deviennent ses points ouverts.

## Rattacher un point à une réunion

Tout point de `### Réunion` porte `[réunion <slug>]` dès qu'une réunion existe pour son projet :
- Si le user nomme la réunion, ou une personne ou un jour qui la désigne sans ambiguïté (« pour Ahmed », « pour jeudi », « au daily »), prends-la.
- Sinon, si une seule réunion couvre le projet, prends-la sans demander. Les réunions `projets : tous` ne comptent pas ici : elles ne reçoivent un point que si le user les nomme.
- S'il y en a plusieurs, demande laquelle en une question, en proposant d'abord celle dont la prochaine séance arrive le plus tôt.
- Sans aucune réunion pour le projet, n'ajoute pas de tag : le point reste « à la prochaine occasion ».

Un point reste attaché à sa réunion tant qu'il n'est pas coché. S'il n'a pas été traité, il revient donc tout seul à la séance suivante. N'écris jamais la date d'une séance dans le résumé d'un point (« Réunion de jeudi : … ») : c'est le tag qui la porte.

## Documents détaillés

Un point (ou une tâche) peut avoir un document complet `~/todo/docs/<id>.md`, référencé par une sous-puce `  - doc : docs/<id>.md`.
- Crée-le quand le user fournit un fichier .md, colle un long texte, ou développe un point au-delà de quelques lignes (argumentaire, chiffres, tableau, historique). Dans `TODO.md`, la ligne reste un résumé d'une ligne. Ne recopie pas le document dans `ctx :`.
- Le document commence par `# #<id> <résumé>`, puis le contenu, mis en forme proprement sans rien perdre.
- N'affiche jamais un document dans une liste ordinaire. Il ressort seulement à la préparation de la réunion ou quand le user le demande.
- Pour préparer **toute une séance** (plutôt qu'un point), écris dans la section `## Préparation` du fichier de séance (voir plus bas).

## Séances : reunions/<slug>/AAAA-MM-JJ.md

```markdown
# Point qspresse avec Ahmed — 2026-11-26

## Préparation
(document de préparation de la séance, s'il y en a un)

## Ordre du jour
- #13 Neutralisation : plafonner le délai PHR à -1 ? → traité
- #14 Validation des mensuels d'octobre → reporté

## Notes
(notes réécrites, regroupées par sujet)

## Décisions
- Le délai PHR est plafonné à -1 jour.

## Actions
- Brieuc : relancer le calcul M2026-07 → #15
- Ahmed : envoyer le fichier de routage

<details><summary>Notes brutes</summary>

(le bloc du user, tel quel)

</details>
```

La date est celle de la séance réelle (après déplacement éventuel). Crée le fichier et le dossier à la première écriture, en n'y mettant que les sections qui ont du contenu.

**Ranger des notes** (« voici mes notes de la réunion avec Ahmed », suivi d'un gros bloc) :
1. Identifie la réunion et la séance : par défaut, la séance d'aujourd'hui. Si la réunion n'avait pas lieu aujourd'hui, prends la dernière séance passée (lance `reunions.sh` avec la date d'hier, puis avant si besoin). Dans le doute, demande.
2. Écris le fichier de séance. L'ordre du jour reprend les points ouverts `[réunion <slug>]` de tous les projets, chacun marqué `traité` ou `reporté` selon les notes. Les notes sont réécrites en français correct, regroupées par sujet, sans rien inventer ni perdre. Les décisions et les actions sont extraites à part. Le bloc brut est gardé tel quel dans le `<details>` final.
3. Dans `TODO.md` : coche les points traités (`✅ <date de séance>`). Si les notes contiennent la réponse à un point, ajoute la sous-puce `réponse (date) :`.
4. Pour chaque action qui revient au user, propose de créer la tâche (ou le point de réunion, si c'est à redire à quelqu'un). Après son accord, crée-les et ajoute `→ #<id>` à l'action dans le fichier de séance.
5. Réponds en quelques lignes : fichier écrit, points cochés, points reportés, tâches proposées.

**Compte rendu** (seulement sur demande, « fais-moi le CR ») : rédige un mail court à partir du fichier de séance (décisions, actions avec responsables, points reportés), sans jargon de code ni chemins de fichiers.

**Retrouver des notes** (« mes notes de la réunion du 25 novembre », « qu'avait-on décidé sur SC2 ? ») :
- Par date : `ls ~/todo/reunions/*/` puis lis le fichier de la date demandée. Si la date est ambiguë (plusieurs réunions ce jour-là, année non précisée), prends la plus récente et dis-le.
- Par sujet : `grep -ril '<mot>' ~/todo/reunions ~/todo/docs`, puis lis les fichiers trouvés. Réponds avec la date de séance et le passage pertinent, puis le chemin du fichier.

## Actions sur les entrées

**Ajouter** (« ajoute ça à ma todo », « note ça pour la réunion », « ajoute ce point dans mes demandes client ») :
1. Tâche ou point de réunion ? Déduis-le de la formulation : « réunion », « demande client », « question », « à demander », « à dire à », « rappeler à », « à valider avec » → Réunion. Sinon → Tâches.
2. Écris un résumé d'une ligne, compréhensible hors de la conversation. Pour un point de réunion, formule-le comme on le dirait à la personne.
3. Ajoute un `ctx :` avec ce qui permettra de reprendre sans la conversation : fichiers et lignes, branche, période ou jeu de données, cas particulier, chiffres clés. Reste concis : 1 à 3 sous-puces. Si le développement est long, crée un document (voir plus haut).
4. Pour un point de réunion, ajoute `[réunion <slug>]` (voir « Rattacher »).
5. Insère l'entrée à la fin de la bonne sous-section, puis confirme en une ligne : `#14 ajouté à qspresse › Réunion (ahmed, jeudi 2026-11-26)`.

**Lister** : si l'outil `mcp__todo-affichage__afficher` est disponible (mod `todo-affichage`), utilise-le. Il affiche une carte stylisée au user, alors ne répète pas la liste dans ta réponse : une ligne suffit. Sinon, liste en Markdown.
- « ma todo » / « ma todo list » → `vue: "todo"` sans projet : toutes les entrées ouvertes, tous projets.
- « à faire sur X » → `vue: "todo"`, `projet: X`.
- « de quoi parler à la réunion / au client », « qu'est-ce que je dois préparer pour jeudi / pour Ahmed » → **préparation de réunion** :
  1. Identifie la réunion (nommée, ou la seule du projet courant, ou demande) et sa prochaine séance avec `reunions.sh`.
  2. Prends les points ouverts `[réunion <slug>]` de tous les projets. Sans réunion définie, prends les points ouverts de `### Réunion` du projet.
  3. Appelle l'outil avec `vue: "reunion"`, `reunion: <slug>` (s'il existe), `nom`, `date` (`AAAA-MM-JJ` et heure éventuelle) et `themes` : les points regroupés par thème, reformulés pour la personne en face (sans jargon de code ni chemins), les `[prio]` en premier, chacun avec l'id de son entrée.
  4. Puis, dans ta réponse : s'il existe une section `## Préparation` dans le fichier de la séance, ou des documents `doc :` sur ces points, résume chacun en quelques puces (l'essentiel à dire ou à demander) avec son chemin. Le user ouvrira le document s'il veut tout.
  5. Si la réunion a un champ `préparation`, fais ce qu'il demande (voir ci-dessous) et écris le résultat dans `## Préparation` du fichier de la séance à venir.
  6. Si une tâche ouverte porte une échéance antérieure ou égale à la séance, signale-la en une ligne.

**Synthèse d'avancement** (quand le champ `préparation` demande un bilan depuis la séance précédente) :
1. La séance précédente est le fichier le plus récent de `~/todo/reunions/<slug>/` antérieur à la séance à venir. S'il n'y en a pas, demande au user depuis quand.
2. Rassemble ce qui s'est passé depuis cette date, sur les projets couverts : entrées cochées (`✅ <date>`), réponses reçues (`réponse (date)`), sous-puces `avancement (date)`, entrées ajoutées (nouveaux sujets), décisions des fichiers de séance des autres réunions. Ajoute ce que tu sais d'autre du travail du user sur la période, si tu as une source fiable (mémoire, historique git des projets).
3. Rédige quelques phrases par projet, orientées résultat (ce qui est livré, décidé, bloqué, la suite), sans jargon de code ni ids. Ignore les projets sans avancement.
4. Écris-la dans `## Préparation` du fichier de séance, puis affiche-la au user pour qu'il la relise avant la réunion.
- N'affiche jamais les entrées `- [x]`, sauf si le user demande les entrées faites ou l'historique.
- Mets toujours l'id `#n` dans les listes pour qu'il puisse s'y référer.

**Marquer fait** (« la 12 est faite ») : remplace `- [ ]` par `- [x]` et ajoute ` ✅ AAAA-MM-JJ` en fin de ligne. Ne supprime jamais une entrée, même faite, sauf demande explicite.

**Réponse du client** (« il a répondu X à la 13 ») : ajoute la sous-puce `  - réponse (AAAA-MM-JJ) : X` et coche le point. Si la réponse entraîne du travail, propose de créer la tâche correspondante.

**Modifier** : modifie la ligne en place, sans changer l'id.

## Après chaque écriture

Lance `~/.claude/skills/todo/sauvegarde.sh`. Il envoie sur le Nextcloud du user les fichiers de `~/todo/` modifiés depuis le dernier envoi, et ne fait rien si la sauvegarde n'est pas configurée. S'il échoue, signale-le en une ligne, sans bloquer.
