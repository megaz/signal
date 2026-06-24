from pydantic import BaseModel
from datetime import datetime

from app.schemas.ad import AdNode


class MetricPoint(BaseModel):
    date: datetime
    health_score: float
    spend: float
    impressions: int
    ctr: float
    frequency: float
    cpa: float


class TimeseriesOut(BaseModel):
    range: str
    points: list[MetricPoint]


class KpiTile(BaseModel):
    key: str
    label: str
    value: float
    unit: str               # "$" | "%" | "x" | "" ...
    delta_pct: float | None  # vs the prior period; None when prior == 0
    sparkline: list[float]


class MonitoringAlert(BaseModel):
    ad_id: str
    ad_title: str | None
    severity: str           # "warning" | "critical"
    health: str
    text: str


class MonitoringOverview(BaseModel):
    range: str
    total: int
    health_breakdown: dict[str, int]
    kpis: list[KpiTile]
    alerts: list[MonitoringAlert]


class CreativeRow(BaseModel):
    ad: AdNode
    spend: float
    ctr: float
    frequency: float
    cpa: float
    delta_pct: float | None  # health_score change vs prior period
    sparkline: list[float]   # daily health_score over the range


class CreativesOut(BaseModel):
    range: str
    creatives: list[CreativeRow]
