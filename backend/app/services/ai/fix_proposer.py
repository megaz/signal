"""
Given a weak beat, proposes a targeted creative fix using Claude.
The fix is tied to rising trend signals so it's culturally grounded, not generic.
"""
import asyncio
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.models.beat import Beat
from app.services.ingestion.google_trends import fetch_trends
from app.services.ai.utils import parse_json

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM = """You are PULSE. Given a weak ad beat and rising trend signals,
propose ONE specific, actionable creative fix. Respond with JSON only:
{
  "description": "clear one-sentence fix",
  "rationale": "why this fixes the specific weakness",
  "script_delta": "the new line/action replacing the weak beat (max 30 words)",
  "trend_hook": "which trend signal this taps"
}"""


async def propose_fix(beat_id: str, db: AsyncSession) -> dict:
    result = await db.execute(select(Beat).where(Beat.id == beat_id))
    beat = result.scalar_one_or_none()
    if not beat:
        return {}

    # Pull a relevant trend as grounding signal — non-fatal if pytrends is unavailable
    try:
        trends = await asyncio.wait_for(
            fetch_trends(["brand storytelling", "authentic ads"]), timeout=10
        )
        trend_summary = str(list(trends.keys())[:3]) if trends else "no trend data"
    except Exception:
        trend_summary = "no trend data"

    prompt = (
        f"Beat type: {beat.beat_type.value}\n"
        f"Health: {beat.health.value} (score: {beat.health_score:.2f})\n"
        f"Diagnosis: {beat.diagnosis or 'not specified'}\n"
        f"Rising trends: {trend_summary}\n"
        "Propose a fix."
    )

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    fix = parse_json(message.content[0].text)

    # Persist to the beat row
    beat.proposed_fix = fix
    await db.commit()

    return fix
