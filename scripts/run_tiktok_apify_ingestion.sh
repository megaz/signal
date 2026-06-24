#!/usr/bin/env bash
# Run TikTok Apify ingestion (tagged @celsiusofficial posts) via Docker Compose API.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HANDLE="${HANDLE:-celsiusofficial}"
MAX_POSTS="${MAX_POSTS:-100}"

echo "Starting Docker Compose stack..."
docker compose up -d db redis api

echo "Waiting for API health..."
for _ in $(seq 1 60); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -sf http://localhost:8000/health >/dev/null || {
  echo "API did not become healthy on :8000" >&2
  exit 1
}

echo "Ensuring Celsius brand exists..."
BRAND_ID="$(docker compose exec -T api python - <<'PY'
import asyncio
import uuid
from sqlalchemy import select

import app.models.beat  # noqa: F401
import app.models.ad  # noqa: F401
import app.models.brand  # noqa: F401
import app.models.refresh  # noqa: F401
import app.models.tiktok_post  # noqa: F401

from app.core.database import init_db, AsyncSessionLocal
from app.models.brand import Brand

async def main() -> None:
    await init_db()
    async with AsyncSessionLocal() as db:
        brand = (await db.execute(select(Brand).where(Brand.name == "Celsius"))).scalar_one_or_none()
        if brand:
            print(brand.id, end="")
            return
        brand_id = str(uuid.uuid4())
        db.add(Brand(id=brand_id, name="Celsius", tiktok_account_id="celsiusofficial"))
        await db.commit()
        print(brand_id, end="")

asyncio.run(main())
PY
)"

echo "Brand ID: $BRAND_ID"
echo "Queueing ingestion for posts tagged @$HANDLE"

curl -sf -X POST \
  "http://localhost:8000/api/v1/ads/sync-tiktok-apify/${BRAND_ID}?handle=${HANDLE}&max_posts=${MAX_POSTS}"

echo ""
echo "Ingestion queued. Apify scrape runs in the API container background (~3-5 min)."
echo "Check results: curl http://localhost:8000/api/v1/brands/${BRAND_ID}/tiktok-posts"
