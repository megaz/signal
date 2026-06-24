"""Post-ingestion: fatigue scoring, similarity clustering, and background beat analysis."""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad, AdHealth
from app.models.tiktok_post import TikTokPost
from app.services.analysis.fatigue_scorer import score_ad
from app.services.analysis.similarity_tree import cluster_brand_families
from app.services.ingestion.promote_posts import promote_tiktok_posts_to_ads


async def _profile_video_ids(brand_id: str) -> list[str]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(TikTokPost.video_id).where(TikTokPost.brand_id == brand_id)
        )
        return [row[0] for row in result.all()]


async def score_brand_ads(brand_id: str, *, video_ids: list[str] | None = None) -> int:
    async with AsyncSessionLocal() as db:
        query = select(Ad).where(Ad.brand_id == brand_id)
        if video_ids is not None:
            query = query.where(Ad.external_id.in_(video_ids))
        ads = (await db.execute(query)).scalars().all()

        for ad in ads:
            ad.health_score, ad.health = score_ad(ad)

        await db.commit()
        return len(ads)


async def finalize_brand_ingestion(brand_id: str, *, scope: str = "profile_posts") -> None:
    """
    Promote posts to ads, score fatigue, cluster creative families, then auto-analyze
    fatiguing/declining ads that haven't been analyzed yet.

    scope=profile_posts: only ads matching tiktok_posts.video_id (ignores junk Apify ads).
    scope=all: all ads for the brand.
    """
    await promote_tiktok_posts_to_ads(brand_id)

    video_ids: list[str] | None = None
    if scope == "profile_posts":
        video_ids = await _profile_video_ids(brand_id)
        if not video_ids:
            return

    await score_brand_ads(brand_id, video_ids=video_ids)
    await cluster_brand_families(brand_id, video_ids=video_ids)

    # Auto-trigger beat analysis for fatiguing/declining ads with no beats yet
    from app.services.analysis.beat_detector import detect_beats  # deferred to avoid circular

    async with AsyncSessionLocal() as db:
        query = select(Ad).where(
            Ad.brand_id == brand_id,
            Ad.health.in_([AdHealth.fatiguing, AdHealth.declining]),
        ).options(selectinload(Ad.beats))
        if video_ids is not None:
            query = query.where(Ad.external_id.in_(video_ids))
        ads = (await db.execute(query)).scalars().all()

    needs_analysis = [a for a in ads if not a.beats]
    if needs_analysis:
        await asyncio.gather(*[detect_beats(a.id) for a in needs_analysis])
