from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum
from app.core.database import Base


class RefreshStatus(str, enum.Enum):
    pending = "pending"
    generating = "generating"
    ready = "ready"
    approved = "approved"
    shipped = "shipped"
    rejected = "rejected"


class Refresh(Base):
    """A Luma-generated refresh of a fatiguing ad after beat fixes are accepted."""

    __tablename__ = "refreshes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ad_id: Mapped[str] = mapped_column(ForeignKey("ads.id"), nullable=False)
    luma_generation_id: Mapped[str | None] = mapped_column(String)
    video_url: Mapped[str | None] = mapped_column(String)
    brief_json: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[RefreshStatus] = mapped_column(SAEnum(RefreshStatus), default=RefreshStatus.pending)
    reviewer_notes: Mapped[str | None] = mapped_column(Text)
    slack_message_ts: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
