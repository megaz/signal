"""
Beat detection: splits a video into semantic segments (Hook → Build → Product → Payoff → CTA)
using Claude vision on sampled frames + transcript timing.

In production this runs as a background task triggered after ad sync.
"""
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.beat import Beat
from app.services.ai.teardown import run_teardown


async def detect_beats(ad_id: str):
    """Background entry-point; creates beat rows, then scores them.

    Idempotent: skips if beats already exist for this ad.
    """
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Beat).where(Beat.ad_id == ad_id).limit(1))
        if existing.scalar_one_or_none() is not None:
            return
        await run_teardown(ad_id, db)
