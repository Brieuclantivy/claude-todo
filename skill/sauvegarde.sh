#!/usr/bin/env bash
# Synchronise ~/todo/ avec Nextcloud (WebDAV). Ne fait rien si non configuré.
# Config : ~/.config/todo-nextcloud.env (voir todo-nextcloud.env.exemple à côté de ce script)
#   sauvegarde.sh               envoie les fichiers modifiés depuis le dernier envoi réussi
#   sauvegarde.sh --tout        envoie tous les fichiers
#   sauvegarde.sh --restaurer   télécharge tout le dossier distant dans ~/todo/ (écrase les fichiers locaux)
# Les suppressions locales ne sont pas propagées : Nextcloud garde tout, avec l'historique des versions.
set -euo pipefail

CONF="$HOME/.config/todo-nextcloud.env"
LOCAL="$HOME/todo"
REPERE="$HOME/.cache/todo-sauvegarde.repere"
[ -f "$CONF" ] || exit 0
. "$CONF"

dav="$NC_URL/remote.php/dav/files/$NC_USER"
racine="$dav/$NC_DOSSIER"
auth=(-u "$NC_USER:$NC_APP_PASSWORD")

# Encode un chemin relatif pour une URL (les « / » sont conservés)
encoder() { jq -rn --arg s "$1" '$s | split("/") | map(@uri) | join("/")'; }

# Liste récursive (fichiers) du dossier distant, chemins relatifs à $racine, décodés
lister() {
  local rel=$1 reponse href
  reponse=$(curl -fsS "${auth[@]}" -X PROPFIND -H 'Depth: 1' "$racine/$(encoder "$rel")")
  # Préfixe XML variable selon le serveur (d:, D:, ns0:…) ; la 1re réponse est le dossier lui-même
  grep -oE '<([A-Za-z0-9]+:)?href>[^<]*</' <<<"$reponse" | sed -E 's#^<[^>]*>##; s#</$##' | tail -n +2 |
    while read -r href; do
      href=$(printf '%b' "${href//%/\\x}")
      href=${href#*/remote.php/dav/files/$NC_USER/$NC_DOSSIER/}
      case "$href" in
        */) lister "$href" ;;
        *) echo "$href" ;;
      esac
    done
}

if [ "${1:-}" = --restaurer ]; then
  lister "" | while read -r f; do
    mkdir -p "$LOCAL/$(dirname "$f")"
    curl -fsS "${auth[@]}" -o "$LOCAL/$f" "$racine/$(encoder "$f")"
  done
  mkdir -p "$(dirname "$REPERE")" && touch "$REPERE"
  exit 0
fi

nouveau=$(mktemp)
trap 'rm -f "$nouveau"' EXIT

filtre=()
[ "${1:-}" != --tout ] && [ -f "$REPERE" ] && filtre=(-newer "$REPERE")

(cd "$LOCAL" && find . -type f "${filtre[@]}" | sed 's#^\./##' | sort) | while read -r f; do
  # Crée les dossiers distants manquants (erreur 405 si déjà présent : ignorée)
  chemin=""
  for d in $(tr '/' ' ' <<<"$NC_DOSSIER") $(dirname "$f" | tr '/' ' ' | sed 's/^\.$//'); do
    chemin="$chemin/$d"
    curl -sS -o /dev/null "${auth[@]}" -X MKCOL "$dav$(encoder "$chemin")" || true
  done
  curl -fsS -o /dev/null "${auth[@]}" -T "$LOCAL/$f" "$racine/$(encoder "$f")"
done

mkdir -p "$(dirname "$REPERE")" && mv "$nouveau" "$REPERE"
trap - EXIT
