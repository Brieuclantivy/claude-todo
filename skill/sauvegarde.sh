#!/usr/bin/env bash
# Envoie ~/todo/TODO.md sur Nextcloud (WebDAV). Ne fait rien si non configuré.
# Config : ~/.config/todo-nextcloud.env (voir todo-nextcloud.env.exemple à côté de ce script)
set -eu

CONF="$HOME/.config/todo-nextcloud.env"
[ -f "$CONF" ] || exit 0
. "$CONF"

base="$NC_URL/remote.php/dav/files/$NC_USER/$NC_DOSSIER"
# Crée le dossier distant s'il n'existe pas (erreur 405 si déjà présent : ignorée)
curl -sS -o /dev/null -u "$NC_USER:$NC_APP_PASSWORD" -X MKCOL "$base" || true
curl -fsS -o /dev/null -u "$NC_USER:$NC_APP_PASSWORD" -T "$HOME/todo/TODO.md" "$base/TODO.md"
