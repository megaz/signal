"""Build a compact first-party context block for Prism from the brand's stored ads.

This is injected into the user message so the agent reasons over real internal ad data
(creative families, fatigue/health, recurring hooks/CTAs) alongside live web research.
"""

from collections import Counter
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ad import Ad
from app.models.brand import Brand

_MAX_ADS = 18


async def build_internal_context(db: AsyncSession, brand_name: str | None) -> str:
    """Return a text summary of the brand's ads, or "" when nothing is on file."""
    if not brand_name:
        return ""

    brand = (
        await db.execute(select(Brand).where(func.lower(Brand.name) == brand_name.lower()))
    ).scalar_one_or_none()
    if brand is None:
        return ""

    ads = (
        (
            await db.execute(
                select(Ad)
                .where(Ad.brand_id == brand.id)
                .order_by(Ad.fetched_at.desc())
                .limit(_MAX_ADS)
            )
        )
        .scalars()
        .all()
    )
    if not ads:
        return f"Brand '{brand.name}' is on file but has no ads ingested yet."

    health_counts = Counter(_enum_val(a.health) for a in ads)
    families = {a.creative_family_id for a in ads if a.creative_family_id}
    hooks = _top_tag(ads, "hook_dialogue")
    ctas = _top_tag(ads, "cta_type")
    emotions = _top_tag(ads, "visual_emotion")

    lines = [
        f"Brand: {brand.name} (id={brand.id})",
        f"Ads on file (most recent {len(ads)}): "
        + ", ".join(f"{k}={v}" for k, v in health_counts.items()),
        f"Distinct creative families: {len(families)}",
    ]
    if ctas:
        lines.append("Most common CTA types: " + ", ".join(ctas))
    if emotions:
        lines.append("Most common visual emotions: " + ", ".join(emotions))
    if hooks:
        lines.append("Recurring hooks: " + "; ".join(hooks))

    lines.append("Recent ads (cite as internal sources via href /ads/<id>):")
    for a in ads[:12]:
        tags = a.creative_tags or {}
        descriptor = " · ".join(
            str(v) for v in (tags.get("cta_type"), tags.get("visual_emotion")) if v
        )
        lines.append(
            f"- [{a.id}] {(a.title or 'untitled')[:70]} | {_enum_val(a.platform)} | "
            f"{_enum_val(a.health)} (score {a.health_score:.2f}, {a.run_days}d run, "
            f"{a.variant_count} variants){(' | ' + descriptor) if descriptor else ''}"
        )

    return "\n".join(lines)


def _enum_val(v: Any) -> str:
    return getattr(v, "value", v) if v is not None else "unknown"


def _top_tag(ads: list[Ad], key: str, limit: int = 4) -> list[str]:
    counter: Counter[str] = Counter()
    for a in ads:
        tags = a.creative_tags or {}
        val = tags.get(key)
        if isinstance(val, str) and val.strip():
            counter[val.strip()] += 1
    return [val for val, _ in counter.most_common(limit)]
