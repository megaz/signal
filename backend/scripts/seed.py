"""Seed the PULSE database with demo data for the Celsius brand.

Creates one brand ("celsius"), a spread of ads across the four health states,
five narrative beats per ad, and 90 days of daily metric snapshots per ad so the
Monitoring time-series / fatigue charts have real data to render.

Run from the backend/ directory:

    python -m scripts.seed
"""
import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import delete

from app.core.database import AsyncSessionLocal, init_db
from app.models.ad import Ad, AdHealth, AdPlatform
from app.models.beat import Beat, BeatHealth, BeatType
from app.models.brand import Brand
from app.models.metric_snapshot import MetricSnapshot
from app.models.refresh import Refresh  # noqa: F401 — register mapper
from app.models.tiktok_post import TikTokPost  # noqa: F401 — register mapper

BRAND_ID = "celsius"
SNAPSHOT_DAYS = 90
RNG = random.Random(42)

# (title, platform, health, run_days, reach_bucket, variant_count, family)
AD_DEFS = [
    ("Summer Shred Hook 15s",       AdPlatform.meta,   AdHealth.thriving,  12, "high", 4, "shred"),
    ("Summer Shred UGC Remix",      AdPlatform.tiktok, AdHealth.thriving,   9, "high", 4, "shred"),
    ("Gym Energy Pre-Workout",      AdPlatform.meta,   AdHealth.thriving,  18, "mid",  2, "gym"),
    ("Office Focus Story",          AdPlatform.meta,   AdHealth.thriving,  21, "mid",  1, None),
    ("Sparkling Orange Launch",     AdPlatform.meta,   AdHealth.thriving,   7, "high", 3, "flavor"),
    ("Kiwi Guava Flavor Drop",      AdPlatform.tiktok, AdHealth.thriving,   6, "mid",  3, "flavor"),
    ("Athlete Testimonial: Maya",   AdPlatform.meta,   AdHealth.thriving,  15, "high", 2, "athlete"),
    ("Morning Routine Reel",        AdPlatform.tiktok, AdHealth.thriving,  11, "mid",  1, None),
    ("Tropical Vibe TikTok",        AdPlatform.tiktok, AdHealth.thriving,   8, "low",  2, "flavor"),
    ("Live Fit Creator Cut",        AdPlatform.tiktok, AdHealth.thriving,  14, "mid",  2, "athlete"),

    ("Hydration Myth Explainer",    AdPlatform.meta,   AdHealth.aging,     34, "mid",  2, None),
    ("Desk Slump Skit",             AdPlatform.tiktok, AdHealth.aging,     29, "mid",  1, None),
    ("Trainer Tips Carousel",       AdPlatform.meta,   AdHealth.aging,     41, "low",  3, "gym"),
    ("Flavor Lineup Showcase",      AdPlatform.meta,   AdHealth.aging,     37, "mid",  4, "flavor"),
    ("Run Club Recap",              AdPlatform.tiktok, AdHealth.aging,     31, "low",  1, "athlete"),
    ("Founder Story 30s",           AdPlatform.meta,   AdHealth.aging,     45, "low",  1, None),

    ("Discount Testimonial Loop",   AdPlatform.meta,   AdHealth.fatiguing, 58, "high", 5, "promo"),
    ("Before/After Promo",          AdPlatform.meta,   AdHealth.fatiguing, 62, "mid",  3, "promo"),
    ("Generic Gym B-roll",          AdPlatform.tiktok, AdHealth.fatiguing, 54, "mid",  2, "gym"),
    ("Spinning Can Loop",           AdPlatform.meta,   AdHealth.fatiguing, 49, "low",  2, None),
    ("Bulk Deal Banner",            AdPlatform.meta,   AdHealth.fatiguing, 67, "mid",  4, "promo"),

    ("Old Mascot Skit",             AdPlatform.meta,   AdHealth.declining, 88, "low",  1, None),
    ("2023 Holiday Rerun",          AdPlatform.meta,   AdHealth.declining, 95, "low",  2, "promo"),
    ("Stock Footage Montage",       AdPlatform.tiktok, AdHealth.declining, 79, "low",  1, None),
]

HEALTH_SCORE_RANGE = {
    AdHealth.thriving:  (0.82, 0.97),
    AdHealth.aging:     (0.58, 0.74),
    AdHealth.fatiguing: (0.32, 0.49),
    AdHealth.declining: (0.10, 0.28),
}

BASE_SPEND = {"high": (900, 1900), "mid": (250, 850), "low": (60, 220)}
BEAT_TYPES = [BeatType.hook, BeatType.build, BeatType.product, BeatType.payoff, BeatType.cta]

WEAK_DIAGNOSES = {
    BeatType.hook: "Hook takes >2s to land the value prop; viewers drop before the brand reveal.",
    BeatType.build: "Middle drags with generic b-roll and no narrative escalation.",
    BeatType.product: "Product benefit is told, not shown — no on-screen proof.",
    BeatType.payoff: "Payoff is weak; no clear transformation or emotional beat.",
    BeatType.cta: "CTA is a flat discount card with no urgency or motion.",
}

FIXES = {
    BeatType.hook: {
        "description": "Open on a creator stating the benefit in the first 1.5s with bold on-screen text.",
        "rationale": "Front-loading the payoff lifts 3s retention, the strongest fatigue lever.",
        "script_delta": "+ 'The only energy drink that...' overlay at 0:00",
        "trend_hook": "creator-led benefit-first hooks",
    },
    BeatType.build: {
        "description": "Replace b-roll with a fast 3-shot proof sequence escalating intensity.",
        "rationale": "Escalation keeps mid-video attention and primes the payoff.",
        "script_delta": "+ quick-cut workout montage with kinetic captions",
        "trend_hook": "kinetic proof montages",
    },
    BeatType.cta: {
        "description": "End on a motion CTA with scarcity and a tappable sticker.",
        "rationale": "Motion + scarcity CTAs outperform static discount cards.",
        "script_delta": "+ 'Limited drop — tap to grab yours' animated end card",
        "trend_hook": "motion CTA end cards",
    },
}


def _beat_health(ad_score: float, order: int) -> tuple[BeatHealth, float]:
    # Weakest beats cluster in lower-scoring ads; hook/cta degrade first.
    jitter = RNG.uniform(-0.12, 0.12)
    weight = 1.0 if order in (0, 4) else 0.6  # hook & cta degrade fastest
    score = max(0.05, min(0.99, ad_score - (1 - ad_score) * weight * 0.5 + jitter))
    if score >= 0.66:
        return BeatHealth.strong, round(score, 2)
    if score >= 0.4:
        return BeatHealth.weak, round(score, 2)
    return BeatHealth.critical, round(score, 2)


def _trajectory(ad: Ad, t: float) -> dict:
    """Metric values at normalized time t in [0,1] (0 = oldest, 1 = today)."""
    decline = 1.0 - ad.health_score  # how aggressively the creative is decaying
    bucket = ad.reach_bucket or "mid"

    lo, hi = BASE_SPEND[bucket]
    base_spend = lo + (hi - lo) * (0.4 + 0.6 * ad.health_score)
    spend = base_spend * (1 - decline * 0.35 * t) * RNG.uniform(0.9, 1.1)

    base_ctr = 1.0 + 2.2 * ad.health_score          # 1%–3.2%
    ctr = base_ctr * (1 - decline * 0.6 * t) * RNG.uniform(0.93, 1.07)

    frequency = (1.4 + 0.6 * (1 - ad.health_score)) + decline * 4.2 * t
    frequency *= RNG.uniform(0.95, 1.05)

    base_cpa = 14 + 26 * (1 - ad.health_score)       # healthier = cheaper
    cpa = base_cpa * (1 + decline * 1.6 * t) * RNG.uniform(0.94, 1.06)

    start_score = min(0.96, ad.health_score + decline * 0.5)
    health_score = start_score - (start_score - ad.health_score) * t

    impressions = int(spend / max(cpa, 1) * (40 + 60 * ad.health_score))

    return {
        "health_score": round(max(0.03, min(0.99, health_score)), 4),
        "spend": round(max(5.0, spend), 2),
        "impressions": max(0, impressions),
        "ctr": round(max(0.05, ctr), 3),
        "frequency": round(max(1.0, frequency), 3),
        "cpa": round(max(4.0, cpa), 2),
    }


async def seed() -> None:
    await init_db()
    now = datetime.utcnow()

    async with AsyncSessionLocal() as db:
        # Idempotent: wipe any prior Celsius data first (FK-safe order).
        await db.execute(delete(MetricSnapshot).where(MetricSnapshot.brand_id == BRAND_ID))
        await db.execute(delete(Beat).where(Beat.ad_id.like(f"{BRAND_ID}-ad-%")))
        await db.execute(delete(Ad).where(Ad.brand_id == BRAND_ID))
        await db.execute(delete(Brand).where(Brand.id == BRAND_ID))
        await db.commit()

        db.add(Brand(
            id=BRAND_ID,
            name="Celsius",
            meta_page_id="celsius_meta",
            tiktok_account_id="celsiusofficial",
            created_at=now,
        ))

        for i, (title, platform, health, run_days, reach, variants, family) in enumerate(AD_DEFS):
            ad_id = f"{BRAND_ID}-ad-{i:02d}"
            lo, hi = HEALTH_SCORE_RANGE[health]
            score = round(RNG.uniform(lo, hi), 3)
            ad = Ad(
                id=ad_id,
                brand_id=BRAND_ID,
                platform=platform,
                external_id=f"ext-{i:05d}",
                title=title,
                video_url=None,
                thumbnail_url=f"https://picsum.photos/seed/{ad_id}/480/600",
                health=health,
                health_score=score,
                run_days=run_days,
                reach_bucket=reach,
                variant_count=variants,
                creative_family_id=f"{BRAND_ID}-fam-{family}" if family else None,
                started_at=now - timedelta(days=run_days),
                last_seen_at=now,
                fetched_at=now,
            )
            db.add(ad)

            # Beats
            for order, bt in enumerate(BEAT_TYPES):
                bh, bscore = _beat_health(score, order)
                weak = bh != BeatHealth.strong
                db.add(Beat(
                    id=f"{ad_id}-beat-{order}",
                    ad_id=ad_id,
                    beat_type=bt,
                    order=order,
                    start_ms=order * 3000,
                    end_ms=(order + 1) * 3000,
                    health=bh,
                    health_score=bscore,
                    diagnosis=WEAK_DIAGNOSES.get(bt) if weak else None,
                    proposed_fix=FIXES.get(bt) if (weak and bt in FIXES) else None,
                    fix_accepted=False,
                ))

            # 90 daily snapshots
            for d in range(SNAPSHOT_DAYS):
                t = d / (SNAPSHOT_DAYS - 1)
                day = now - timedelta(days=SNAPSHOT_DAYS - 1 - d)
                vals = _trajectory(ad, t)
                db.add(MetricSnapshot(
                    id=f"{ad_id}-snap-{d:03d}",
                    ad_id=ad_id,
                    brand_id=BRAND_ID,
                    captured_at=day.replace(hour=0, minute=0, second=0, microsecond=0),
                    **vals,
                ))

        await db.commit()

    print(f"Seeded brand '{BRAND_ID}' with {len(AD_DEFS)} ads, "
          f"{len(AD_DEFS) * len(BEAT_TYPES)} beats, "
          f"{len(AD_DEFS) * SNAPSHOT_DAYS} metric snapshots.")


if __name__ == "__main__":
    asyncio.run(seed())
