from app.schemas.radar import RadarChatEnvelope, RadarChatRequest
from app.services.ai.radar_chat import run_radar_chat
from fastapi import APIRouter

router = APIRouter()


@router.post("/chat", response_model=RadarChatEnvelope)
async def radar_chat(request: RadarChatRequest):
    mode, result = await run_radar_chat(request)
    return {
        "ok": True,
        "source": "meta_ad_library",
        "mode": mode,
        "result": result,
    }
