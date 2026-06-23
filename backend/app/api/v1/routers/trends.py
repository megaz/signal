from fastapi import APIRouter, Query
from app.services.ingestion.google_trends import fetch_trends

router = APIRouter()


@router.get("/")
async def get_trends(keywords: list[str] = Query(...), geo: str = Query("US")):
    """Return Google Trends interest-over-time for given keywords."""
    data = await fetch_trends(keywords, geo)
    return {"data": data}
