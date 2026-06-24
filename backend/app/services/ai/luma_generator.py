"""
Orchestrates Luma video generation from creative briefs and accepted beat fixes.
"""
import uuid

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad
from app.models.beat import Beat
from app.models.refresh import Refresh, RefreshStatus
from app.schemas.brief import CreativeBrief, LumaConcept
from app.services.ai.brief_builder import build_creative_brief
from app.services.ai.luma_client import generate_video

MAX_VARIANTS = 3


async def generate_refresh(refresh_id: str) -> None:
    async with AsyncSessionLocal() as db:
        refresh = (await db.execute(select(Refresh).where(Refresh.id == refresh_id))).scalar_one_or_none()
        if not refresh:
            return

        ad = (await db.execute(select(Ad).where(Ad.id == refresh.ad_id))).scalar_one_or_none()
        if not ad:
            refresh.status = RefreshStatus.rejected
            await db.commit()
            return

        if refresh.brief_json:
            brief = CreativeBrief.model_validate(refresh.brief_json)
        else:
            brief = await build_creative_brief(refresh.ad_id, db)
            refresh.brief_json = brief.model_dump()
            await db.commit()

        beats = (
            await db.execute(
                select(Beat).where(Beat.ad_id == refresh.ad_id, Beat.fix_accepted == True)  # noqa: E712
            )
        ).scalars().all()
        beat_notes = " ".join(
            b.proposed_fix.get("script_delta", "")
            for b in beats
            if b.proposed_fix
        )
        prompt = brief.luma_prompt
        if beat_notes:
            prompt = f"{prompt} Beat fixes to incorporate: {beat_notes}"

        try:
            generation_id, video_url = await generate_video(
                prompt,
                start_frame_url=ad.thumbnail_url,
            )
            refresh.luma_generation_id = generation_id
            refresh.video_url = video_url
            refresh.status = RefreshStatus.ready
        except Exception:
            refresh.status = RefreshStatus.rejected
        finally:
            await db.commit()


async def _run_variant_job(refresh_id: str, prompt: str, thumbnail_url: str | None) -> None:
    async with AsyncSessionLocal() as db:
        refresh = (await db.execute(select(Refresh).where(Refresh.id == refresh_id))).scalar_one_or_none()
        if not refresh:
            return

        try:
            generation_id, video_url = await generate_video(
                prompt,
                start_frame_url=thumbnail_url,
            )
            refresh.luma_generation_id = generation_id
            refresh.video_url = video_url
            refresh.status = RefreshStatus.ready
        except Exception:
            refresh.status = RefreshStatus.rejected
        finally:
            await db.commit()


async def generate_variants(ad_id: str, count: int = 3) -> list[str]:
    """Create N refresh rows and queue Luma jobs with distinct concept prompts."""
    count = min(max(count, 1), MAX_VARIANTS)
    brief = await build_creative_brief(ad_id)

    concepts: list[LumaConcept] = list(brief.concepts[:count])
    while len(concepts) < count:
        concepts.append(
            LumaConcept(
                label=f"Variant {len(concepts) + 1}",
                hook_type=brief.hook_type,
                luma_prompt=brief.luma_prompt,
            )
        )

    async with AsyncSessionLocal() as db:
        ad = (await db.execute(select(Ad).where(Ad.id == ad_id))).scalar_one_or_none()
        if not ad:
            raise ValueError(f"Ad not found: {ad_id}")
        thumbnail_url = ad.thumbnail_url

    refresh_ids: list[str] = []
    for concept in concepts[:count]:
        variant_brief = brief.model_copy(
            update={
                "luma_prompt": concept.luma_prompt,
                "hook_type": concept.hook_type,
            }
        )
        refresh_id = f"ref_{ad_id}_{uuid.uuid4().hex[:8]}"

        async with AsyncSessionLocal() as db:
            refresh = Refresh(
                id=refresh_id,
                ad_id=ad_id,
                status=RefreshStatus.generating,
                brief_json=variant_brief.model_dump(),
            )
            db.add(refresh)
            await db.commit()

        refresh_ids.append(refresh_id)
        await _run_variant_job(refresh_id, concept.luma_prompt, thumbnail_url)

    return refresh_ids
