"""
Build structured creative briefs from ad + TikTok post intelligence signals.
"""
import json

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.ad import Ad
from app.models.tiktok_post import TikTokPost
from app.schemas.brief import CreativeBrief, LumaConcept

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None

_SYSTEM = """You are PULSE creative strategist. Given ad performance signals and TikTok post context,
produce a structured refresh brief for Luma AI video generation. Respond with JSON only:
{
  "title": "short title",
  "hook_type": "ugc_tag | testimonial | product_demo | collab | trend_react",
  "format_length": "e.g. 15s vertical TikTok",
  "visual_pacing": "describe cut rhythm",
  "creative_direction": "strategist paragraph",
  "luma_prompt": "cinematic 9:16 video prompt, max 200 words, no quotes",
  "performance_rationale": "why refresh now, cite signals",
  "concepts": [
    {"label": "Variant A", "hook_type": "...", "luma_prompt": "..."},
    {"label": "Variant B", "hook_type": "...", "luma_prompt": "..."},
    {"label": "Variant C", "hook_type": "...", "luma_prompt": "..."}
  ]
}
Produce exactly 3 distinct concepts with different hooks."""


async def _find_tiktok_post(db: AsyncSession, ad: Ad) -> TikTokPost | None:
    if ad.external_id:
        result = await db.execute(
            select(TikTokPost).where(
                TikTokPost.brand_id == ad.brand_id,
                TikTokPost.video_id == ad.external_id,
            )
        )
        post = result.scalar_one_or_none()
        if post:
            return post

    posts = (
        await db.execute(select(TikTokPost).where(TikTokPost.brand_id == ad.brand_id))
    ).scalars().all()
    title = (ad.title or "").strip()
    for post in posts:
        caption = post.caption or ""
        if title and (caption.startswith(title) or title == caption[:80]):
            return post
    return None


async def _family_context(db: AsyncSession, ad: Ad) -> str:
    if not ad.creative_family_id:
        return "standalone creative (no family)"
    siblings = (
        await db.execute(
            select(Ad).where(
                Ad.brand_id == ad.brand_id,
                Ad.creative_family_id == ad.creative_family_id,
                Ad.id != ad.id,
            )
        )
    ).scalars().all()
    if not siblings:
        return f"family size: {ad.variant_count} (only member seen)"
    titles = [s.title for s in siblings[:5] if s.title]
    return f"family size: {ad.variant_count}; siblings: {'; '.join(titles)}"


def _fallback_brief(ad: Ad, post: TikTokPost | None) -> CreativeBrief:
    title = (post.caption if post and post.caption else ad.title) or "Untitled ad"
    prompt = (
        f"9:16 TikTok refresh for Celsius energy drink. "
        f"Open with a bold visual hook. {title[:120]}. "
        f"Cinematic lighting, energetic pacing, product visible by second 3."
    )
    concept = LumaConcept(label="Variant A", hook_type="product_demo", luma_prompt=prompt)
    return CreativeBrief(
        ad_id=ad.id,
        title=title[:80],
        hook_type="product_demo",
        format_length="15s vertical TikTok",
        visual_pacing="fast hook, mid-paced product beat",
        creative_direction=f"Refresh fatiguing creative: {title[:100]}",
        luma_prompt=prompt,
        performance_rationale=(
            f"Health={ad.health.value}, score={ad.health_score:.2f}, "
            f"reach={ad.reach_bucket}, run_days={ad.run_days}"
        ),
        concepts=[concept],
    )


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


async def build_creative_brief(ad_id: str, db: AsyncSession | None = None) -> CreativeBrief:
    from app.core.database import AsyncSessionLocal

    async def _build(session: AsyncSession) -> CreativeBrief:
        ad = (await session.execute(select(Ad).where(Ad.id == ad_id))).scalar_one_or_none()
        if not ad:
            raise ValueError(f"Ad not found: {ad_id}")

        post = await _find_tiktok_post(session, ad)
        family = await _family_context(session, ad)

        if not client:
            return _fallback_brief(ad, post)

        engagement = "no TikTok post matched"
        if post:
            engagement = (
                f"plays={post.play_count}, likes={post.digg_count}, "
                f"comments={post.comment_count}, author=@{post.author_username}"
            )

        user_prompt = f"""Ad signals:
- title: {ad.title}
- health: {ad.health.value} (score {ad.health_score:.2f})
- reach_bucket: {ad.reach_bucket}
- run_days: {ad.run_days}
- variant_count: {ad.variant_count}
- creative_family: {family}
- platform: {ad.platform.value}
- thumbnail: {ad.thumbnail_url or 'none'}

TikTok engagement: {engagement}
Caption: {(post.caption if post else ad.title) or 'n/a'}

Build a refresh brief that addresses fatigue while preserving what worked."""

        message = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )

        try:
            raw = json.loads(_strip_code_fences(message.content[0].text))
            concepts = [LumaConcept.model_validate(c) for c in raw.get("concepts", [])]
            return CreativeBrief(
                ad_id=ad.id,
                title=raw.get("title", ad.title or "Untitled"),
                hook_type=raw.get("hook_type", "product_demo"),
                format_length=raw.get("format_length", "15s vertical TikTok"),
                visual_pacing=raw.get("visual_pacing", "moderate"),
                creative_direction=raw.get("creative_direction", ""),
                luma_prompt=raw.get("luma_prompt", ""),
                performance_rationale=raw.get("performance_rationale", ""),
                concepts=concepts,
            )
        except (json.JSONDecodeError, ValueError, KeyError):
            return _fallback_brief(ad, post)

    if db is not None:
        return await _build(db)

    async with AsyncSessionLocal() as session:
        return await _build(session)
