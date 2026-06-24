"""Promote ingested TikTok posts into the ads table for scoring and clustering."""
import json
import uuid
from datetime import date, datetime

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad, AdPlatform
from app.models.tiktok_post import TikTokPost


def _reach_bucket(play_count: int | None) -> str | None:
    if play_count is None:
        return None
    if play_count >= 1_000_000:
        return "high"
    if play_count >= 100_000:
        return "mid"
    return "low"


def _run_days_from_raw(raw_post: str | None) -> int:
    if not raw_post:
        return 0
    try:
        data = json.loads(raw_post)
    except json.JSONDecodeError:
        return 0
    created = data.get("createTimeISO") or data.get("createTime")
    if not created:
        return 0
    try:
        if isinstance(created, (int, float)):
            t0 = datetime.utcfromtimestamp(created).date()
        else:
            t0 = date.fromisoformat(str(created)[:10])
        return max((date.today() - t0).days, 0)
    except (ValueError, TypeError, OSError):
        return 0


def _thumbnail_from_raw(raw_post: str | None) -> str | None:
    if not raw_post:
        return None
    try:
        data = json.loads(raw_post)
    except json.JSONDecodeError:
        return None
    video_meta = data.get("videoMeta")
    if isinstance(video_meta, dict):
        return video_meta.get("coverUrl") or video_meta.get("originalCoverUrl")
    return None


def _video_url_from_raw(raw_post: str | None, web_video_url: str | None) -> str | None:
    if web_video_url:
        return web_video_url
    if not raw_post:
        return None
    try:
        data = json.loads(raw_post)
    except json.JSONDecodeError:
        return None
    media_urls = data.get("mediaUrls")
    if isinstance(media_urls, list) and media_urls:
        return str(media_urls[0])
    if data.get("videoUrl"):
        return str(data["videoUrl"])
    return data.get("webVideoUrl")


async def promote_tiktok_posts_to_ads(brand_id: str) -> int:
    """Upsert tiktok_posts rows into ads. Returns number of ads touched."""
    async with AsyncSessionLocal() as db:
        posts = (
            await db.execute(select(TikTokPost).where(TikTokPost.brand_id == brand_id))
        ).scalars().all()

        count = 0
        for post in posts:
            existing = await db.execute(
                select(Ad).where(
                    Ad.brand_id == brand_id,
                    Ad.platform == AdPlatform.tiktok,
                    Ad.external_id == post.video_id,
                )
            )
            ad = existing.scalar_one_or_none()
            if not ad:
                ad = Ad(
                    id=str(uuid.uuid4()),
                    brand_id=brand_id,
                    platform=AdPlatform.tiktok,
                    external_id=post.video_id,
                )
                db.add(ad)

            ad.title = (post.caption or "")[:80] or None
            ad.video_url = _video_url_from_raw(post.raw_post, post.web_video_url)
            ad.thumbnail_url = _thumbnail_from_raw(post.raw_post)
            ad.reach_bucket = _reach_bucket(post.play_count)
            ad.run_days = _run_days_from_raw(post.raw_post)
            count += 1

        await db.commit()
        return count
