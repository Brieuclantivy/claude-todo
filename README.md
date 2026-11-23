# claude-todo

TODO et questions client par projet, gérées par Claude Code dans tous les projets.

- **Skill `todo`** : ajouter, lister, cocher, noter la réponse du client. Il se déclenche avec des phrases comme « ajoute ça à mes demandes client », « donne-moi ma todo », « de quoi je dois parler au client ? », « la 12 est faite ».
- **Hook `SessionStart`** : affiche « 📋 projet : N tâches, M questions client ouvertes », une seule fois par jour et par projet.
- **Données** : `~/todo/TODO.md`, hors de ce dépôt car elles contiennent des informations client. Une copie part sur Nextcloud à chaque modification.

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

- Envoi manuel : `skill/sauvegarde.sh`
- Restauration : supprimer `~/todo/TODO.md`, puis relancer `install.sh`
