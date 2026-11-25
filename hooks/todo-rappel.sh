#!/usr/bin/env bash
# Hook SessionStart, une seule fois par jour (état dans ~/.cache/todo-rappel/) :
# - tâches / points de réunion ouverts du projet courant (une fois par projet) ;
# - réunions du jour, avec leurs points ouverts et documents (une fois tous projets confondus).
set -u

FICHIER="$HOME/todo/TODO.md"
ETAT="$HOME/.cache/todo-rappel"
REUNIONS="$HOME/.claude/skills/todo/reunions.sh"
[ -f "$FICHIER" ] || exit 0

cwd=$(jq -r '.cwd // empty')
[ -n "$cwd" ] || cwd=$PWD
racine=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || racine=$cwd
projet=$(basename "$racine")
aujourdhui=$(date +%F)
lignes=()

mkdir -p "$ETAT"

if [ "$(cat "$ETAT/$projet" 2>/dev/null)" != "$aujourdhui" ]; then
  echo "$aujourdhui" > "$ETAT/$projet"
  read -r taches points < <(awk -v p="## $projet" '
    /^## / { dans = ($0 == p); sec = ""; next }
    dans && /^### / { sec = $0; next }
    dans && /^- \[ \]/ { if (sec ~ /Réunion|Questions/) q++; else t++ }
    END { print t+0, q+0 }' "$FICHIER")
  if [ "$taches" -gt 0 ] || [ "$points" -gt 0 ]; then
    lignes+=("📋 $projet : $taches tâche(s) et $points point(s) de réunion ouverts")
  fi
fi

# L'état n'est écrit qu'après une annonce : une réunion créée dans la journée sera encore annoncée
if [ -x "$REUNIONS" ] && [ "$(cat "$ETAT/_reunions" 2>/dev/null)" != "$aujourdhui" ]; then
  while IFS=$'\t' read -r slug date heure nom; do
    [ "$date" = "$aujourdhui" ] || continue
    read -r nb docs < <(awk -v tag="[réunion $slug]" '
      /^- \[ \]/ { dedans = index($0, tag) > 0; if (dedans) n++; next }
      /^- / { dedans = 0; next }
      dedans && /^  - doc *:/ { d++ }
      END { print n+0, d+0 }' "$FICHIER")
    l="📅 Aujourd'hui : $nom${heure:+ $heure} · $nb point(s)"
    [ "$docs" -gt 0 ] && l+=" · $docs 📎"
    lignes+=("$l")
    echo "$aujourdhui" > "$ETAT/_reunions"
  done < <("$REUNIONS" 2>/dev/null)
fi

[ ${#lignes[@]} -gt 0 ] || exit 0
msg=$(printf '%s\n' "${lignes[@]}")
jq -n --arg m "$msg" '{
  systemMessage: $m,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: ("Rappel TODO du jour (skill todo) :\n" + $m + "\nMentionne-le brièvement au début de ta première réponse.")
  }
}'
