#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install it before running this script." >&2
  exit 1
fi

if [ ! -f .env ]; then
  read -rp "Public hostname (e.g. planner.example.com): " PUBLIC_HOST
  echo "PUBLIC_ORIGIN=https://${PUBLIC_HOST}" > .env
  echo "Wrote .env with PUBLIC_ORIGIN=https://${PUBLIC_HOST}"
fi

docker compose build
docker compose up -d

echo "Waiting for the app to become ready..."
until docker compose exec -T app node -e "fetch('http://localhost:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; do
  sleep 2
done

echo "Stack is up."
docker compose exec -T app node dist/scripts/create-setup-token.js
