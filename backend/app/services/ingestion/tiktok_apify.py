"""
TikTok Ad Library scraper via Apify (keyword search).

Wraps scripts/run_scrape_tiktok_ads.sh using the Ad Library actor by default —
the most accurate source for brand/search-term queries. Creative Center
(mode=creative_center) is available but only returns loosely keyword-matched
trending ads.
"""
import asyncio
import importlib.util
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import get_settings

settings = get_settings()


def _scraper_script_path() -> Path:
    """Resolve scrape_tiktok_ads.py in repo layout or Docker /scripts mount."""
    here = Path(__file__).resolve()
    candidates = [
        here.parents[4] / "scripts" / "scrape_tiktok_ads.py",  # repo: backend/app/services/ingestion
        here.parents[3] / "scripts" / "scrape_tiktok_ads.py",  # if backend is repo root
        Path("/scripts/scrape_tiktok_ads.py"),                  # docker-compose volume
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise ImportError(
        "Cannot find scripts/scrape_tiktok_ads.py. "
        "Mount ./scripts into the API container or run from the repo root."
    )


@lru_cache(maxsize=1)
def _scraper_module():
    path = _scraper_script_path()
    spec = importlib.util.spec_from_file_location("scrape_tiktok_ads", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load scraper from {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _run_scraper_sync(
    query: str,
    *,
    country: str = "GB",
    mode: str = "ad_library",
    max_pages: int = 3,
    industry: str | None = None,
    period: str = "180",
    filter_query: bool = True,
) -> list[dict[str, Any]]:
    scraper = _scraper_module()
    token = settings.apify_token
    if not token:
        raise RuntimeError(
            "APIFY_TOKEN is not configured. Add it to backend/.env to enable TikTok Apify ingestion."
        )

    resolved_industry = industry or scraper.suggest_industry(query)
    _, normalized = scraper.run_tiktok_ads_scraper(
        token=token,
        query=query,
        actor_id=scraper.DEFAULT_ACTOR_ID,
        mode=mode,
        max_pages=max_pages,
        country=country,
        start_date=None,
        end_date=None,
        quick_search=False,
        period=period,
        industry=resolved_industry,
        filter_query=filter_query,
        fallback_ad_library=False,
    )
    return normalized


async def fetch_ads_for_query(
    query: str,
    *,
    country: str = "GB",
    mode: str = "ad_library",
    max_pages: int = 3,
    industry: str | None = None,
    period: str = "180",
    filter_query: bool = True,
) -> list[dict[str, Any]]:
    """Run the Apify TikTok scraper for a brand/keyword query (blocking I/O in executor)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: _run_scraper_sync(
            query,
            country=country,
            mode=mode,
            max_pages=max_pages,
            industry=industry,
            period=period,
            filter_query=filter_query,
        ),
    )


def compute_run_days(start: str | None, end: str | None) -> int:
    if not start:
        return 0
    try:
        t0 = date.fromisoformat(str(start)[:10])
        t1 = date.fromisoformat(str(end)[:10]) if end else date.today()
        return max((t1 - t0).days, 0)
    except ValueError:
        return 0


def _reach_bucket(impressions: Any) -> str | None:
    if impressions is None:
        return None
    text = str(impressions).lower()
    if "high" in text or "1m" in text:
        return "high"
    if "mid" in text or "100k" in text:
        return "mid"
    if "low" in text:
        return "low"
    return str(impressions)[:32]


async def sync_tiktok_apify_ads(
    brand_id: str,
    *,
    query: str | None = None,
    country: str = "GB",
    mode: str = "ad_library",
    max_pages: int = 3,
    industry: str | None = None,
    filter_query: bool = True,
) -> None:
    """Background task: scrape TikTok ads via Apify and upsert into DB."""
    from app.core.database import AsyncSessionLocal
    from app.models.brand import Brand
    from app.models.ad import Ad, AdPlatform
    from sqlalchemy import select
    import uuid

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand:
            return

        search_query = query or brand.name
        normalized = await fetch_ads_for_query(
            search_query,
            country=country,
            mode=mode,
            max_pages=max_pages,
            industry=industry,
            filter_query=filter_query,
        )

        for item in normalized:
            ad_id = item.get("ad_id")
            if not ad_id:
                continue

            external_id = str(ad_id)
            existing = await db.execute(
                select(Ad).where(
                    Ad.external_id == external_id,
                    Ad.platform == AdPlatform.tiktok,
                )
            )
            ad = existing.scalar_one_or_none()
            if not ad:
                ad = Ad(
                    id=str(uuid.uuid4()),
                    brand_id=brand_id,
                    platform=AdPlatform.tiktok,
                    external_id=external_id,
                )
                db.add(ad)

            title = item.get("ad_text") or item.get("advertiser_name")
            ad.title = (title or "")[:80] or None
            ad.video_url = item.get("video_url")
            ad.thumbnail_url = item.get("cover_url")
            ad.run_days = compute_run_days(item.get("start_date"), item.get("end_date"))
            ad.reach_bucket = _reach_bucket(item.get("impressions"))

        await db.commit()

    from app.services.analysis.similarity_tree import cluster_brand_families

    await cluster_brand_families(brand_id)
