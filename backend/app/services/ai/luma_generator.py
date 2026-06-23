"""
Calls Luma AI to generate a refreshed video cut from accepted beat fixes.
Polls until complete, then updates the Refresh row.
"""
import asyncio
import httpx
from app.config import get_settings

settings = get_settings()
LUMA_BASE = "https://api.lumalabs.ai/dream-machine/v1"


async def generate_refresh(refresh_id: str):
    from app.core.database import AsyncSessionLocal
    from app.models.refresh import Refresh, RefreshStatus
    from app.models.beat import Beat
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Refresh).where(Refresh.id == refresh_id))
        refresh = result.scalar_one_or_none()
        if not refresh:
            return

        # Collect accepted fixes to build the generation prompt
        beats_result = await db.execute(
            select(Beat).where(Beat.ad_id == refresh.ad_id, Beat.fix_accepted == True)  # noqa: E712
        )
        accepted = beats_result.scalars().all()
        script_parts = [b.proposed_fix.get("script_delta", "") for b in accepted if b.proposed_fix]
        prompt = " ".join(script_parts) or "Refresh this ad with improved pacing and hook."

        try:
            generation_id = await _submit_luma(prompt)
            refresh.luma_generation_id = generation_id
            await db.commit()

            video_url = await _poll_luma(generation_id)
            refresh.video_url = video_url
            refresh.status = RefreshStatus.ready
        except Exception:
            refresh.status = RefreshStatus.rejected  # mark failed so UI can retry
        finally:
            await db.commit()


async def _submit_luma(prompt: str) -> str:
    headers = {"Authorization": f"Bearer {settings.luma_api_key}", "Content-Type": "application/json"}
    payload = {"prompt": prompt, "loop": False, "aspect_ratio": "9:16"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{LUMA_BASE}/generations", json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()["id"]


async def _poll_luma(generation_id: str, max_wait: int = 300) -> str:
    headers = {"Authorization": f"Bearer {settings.luma_api_key}"}
    url = f"{LUMA_BASE}/generations/{generation_id}"
    elapsed = 0
    async with httpx.AsyncClient(timeout=10) as client:
        while elapsed < max_wait:
            resp = await client.get(url, headers=headers)
            data = resp.json()
            if data.get("state") == "completed":
                return data["assets"]["video"]
            if data.get("state") == "failed":
                raise RuntimeError("Luma generation failed")
            await asyncio.sleep(5)
            elapsed += 5
    raise TimeoutError("Luma generation timed out")
