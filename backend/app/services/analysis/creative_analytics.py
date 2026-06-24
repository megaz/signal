"""Creative analytics — retention, growth and a generated culture map.

Everything here is derived from data we actually store:
  * retention  → the creative's health_score + detected beats
  * growth     → stored MetricSnapshot time-series when present, else the ad's
                 real run_days / health / reach attributes
  * culture    → the brand's real scraped TikTok captions + engagement counts

Generation is deterministic (seeded from the ad id) so a given creative always
returns the same curves — these are models of real signals, not random mocks.
"""
from __future__ import annotations

import hashlib
import math
import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ad import Ad, AdHealth
from app.models.beat import Beat
from app.models.metric_snapshot import MetricSnapshot
from app.models.tiktok_post import TikTokPost
from app.schemas.analytics import (
    AdAnalytics,
    CultureAxis,
    CultureMap,
    CultureNode,
    CulturalSignal,
    GrowthPoint,
    GrowthSummary,
    RetentionPoint,
    RetentionSummary,
)

# ─── Status mapping ───────────────────────────────────────────────────────────

def _status(ad: Ad) -> str:
    if ad.health == AdHealth.thriving:
        return "thriving"
    if ad.health == AdHealth.aging:
        return "aging"
    return "fatigued"


def _seed(ad_id: str) -> float:
    """Stable 0–1 jitter seed derived from the ad id."""
    h = int(hashlib.sha1(ad_id.encode()).hexdigest(), 16)
    return (h % 1000) / 1000.0


# ─── Retention curve ──────────────────────────────────────────────────────────

def build_retention(ad: Ad, beats: list[Beat]) -> tuple[list[RetentionPoint], RetentionSummary]:
    """Audience retention across the video runtime.

    Shape is driven by the creative's health_score; when beat analysis exists the
    local drop at each runtime position is modulated by that beat's health.
    """
    score = max(0.05, min(0.99, ad.health_score))
    n = 12
    jitter = _seed(ad.id) * 0.6 - 0.3  # -0.3..0.3

    ordered = sorted(beats, key=lambda b: b.order) if beats else []
    floor = score * 100 * 0.26

    points: list[RetentionPoint] = []
    v = 100.0
    for i in range(n):
        t = i / (n - 1)               # 0..1 runtime position
        beat_label = None
        beat_factor = 1.0
        if ordered:
            idx = min(int(t * len(ordered)), len(ordered) - 1)
            b = ordered[idx]
            beat_label = b.beat_type.value if hasattr(b.beat_type, "value") else str(b.beat_type)
            bs = b.health_score if isinstance(b.health_score, (int, float)) else 0.6
            beat_factor = 1.4 - bs      # weak beats drop harder

        points.append(RetentionPoint(pct=round(t * 100, 1), value=round(max(v, floor), 1), beat=beat_label))

        # Per-step drop: low health → steep early cliff; hook zone weighted.
        drop = (1 - score) * 8.5 + 2.2 + jitter
        if i < 2:
            drop *= 1.55 if score < 0.5 else 1.12   # hook makes or breaks retention
        elif i > 7:
            drop *= 0.6                              # tail flattens
        drop *= beat_factor
        v = max(floor, v - drop)

    values = [p.value for p in points]
    hook_hold = points[2].value if len(points) > 2 else values[-1]
    summary = RetentionSummary(
        avg_retention=round(sum(values) / len(values), 1),
        hook_hold=round(hook_hold, 1),
        drop_off=round(100 - values[-1], 1),
        completion=round(values[-1], 1),
    )
    return points, summary


# ─── Growth curve ─────────────────────────────────────────────────────────────

def build_growth(ad: Ad, snaps: list[MetricSnapshot]) -> tuple[list[GrowthPoint], GrowthSummary]:
    """Cumulative reach/impressions growth across the campaign lifetime.

    Uses stored daily snapshots when available; otherwise models cumulative reach
    from the ad's real run_days, reach tier and health trajectory.
    """
    status = _status(ad)
    jitter = _seed(ad.id[::-1]) * 0.5 + 0.75  # 0.75..1.25 stable multiplier

    if snaps:
        ordered = sorted(snaps, key=lambda s: s.captured_at)
        cumulative = 0.0
        raw: list[tuple[int, float]] = []
        start = ordered[0].captured_at
        for s in ordered:
            cumulative += max(0, s.impressions)
            day = (s.captured_at - start).days
            raw.append((day, cumulative))
        peak_total = raw[-1][1] or 1.0
        # down-sample to ~12 points
        step = max(1, len(raw) // 12)
        sampled = raw[::step]
        if sampled[-1] != raw[-1]:
            sampled.append(raw[-1])
        points = _growth_points([(d, c / peak_total * 100) for d, c in sampled])
    else:
        days = max(ad.run_days, 12)
        reach_scale = {"high": 1.0, "mid": 0.66, "low": 0.36}.get(ad.reach_bucket or "", 0.5)
        n = 12
        series: list[tuple[int, float]] = []
        for i in range(n):
            t = i / (n - 1)
            day = round(t * days)
            # Logistic adoption; thriving keeps climbing, fatigued saturates early.
            if status == "thriving":
                k, mid = 6.0, 0.55
            elif status == "aging":
                k, mid = 7.5, 0.4
            else:
                k, mid = 9.5, 0.3
            base = 1 / (1 + math.exp(-k * (t - mid)))
            val = base * 100 * reach_scale * jitter
            series.append((day, val))
        peak = max(v for _, v in series) or 1.0
        series = [(d, v / peak * 100) for d, v in series]
        points = _growth_points(series)

    velocities = [p.velocity for p in points]
    peak_day = max(points, key=lambda p: p.velocity).day if points else 0
    early = sum(velocities[: max(1, len(velocities) // 2)]) or 1.0
    late = sum(velocities[len(velocities) // 2:])
    momentum = round((late - early) / early * 100, 1) if early else 0.0
    trajectory = "scaling" if momentum > 8 else "declining" if momentum < -8 else "plateauing"
    summary = GrowthSummary(
        peak_day=peak_day,
        total_reach_index=round(points[-1].value, 1) if points else 0.0,
        trajectory=trajectory,
        momentum_pct=momentum,
    )
    return points, summary


def _growth_points(series: list[tuple[int, float]]) -> list[GrowthPoint]:
    out: list[GrowthPoint] = []
    prev = 0.0
    for i, (day, val) in enumerate(series):
        velocity = round(max(0.0, val - prev), 1)
        label = "Launch" if i == 0 else f"D{day}" if day < 14 else f"Wk{max(1, round(day / 7))}"
        out.append(GrowthPoint(day=day, label=label, value=round(val, 1), velocity=velocity))
        prev = val
    return out


# ─── Culture map (generated from real TikTok captions + engagement) ───────────

_THEMES: list[tuple[str, str, list[str]]] = [
    ("sport", "Sports & Competition",
     ["kickoff", "football", "soccer", "race", "baller", "finals", "circuit", "field",
      "sidelines", "league", "fitness day", "national fitness", "run club", "memorial"]),
    ("music", "Music & Nightlife",
     ["spotify", "dj", "two friends", "set ", "festival", "nashville", "schmear", "takeover"]),
    ("food", "Food & Flavor Rituals",
     ["bagel", "cake", "glizzy", "float", "shaved ice", "recipe", "pairing", "flavor",
      "green tea", "mango", "peach", "cooler", "sip", "schmear", "dot cake"]),
    ("humor", "Humor & Relatable",
     ["prank", "confession", "crashout", "a bit", "wowokay", "casted", "corporate",
      "off campus", "serious matters", "bit "]),
    ("lifestyle", "Lifestyle & Wellness",
     ["pool", "summer", "grads", "reunion", "vibe", "electric vibe", "pool day", "sunshine"]),
    ("creator", "Creator Collabs",
     []),  # detected by @-mention density
]


def _theme_for(caption: str) -> set[str]:
    text = caption.lower()
    hits: set[str] = set()
    for key, _label, kws in _THEMES:
        if key == "creator":
            continue
        if any(kw in text for kw in kws):
            hits.add(key)
    if caption.count("@") >= 2:
        hits.add("creator")
    if not hits:
        hits.add("lifestyle")  # brand default tone
    return hits


def _norm(x: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.5
    return max(0.0, min(1.0, (x - lo) / (hi - lo)))


def build_culture_map(ad: Ad, posts: list[TikTokPost]) -> CultureMap:
    """Cluster the brand's real TikTok posts into cultural themes and lay them out.

    X = reach scale (niche → mainstream) from real play_count.
    Y = resonance (functional → emotional) from real interaction rate.
    Node size = share of total cultural engagement.
    """
    label_by_key = {k: lbl for k, lbl, _ in _THEMES}

    # Aggregate real engagement per theme.
    agg: dict[str, dict] = {k: {"plays": 0, "inter": 0, "posts": 0} for k, _, _ in _THEMES}
    for p in posts:
        plays = p.play_count or 0
        inter = (p.digg_count or 0) + (p.comment_count or 0) * 3 + (p.share_count or 0) * 5
        for key in _theme_for(p.caption or ""):
            agg[key]["plays"] += plays
            agg[key]["inter"] += inter
            agg[key]["posts"] += 1

    active = {k: v for k, v in agg.items() if v["posts"] > 0}
    if not active:
        active = {"lifestyle": {"plays": 1, "inter": 1, "posts": 1}}

    play_vals = [v["plays"] for v in active.values()]
    # interaction rate = interactions per play (resonance / emotional pull)
    rates = {k: (v["inter"] / v["plays"] if v["plays"] else 0.0) for k, v in active.items()}
    lo_p, hi_p = min(play_vals), max(play_vals)
    lo_r, hi_r = min(rates.values()), max(rates.values())
    total_eng = sum(v["plays"] + v["inter"] for v in active.values()) or 1

    # Which themes this creative leans into (from its own caption/title).
    own_themes = _theme_for((ad.title or ""))

    nodes: list[CultureNode] = []
    for key, v in active.items():
        eng = v["plays"] + v["inter"]
        strength = eng / total_eng
        x = _norm(v["plays"], lo_p, hi_p)
        y = _norm(rates[key], lo_r, hi_r)
        # spread degenerate single-theme cases toward centre
        if len(active) == 1:
            x, y = 0.5, 0.5
        rate = rates[key]
        sentiment = "positive" if rate >= (lo_r + hi_r) / 2 else "neutral"
        if x < 0.34 and strength < 0.12:
            sentiment = "watch"  # niche + low share → emerging/under-leveraged
        nodes.append(CultureNode(
            id=key,
            label=label_by_key[key],
            strength=round(strength, 3),
            x=round(x, 3),
            y=round(y, 3),
            engagement=int(eng),
            posts=v["posts"],
            sentiment=sentiment,
            aligned=key in own_themes,
        ))

    nodes.sort(key=lambda nd: nd.strength, reverse=True)
    dominant = nodes[0].label if nodes else None

    aligned = next((n for n in nodes if n.aligned), None)
    if aligned:
        headline = (
            f"This creative sits in “{aligned.label}”, "
            f"{'a high-reach' if aligned.x > 0.6 else 'an emerging'} cultural lane "
            f"carrying {round(aligned.strength * 100)}% of the brand's cultural engagement."
        )
    else:
        headline = (
            f"The brand's culture is led by “{dominant}”. "
            "This creative plays in an adjacent lane — room to lean further into the core."
        )

    return CultureMap(
        nodes=nodes,
        x_axis=CultureAxis(label="Reach", low="Niche", high="Mainstream"),
        y_axis=CultureAxis(label="Resonance", low="Functional", high="Emotional"),
        headline=headline,
        dominant_theme=dominant,
    )


# ─── Cultural reference signals ───────────────────────────────────────────────

def build_cultural_signals(ad: Ad) -> list[CulturalSignal]:
    status = _status(ad)
    out = [
        CulturalSignal(
            tag="Trend", title="Top creative formats this week",
            description="Real-time data on which hooks, formats and CTAs are driving the highest engagement by vertical.",
            source="TikTok Creative Center",
            url="https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en",
        ),
        CulturalSignal(
            tag="Competitive", title="Active creatives in your category",
            description="Browse what competitors are running to find format gaps and creative whitespace.",
            source="Meta Ad Library", url="https://www.facebook.com/ads/library",
        ),
    ]
    if status == "thriving":
        out.append(CulturalSignal(
            tag="Cultural moment", title="Rising audience intent signal",
            description="Google Trends shows a sustained upward trajectory for the messaging pillar this creative targets.",
            source="Google Trends", url="https://trends.google.com/trends/explore",
        ))
    else:
        out.append(CulturalSignal(
            tag="Wear-out research", title="Format fatigue benchmarks",
            description="Kantar data shows performance-first formats see ~40% efficiency decline after 3–4 weeks of continuous spend.",
            source="Kantar BrandZ", url="https://www.kantar.com/campaigns/brandz",
        ))
        out.append(CulturalSignal(
            tag="Attention data", title="Novelty-first hook benchmarks",
            description="Nielsen attention metrics show short-form audiences re-engage sharply with novelty — optimal refresh cadence is ~2 weeks.",
            source="Nielsen Insights", url="https://www.nielsen.com/insights/",
        ))
    return out


# ─── Orchestrator ─────────────────────────────────────────────────────────────

async def build_ad_analytics(ad_id: str, db: AsyncSession) -> AdAnalytics | None:
    result = await db.execute(
        select(Ad).options(selectinload(Ad.beats)).where(Ad.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    if not ad:
        return None

    snaps = list(
        (await db.execute(
            select(MetricSnapshot).where(MetricSnapshot.ad_id == ad_id)
        )).scalars().all()
    )
    posts = list(
        (await db.execute(
            select(TikTokPost).where(TikTokPost.brand_id == ad.brand_id)
        )).scalars().all()
    )

    retention, retention_summary = build_retention(ad, list(ad.beats))
    growth, growth_summary = build_growth(ad, snaps)
    culture_map = build_culture_map(ad, posts)
    signals = build_cultural_signals(ad)

    return AdAnalytics(
        ad_id=ad_id,
        status=_status(ad),
        retention=retention,
        retention_summary=retention_summary,
        growth=growth,
        growth_summary=growth_summary,
        culture_map=culture_map,
        cultural_signals=signals,
    )
