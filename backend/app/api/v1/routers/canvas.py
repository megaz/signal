from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.beat import Beat
from app.schemas.beat import BeatOut, AcceptFixRequest
from app.schemas.plan import PlanOut
from app.services.ai.teardown import run_teardown
from app.services.ai.fix_proposer import propose_fix
from app.services.ai.plan_advisor import plan_ad

router = APIRouter()


@router.get("/{ad_id}/beats", response_model=list[BeatOut])
async def get_beats(ad_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Beat).where(Beat.ad_id == ad_id).order_by(Beat.order)
    )
    return [BeatOut.model_validate(b) for b in result.scalars().all()]


@router.post("/{ad_id}/plan", response_model=PlanOut)
async def plan_canvas(ad_id: str, db: AsyncSession = Depends(get_db)):
    """Run AI planning: decides Variations vs Full Recreate with visible reasoning."""
    plan = await plan_ad(ad_id, db)
    if not plan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ad not found")
    return plan


@router.post("/{ad_id}/teardown")
async def teardown_ad(ad_id: str, db: AsyncSession = Depends(get_db)):
    """Run AI teardown: decompose video into scored beats."""
    beats = await run_teardown(ad_id, db)
    return {"beats": [BeatOut.model_validate(b) for b in beats]}


@router.post("/beats/{beat_id}/fix")
async def get_fix_proposal(beat_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a targeted fix for a weak beat."""
    fix = await propose_fix(beat_id, db)
    return fix


@router.post("/beats/{beat_id}/accept")
async def accept_fix(beat_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Beat).where(Beat.id == beat_id))
    beat = result.scalar_one_or_none()
    if not beat:
        from fastapi import HTTPException
        raise HTTPException(404, "Beat not found")
    beat.fix_accepted = True
    await db.commit()
    return BeatOut.model_validate(beat)


@router.post("/{ad_id}/copilot")
async def copilot_ask(ad_id: str, body: dict):
    """Proxy to Claude for the in-canvas AI co-pilot Q&A."""
    from app.services.ai.teardown import ask_copilot
    answer = await ask_copilot(ad_id, body.get("question", ""))
    return {"answer": answer}
