from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad
from app.services.analysis.fatigue_scorer import score_ad
from app.services.analysis.similarity_tree import cluster_brand_families
from app.services.ingestion.meta_ad_library import sync_brand_ads
from app.services.ingestion.tiktok_creative import sync_tiktok_ads


async def collect_brand_data(
    brand_id: str,
    source: str = "meta",
    tiktok_industry_id: str = "7",
) -> None:
    """Run an on-demand ingestion pipeline and refresh derived ad fields."""
    normalized_source = source.lower()

    if normalized_source in ("meta", "both"):
        await sync_brand_ads(brand_id)

    if normalized_source in ("tiktok", "both"):
        await sync_tiktok_ads(brand_id, tiktok_industry_id)

    # Recompute health after any ingestion run so Web stats stay current.
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
        ads = result.scalars().all()
        for ad in ads:
            ad.health_score, ad.health = score_ad(ad)
        await db.commit()

    await cluster_brand_families(brand_id)
