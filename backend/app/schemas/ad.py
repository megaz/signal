from pydantic import BaseModel
from datetime import datetime
from app.models.ad import AdHealth, AdPlatform


class AdBase(BaseModel):
    id: str
    brand_id: str
    platform: AdPlatform
    title: str | None
    thumbnail_url: str | None
    health: AdHealth
    health_score: float
    run_days: int
    reach_bucket: str | None
    variant_count: int
    creative_family_id: str | None


class AdNode(AdBase):
    """Minimal payload for the Web screen — avoids sending beat data."""
    started_at: datetime | None
    last_seen_at: datetime | None

    class Config:
        from_attributes = True


class AdDetail(AdBase):
    video_url: str | None
    beats: list["BeatOut"]

    class Config:
        from_attributes = True


from app.schemas.beat import BeatOut  # noqa: E402 — deferred to avoid circular
AdDetail.model_rebuild()
