# claude-todo

TODO, points de réunion et réunions récurrentes par projet, gérés par Claude Code dans tous les projets.

- **Skill `todo`** : ajouter, lister, cocher, noter la réponse du client ; créer, annuler, déplacer des réunions ; préparer une réunion ; ranger ses notes de réunion et les retrouver plus tard. Il se déclenche avec des phrases comme « ajoute ça à ma todo », « note ça pour la réunion avec Ahmed », « crée une réunion tous les mardis avec X », « qu'est-ce que je dois préparer pour jeudi ? », « voici mes notes de la réunion », « qu'avait-on dit le 25 novembre ? », « la 12 est faite ».
- **Hook `SessionStart`**, une seule fois par jour :
  - « 📋 projet : N tâches et M points de réunion ouverts » (une fois par projet) ;
  - « 📅 Aujourd'hui : Point avec Ahmed 14h · 3 points · 1 📎 » les jours de réunion.
- **Mod `todo-affichage`** ([mod/](mod/)) :
  - une carte stylisée sous l'appel du skill (ou sous le dernier outil qui a touché `TODO.md` pendant le tour), avec les entrées ouvertes du projet, celles ajoutées, cochées ou modifiées mises en évidence, les `PRIO` et les échéances ;
  - un bandeau permanent au-dessus du prompt : « 📋 projet · N tâches · M points de réunion ».
  - Tests : `claude plugin test mod`.
- **Données** : dans `~/todo/`, hors de ce dépôt car elles contiennent des informations client. Les fichiers modifiés partent sur Nextcloud à chaque écriture.

## Données

Tout est en Markdown, modifiable à la main. Rien n'est prédéfini : chacun crée ses réunions en le demandant à Claude.

```
~/todo/
  TODO.md                         par projet : ### Tâches (pour soi) et ### Réunion (à dire ou demander)
  reunions.md                     réunions récurrentes
  docs/<id>.md                    document détaillé d'une entrée (📎), affiché seulement à la demande
  reunions/<slug>/AAAA-MM-JJ.md   une séance : préparation, ordre du jour, notes, décisions, actions
```

Exemple de `reunions.md` :

```markdown
# Réunions

## ahmed
- nom : Point qspresse avec Ahmed
- quand : hebdo jeudi 14h
- projets : qspresse
- participants : Ahmed
- exceptions :
  - 2026-12-24 annulée
  - 2026-12-31 → 2027-01-02 10h
```

Récurrences : `quotidien` (lundi à vendredi), `hebdo <jour>[,<jour>…]`, `2-semaines <jour> depuis <AAAA-MM-JJ>`, `mensuel <1er|2e|3e|4e|dernier> <jour>`, heure facultative. `projets : tous` couvre tous les projets. Le champ libre `préparation :` dit au skill quoi préparer pour chaque séance (ex. « synthèse de mon avancement depuis le weekly précédent »). Un point de réunion porte le tag `[réunion <slug>]` et revient à chaque séance tant qu'il n'est pas coché. `skill/reunions.sh [date]` donne la prochaine séance de chaque réunion.

Le calcul des dates utilise GNU `date`. Sur macOS : `brew install coreutils` (le script prend alors `gdate`).

## Installer (nouveau PC)

```bash
git clone <ce dépôt> ~/Projets/perso/claude-todo
# Facultatif mais conseillé, avant install.sh, pour récupérer la TODO existante :
cp ~/Projets/perso/claude-todo/skill/todo-nextcloud.env.exemple ~/.config/todo-nextcloud.env
chmod 600 ~/.config/todo-nextcloud.env   # puis le remplir
~/Projets/perso/claude-todo/install.sh
```

Le script peut être relancé sans risque. Il crée des liens symboliques vers ce dépôt (un `git pull` suffit ensuite pour mettre à jour) et ajoute le hook dans `~/.claude/settings.json` après en avoir fait une copie `.bak`.

## Sauvegarde Nextcloud

Elle passe par WebDAV avec `curl`, sans client Nextcloud. Il faut un mot de passe d'application : Nextcloud › Paramètres personnels › Sécurité. Nextcloud garde l'historique des versions du fichier.

Tout le dossier `~/todo/` est synchronisé, sous-dossiers compris. Les suppressions locales ne sont pas propagées.

- Envoi manuel : `skill/sauvegarde.sh` (fichiers modifiés depuis le dernier envoi), `skill/sauvegarde.sh --tout` (tout)
- Restauration : `skill/sauvegarde.sh --restaurer` (écrase les fichiers locaux), ou automatiquement par `install.sh` si `~/todo/TODO.md` n'existe pas
