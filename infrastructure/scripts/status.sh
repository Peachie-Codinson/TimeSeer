#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "== Containers =="
docker compose ps

echo
echo "== App health =="
if docker compose exec -T app node -e "fetch('http://localhost:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  echo "app: healthy"
else
  echo "app: NOT healthy"
fi

echo
echo "== Data volume usage =="
docker compose exec -T app sh -c 'du -sh /data 2>/dev/null; df -h /data 2>/dev/null' || true

echo
echo "== Local backups (./backups) =="
ls -lt ./backups 2>/dev/null | head -n 8 || echo "No local backups yet — run infrastructure/scripts/backup.sh."
