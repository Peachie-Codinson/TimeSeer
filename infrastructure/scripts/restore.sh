#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

DB_BACKUP="${1:?Usage: infrastructure/scripts/restore.sh <backup.db> [attachments.tar.gz]}"
ATTACHMENTS_BACKUP="${2:-}"

[ -f "$DB_BACKUP" ] || { echo "Not found: $DB_BACKUP" >&2; exit 1; }
if [ -n "$ATTACHMENTS_BACKUP" ]; then
  [ -f "$ATTACHMENTS_BACKUP" ] || { echo "Not found: $ATTACHMENTS_BACKUP" >&2; exit 1; }
fi

echo "Stopping app so the live database isn't open during restore..."
docker compose stop app

# Copy the backup files onto the `planner_data` volume (not the container's writable
# layer) so they're visible to the one-off container the restore script runs in below.
docker compose cp "$DB_BACKUP" app:/data/restore-incoming.db
args="/data/restore-incoming.db"
if [ -n "$ATTACHMENTS_BACKUP" ]; then
  docker compose cp "$ATTACHMENTS_BACKUP" app:/data/restore-incoming-attachments.tar.gz
  args="$args /data/restore-incoming-attachments.tar.gz"
fi

echo "Restoring..."
# shellcheck disable=SC2086
docker compose run --rm --no-deps -T app node dist/scripts/restore.js $args

docker compose run --rm --no-deps -T app rm -f /data/restore-incoming.db /data/restore-incoming-attachments.tar.gz

echo "Starting app..."
docker compose up -d app

echo "Restore complete."
