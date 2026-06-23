from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.refresh import Refresh, RefreshStatus
from app.schemas.review import RefreshOut, ApproveRequest, RejectRequest
from app.services.ai.luma_generator import generate_refresh
from app.services.handoff.slack_notifier import notify_slack

router = APIRouter()


@router.post("/{ad_id}/generate", response_model=RefreshOut)
async def trigger_generation(
    ad_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Generate a refreshed cut via Luma from the accepted beat fixes."""
    refresh = Refresh(id=f"ref_{ad_id}", ad_id=ad_id, status=RefreshStatus.generating)
    db.add(refresh)
    await db.commit()
    background_tasks.add_task(generate_refresh, refresh.id)
    return RefreshOut.model_validate(refresh)


@router.get("/{ad_id}/refresh", response_model=RefreshOut)
async def get_refresh(ad_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Refresh).where(Refresh.ad_id == ad_id))
    refresh = result.scalar_one_or_none()
    if not refresh:
        from fastapi import HTTPException
        raise HTTPException(404, "No refresh found for this ad")
    return RefreshOut.model_validate(refresh)


@router.post("/refresh/{refresh_id}/approve", response_model=RefreshOut)
async def approve_refresh(
    refresh_id: str,
    body: ApproveRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Refresh).where(Refresh.id == refresh_id))
    refresh = result.scalar_one_or_none()
    if not refresh:
        from fastapi import HTTPException
        raise HTTPException(404, "Refresh not found")
    refresh.status = RefreshStatus.approved
    refresh.reviewer_notes = body.notes
    await db.commit()
    background_tasks.add_task(notify_slack, refresh_id)
    return RefreshOut.model_validate(refresh)


@router.post("/refresh/{refresh_id}/reject", response_model=RefreshOut)
async def reject_refresh(
    refresh_id: str,
    body: RejectRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Refresh).where(Refresh.id == refresh_id))
    refresh = result.scalar_one_or_none()
    if not refresh:
        from fastapi import HTTPException
        raise HTTPException(404, "Refresh not found")
    refresh.status = RefreshStatus.rejected
    refresh.reviewer_notes = body.notes
    await db.commit()
    return RefreshOut.model_validate(refresh)
