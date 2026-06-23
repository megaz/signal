"""
Scores ad fatigue from public signals:
- run_days decay curve (diminishing returns after ~14d)
- reach_bucket degradation
- variant_count (more variants = brand is fighting decay)

Returns a 0–1 health_score and an AdHealth bucket.
"""
from app.models.ad import Ad, AdHealth


_THRESHOLDS = {
    AdHealth.thriving: 0.75,
    AdHealth.aging: 0.50,
    AdHealth.fatiguing: 0.25,
    AdHealth.declining: 0.0,
}


def score_ad(ad: Ad) -> tuple[float, AdHealth]:
    """Return (health_score 0–1, health bucket)."""
    run_score = _run_days_score(ad.run_days)
    variant_penalty = min(0.2, (ad.variant_count - 1) * 0.05)  # many variants = fighting fatigue
    reach_score = _reach_score(ad.reach_bucket)

    raw = (run_score * 0.5) + (reach_score * 0.3) + ((1 - variant_penalty) * 0.2)
    score = max(0.0, min(1.0, raw))

    if score >= _THRESHOLDS[AdHealth.thriving]:
        return score, AdHealth.thriving
    if score >= _THRESHOLDS[AdHealth.aging]:
        return score, AdHealth.aging
    if score >= _THRESHOLDS[AdHealth.fatiguing]:
        return score, AdHealth.fatiguing
    return score, AdHealth.declining


def _run_days_score(run_days: int) -> float:
    """Peak at 14 days, decays after."""
    import math
    if run_days <= 0:
        return 0.5
    # Logistic decay centred at 14d; near-new ads score 0.5 until they prove themselves
    return 1 / (1 + math.exp(0.15 * (run_days - 21)))


def _reach_score(bucket: str | None) -> float:
    return {"high": 1.0, "mid": 0.6, "low": 0.3}.get(bucket or "low", 0.3)
