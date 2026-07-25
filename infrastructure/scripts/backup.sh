#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

# Backups are produced inside the container (via the server's SQLite Online Backup API
# script, see apps/server/src/scripts/backup.ts) then copied onto the host, so they survive
# even if the `planner_data` volume is ever destroyed (spec 18.4).
HOST_BACKUP_DIR="${HOST_BACKUP_DIR:-./backups}"
mkdir -p "$HOST_BACKUP_DIR"

STAMP="$(date -u +%Y-%m-%d)"

echo "Running in-container backup..."
docker compose exec -T app node dist/scripts/backup.js

docker compose cp "app:/data/backups/planner-${STAMP}.db" "$HOST_BACKUP_DIR/planner-${STAMP}.db"

if docker compose exec -T app test -f "/data/backups/attachments-${STAMP}.tar.gz"; then
  docker compose cp "app:/data/backups/attachments-${STAMP}.tar.gz" "$HOST_BACKUP_DIR/attachments-${STAMP}.tar.gz"
fi

# Config lives on the host, not in the container, so it's copied directly.
for f in .env compose.yaml infrastructure/Caddyfile; do
  [ -f "$f" ] && cp "$f" "$HOST_BACKUP_DIR/$(basename "$f").${STAMP}.bak"
done

echo "Backup complete: $HOST_BACKUP_DIR (stamp ${STAMP})"

# Retention: keep the 7 most recent daily backups, plus up to 4 older Sunday
# ("weekly") snapshots and up to 3 older first-of-month ("monthly") snapshots (spec 18.4).
mapfile -t stamps < <(ls "$HOST_BACKUP_DIR" 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | sort -ru)

keep=()
daily=0 weekly=0 monthly=0
for s in "${stamps[@]}"; do
  if [ "$daily" -lt 7 ]; then
    keep+=("$s"); daily=$((daily + 1)); continue
  fi
  dow="$(date -u -d "$s" +%u)"   # 1=Mon .. 7=Sun
  dom="$(date -u -d "$s" +%d)"
  if [ "$dow" = "7" ] && [ "$weekly" -lt 4 ]; then
    keep+=("$s"); weekly=$((weekly + 1)); continue
  fi
  if [ "$dom" = "01" ] && [ "$monthly" -lt 3 ]; then
    keep+=("$s"); monthly=$((monthly + 1)); continue
  fi
done

for f in "$HOST_BACKUP_DIR"/*; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"
  stamp="$(echo "$base" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)"
  [ -z "$stamp" ] && continue
  found=false
  for k in "${keep[@]}"; do
    [ "$k" = "$stamp" ] && found=true && break
  done
  if [ "$found" = false ]; then
    echo "Pruning old backup: $base"
    rm -f "$f"
  fi
done
