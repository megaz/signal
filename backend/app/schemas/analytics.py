"""Schemas for creative analytics — retention, growth and the culture map.

These power the graphs and the generated culture map on the ad detail page and
are designed to be reused anywhere a creative's performance + cultural context
needs to be visualised.
"""
from pydantic import BaseModel


class RetentionPoint(BaseModel):
    """A single point on the audience-retention curve over the creative runtime."""
    pct: float          # 0–100, position through the video runtime
    value: float        # 0–100, % of viewers still watching
    beat: str | None = None  # beat type covering this position, if known


class GrowthPoint(BaseModel):
    """A single point on the cumulative reach/impressions growth curve."""
    day: int            # days since launch
    label: str          # short axis label, e.g. "Wk 2"
    value: float        # 0–100 indexed cumulative reach
    velocity: float     # day-over-day growth rate (indexed)


class CultureNode(BaseModel):
    """One cultural theme cluster positioned on the culture map."""
    id: str
    label: str
    strength: float     # 0–1, share of cultural engagement
    x: float            # 0–1, niche → mainstream (reach)
    y: float            # 0–1, functional → emotional (resonance)
    engagement: int     # aggregate real engagement behind this theme
    posts: int          # number of real posts in the cluster
    sentiment: str      # "positive" | "neutral" | "watch"
    aligned: bool       # whether this creative leans into this theme


class CultureAxis(BaseModel):
    label: str
    low: str
    high: str


class CultureMap(BaseModel):
    """A generated 2-D map of the brand's cultural footprint."""
    nodes: list[CultureNode]
    x_axis: CultureAxis
    y_axis: CultureAxis
    headline: str       # one-line generated read on cultural position
    dominant_theme: str | None


class CulturalSignal(BaseModel):
    """An external cultural / market reference relevant to this creative."""
    tag: str
    title: str
    description: str
    source: str
    url: str


class RetentionSummary(BaseModel):
    avg_retention: float    # 0–100
    hook_hold: float        # 0–100, retention at end of hook
    drop_off: float         # 0–100, total drop across runtime
    completion: float       # 0–100, retention at the end


class GrowthSummary(BaseModel):
    peak_day: int           # day of fastest growth
    total_reach_index: float  # final cumulative index 0–100
    trajectory: str         # "scaling" | "plateauing" | "declining"
    momentum_pct: float     # recent growth velocity vs early, %


class AdAnalytics(BaseModel):
    ad_id: str
    status: str             # thriving | aging | fatigued
    retention: list[RetentionPoint]
    retention_summary: RetentionSummary
    growth: list[GrowthPoint]
    growth_summary: GrowthSummary
    culture_map: CultureMap
    cultural_signals: list[CulturalSignal]
