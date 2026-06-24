"""
Canvas Plan Advisor: decides whether an ad needs surgical Variations (patch specific beats)
or a Full Recreate (rebuild from scratch), then surfaces visible reasoning to the user.
"""
import asyncio
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.ad import Ad, AdHealth
from app.models.beat import Beat, BeatHealth
from app.schemas.plan import PlanOut
from app.services.ai.utils import parse_json

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM = """You are PULSE, a creative strategist AI.
Given an ad's health data and beat breakdown, decide whether to:
  - "variations": surgically patch 1-2 specific weak beats (keep the rest intact)
  - "full_recreate": rebuild the ad from scratch (too many weak points to patch)

Decision rules:
  - variations → ≤ 2 weak/critical beats AND ad health is not "declining"
  - full_recreate → ≥ 3 weak/critical beats OR health is "declining"

Return JSON only — no markdown, no code fences.
Format:
{
  "strategy": "variations | full_recreate",
  "rationale": "one concise sentence explaining the decision (shown directly to the user)",
  "reasoning_steps": [
    "step 1 — what you observed",
    "step 2 — what that implies",
    "step 3 — therefore the approach"
  ],
  "affected_beat_ids": ["<beat_id>", ...],
  "rebuilt_beats": [
    { "beat_type": "hook", "order": 0, "action": "open with a bold first-person claim about energy..." },
    { "beat_type": "build", "order": 1, "action": "..." },
    { "beat_type": "product", "order": 2, "action": "..." },
    { "beat_type": "payoff", "order": 3, "action": "..." },
    { "beat_type": "cta", "order": 4, "action": "..." }
  ]
}

For "variations": populated affected_beat_ids with the IDs of the weak/critical beats; rebuilt_beats = [].
For "full_recreate": affected_beat_ids = []; rebuilt_beats must contain all 5 beats with specific action descriptions.
reasoning_steps must have exactly 3 entries."""


async def plan_ad(ad_id: str, db: AsyncSession) -> PlanOut | None:
    """Decide Variations vs Full Recreate and return a structured plan with visible reasoning."""
    result = await db.execute(
        select(Ad).options(selectinload(Ad.beats)).where(Ad.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    if not ad:
        return None

    beats = sorted(ad.beats, key=lambda b: b.order)
    weak_beats = [b for b in beats if b.health in (BeatHealth.weak, BeatHealth.critical)]

    beat_summary = "\n".join(
        f"  beat_id={b.id} | {b.beat_type.value} | health={b.health.value} "
        f"(score={b.health_score:.2f}) | diagnosis={b.diagnosis or 'none'}"
        for b in beats
    )

    tags = ad.creative_tags or {}
    prompt = (
        f"Ad health: {ad.health.value} (score={ad.health_score:.2f})\n"
        f"Run days: {ad.run_days}\n"
        f"Weak/critical beats: {len(weak_beats)} of {len(beats)}\n"
        f"Hook dialogue: {tags.get('hook_dialogue', 'unknown')}\n"
        f"Character type: {tags.get('character_type', 'unknown')}\n"
        f"Music style: {tags.get('music_style', 'unknown')}\n\n"
        f"Beats:\n{beat_summary}\n\n"
        "Decide the strategy and return the plan JSON."
    )

    message = await asyncio.wait_for(
        client.messages.create(
            model=settings.anthropic_model,
            max_tokens=800,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        ),
        timeout=30,
    )

    raw = parse_json(message.content[0].text)
    return PlanOut(**raw)
