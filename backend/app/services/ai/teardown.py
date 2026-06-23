"""
Uses Claude to:
1. Decompose an ad video into labelled beats (Hook/Build/Product/Payoff/CTA)
2. Score each beat's health
3. Answer co-pilot questions about the ad
"""
import uuid
import json
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.models.ad import Ad
from app.models.beat import Beat, BeatType, BeatHealth

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM = """You are PULSE, a creative intelligence assistant specializing in ad performance analysis.
When asked to tear down an ad, respond with JSON only — no prose.
Format:
{
  "beats": [
    {
      "beat_type": "hook|build|product|payoff|cta",
      "order": 0,
      "start_ms": 0,
      "end_ms": 2000,
      "health": "strong|weak|critical",
      "health_score": 0.0-1.0,
      "diagnosis": "one-sentence reason if weak/critical"
    }
  ]
}"""


async def run_teardown(ad_id: str, db: AsyncSession) -> list[Beat]:
    """Ask Claude to decompose the ad into scored beats and persist them."""
    result = await db.execute(select(Ad).where(Ad.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        return []

    # Build user prompt — include video URL if available; otherwise use title/metadata
    user_content = f"Tear down this ad into creative beats.\nAd title: {ad.title or 'unknown'}"
    if ad.video_url:
        user_content += f"\nVideo URL: {ad.video_url}"

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=_SYSTEM,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = json.loads(message.content[0].text)

    # Delete stale beats for this ad
    existing = await db.execute(select(Beat).where(Beat.ad_id == ad_id))
    for b in existing.scalars().all():
        await db.delete(b)

    beats: list[Beat] = []
    for item in raw.get("beats", []):
        beat = Beat(
            id=str(uuid.uuid4()),
            ad_id=ad_id,
            beat_type=BeatType(item["beat_type"]),
            order=item["order"],
            start_ms=item.get("start_ms"),
            end_ms=item.get("end_ms"),
            health=BeatHealth(item.get("health", "strong")),
            health_score=item.get("health_score", 1.0),
            diagnosis=item.get("diagnosis"),
        )
        db.add(beat)
        beats.append(beat)

    await db.commit()
    return beats


async def ask_copilot(ad_id: str, question: str) -> str:
    """Free-form Q&A for the in-canvas AI co-pilot."""
    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        system="You are a creative strategist co-pilot. Answer concisely about the ad's performance and creative choices.",
        messages=[{"role": "user", "content": f"Ad ID: {ad_id}\n\nQuestion: {question}"}],
    )
    return message.content[0].text
