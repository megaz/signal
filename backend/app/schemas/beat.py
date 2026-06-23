from pydantic import BaseModel
from app.models.beat import BeatType, BeatHealth


class BeatOut(BaseModel):
    id: str
    beat_type: BeatType
    order: int
    start_ms: int | None
    end_ms: int | None
    health: BeatHealth
    health_score: float
    diagnosis: str | None
    proposed_fix: dict | None
    fix_accepted: bool

    class Config:
        from_attributes = True


class AcceptFixRequest(BaseModel):
    beat_id: str
