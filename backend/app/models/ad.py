from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum
from app.core.database import Base


class AdHealth(str, enum.Enum):
    thriving = "thriving"
    aging = "aging"
    fatiguing = "fatiguing"
    declining = "declining"


class AdPlatform(str, enum.Enum):
    meta = "meta"
    tiktok = "tiktok"


class Ad(Base):
    __tablename__ = "ads"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id"), nullable=False)
    platform: Mapped[AdPlatform] = mapped_column(SAEnum(AdPlatform))
    external_id: Mapped[str] = mapped_column(String)           # Meta/TikTok ad ID
    title: Mapped[str | None] = mapped_column(String)
    video_url: Mapped[str | None] = mapped_column(String)
    thumbnail_url: Mapped[str | None] = mapped_column(String)
    health: Mapped[AdHealth] = mapped_column(SAEnum(AdHealth), default=AdHealth.thriving)
    health_score: Mapped[float] = mapped_column(Float, default=1.0)  # 0–1
    run_days: Mapped[int] = mapped_column(Integer, default=0)         # proxy for performance
    reach_bucket: Mapped[str | None] = mapped_column(String)          # low/mid/high from platform
    variant_count: Mapped[int] = mapped_column(Integer, default=1)
    creative_family_id: Mapped[str | None] = mapped_column(String)    # groups related variants
    creative_tags: Mapped[dict | None] = mapped_column(JSON)          # hook_dialogue, music_style, visual_emotion, cta_type, scene_transitions, character_type
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    brand: Mapped["Brand"] = relationship("Brand", back_populates="ads")
    beats: Mapped[list["Beat"]] = relationship("Beat", back_populates="ad", cascade="all, delete-orphan")
