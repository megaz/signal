import pytest
from unittest.mock import MagicMock
from app.services.analysis.fatigue_scorer import score_ad
from app.models.ad import AdHealth


def make_ad(run_days=0, reach_bucket="high", variant_count=1):
    ad = MagicMock()
    ad.run_days = run_days
    ad.reach_bucket = reach_bucket
    ad.variant_count = variant_count
    return ad


def test_new_high_reach_ad_is_thriving():
    score, health = score_ad(make_ad(run_days=3, reach_bucket="high"))
    assert health == AdHealth.thriving


def test_long_running_ad_declines():
    score, health = score_ad(make_ad(run_days=60, reach_bucket="low"))
    assert health in (AdHealth.fatiguing, AdHealth.declining)


def test_many_variants_penalise_score():
    score_few, _ = score_ad(make_ad(run_days=10, reach_bucket="high", variant_count=1))
    score_many, _ = score_ad(make_ad(run_days=10, reach_bucket="high", variant_count=8))
    assert score_few > score_many
