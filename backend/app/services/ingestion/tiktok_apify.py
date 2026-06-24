"""
TikTok post ingestion via Apify clockworks/tiktok-scraper.

Discovers all posts that @-mention or are published by a brand handle
(default celsiusofficial), upserts into tiktok_posts, then promotes to ads
and runs fatigue scoring + similarity clustering.
"""
import asyncio
import importlib.util
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import get_settings

settings = get_settings()

DEFAULT_HANDLE = "celsiusofficial"


def _scraper_script_path() -> Path:
    here = Path(__file__).resolve()
    candidates = [
        here.parents[4] / "scripts" / "scrape_tiktok_posts.py",
        here.parents[3] / "scripts" / "scrape_tiktok_posts.py",
        Path("/scripts/scrape_tiktok_posts.py"),
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise ImportError(
        "Cannot find scripts/scrape_tiktok_posts.py. "
        "Mount ./scripts into the API container or run from the repo root."
    )


@lru_cache(maxsize=1)
def _scraper_module():
    path = _scraper_script_path()
    spec = importlib.util.spec_from_file_location("scrape_tiktok_posts", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load scraper from {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _resolve_handle(
    handle: str | None,
    *,
    brand_tiktok_account_id: str | None,
    brand_name: str | None,
    query: str | None,
) -> str:
    if handle:
        return handle.lstrip("@")
    if brand_tiktok_account_id:
        return brand_tiktok_account_id.lstrip("@")
    scraper = _scraper_module()
    suggested = scraper.suggest_profile(query, brand_name)
    return suggested or DEFAULT_HANDLE


def _run_tagged_scraper_sync(
    handle: str,
    *,
    results_per_page: int = 100,
    comments_per_post: int = 25,
    max_posts: int = 100,
    include_profile_posts: bool = True,
) -> list[dict[str, Any]]:
    scraper = _scraper_module()
    token = settings.apify_token
    if not token:
        raise RuntimeError(
            "APIFY_TOKEN is not configured. Add it to backend/.env to enable TikTok Apify ingestion."
        )

    _, detail_items = scraper.run_tagged_posts_scraper(
        token,
        handle,
        results_per_page=results_per_page,
        comments_per_post=comments_per_post,
        max_posts=max_posts,
        include_profile_posts=include_profile_posts,
    )
    return detail_items


async def fetch_tagged_posts(
    handle: str,
    *,
    results_per_page: int = 100,
    comments_per_post: int = 25,
    max_posts: int = 100,
    include_profile_posts: bool = True,
) -> list[dict[str, Any]]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: _run_tagged_scraper_sync(
            handle,
            results_per_page=results_per_page,
            comments_per_post=comments_per_post,
            max_posts=max_posts,
            include_profile_posts=include_profile_posts,
        ),
    )


async def sync_tiktok_apify_ads(
    brand_id: str,
    *,
    handle: str | None = None,
    query: str | None = None,
    max_posts: int = 100,
    results_per_page: int = 100,
    comments_per_post: int = 25,
    include_profile_posts: bool = True,
    # kept for API compatibility — no longer used
    country: str = "GB",
    mode: str = "ad_library",
    max_pages: int = 3,
    industry: str | None = None,
    filter_query: bool = True,
) -> None:
    """Background task: scrape posts tagged @handle and upsert into tiktok_posts."""
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.brand import Brand
    from app.services.ingestion.tiktok_posts import upsert_tiktok_post_items
    from app.services.ingestion.finalize import finalize_brand_ingestion

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand:
            return

        resolved_handle = _resolve_handle(
            handle,
            brand_tiktok_account_id=brand.tiktok_account_id,
            brand_name=brand.name,
            query=query,
        )

        items = await fetch_tagged_posts(
            resolved_handle,
            results_per_page=results_per_page,
            comments_per_post=comments_per_post,
            max_posts=max_posts,
            include_profile_posts=include_profile_posts,
        )

        await upsert_tiktok_post_items(db, brand_id, items)
        await db.commit()

    await finalize_brand_ingestion(brand_id, scope="profile_posts")
