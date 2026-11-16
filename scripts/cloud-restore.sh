#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${RESTORE_DATABASE_URL:?Set a NEW empty PostgreSQL/PostGIS database URL}"
: "${BACKUP_PASSPHRASE:?Set the original encryption passphrase}"
: "${DRIVE_REMOTE:?Set your private rclone remote}"
: "${BACKUP_NAME:?Specify the exact backup filename}"
[[ "$BACKUP_NAME" =~ ^gosy-[0-9]{8}T[0-9]{6}Z\.dump\.gpg$ ]] || { echo 'Invalid backup filename' >&2; exit 1; }
count=$(psql "$RESTORE_DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('spatial_ref_sys')")
[[ "$count" == 0 ]] || { echo 'Refusing to restore over existing tables' >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
rclone copyto "${DRIVE_REMOTE%/}/$BACKUP_NAME" "$work/$BACKUP_NAME"
printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 --decrypt --output "$work/database.dump" "$work/$BACKUP_NAME"
pg_restore --list "$work/database.dump" > /dev/null
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname "$RESTORE_DATABASE_URL" "$work/database.dump"
echo 'Restored into the new database. Verify before switching production.'
