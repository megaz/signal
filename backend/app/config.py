from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    env: str = "development"
    secret_key: str = "changeme"

    # Database — defaults to SQLite for local dev; swap to postgresql+asyncpg:// in production
    database_url: str = "sqlite+aiosqlite:///./pulse.db"
    redis_url: str = "redis://localhost:6379"
    cors_origins: str = "http://localhost:3000"

    # Meta Ad Library
    meta_access_token: str = ""
    meta_api_version: str = "v19.0"

    # TikTok Creative Center
    tiktok_app_id: str = ""
    tiktok_secret: str = ""

    # Apify (TikTok Ad Library scraper — scripts/run_scrape_tiktok_ads.sh)
    apify_token: str = ""

    # Google Trends (no auth needed, via pytrends)
    trends_geo: str = "US"

    # Luma AI
    luma_api_key: str = ""

    # Claude (Anthropic) — beat teardown + fix proposals
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    # Slack handoff
    slack_bot_token: str = ""
    slack_channel_id: str = ""

    # Apify (TikTok scraper script support)
    apify_token: str = ""

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
