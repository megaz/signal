"""
Pulls top ads from TikTok Creative Center.
Uses impression buckets and run-duration as performance proxies.
"""
import httpx
from app.config import get_settings

settings = get_settings()
TIKTOK_BASE = "https://business-api.tiktok.com/open_api/v1.3/creative/center/ad/detail/"


async def fetch_top_ads(industry_id: str, limit: int = 50) -> list[dict]:
    headers = {"Access-Token": settings.tiktok_secret}
    params = {
        "industry_id": industry_id,
        "material_type": "VIDEO",
        "period_type": 7,
        "limit": limit,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(TIKTOK_BASE, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json().get("data", {}).get("materials", [])


async def sync_tiktok_ads(brand_id: str, industry_id: str):
    """Background task: fetch TikTok trending ads and upsert."""
    from app.core.database import AsyncSessionLocal
    from app.models.ad import Ad, AdPlatform
    from sqlalchemy import select
    import uuid

    async with AsyncSessionLocal() as db:
        raw_ads = await fetch_top_ads(industry_id)
        for raw in raw_ads:
            existing = await db.execute(
                select(Ad).where(Ad.external_id == str(raw.get("item_id")), Ad.platform == AdPlatform.tiktok)
            )
            ad = existing.scalar_one_or_none()
            if not ad:
                ad = Ad(
                    id=str(uuid.uuid4()),
                    brand_id=brand_id,
                    platform=AdPlatform.tiktok,
                    external_id=str(raw.get("item_id")),
                )
                db.add(ad)
            ad.video_url = raw.get("video_info", {}).get("vid_url_list", [None])[0]
            ad.thumbnail_url = raw.get("video_cover")
            ad.reach_bucket = raw.get("impression_bucket")

        await db.commit()

    from app.services.analysis.similarity_tree import cluster_brand_families

    await cluster_brand_families(brand_id)
