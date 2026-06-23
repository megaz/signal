"""
WebSocket hub for real-time canvas collaboration.
Multiple strategists can see each other's cursor and beat acceptance state live.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict
import json

router = APIRouter()

# canvas_id → list of active connections
_rooms: dict[str, list[WebSocket]] = defaultdict(list)


@router.websocket("/canvas/{ad_id}")
async def canvas_ws(websocket: WebSocket, ad_id: str):
    await websocket.accept()
    _rooms[ad_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # Broadcast to all other connections in this room
            for conn in _rooms[ad_id]:
                if conn is not websocket:
                    await conn.send_text(json.dumps({"from": "peer", **msg}))
    except WebSocketDisconnect:
        _rooms[ad_id].remove(websocket)
        if not _rooms[ad_id]:
            del _rooms[ad_id]
