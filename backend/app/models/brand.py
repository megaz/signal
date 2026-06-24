from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    meta_page_id: Mapped[str | None] = mapped_column(String)
    tiktok_account_id: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ads: Mapped[list["Ad"]] = relationship("Ad", back_populates="brand")
    tiktok_posts: Mapped[list["TikTokPost"]] = relationship("TikTokPost", back_populates="brand")
