"""
Pulls ads from the Meta Ad Library API.
Run-duration (last_seen - started) is used as a performance proxy:
brands kill losers; longer-running = stronger signal.
"""
import httpx
from datetime import datetime
from app.config import get_settings

settings = get_settings()
BASE = f"https://graph.facebook.com/{settings.meta_api_version}/ads_archive"


async def fetch_ads_for_page(meta_page_id: str) -> list[dict]:
    """Return raw ad records from the Library for a given Facebook Page ID."""
    params = {
        "access_token": settings.meta_access_token,
        "search_page_ids": meta_page_id,
        "ad_type": "ALL",
        "fields": "id,ad_creative_body,ad_creative_link_caption,ad_delivery_start_time,ad_delivery_stop_time,impressions,spend,ad_snapshot_url",
        "limit": 200,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(BASE, params=params)
        resp.raise_for_status()
        return resp.json().get("data", [])


def compute_run_days(raw: dict) -> int:
    start = raw.get("ad_delivery_start_time")
    stop = raw.get("ad_delivery_stop_time")
    if not start:
        return 0
    fmt = "%Y-%m-%dT%H:%M:%S%z"
    t0 = datetime.strptime(start, fmt)
    t1 = datetime.strptime(stop, fmt) if stop else datetime.now(t0.tzinfo)
    return (t1 - t0).days


async def sync_brand_ads(brand_id: str):
    """Background task: fetch Meta ads and upsert into DB."""
    from app.core.database import AsyncSessionLocal
    from app.models.brand import Brand
    from app.models.ad import Ad, AdPlatform
    from sqlalchemy import select
    import uuid

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand or not brand.meta_page_id:
            return

        raw_ads = await fetch_ads_for_page(brand.meta_page_id)
        for raw in raw_ads:
            existing = await db.execute(
                select(Ad).where(Ad.external_id == raw["id"], Ad.platform == AdPlatform.meta)
            )
            ad = existing.scalar_one_or_none()
            if not ad:
                ad = Ad(
                    id=str(uuid.uuid4()),
                    brand_id=brand_id,
                    platform=AdPlatform.meta,
                    external_id=raw["id"],
                )
                db.add(ad)
            ad.run_days = compute_run_days(raw)
            ad.title = raw.get("ad_creative_link_caption") or raw.get("ad_creative_body", "")[:80]

        await db.commit()
