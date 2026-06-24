from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.ad import Ad
from app.schemas.ad import AdDetail
from app.services.ingestion.meta_ad_library import sync_brand_ads
from app.services.ingestion.tiktok_apify import sync_tiktok_apify_ads
from app.services.ingestion.tiktok_posts import sync_tiktok_posts
from app.services.analysis.beat_detector import detect_beats

router = APIRouter()


@router.get("/{ad_id}", response_model=AdDetail)
async def get_ad(ad_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ad).where(Ad.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ad not found")
    return AdDetail.model_validate(ad)


@router.post("/sync/{brand_id}")
async def trigger_sync(brand_id: str, background_tasks: BackgroundTasks):
    """Kick off a background pull from Meta Ad Library for a brand."""
    background_tasks.add_task(sync_brand_ads, brand_id)
    return {"queued": True}


@router.post("/sync-tiktok-apify/{brand_id}")
async def trigger_tiktok_apify_sync(
    brand_id: str,
    background_tasks: BackgroundTasks,
    query: str | None = Query(None, description="Search query; defaults to brand name"),
    country: str = Query("GB", description="Ad Library region (GB for US brand searches)"),
    mode: str = Query("ad_library", pattern="^(auto|ad_library|creative_center)$"),
    max_pages: int = Query(3, ge=1, le=20),
    industry: str | None = Query(None),
    filter_query: bool = Query(True, description="Drop ads that don't mention the query term"),
):
    """Kick off a background TikTok ad scrape via Apify (scripts/run_scrape_tiktok_ads.sh)."""
    background_tasks.add_task(
        sync_tiktok_apify_ads,
        brand_id,
        query=query,
        country=country,
        mode=mode,
        max_pages=max_pages,
        industry=industry,
        filter_query=filter_query,
    )
    return {"queued": True}


@router.post("/sync-tiktok-posts/{brand_id}")
async def trigger_tiktok_posts_sync(
    brand_id: str,
    background_tasks: BackgroundTasks,
    query: str | None = Query(None, description="Search query; defaults to brand name"),
    profiles: list[str] | None = Query(None, description="TikTok usernames, e.g. celsiusofficial"),
    hashtags: list[str] | None = Query(None),
    post_urls: list[str] | None = Query(None, description="Skip discovery and scrape these URLs"),
    results_per_page: int = Query(30, ge=1, le=100),
    comments_per_post: int = Query(25, ge=0, le=100, description="Comments per post in detail phase"),
    max_posts: int = Query(30, ge=1, le=100),
    filter_query: bool = Query(True),
    download_videos: bool | None = Query(None, description="Download video files via Apify (default true for profiles)"),
    download_covers: bool | None = Query(None, description="Download cover images via Apify (default true for profiles)"),
):
    """Scrape TikTok posts: profile discovery → detail scrape with comments.

    After ingest, automatically promotes posts to ads, scores fatigue, and clusters families.
    """
    background_tasks.add_task(
        sync_tiktok_posts,
        brand_id,
        query=query,
        profiles=profiles,
        hashtags=hashtags,
        post_urls=post_urls,
        results_per_page=results_per_page,
        comments_per_post=comments_per_post,
        max_posts=max_posts,
        filter_query=filter_query,
        download_videos=download_videos,
        download_covers=download_covers,
    )
    return {"queued": True}


@router.post("/{ad_id}/analyze")
async def trigger_beat_analysis(ad_id: str, background_tasks: BackgroundTasks):
    """Kick off beat detection + scoring for a single ad."""
    background_tasks.add_task(detect_beats, ad_id)
    return {"queued": True}
