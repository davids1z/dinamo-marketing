#!/usr/bin/env bash
set -euo pipefail

# Dinamo Marketing Platform — Production Deploy Script
# Usage: ./scripts/deploy.sh

cd "$(dirname "$0")/.."

echo "╔══════════════════════════════════════════╗"
echo "║  Dinamo Marketing — Production Deploy    ║"
echo "╚══════════════════════════════════════════╝"

echo ""
echo "==> Pulling latest code..."
git pull origin main

echo ""
echo "==> Building containers..."
docker compose -f docker-compose.prod.yml build --parallel

echo ""
echo "==> Starting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo ""
echo "==> Waiting for API health..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:3301/api/v1/health/live > /dev/null 2>&1; then
        echo "    API is healthy!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "    WARNING: API did not become healthy in time"
        docker compose -f docker-compose.prod.yml logs api --tail=20
        exit 1
    fi
    echo "    Waiting... ($i/30)"
    sleep 2
done

echo ""
echo "==> Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head 2>/dev/null || echo "    Migrations skipped or already up to date"

echo ""
echo "==> Seeding admin user..."
docker compose -f docker-compose.prod.yml exec -T api python -c "
import asyncio
from app.seed import main
asyncio.run(main())
" 2>/dev/null || echo "    Seed skipped"

echo ""
echo "==> Cleaning up old images..."
docker image prune -f

echo ""
echo "==> Service status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "Deploy complete! Dashboard: http://dinamo.xyler.ai"
