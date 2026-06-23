"""
Posts approved refreshes to a Slack channel for campaign manager handoff.
"""
import httpx
from app.config import get_settings

settings = get_settings()


async def notify_slack(refresh_id: str):
    from app.core.database import AsyncSessionLocal
    from app.models.refresh import Refresh, RefreshStatus
    from app.models.ad import Ad
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Refresh).where(Refresh.id == refresh_id))
        refresh = result.scalar_one_or_none()
        if not refresh:
            return

        ad_result = await db.execute(select(Ad).where(Ad.id == refresh.ad_id))
        ad = ad_result.scalar_one_or_none()
        ad_title = ad.title if ad else refresh.ad_id

        blocks = [
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*PULSE — Refreshed cut approved* :white_check_mark:\n*Ad:* {ad_title}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Reviewer notes:* {refresh.reviewer_notes or '—'}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Video:* {refresh.video_url or 'pending upload'}"}},
            {"type": "divider"},
        ]

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {settings.slack_bot_token}"},
                json={"channel": settings.slack_channel_id, "blocks": blocks},
            )
            data = resp.json()
            if data.get("ok"):
                refresh.slack_message_ts = data.get("ts")
                refresh.status = RefreshStatus.shipped
                await db.commit()
