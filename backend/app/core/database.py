from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False via connect_args
_is_sqlite = settings.database_url.startswith("sqlite")
engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if not _is_sqlite:
            await conn.execute(
                text("ALTER TABLE refreshes ADD COLUMN IF NOT EXISTS brief_json JSONB")
            )
        else:
            try:
                await conn.execute(text("ALTER TABLE refreshes ADD COLUMN brief_json JSON"))
            except Exception:
                pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
