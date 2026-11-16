#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?Set DATABASE_URL to the source DB}"
: "${BACKUP_PASSPHRASE:?Set a strong backup encryption passphrase}"
: "${DRIVE_REMOTE:?Set the private rclone Google Drive remote, e.g. gosy-drive:GoSyBackups}"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
name="gosy-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
pg_dump --format=custom --no-owner --no-privileges --file="$work/database.dump" "$DATABASE_URL"
pg_restore --list "$work/database.dump" > /dev/null
printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 --symmetric --cipher-algo AES256 --output "$work/$name" "$work/database.dump"
rclone copyto --immutable "$work/$name" "${DRIVE_REMOTE%/}/$name"
printf 'Encrypted backup uploaded: %s\n' "$name"
