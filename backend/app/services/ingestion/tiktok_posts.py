"""
TikTok post + comment ingestion via Apify clockworks/tiktok-scraper.

Two-phase workflow (see scripts/scrape_tiktok_posts.py):
  1. Discover posts by search query / hashtag (no comments).
  2. Re-scrape discovered post URLs with comments for full context.
"""
import asyncio
import importlib.util
import json
import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import get_settings

settings = get_settings()


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
    raise ImportError("Cannot find scripts/scrape_tiktok_posts.py")


@lru_cache(maxsize=1)
def _scraper_module():
    path = _scraper_script_path()
    spec = importlib.util.spec_from_file_location("scrape_tiktok_posts", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load scraper from {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _video_id_from_item(item: dict[str, Any]) -> str | None:
    if item.get("id"):
        return str(item["id"])
    url = item.get("webVideoUrl") or item.get("web_video_url") or ""
    match = re.search(r"/video/(\d+)", str(url))
    return match.group(1) if match else None


def _author_username(item: dict[str, Any]) -> str | None:
    author_meta = item.get("authorMeta")
    if isinstance(author_meta, dict):
        return author_meta.get("name") or author_meta.get("uniqueId")
    return item.get("authorMeta.name")


def _extract_comments(item: dict[str, Any]) -> list[dict[str, Any]]:
    comments = item.get("comments")
    if isinstance(comments, list) and comments:
        return comments
    dataset_url = item.get("commentsDatasetURL") or item.get("commentsDatasetUrl")
    if dataset_url:
        return [{"commentsDatasetUrl": dataset_url}]
    return []


def _media_url(item: dict[str, Any]) -> str | None:
    media_urls = item.get("mediaUrls")
    if isinstance(media_urls, list) and media_urls:
        return str(media_urls[0])
    if item.get("videoUrl"):
        return str(item["videoUrl"])
    video_meta = item.get("videoMeta")
    if isinstance(video_meta, dict) and video_meta.get("downloadAddr"):
        return str(video_meta["downloadAddr"])
    return item.get("webVideoUrl") or item.get("web_video_url")


def _run_scraper_sync(
    *,
    query: str | None = None,
    hashtags: list[str] | None = None,
    profiles: list[str] | None = None,
    results_per_page: int = 30,
    comments_per_post: int = 25,
    filter_query: bool = True,
    max_posts: int = 50,
    post_urls: list[str] | None = None,
    download_videos: bool = False,
    download_covers: bool = False,
) -> list[dict[str, Any]]:
    scraper = _scraper_module()
    token = settings.apify_token
    if not token:
        raise RuntimeError("APIFY_TOKEN is not configured")

    _, detail_items = scraper.run_tiktok_posts_scraper(
        token,
        query=query,
        hashtags=hashtags,
        profiles=profiles,
        results_per_page=results_per_page,
        comments_per_post=comments_per_post,
        filter_query=filter_query,
        max_posts=max_posts,
        post_urls=post_urls,
        download_videos=download_videos,
        download_covers=download_covers,
    )
    return detail_items


async def fetch_posts_with_comments(
    *,
    query: str | None = None,
    hashtags: list[str] | None = None,
    profiles: list[str] | None = None,
    results_per_page: int = 30,
    comments_per_post: int = 25,
    filter_query: bool = True,
    max_posts: int = 50,
    post_urls: list[str] | None = None,
    download_videos: bool = False,
    download_covers: bool = False,
) -> list[dict[str, Any]]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: _run_scraper_sync(
            query=query,
            hashtags=hashtags,
            profiles=profiles,
            results_per_page=results_per_page,
            comments_per_post=comments_per_post,
            filter_query=filter_query,
            max_posts=max_posts,
            post_urls=post_urls,
            download_videos=download_videos,
            download_covers=download_covers,
        ),
    )


async def sync_tiktok_posts(
    brand_id: str,
    *,
    query: str | None = None,
    hashtags: list[str] | None = None,
    profiles: list[str] | None = None,
    results_per_page: int = 30,
    comments_per_post: int = 25,
    filter_query: bool = True,
    max_posts: int = 50,
    post_urls: list[str] | None = None,
    download_videos: bool | None = None,
    download_covers: bool | None = None,
) -> None:
    """Background task: discover TikTok posts and upsert with comments."""
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.brand import Brand
    from app.models.tiktok_post import TikTokPost

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand:
            return

        scraper = _scraper_module()
        resolved_profiles = profiles
        if not resolved_profiles and not post_urls and not hashtags:
            if brand.tiktok_account_id:
                resolved_profiles = [brand.tiktok_account_id.lstrip("@")]
            else:
                suggested = scraper.suggest_profile(query, brand.name)
                if suggested:
                    resolved_profiles = [suggested]

        use_profiles = bool(resolved_profiles)
        search_query = None if post_urls or hashtags or use_profiles else (query or brand.name)
        dl_videos = download_videos if download_videos is not None else use_profiles
        dl_covers = download_covers if download_covers is not None else use_profiles

        items = await fetch_posts_with_comments(
            query=search_query,
            hashtags=hashtags,
            profiles=resolved_profiles,
            results_per_page=results_per_page,
            comments_per_post=comments_per_post,
            filter_query=False if use_profiles else filter_query,
            max_posts=max_posts,
            post_urls=post_urls,
            download_videos=dl_videos,
            download_covers=dl_covers,
        )

        for item in items:
            video_id = _video_id_from_item(item)
            if not video_id:
                continue

            existing = await db.execute(
                select(TikTokPost).where(
                    TikTokPost.brand_id == brand_id,
                    TikTokPost.video_id == video_id,
                )
            )
            post = existing.scalar_one_or_none()
            if not post:
                post = TikTokPost(
                    id=str(uuid.uuid4()),
                    brand_id=brand_id,
                    video_id=video_id,
                )
                db.add(post)

            post.web_video_url = _media_url(item) or item.get("webVideoUrl") or item.get("web_video_url")
            post.caption = item.get("text") or item.get("desc")
            post.author_username = _author_username(item)
            post.play_count = item.get("playCount")
            post.digg_count = item.get("diggCount")
            post.comment_count = item.get("commentCount")
            post.share_count = item.get("shareCount")
            post.raw_post = json.dumps(item, ensure_ascii=False)
            comments = _extract_comments(item)
            post.comments_json = json.dumps(comments, ensure_ascii=False) if comments else None

        await db.commit()

    from app.services.ingestion.finalize import finalize_brand_ingestion

    await finalize_brand_ingestion(brand_id, scope="profile_posts")
