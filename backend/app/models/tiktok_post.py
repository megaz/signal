from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TikTokPost(Base):
    __tablename__ = "tiktok_posts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id"), nullable=False)
    video_id: Mapped[str] = mapped_column(String, nullable=False)
    web_video_url: Mapped[str | None] = mapped_column(String)
    caption: Mapped[str | None] = mapped_column(Text)
    author_username: Mapped[str | None] = mapped_column(String)
    play_count: Mapped[int | None] = mapped_column(Integer)
    digg_count: Mapped[int | None] = mapped_column(Integer)
    comment_count: Mapped[int | None] = mapped_column(Integer)
    share_count: Mapped[int | None] = mapped_column(Integer)
    raw_post: Mapped[str | None] = mapped_column(Text)
    comments_json: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    brand: Mapped["Brand"] = relationship("Brand", back_populates="tiktok_posts")
