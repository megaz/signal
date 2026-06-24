"""Seed the ads table with REAL @celsiusofficial TikTok videos.

Reads scripts/output/celsius_media_manifest.json (produced by
scripts/download_celsius_media.py — local /celsius/*.mp4 + *.jpg served from
frontend/public). Replaces the fake placeholder ads with real Celsius creatives.

Health is assigned by play-count rank (quartiles) for a realistic spread; run_days
comes from the real post date.

Run from the backend dir (sqlite override matches the running server):
  DATABASE_URL="sqlite+aiosqlite:///./pulse.db" .venv/bin/python seed_celsius_posts.py
"""
import asyncio
import json
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, init_db
from app.models.ad import Ad, AdHealth, AdPlatform
from app.models.brand import Brand
# Import related models so SQLAlchemy can resolve relationship() targets.
from app.models.beat import Beat  # noqa: F401
from app.models.tiktok_post import TikTokPost  # noqa: F401

BRAND_ID = "celsius"
MANIFEST = Path(__file__).resolve().parent.parent / "scripts" / "output" / "celsius_media_manifest.json"

# rank quartile → (health, score band low, high)
QUARTILES = [
    (AdHealth.thriving, 0.82, 0.97),
    (AdHealth.aging, 0.60, 0.78),
    (AdHealth.fatiguing, 0.40, 0.56),
    (AdHealth.declining, 0.20, 0.36),
]


def run_days(created) -> int:
    if not created:
        return 0
    try:
        t0 = date.fromisoformat(str(created)[:10])
        return max((date.today() - t0).days, 0)
    except (ValueError, TypeError):
        return 0


def reach_bucket(plays: int):
    if plays >= 1_000_000:
        return "high"
    if plays >= 100_000:
        return "mid"
    return "low"


async def main():
    await init_db()
    now = datetime.utcnow()

    if not MANIFEST.exists():
        raise SystemExit(f"Missing {MANIFEST} — run scripts/download_celsius_media.py first.")
    rows = json.loads(MANIFEST.read_text())
    if not rows:
        raise SystemExit("Manifest is empty.")

    # Rank by plays → quartile health/score
    rows.sort(key=lambda r: r.get("playCount", 0), reverse=True)
    n = len(rows)
    band = max(1, n // 4)
    for idx, r in enumerate(rows):
        q = min(3, idx * 4 // n)
        health, lo, hi = QUARTILES[q]
        frac = 1 - (idx % band) / band
        r["health"] = health
        r["score"] = round(lo + (hi - lo) * frac, 3)

    async with AsyncSessionLocal() as db:
        brand = (await db.execute(select(Brand).where(Brand.id == BRAND_ID))).scalar_one_or_none()
        if not brand:
            db.add(Brand(id=BRAND_ID, name="Celsius", tiktok_account_id="celsiusofficial"))

        ids = {r["id"] for r in rows}
        existing = (await db.execute(select(Ad).where(Ad.brand_id == BRAND_ID))).scalars().all()
        removed = 0
        for ad in existing:
            if ad.id not in ids:
                await db.delete(ad)
                removed += 1

        inserted = 0
        for r in rows:
            ad = (await db.execute(select(Ad).where(Ad.id == r["id"]))).scalar_one_or_none()
            if not ad:
                ad = Ad(id=r["id"], brand_id=BRAND_ID, platform=AdPlatform.tiktok, external_id=r["id"])
                db.add(ad)
                inserted += 1
            plays = int(r.get("playCount") or 0)
            ad.title = (r.get("text") or "").strip()[:120] or None
            ad.video_url = r["video"]
            ad.thumbnail_url = r["cover"]
            ad.health = r["health"]
            ad.health_score = r["score"]
            ad.run_days = run_days(r.get("createTimeISO"))
            ad.reach_bucket = reach_bucket(plays)
            ad.variant_count = 1
            ad.started_at = now - timedelta(days=ad.run_days)
            ad.last_seen_at = now

        await db.commit()
        print(f"Removed {removed} old ads, upserted {len(rows)} real Celsius videos ({inserted} new).")


if __name__ == "__main__":
    asyncio.run(main())
