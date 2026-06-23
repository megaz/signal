from pydantic import BaseModel
from app.models.refresh import RefreshStatus


class RefreshOut(BaseModel):
    id: str
    ad_id: str
    video_url: str | None
    status: RefreshStatus
    reviewer_notes: str | None

    class Config:
        from_attributes = True


class ApproveRequest(BaseModel):
    notes: str | None = None


class RejectRequest(BaseModel):
    notes: str
