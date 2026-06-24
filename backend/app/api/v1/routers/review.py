import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.models.refresh import Refresh, RefreshStatus
from app.schemas.brief import CreativeBrief
from app.schemas.review import ApproveRequest, RefreshOut, RejectRequest
from app.services.ai.brief_builder import build_creative_brief
from app.services.ai.luma_generator import MAX_VARIANTS, generate_refresh, generate_variants
from app.services.handoff.slack_notifier import notify_slack

router = APIRouter()
settings = get_settings()


def _refresh_out(refresh: Refresh) -> RefreshOut:
    brief = None
    if refresh.brief_json:
        brief = CreativeBrief.model_validate(refresh.brief_json)
    return RefreshOut(
        id=refresh.id,
        ad_id=refresh.ad_id,
        video_url=refresh.video_url,
        status=refresh.status,
        reviewer_notes=refresh.reviewer_notes,
        brief=brief,
    )


def _require_luma_key() -> None:
    if not settings.luma_api_key:
        raise HTTPException(503, "LUMA_API_KEY is not configured")


class GenerateRequest(BaseModel):
    extra_context: str | None = None  # nodeEdits + brandKit appended to luma_prompt


@router.post("/{ad_id}/generate", response_model=RefreshOut)
async def trigger_generation(
    ad_id: str,
    background_tasks: BackgroundTasks,
    body: GenerateRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Build a performance brief and generate a refreshed cut via Luma."""
    _require_luma_key()
    brief = await build_creative_brief(ad_id, db)
    if body and body.extra_context:
        brief.luma_prompt = brief.luma_prompt.rstrip() + "\n\nAdditional context:\n" + body.extra_context
    refresh = Refresh(
        id=f"ref_{ad_id}_{uuid.uuid4().hex[:8]}",
        ad_id=ad_id,
        status=RefreshStatus.generating,
        brief_json=brief.model_dump(),
    )
    db.add(refresh)
    await db.commit()
    background_tasks.add_task(generate_refresh, refresh.id)
    return _refresh_out(refresh)


@router.post("/{ad_id}/generate-variants")
async def trigger_variant_generation(
    ad_id: str,
    background_tasks: BackgroundTasks,
    count: int = Query(3, ge=1, le=MAX_VARIANTS),
):
    """Queue N Luma variant generations from distinct brief concepts."""
    _require_luma_key()
    background_tasks.add_task(generate_variants, ad_id, count)
    return {"queued": True, "ad_id": ad_id, "count": count}


@router.get("/{ad_id}/refresh", response_model=RefreshOut)
async def get_refresh(ad_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Refresh)
        .where(Refresh.ad_id == ad_id)
        .order_by(Refresh.created_at.desc())
        .limit(1)
    )
    refresh = result.scalar_one_or_none()
    if not refresh:
        raise HTTPException(404, "No refresh found for this ad")
    return _refresh_out(refresh)


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
        raise HTTPException(404, "Refresh not found")
    refresh.status = RefreshStatus.approved
    refresh.reviewer_notes = body.notes
    await db.commit()
    background_tasks.add_task(notify_slack, refresh_id)
    return _refresh_out(refresh)


@router.post("/refresh/{refresh_id}/reject", response_model=RefreshOut)
async def reject_refresh(
    refresh_id: str,
    body: RejectRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Refresh).where(Refresh.id == refresh_id))
    refresh = result.scalar_one_or_none()
    if not refresh:
        raise HTTPException(404, "Refresh not found")
    refresh.status = RefreshStatus.rejected
    refresh.reviewer_notes = body.notes
    await db.commit()
    return _refresh_out(refresh)
