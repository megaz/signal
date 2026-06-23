"""
Google Trends via pytrends (no auth required).
Used to surface culturally-rising signals for the Canvas fix proposals.
"""
import asyncio
from functools import partial
from pytrends.request import TrendReq


def _blocking_fetch(keywords: list[str], geo: str) -> dict:
    pt = TrendReq(hl="en-US", tz=360)
    pt.build_payload(keywords, cat=0, timeframe="now 7-d", geo=geo)
    df = pt.interest_over_time()
    if df.empty:
        return {}
    return df.drop(columns=["isPartial"], errors="ignore").tail(7).to_dict()


async def fetch_trends(keywords: list[str], geo: str = "US") -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_blocking_fetch, keywords, geo))
