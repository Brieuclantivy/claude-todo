#!/usr/bin/env bash
# Prochaine séance de chaque réunion définie dans ~/todo/reunions.md, à partir d'une date (défaut : aujourd'hui).
# Usage : reunions.sh [AAAA-MM-JJ]
# Sortie : une ligne par réunion, séparée par des tabulations : slug  date  heure  nom
#          (heure vide si non définie ; réunion absente si aucune séance dans les 62 jours)
# Nécessite GNU date (sur macOS : brew install coreutils, puis gdate).
set -euo pipefail

FICHIER="${TODO_REUNIONS:-$HOME/todo/reunions.md}"
DATE=date
command -v gdate >/dev/null && DATE=gdate
[ -f "$FICHIER" ] || exit 0

debut=${1:-$($DATE +%F)}
HORIZON=62

# Calendrier : HORIZON+7 jours à partir de debut (les 7 de plus servent au « dernier <jour> du mois »)
# Midi évite les décalages d'heure d'été.
t0=$($DATE -d "$debut 12:00" +%s)
mapfile -t CAL < <(for ((i = 0; i < HORIZON + 7; i++)); do echo "@$((t0 + i * 86400))"; done | $DATE -f - '+%F %u %-d %m')

jour_num() {
  case "$1" in
    lundi) echo 1 ;; mardi) echo 2 ;; mercredi) echo 3 ;; jeudi) echo 4 ;;
    vendredi) echo 5 ;; samedi) echo 6 ;; dimanche) echo 7 ;;
    *) echo "reunions.sh : jour inconnu « $1 »" >&2; return 1 ;;
  esac
}

# Vrai si la date d'indice $1 du calendrier correspond à la récurrence $2
tombe() {
  local i=$1 quand=$2 date jsem jmois mois
  read -r date jsem jmois mois <<<"${CAL[$i]}"
  local mots
  read -ra mots <<<"$quand"

  case "${mots[0]}" in
    quotidien)
      [ "$jsem" -le 5 ] ;;
    hebdo)
      # hebdo <jour>[,<jour>…]
      local j
      IFS=, read -ra jours <<<"${mots[1]}"
      for j in "${jours[@]}"; do
        [ "$jsem" -eq "$(jour_num "$j")" ] && return 0
      done
      return 1 ;;
    *-semaines)
      # <N>-semaines <jour> depuis <AAAA-MM-JJ>
      local n=${mots[0]%-semaines} ancre
      [ "$jsem" -eq "$(jour_num "${mots[1]}")" ] || return 1
      ancre=$($DATE -d "${mots[3]} 12:00" +%s)
      (( ((t0 + i * 86400 - ancre) / 86400) % (n * 7) == 0 )) ;;
    mensuel)
      # mensuel <1er|2e|3e|4e|dernier> <jour>
      [ "$jsem" -eq "$(jour_num "${mots[2]}")" ] || return 1
      if [ "${mots[1]}" = dernier ]; then
        local mois7
        read -r _ _ _ mois7 <<<"${CAL[$((i + 7))]}"
        [ "$mois7" != "$mois" ]
      else
        [ $(( (jmois - 1) / 7 + 1 )) -eq "${mots[1]//[!0-9]/}" ]
      fi ;;
    *)
      echo "reunions.sh : récurrence inconnue « $quand »" >&2; return 1 ;;
  esac
}

# Une ligne par réunion : slug \t nom \t quand \t exceptions (séparées par |)
awk '
  function sortir() { if (slug != "") print slug "\t" nom "\t" quand "\t" exc }
  /^## / { sortir(); slug = substr($0, 4); gsub(/^ +| +$/, "", slug); nom = slug; quand = ""; exc = ""; next }
  /^- nom *:/   { sub(/^- nom *: */, ""); nom = $0; next }
  /^- quand *:/ { sub(/^- quand *: */, ""); quand = $0; next }
  /^ +- [0-9]{4}-[0-9]{2}-[0-9]{2}/ { sub(/^ +- /, ""); exc = exc (exc == "" ? "" : "|") $0; next }
  END { sortir() }
' "$FICHIER" | while IFS=$'\t' read -r slug nom quand exc; do
  [ -n "$quand" ] || continue

  # Heure facultative en fin de récurrence : « hebdo jeudi 14h », « quotidien 9h30 »
  heure=""
  if [[ $quand =~ ^(.*[^ ])\ +([0-9]{1,2}h[0-9]{0,2})$ ]]; then
    quand=${BASH_REMATCH[1]}
    heure=${BASH_REMATCH[2]}
  fi

  # Exceptions : « 2026-12-24 annulée » ou « 2026-12-31 → 2027-01-02 [10h] »
  declare -A sautees=()
  declare -A ajoutees=()
  IFS='|' read -ra liste <<<"$exc"
  for e in "${liste[@]}"; do
    read -r origine reste <<<"$e"
    sautees[$origine]=1
    if [[ $reste =~ ^(→|->)\ *([0-9]{4}-[0-9]{2}-[0-9]{2})\ *([0-9]{1,2}h[0-9]{0,2})? ]]; then
      ajoutees[${BASH_REMATCH[2]}]=${BASH_REMATCH[3]:-$heure}
    fi
  done

  for ((i = 0; i < HORIZON; i++)); do
    read -r d _ <<<"${CAL[$i]}"
    if [ -n "${ajoutees[$d]+x}" ]; then
      printf '%s\t%s\t%s\t%s\n' "$slug" "$d" "${ajoutees[$d]}" "$nom"
      break
    fi
    if [ -z "${sautees[$d]+x}" ] && tombe "$i" "$quand"; then
      printf '%s\t%s\t%s\t%s\n' "$slug" "$d" "$heure" "$nom"
      break
    fi
  done
  unset sautees ajoutees
done
