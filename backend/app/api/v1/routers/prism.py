from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.prism import PrismChatRequest
from app.services.ai.prism_chat import stream_prism_chat
from app.services.ai.prism_context import build_internal_context

router = APIRouter()


@router.post("/chat")
async def prism_chat(request: PrismChatRequest, db: AsyncSession = Depends(get_db)):
    """Stream a Prism answer as Server-Sent Events.

    The internal ad context is resolved up front (while the DB session is open) and
    passed into the streaming generator, which then talks to Anthropic and emits
    `thinking` / `search` / `source` / `token` / `citation` / `card` / `suggestions` /
    `done` / `error` frames.
    """
    internal_context = await build_internal_context(db, request.brand)

    return StreamingResponse(
        stream_prism_chat(request, internal_context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable proxy buffering so frames flush live
        },
    )
