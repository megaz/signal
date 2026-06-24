"""Persist real TikTok engagement (views/likes/comments/shares + raw author meta)
from a scraped Apify JSON dump into the tiktok_posts table.

This is the same mapping the live pipeline uses (upsert_tiktok_post_items) — it only
populates tiktok_posts (keyed by video_id == ads.id); it does NOT touch the ads/videos.

Run from backend/:
    DATABASE_URL="sqlite+aiosqlite:///./pulse.db" .venv/bin/python -m scripts.import_engagement
    (optional: pass an explicit path to a scraped JSON as argv[1])
"""
import asyncio
import json
import sys
from pathlib import Path

from app.core.database import AsyncSessionLocal, init_db
from app.models.ad import Ad  # noqa: F401 — register mapper
from app.models.brand import Brand  # noqa: F401
from app.models.beat import Beat  # noqa: F401
from app.models.metric_snapshot import MetricSnapshot  # noqa: F401
from app.models.refresh import Refresh  # noqa: F401
from app.models.tiktok_post import TikTokPost  # noqa: F401
from app.services.ingestion.tiktok_posts import upsert_tiktok_post_items

BRAND_ID = "celsius"


def _find_json() -> Path:
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / "scripts" / "output" / "celsius_profile_downloaded.json",
        here.parents[2] / "scripts" / "output" / "tiktok_posts_detail.json",
        here.parents[1] / "output" / "celsius_profile_downloaded.json",
    ]
    for c in candidates:
        if c.is_file():
            return c
    raise FileNotFoundError("Could not locate a scraped TikTok JSON (scripts/output/*.json)")


async def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else _find_json()
    items = json.load(open(path, encoding="utf-8"))
    if not isinstance(items, list):
        items = items.get("items") or items.get("data") or []

    await init_db()
    async with AsyncSessionLocal() as db:
        n = await upsert_tiktok_post_items(db, BRAND_ID, items)
        await db.commit()
    print(f"Upserted {n} tiktok_posts for brand '{BRAND_ID}' from {path.name}")


if __name__ == "__main__":
    asyncio.run(main())
