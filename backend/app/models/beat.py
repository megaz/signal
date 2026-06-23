from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import enum
from app.core.database import Base


class BeatType(str, enum.Enum):
    hook = "hook"
    build = "build"
    product = "product"
    payoff = "payoff"
    cta = "cta"


class BeatHealth(str, enum.Enum):
    strong = "strong"
    weak = "weak"
    critical = "critical"


class Beat(Base):
    __tablename__ = "beats"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ad_id: Mapped[str] = mapped_column(ForeignKey("ads.id"), nullable=False)
    beat_type: Mapped[BeatType] = mapped_column(SAEnum(BeatType))
    order: Mapped[int] = mapped_column(Integer)                  # position in sequence
    start_ms: Mapped[int | None] = mapped_column(Integer)        # timestamp in source video
    end_ms: Mapped[int | None] = mapped_column(Integer)
    health: Mapped[BeatHealth] = mapped_column(SAEnum(BeatHealth), default=BeatHealth.strong)
    health_score: Mapped[float] = mapped_column(Float, default=1.0)
    diagnosis: Mapped[str | None] = mapped_column(Text)          # AI-generated why it's weak
    proposed_fix: Mapped[dict | None] = mapped_column(JSON)      # {description, script_delta}
    fix_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ad: Mapped["Ad"] = relationship("Ad", back_populates="beats")
