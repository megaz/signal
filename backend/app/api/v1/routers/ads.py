from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.ad import Ad
from app.schemas.ad import AdDetail
from app.services.ingestion.meta_ad_library import sync_brand_ads
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


@router.post("/{ad_id}/analyze")
async def trigger_beat_analysis(ad_id: str, background_tasks: BackgroundTasks):
    """Kick off beat detection + scoring for a single ad."""
    background_tasks.add_task(detect_beats, ad_id)
    return {"queued": True}
