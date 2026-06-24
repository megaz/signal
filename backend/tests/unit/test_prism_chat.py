import asyncio

from app.schemas.prism import PrismChatRequest
from app.services.ai import prism_chat


def test_render_cards_tool_contract():
    schema = prism_chat.RENDER_CARDS_TOOL["input_schema"]
    card_types = set(schema["properties"]["cards"]["items"]["properties"]["type"]["enum"])
    assert {
        "insight",
        "metrics",
        "chart",
        "comparison",
        "action",
        "image",
        "brief",
        "concepts",
        "sources",
    } <= card_types
    assert prism_chat.WEB_SEARCH_TOOL["type"] == "web_search_20250305"


def test_sse_frame_format():
    frame = prism_chat._sse("token", {"delta": "hi"})
    assert frame.startswith("event: token\n")
    assert frame.endswith("\n\n")
    assert '"delta": "hi"' in frame


def test_no_api_key_yields_single_error_frame(monkeypatch):
    """Without a configured key the stream emits exactly one no_api_key error frame."""
    monkeypatch.setattr(prism_chat, "client", None)

    async def collect():
        return [frame async for frame in prism_chat.stream_prism_chat(PrismChatRequest(prompt="hi"))]

    frames = asyncio.run(collect())
    assert len(frames) == 1
    assert frames[0].startswith("event: error\n")
    assert "no_api_key" in frames[0]
