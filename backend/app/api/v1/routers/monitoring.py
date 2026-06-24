from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ad import Ad, AdHealth
from app.models.metric_snapshot import MetricSnapshot
from app.schemas.ad import AdNode
from app.schemas.monitoring import (
    CreativeRow,
    CreativesOut,
    KpiTile,
    MetricPoint,
    MonitoringAlert,
    MonitoringOverview,
    TimeseriesOut,
)

router = APIRouter()

_RANGE_DAYS = {"7d": 7, "14d": 14, "30d": 30, "90d": 90}


def _days(rng: str) -> int:
    return _RANGE_DAYS.get(rng, 30)


def _mean(xs: list[float]) -> float:
    return round(sum(xs) / len(xs), 4) if xs else 0.0


def _delta_pct(current: float, prior: float) -> float | None:
    if not prior:
        return None
    return round((current - prior) / prior * 100, 1)


async def _load_snaps(db: AsyncSession, brand_id: str, since: datetime) -> list[MetricSnapshot]:
    result = await db.execute(
        select(MetricSnapshot)
        .where(MetricSnapshot.brand_id == brand_id, MetricSnapshot.captured_at >= since)
        .order_by(MetricSnapshot.captured_at)
    )
    return list(result.scalars().all())


def _daily(snaps: list[MetricSnapshot], reducer) -> list[tuple[datetime, float]]:
    """Bucket snapshots by calendar day and reduce each day's values."""
    buckets: dict[str, list[MetricSnapshot]] = defaultdict(list)
    for s in snaps:
        buckets[s.captured_at.date().isoformat()].append(s)
    return [(datetime.fromisoformat(day), reducer(rows)) for day, rows in sorted(buckets.items())]


@router.get("/{brand_id}/timeseries", response_model=TimeseriesOut)
async def get_timeseries(
    brand_id: str,
    range: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
):
    """Brand-level daily aggregate across all ads — drives the fatigue charts."""
    days = _days(range)
    start = datetime.utcnow() - timedelta(days=days)
    snaps = await _load_snaps(db, brand_id, start)

    buckets: dict[str, list[MetricSnapshot]] = defaultdict(list)
    for s in snaps:
        buckets[s.captured_at.date().isoformat()].append(s)

    points = []
    for day, rows in sorted(buckets.items()):
        points.append(
            MetricPoint(
                date=datetime.fromisoformat(day),
                health_score=_mean([r.health_score for r in rows]),
                spend=round(sum(r.spend for r in rows), 2),
                impressions=sum(r.impressions for r in rows),
                ctr=_mean([r.ctr for r in rows]),
                frequency=_mean([r.frequency for r in rows]),
                cpa=_mean([r.cpa for r in rows]),
            )
        )
    return TimeseriesOut(range=range, points=points)


@router.get("/{brand_id}/overview", response_model=MonitoringOverview)
async def get_overview(
    brand_id: str,
    range: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
):
    days = _days(range)
    now = datetime.utcnow()
    cut_current = now - timedelta(days=days)
    cut_prior = now - timedelta(days=2 * days)

    snaps = await _load_snaps(db, brand_id, cut_prior)
    current = [s for s in snaps if s.captured_at >= cut_current]
    prior = [s for s in snaps if s.captured_at < cut_current]

    ads_result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
    ads = list(ads_result.scalars().all())
    health_breakdown = {h.value: 0 for h in AdHealth}
    for ad in ads:
        health_breakdown[ad.health.value] += 1

    def spark(metric: str) -> list[float]:
        return [round(v, 4) for _, v in _daily(current, lambda rows: _mean([getattr(r, metric) for r in rows]))]

    fatiguing_now = health_breakdown["fatiguing"] + health_breakdown["declining"]
    kpis = [
        KpiTile(
            key="spend",
            label="Spend",
            value=round(sum(s.spend for s in current), 0),
            unit="$",
            delta_pct=_delta_pct(sum(s.spend for s in current), sum(s.spend for s in prior)),
            sparkline=[round(v, 2) for _, v in _daily(current, lambda rows: sum(r.spend for r in rows))],
        ),
        KpiTile(
            key="ctr",
            label="Avg CTR",
            value=round(_mean([s.ctr for s in current]), 2),
            unit="%",
            delta_pct=_delta_pct(_mean([s.ctr for s in current]), _mean([s.ctr for s in prior])),
            sparkline=spark("ctr"),
        ),
        KpiTile(
            key="frequency",
            label="Avg Frequency",
            value=round(_mean([s.frequency for s in current]), 2),
            unit="x",
            delta_pct=_delta_pct(_mean([s.frequency for s in current]), _mean([s.frequency for s in prior])),
            sparkline=spark("frequency"),
        ),
        KpiTile(
            key="fatiguing",
            label="Fatiguing Creatives",
            value=float(fatiguing_now),
            unit="",
            delta_pct=None,
            sparkline=[],
        ),
    ]

    alerts: list[MonitoringAlert] = []
    for ad in ads:
        if ad.health == AdHealth.declining:
            alerts.append(MonitoringAlert(
                ad_id=ad.id, ad_title=ad.title, severity="critical", health=ad.health.value,
                text=f"{ad.title or 'Creative'} is declining — replace before spend is wasted.",
            ))
        elif ad.health == AdHealth.fatiguing:
            alerts.append(MonitoringAlert(
                ad_id=ad.id, ad_title=ad.title, severity="warning", health=ad.health.value,
                text=f"{ad.title or 'Creative'} is fatiguing after {ad.run_days}d — refresh the hook.",
            ))
    alerts.sort(key=lambda a: 0 if a.severity == "critical" else 1)

    return MonitoringOverview(
        range=range,
        total=len(ads),
        health_breakdown=health_breakdown,
        kpis=kpis,
        alerts=alerts,
    )


@router.get("/{brand_id}/creatives", response_model=CreativesOut)
async def get_creatives(
    brand_id: str,
    range: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
):
    """Per-ad rows with an inline health sparkline for the monitoring table."""
    days = _days(range)
    now = datetime.utcnow()
    cut_current = now - timedelta(days=days)
    cut_prior = now - timedelta(days=2 * days)

    ads_result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
    ads = list(ads_result.scalars().all())

    snaps = await _load_snaps(db, brand_id, cut_prior)
    by_ad: dict[str, list[MetricSnapshot]] = defaultdict(list)
    for s in snaps:
        by_ad[s.ad_id].append(s)

    rows: list[CreativeRow] = []
    for ad in ads:
        ad_snaps = by_ad.get(ad.id, [])
        cur = [s for s in ad_snaps if s.captured_at >= cut_current]
        pri = [s for s in ad_snaps if s.captured_at < cut_current]
        latest = cur[-1] if cur else (ad_snaps[-1] if ad_snaps else None)
        rows.append(CreativeRow(
            ad=AdNode.model_validate(ad),
            spend=round(sum(s.spend for s in cur), 0),
            ctr=round(latest.ctr, 2) if latest else 0.0,
            frequency=round(latest.frequency, 2) if latest else 0.0,
            cpa=round(latest.cpa, 2) if latest else 0.0,
            delta_pct=_delta_pct(_mean([s.health_score for s in cur]), _mean([s.health_score for s in pri])),
            sparkline=[round(v, 4) for _, v in _daily(cur, lambda r: _mean([x.health_score for x in r]))],
        ))

    rows.sort(key=lambda r: r.ad.health_score)  # worst first
    return CreativesOut(range=range, creatives=rows)
