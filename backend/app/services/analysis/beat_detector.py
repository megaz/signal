"""
Beat detection: splits a video into semantic segments (Hook → Build → Product → Payoff → CTA)
using Claude vision on sampled frames + transcript timing.

In production this runs as a background task triggered after ad sync.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad
from app.models.beat import Beat, BeatType, BeatHealth
from app.services.ai.teardown import run_teardown


_BEAT_ORDER = [BeatType.hook, BeatType.build, BeatType.product, BeatType.payoff, BeatType.cta]


async def detect_beats(ad_id: str):
    """Background entry-point; creates beat rows, then scores them."""
    async with AsyncSessionLocal() as db:
        await run_teardown(ad_id, db)
