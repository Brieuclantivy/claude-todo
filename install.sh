#!/usr/bin/env bash
# Installe le skill « todo » et le hook de rappel dans ~/.claude. Peut être relancé sans risque.
# Prérequis : jq, curl, git.
set -euo pipefail

REPO=$(cd "$(dirname "$0")" && pwd)
CLAUDE="$HOME/.claude"
SETTINGS="$CLAUDE/settings.json"
HOOK_CMD='$HOME/.claude/hooks/todo-rappel.sh'

for c in jq curl git; do
  command -v "$c" >/dev/null || { echo "Manquant : $c" >&2; exit 1; }
done

# 1. Liens symboliques : un « git pull » dans le dépôt suffit ensuite pour mettre à jour
mkdir -p "$CLAUDE/skills" "$CLAUDE/hooks"
ln -sfn "$REPO/skill" "$CLAUDE/skills/todo"
ln -sf "$REPO/hooks/todo-rappel.sh" "$CLAUDE/hooks/todo-rappel.sh"

# 2. Hook SessionStart dans settings.json (fusion, sans doublon)
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
if jq -e --arg c "$HOOK_CMD" '[.hooks.SessionStart[]?.hooks[]?.command] | index($c)' "$SETTINGS" >/dev/null; then
  echo "Hook déjà présent dans $SETTINGS"
else
  cp "$SETTINGS" "$SETTINGS.bak"
  jq --arg c "$HOOK_CMD" '.hooks.SessionStart += [{hooks: [{type: "command", command: $c}]}]' "$SETTINGS.bak" > "$SETTINGS"
  echo "Hook ajouté dans $SETTINGS (ancienne version : $SETTINGS.bak)"
fi

# 3. Dossier ~/todo : récupéré en entier depuis Nextcloud si configuré, sinon TODO.md créé vide
mkdir -p "$HOME/todo"
if [ -f "$HOME/todo/TODO.md" ]; then
  echo "~/todo/TODO.md existe déjà : conservé"
elif [ -f "$HOME/.config/todo-nextcloud.env" ]; then
  "$REPO/skill/sauvegarde.sh" --restaurer
  echo "~/todo/ récupéré depuis Nextcloud"
else
  printf '# TODO\n' > "$HOME/todo/TODO.md"
  echo "~/todo/TODO.md créé (vide). Sauvegarde Nextcloud non configurée : voir README.md"
fi

# 4. Mod d'affichage (carte sous Skill(todo) + bandeau) : ce dépôt est son marketplace
if command -v claude >/dev/null; then
  if ! claude plugin marketplace list 2>/dev/null | grep -q 'claude-todo'; then
    claude plugin marketplace add "$REPO"
  else
    claude plugin marketplace update claude-todo
  fi

  if claude plugin list 2>/dev/null | grep -q 'todo-affichage@claude-todo'; then
    claude plugin update todo-affichage@claude-todo
  else
    claude plugin install todo-affichage@claude-todo
  fi
else
  echo "claude introuvable : mod d'affichage non installé (relancer install.sh plus tard)"
fi

echo "Installation terminée. Relance Claude Code pour charger le hook et le mod."
