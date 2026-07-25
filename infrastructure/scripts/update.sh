#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "Pulling latest source..."
git pull --ff-only

echo "Building updated images..."
docker compose build

echo "Running database migrations..."
docker compose run --rm --no-deps app node dist/db/migrate.js

echo "Restarting stack..."
docker compose up -d

echo "Waiting for the app to become ready..."
until docker compose exec -T app node -e "fetch('http://localhost:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; do
  sleep 2
done

echo "Update complete."
