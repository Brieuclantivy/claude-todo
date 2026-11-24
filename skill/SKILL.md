---
name: todo
description: TODO et questions client du user, par projet, dans ~/todo/TODO.md. À utiliser dès que le user veut ajouter, lister, cocher ou répondre à une tâche ou une question client — ex. "ajoute ça à ma todo", "ajoute ce point dans mes demandes client", "note cette question pour le client", "donne-moi ma todo list", "qu'est-ce que j'ai à faire sur qspresse ?", "de quoi je dois parler au client à la réunion ?", "marque la 12 comme faite", "le client a répondu X à la 13".
---

# TODO et questions client

Un seul fichier : `~/todo/TODO.md`. Il est en Markdown et le user peut le modifier à la main. Relis-le donc avant chaque écriture.

## Format

```markdown
# TODO

## qspresse

### Tâches
- [ ] #12 Porter envoiPenalite en TS (ajouté 2026-11-23)
  - ctx : `src/resultats/Resultats.ts:1199`, legacy `Resultats.php` non porté
- [x] #9 Corriger le suffixe du bucket hebdo (ajouté 2026-11-17) ✅ 2026-11-20

### Questions client
- [ ] #13 Neutralisation : le délai PHR doit-il être plafonné à -1 ? (ajouté 2026-11-23) [prio] [échéance 2026-12-01]
  - ctx : M2026-07, `calcDelai`, 3 plis concernés
- [x] #10 Samedi = jour limite de distribution ? (ajouté 2026-11-12) ✅ 2026-11-25
  - réponse (2026-11-25) : oui, pour tous les titres
```

Règles :
- Une section `## <projet>` par projet, avec deux sous-sections fixes : `### Tâches` et `### Questions client`. Crée-les à la première entrée du projet.
- Chaque entrée est une ligne `- [ ] #<id> <résumé> (ajouté AAAA-MM-JJ)`, en colonne 0. Le hook de rappel ne compte que ces lignes.
- Les détails vont en sous-puces indentées de 2 espaces : `ctx :` (fichier:ligne, branche, période, cas particulier, ce qui a été essayé) et `réponse (date) :`.
- Les ids sont globaux, uniques et jamais réutilisés. Prochain id = max + 1 : `grep -o '^- \[.\] #[0-9]*' ~/todo/TODO.md | grep -o '[0-9]*$' | sort -n | tail -1`.
- Options, seulement si le user les donne : `[prio]` et `[échéance AAAA-MM-JJ]` en fin de ligne.

## Projet

- Le projet vient de la racine git du dossier courant (`basename "$(git rev-parse --show-toplevel)"`). Hors dépôt git, c'est le nom du dossier courant.
- Si le user nomme un projet (« sur qspresse… », « pour geoSoulte »), c'est celui-là qui compte. Pour une liste, accepte un nom approchant (casse, tirets) et prends la section existante qui correspond.

## Actions

**Ajouter** (« ajoute ça à ma todo / à mes demandes client ») :
1. Tâche ou question client ? Déduis-le de la formulation : « demande client », « question », « à demander », « à valider avec le client » → Questions client. Sinon → Tâches.
2. Écris un résumé d'une ligne, compréhensible hors de la conversation. Pour une question client, formule-la comme on la poserait au client.
3. Ajoute un `ctx :` avec ce qui permettra de reprendre sans la conversation : fichiers et lignes, branche, période ou jeu de données, cas particulier, chiffres clés. Reste concis : 1 à 3 sous-puces.
4. Insère l'entrée à la fin de la bonne sous-section, puis confirme en une ligne : `#14 ajoutée à qspresse › Questions client`.

**Lister** : si l'outil `mcp__todo-affichage__afficher` est disponible (mod `todo-affichage`), utilise-le. Il affiche une carte stylisée au user, alors ne répète pas la liste dans ta réponse : une ligne suffit (et, pour une réunion, l'offre d'un mail). Sinon, liste en Markdown comme ci-dessous.
- Avec l'outil : `vue: "todo"` (avec `projet` pour un seul projet), ou `vue: "reunion"` avec `projet` et `themes` (questions reformulées et regroupées comme décrit plus bas, chaque point avec l'id de son entrée).
- « ma todo » / « ma todo list » → toutes les entrées ouvertes `- [ ]`, tous projets, groupées par projet puis tâches et questions.
- « à faire sur X » → les entrées ouvertes du projet X (tâches, puis questions client).
- « de quoi parler au client / en réunion » → les questions client ouvertes du projet courant (ou du projet nommé). Regroupe-les par thème et reformule-les pour le client, sans jargon de code ni chemins de fichiers. Mets les `[prio]` en premier. Propose d'en faire un mail si c'est utile.
- N'affiche jamais les entrées `- [x]`, sauf si le user demande explicitement les entrées faites ou l'historique.
- Mets toujours l'id `#n` dans les listes pour qu'il puisse s'y référer.

**Marquer fait** (« la 12 est faite », « marque #12 comme fait ») : remplace `- [ ]` par `- [x]` et ajoute ` ✅ AAAA-MM-JJ` en fin de ligne. Ne supprime jamais une entrée, même faite, sauf demande explicite.

**Réponse du client** (« il a répondu X à la 13 ») : ajoute la sous-puce `  - réponse (AAAA-MM-JJ) : X` et coche la question. Si la réponse entraîne du travail, propose de créer la tâche correspondante.

**Modifier** : modifie la ligne en place, sans changer l'id.

## Après chaque écriture

Lance `~/.claude/skills/todo/sauvegarde.sh`. Il envoie le fichier sur le Nextcloud du user et ne fait rien si la sauvegarde n'est pas configurée. S'il échoue, signale-le en une ligne, sans bloquer.
