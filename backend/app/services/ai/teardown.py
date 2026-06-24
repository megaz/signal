"""
Uses Claude to:
1. Decompose an ad video into labelled beats (Hook/Build/Product/Payoff/CTA)
2. Score each beat's health
3. Tag the ad with creative signals (hook_dialogue, music_style, visual_emotion, cta_type, scene_transitions, character_type)
4. Answer co-pilot questions about the ad

One Claude call covers frames (via thumbnail), on-screen text, audio style inference, and image components together.
"""
import asyncio
import uuid
import json
import re
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.models.ad import Ad
from app.models.beat import Beat, BeatType, BeatHealth

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM = """You are PULSE, a creative intelligence analyst for performance ads.
Analyze the provided ad metadata (and thumbnail image if included) in one pass — visual frames, on-screen text, inferred audio, and composition together.
Return JSON only — no markdown, no code fences, no prose. Output must be valid JSON parseable by json.loads().

Format:
{
  "beats": [
    {
      "beat_type": "hook|build|product|payoff|cta",
      "order": 0,
      "start_ms": 0,
      "end_ms": 2000,
      "health": "strong|weak|critical",
      "health_score": 0.0,
      "diagnosis": "one-sentence reason if weak/critical, null if strong"
    }
  ],
  "creative_tags": {
    "hook_dialogue": "opening hook text or question visible or strongly implied by the creative",
    "music_style": "inferred audio style e.g. energetic EDM or lo-fi chill or upbeat pop or trending audio",
    "visual_emotion": "primary emotion conveyed e.g. excitement or trust or urgency or nostalgia or humor",
    "cta_type": "call-to-action category e.g. Shop now or Sign up or Learn more or Follow or Download",
    "scene_transitions": "editing style e.g. quick cuts or smooth dissolves or jump cuts or static hold or mixed",
    "character_type": "talent category e.g. influencer or UGC creator or brand founder or AI avatar or product only or none"
  }
}"""


def _parse_json(text: str) -> dict:
    """Parse Claude's response, stripping any markdown code fences."""
    text = text.strip()
    # Strip ```json ... ``` or ``` ... ``` wrappers
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


def _build_text_block(ad: Ad) -> dict:
    return {
        "type": "text",
        "text": (
            f"Ad title: {ad.title or 'unknown'}\n"
            f"Platform: {ad.platform}\n"
            f"Run days: {ad.run_days}\n"
            f"Health status: {ad.health}\n"
            f"Health score: {ad.health_score:.2f}\n"
            f"Reach bucket: {ad.reach_bucket or 'unknown'}\n"
            + (f"Video URL: {ad.video_url}\n" if ad.video_url else "")
        ),
    }


async def _call_claude(content: list[dict]) -> dict:
    message = await asyncio.wait_for(
        client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1600,
            system=_SYSTEM,
            messages=[{"role": "user", "content": content}],
        ),
        timeout=45,
    )
    return _parse_json(message.content[0].text)


async def run_teardown(ad_id: str, db: AsyncSession) -> list[Beat]:
    """Ask Claude to decompose the ad into scored beats + creative tags, then persist them."""
    result = await db.execute(select(Ad).where(Ad.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        return []

    text_block = _build_text_block(ad)

    # Try with thumbnail image first; fall back to text-only if the URL is inaccessible
    raw: dict | None = None
    if ad.thumbnail_url:
        try:
            content = [
                {"type": "image", "source": {"type": "url", "url": ad.thumbnail_url}},
                text_block,
            ]
            raw = await _call_claude(content)
        except Exception:
            raw = None  # fall through to text-only

    if raw is None:
        raw = await _call_claude([text_block])

    # Persist beats — delete stale first
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

    # Persist creative tags back to the ad
    creative_tags = raw.get("creative_tags")
    if creative_tags:
        ad.creative_tags = creative_tags

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
