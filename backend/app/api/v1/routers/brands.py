from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.brand import Brand
from app.models.ad import Ad, AdHealth
from app.schemas.ad import AdNode
from app.services.analysis.similarity_tree import cluster_brand_families

router = APIRouter()


@router.get("/{brand_id}/web")
async def get_brand_web(
    brand_id: str,
    include_competitors: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """All ads for a brand as graph nodes for the Web screen."""
    result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
    ads = result.scalars().all()
    nodes = [AdNode.model_validate(a) for a in ads]

    competitor_nodes: list[AdNode] = []
    if include_competitors:
        # Fetch same-category brands excluding this one
        pass  # TODO: category tagging

    return {"nodes": nodes, "competitor_nodes": competitor_nodes}


@router.get("/{brand_id}/stats")
async def get_brand_stats(brand_id: str, db: AsyncSession = Depends(get_db)):
    """Overview stats shown at the top of the Web screen."""
    result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
    ads = result.scalars().all()

    counts = {h.value: 0 for h in AdHealth}
    for ad in ads:
        counts[ad.health.value] += 1

    return {
        "total": len(ads),
        "health_breakdown": counts,
        "fatiguing_count": counts[AdHealth.fatiguing] + counts[AdHealth.declining],
    }


@router.post("/{brand_id}/cluster")
async def trigger_clustering(brand_id: str, background_tasks: BackgroundTasks):
    """Re-cluster all ads for a brand into creative families."""
    background_tasks.add_task(cluster_brand_families, brand_id)
    return {"queued": True}
