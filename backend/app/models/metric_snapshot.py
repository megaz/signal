from sqlalchemy import String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.core.database import Base


class MetricSnapshot(Base):
    """A daily performance snapshot for a single ad.

    Powers the Monitoring screen's time-series / fatigue charts. Seeded for the
    demo brand; in production these would be written by the ingestion pipeline.
    """

    __tablename__ = "metric_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ad_id: Mapped[str] = mapped_column(ForeignKey("ads.id"), nullable=False, index=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id"), nullable=False, index=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)

    health_score: Mapped[float] = mapped_column(Float, default=1.0)   # 0–1
    spend: Mapped[float] = mapped_column(Float, default=0.0)          # USD/day
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    ctr: Mapped[float] = mapped_column(Float, default=0.0)            # %
    frequency: Mapped[float] = mapped_column(Float, default=0.0)      # avg impressions / user
    cpa: Mapped[float] = mapped_column(Float, default=0.0)            # USD

    ad: Mapped["Ad"] = relationship("Ad")
