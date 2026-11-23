#!/usr/bin/env bash
# Hook SessionStart : rappel des tâches / questions client ouvertes du projet courant,
# une seule fois par jour et par projet (état dans ~/.cache/todo-rappel/<projet>).
set -u

FICHIER="$HOME/todo/TODO.md"
ETAT="$HOME/.cache/todo-rappel"
[ -f "$FICHIER" ] || exit 0

cwd=$(jq -r '.cwd // empty')
[ -n "$cwd" ] || cwd=$PWD
racine=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || racine=$cwd
projet=$(basename "$racine")
aujourdhui=$(date +%F)

mkdir -p "$ETAT"
[ "$(cat "$ETAT/$projet" 2>/dev/null)" = "$aujourdhui" ] && exit 0

read -r taches questions < <(awk -v p="## $projet" '
  /^## / { dans = ($0 == p); sec = ""; next }
  dans && /^### / { sec = $0; next }
  dans && /^- \[ \]/ { if (sec ~ /Questions/) q++; else t++ }
  END { print t+0, q+0 }' "$FICHIER")

echo "$aujourdhui" > "$ETAT/$projet"
[ "$taches" -eq 0 ] && [ "$questions" -eq 0 ] && exit 0

msg="📋 $projet : $taches tâche(s) et $questions question(s) client ouvertes"
jq -n --arg m "$msg" '{
  systemMessage: $m,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: ("Rappel TODO du jour (skill todo) : " + $m + ". Mentionne-le en une ligne au début de ta première réponse.")
  }
}'
