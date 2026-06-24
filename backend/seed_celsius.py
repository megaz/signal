"""Seed the ads table with real scraped Celsius TikTok creatives.

Reads scripts/output/celsius_*_normalized.json (video_url + cover_url) and inserts
them as Ad rows for the demo Celsius brand so the existing /brands/{id}/web and
/ads/{id} endpoints return real media. Idempotent: skips ad_ids already present.

Run from the backend dir:  .venv/bin/python seed_celsius.py
"""
import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, init_db
from app.models.ad import Ad, AdHealth, AdPlatform
from app.models.brand import Brand
# Import related models so SQLAlchemy can resolve relationship() targets.
from app.models.beat import Beat  # noqa: F401
from app.models.tiktok_post import TikTokPost  # noqa: F401

BRAND_ID = "celsius"  # matches the brand id in the running sqlite DB
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "scripts" / "output"
FILES = [
    "celsius_us_normalized.json",
    "celsius_gb_normalized.json",
    "celsius_gb_retry_normalized.json",
]

HEALTHS = [AdHealth.thriving, AdHealth.aging, AdHealth.fatiguing, AdHealth.declining]
BASE_SCORE = {
    AdHealth.thriving: 0.84,
    AdHealth.aging: 0.64,
    AdHealth.fatiguing: 0.44,
    AdHealth.declining: 0.24,
}


def derive(ad_id: str):
    """Deterministic, varied health/score/run_days from the ad id."""
    h = int(hashlib.sha1(ad_id.encode()).hexdigest(), 16)
    health = HEALTHS[h % 4]
    score = min(0.99, round(BASE_SCORE[health] + ((h >> 8) % 14) / 100.0, 3))
    run_days = h % 75  # 0..74 → spreads ads across day/week/month/year buckets
    reach = ["high", "mid", "low"][(h >> 24) % 3]
    variants = 1 + (h >> 28) % 4
    return health, score, run_days, reach, variants


async def main():
    await init_db()
    now = datetime.utcnow()
    inserted = 0

    async with AsyncSessionLocal() as db:
        brand = (await db.execute(select(Brand).where(Brand.id == BRAND_ID))).scalar_one_or_none()
        if not brand:
            db.add(Brand(id=BRAND_ID, name="Celsius", tiktok_account_id="celsius"))

        existing = set(
            (await db.execute(select(Ad.id).where(Ad.brand_id == BRAND_ID))).scalars().all()
        )
        seen: set[str] = set()

        for fn in FILES:
            path = OUTPUT_DIR / fn
            if not path.exists():
                continue
            records = json.loads(path.read_text())
            for r in records:
                ad_id = r.get("ad_id")
                if not ad_id or ad_id in seen or ad_id in existing:
                    continue
                video_url = r.get("video_url")
                cover_url = r.get("cover_url")
                if not video_url and not cover_url:
                    continue
                seen.add(ad_id)

                health, score, run_days, reach, variants = derive(ad_id)
                title = (r.get("ad_text") or r.get("advertiser_name") or "").strip()[:120] or None
                db.add(
                    Ad(
                        id=ad_id,
                        brand_id=BRAND_ID,
                        platform=AdPlatform.tiktok,
                        external_id=ad_id,
                        title=title,
                        video_url=video_url,
                        thumbnail_url=cover_url,
                        health=health,
                        health_score=score,
                        run_days=run_days,
                        reach_bucket=reach,
                        variant_count=variants,
                        creative_family_id=None,
                        started_at=now - timedelta(days=run_days),
                        last_seen_at=now,
                    )
                )
                inserted += 1

        await db.commit()

    print(f"Seeded {inserted} ads for brand {BRAND_ID}")


if __name__ == "__main__":
    asyncio.run(main())
