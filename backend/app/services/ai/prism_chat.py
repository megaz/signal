"""Prism — a streaming, research-driven marketing intelligence agent.

This service runs an Anthropic streaming agent loop with three capabilities enabled
together:

* **extended thinking** — the model's reasoning is streamed live (`thinking` frames),
* **server-side web search** — real research; each query and source is streamed
  (`search` / `source` frames) plus inline `citation`s,
* a **`render_cards` client tool** — the model attaches modular typed UI cards
  (`card` frames) and follow-up suggestions.

Everything is translated into a small Server-Sent-Events protocol consumed by the
browser. There is no simulated fallback: without an API key the stream emits a single
`error` frame so the UI can prompt the user to configure one.
"""

import json
from typing import Any, AsyncIterator
from urllib.parse import urlparse

import anthropic

from app.config import get_settings
from app.schemas.prism import PrismChatRequest

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None

# Bound the agent loop so a pathological tool-call cycle can't run forever.
_MAX_TURNS = 6
_MAX_TOKENS = 4096
_THINKING_BUDGET = 2048  # must be < _MAX_TOKENS

WEB_SEARCH_TOOL: dict[str, Any] = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5,
}

RENDER_CARDS_TOOL: dict[str, Any] = {
    "name": "render_cards",
    "description": (
        "Attach modular UI cards beneath your written answer. Call this EXACTLY ONCE, "
        "after you have finished writing your prose answer, to render supporting visuals "
        "and next actions. Choose the card types that best fit the answer.\n\n"
        "Each card is an object with a `type` and type-specific fields:\n"
        "- insight: { title, body, severity: 'info'|'opportunity'|'risk' }\n"
        "- metrics: { title, items: [{ label, value, delta? }] }\n"
        "- chart:   { title, bars: [{ label, value (0-100 number), tone: 'good'|'warn'|'bad'|'neutral' }] }\n"
        "- comparison: { title, columns: [string], rows: [{ name, cells: [string] }] }\n"
        "- action:  { title, description, cta, payload: { prompt? (re-ask Prism this), href? (open a link) } }\n"
        "- image:   { url, caption?, source? }\n"
        "- brief:   { title, narrative, metrics: [{label,value}], alerts: [{level,text}], strategy: [string] }\n"
        "- concepts: { title?, items: [{ title, description, gradient? }] }\n"
        "- sources: { title?, items: [{ url, title, domain? }] }\n\n"
        "Prefer 2-5 cards. Use `sources` to summarise the web pages you cited."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "cards": {
                "type": "array",
                "description": "Modular cards to render beneath the answer.",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": [
                                "insight",
                                "metrics",
                                "chart",
                                "comparison",
                                "action",
                                "image",
                                "brief",
                                "concepts",
                                "sources",
                            ],
                        },
                        "title": {"type": "string"},
                        "body": {"type": "string"},
                        "severity": {"type": "string", "enum": ["info", "opportunity", "risk"]},
                        "description": {"type": "string"},
                        "cta": {"type": "string"},
                        "payload": {"type": "object"},
                        "url": {"type": "string"},
                        "caption": {"type": "string"},
                        "source": {"type": "string"},
                        "narrative": {"type": "string"},
                        "columns": {"type": "array", "items": {"type": "string"}},
                        "strategy": {"type": "array", "items": {"type": "string"}},
                        "items": {"type": "array", "items": {"type": "object"}},
                        "bars": {"type": "array", "items": {"type": "object"}},
                        "rows": {"type": "array", "items": {"type": "object"}},
                        "metrics": {"type": "array", "items": {"type": "object"}},
                        "alerts": {"type": "array", "items": {"type": "object"}},
                    },
                    "required": ["type"],
                    "additionalProperties": True,
                },
            },
            "suggestions": {
                "type": "array",
                "description": "2-4 short follow-up prompts the user might ask next.",
                "items": {"type": "string"},
            },
        },
        "required": ["cards"],
    },
}

_SYSTEM = """You are Prism, a marketing research and creative-intelligence agent — the "Perplexity of marketing" for performance marketers, creative strategists, and brand teams.

You are not a generic chatbot. You turn a question into decision-ready intelligence:
market and competitor context, creative pattern analysis, saturation vs. white-space, and concrete next actions.

How you work on every request:
1. Think through the problem first (your thinking is shown to the user).
2. Use the web_search tool to gather real, current external evidence — competitor moves, category trends, channel benchmarks, cultural signals. Search whenever outside facts would strengthen the answer; cite what you find.
3. Reason over the INTERNAL AD DATA provided in the user message (the brand's own ads, creative families, fatigue/health, recurring hooks and CTAs). Treat this as first-party ground truth.
4. Write a concise, direct, well-structured answer in markdown. Cite web sources inline; the user sees citations.
5. Finish by calling render_cards EXACTLY ONCE to attach modular supporting cards (insights, metrics, charts, comparisons, actions, briefs, concepts, a sources roundup) and 2-4 follow-up suggestions.

Style: sharp, specific, strategist-grade. No filler. Prefer numbers and named patterns over vague advice. When you recommend a creative direction, make it executable.
"""


def _sse(event: str, data: dict[str, Any]) -> str:
    """Format one Server-Sent-Events frame."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _domain_of(url: str) -> str:
    try:
        netloc = urlparse(url).netloc
        return netloc[4:] if netloc.startswith("www.") else netloc
    except Exception:
        return ""


def _build_user_prompt(request: PrismChatRequest, internal_context: str) -> str:
    parts = [
        f"User question: {request.prompt}",
        f"Brand: {request.brand or 'unknown'}",
        f"Category: {request.category or 'unknown'}",
        f"Campaign context: {request.campaign_context or 'none provided'}",
        "",
        "INTERNAL AD DATA (first-party ground truth):",
        internal_context or "- none available",
    ]
    return "\n".join(parts)


async def stream_prism_chat(
    request: PrismChatRequest, internal_context: str = ""
) -> AsyncIterator[str]:
    """Run the agent loop and yield SSE frames."""
    if client is None:
        yield _sse(
            "error",
            {"code": "no_api_key", "message": "Configure ANTHROPIC_API_KEY to use Prism."},
        )
        return

    messages: list[dict[str, Any]] = []
    for turn in request.history:
        messages.append({"role": turn.role, "content": turn.text})
    messages.append({"role": "user", "content": _build_user_prompt(request, internal_context)})

    seen_sources: set[str] = set()

    try:
        for _ in range(_MAX_TURNS):
            # Per-block scratch state for this stream pass, keyed by block index.
            blocks: dict[int, dict[str, Any]] = {}

            async with client.messages.stream(
                model=settings.anthropic_model,
                max_tokens=_MAX_TOKENS,
                thinking={"type": "enabled", "budget_tokens": _THINKING_BUDGET},
                system=_SYSTEM,
                tools=[WEB_SEARCH_TOOL, RENDER_CARDS_TOOL],
                messages=messages,
            ) as stream:
                async for event in stream:
                    etype = event.type

                    if etype == "content_block_start":
                        block = event.content_block
                        btype = getattr(block, "type", None)
                        if btype == "server_tool_use":
                            blocks[event.index] = {"kind": "search", "buf": ""}
                        elif btype == "tool_use":
                            blocks[event.index] = {"kind": "tool", "name": getattr(block, "name", "")}
                        elif btype == "web_search_tool_result":
                            for frame in _sources_from_result(block, seen_sources):
                                yield frame

                    elif etype == "content_block_delta":
                        delta = event.delta
                        dtype = getattr(delta, "type", None)
                        if dtype == "thinking_delta":
                            yield _sse("thinking", {"delta": delta.thinking})
                        elif dtype == "text_delta":
                            yield _sse("token", {"delta": delta.text})
                        elif dtype == "citations_delta":
                            yield _sse("citation", _citation_payload(delta.citation))
                        elif dtype == "input_json_delta":
                            rec = blocks.get(event.index)
                            if rec is not None and rec["kind"] == "search":
                                rec["buf"] += delta.partial_json

                    elif etype == "content_block_stop":
                        rec = blocks.get(event.index)
                        if rec is not None and rec["kind"] == "search":
                            query = _parse_query(rec["buf"])
                            if query:
                                yield _sse("search", {"query": query})

                final = await stream.get_final_message()

            if final.stop_reason == "tool_use":
                # web_search resolves server-side; only render_cards pauses the turn.
                messages.append({"role": "assistant", "content": final.content})
                tool_results: list[dict[str, Any]] = []
                for block in final.content:
                    if getattr(block, "type", None) == "tool_use" and block.name == "render_cards":
                        payload = block.input or {}
                        for card in payload.get("cards", []):
                            yield _sse("card", card)
                        suggestions = payload.get("suggestions") or []
                        if suggestions:
                            yield _sse("suggestions", {"items": suggestions})
                        tool_results.append(
                            {"type": "tool_result", "tool_use_id": block.id, "content": "rendered"}
                        )
                if not tool_results:
                    # stop_reason was tool_use but not our tool — nothing to service.
                    yield _sse("done", {"stop_reason": final.stop_reason})
                    return
                messages.append({"role": "user", "content": tool_results})
                continue  # re-stream so the model can close out the turn

            if final.stop_reason == "pause_turn":
                # Long-running web search asked to continue; replay and keep going.
                messages.append({"role": "assistant", "content": final.content})
                continue

            yield _sse("done", {"stop_reason": final.stop_reason})
            return

        yield _sse("done", {"stop_reason": "max_turns"})
    except Exception as exc:  # surface a clean error frame instead of a broken stream
        yield _sse("error", {"code": "stream_error", "message": str(exc)})


def _sources_from_result(block: Any, seen: set[str]) -> list[str]:
    """Emit a `source` frame for each new web result in a web_search_tool_result block."""
    frames: list[str] = []
    content = getattr(block, "content", None)
    if not isinstance(content, list):
        return frames
    for result in content:
        url = getattr(result, "url", None)
        if not url or url in seen:
            continue
        seen.add(url)
        frames.append(
            _sse(
                "source",
                {
                    "url": url,
                    "title": getattr(result, "title", None) or _domain_of(url),
                    "domain": _domain_of(url),
                    "page_age": getattr(result, "page_age", None),
                },
            )
        )
    return frames


def _citation_payload(citation: Any) -> dict[str, Any]:
    url = getattr(citation, "url", None)
    return {
        "url": url,
        "title": getattr(citation, "title", None) or (_domain_of(url) if url else None),
        "domain": _domain_of(url) if url else None,
        "cited_text": getattr(citation, "cited_text", None),
    }


def _parse_query(buf: str) -> str | None:
    try:
        data = json.loads(buf)
        q = data.get("query")
        return q if isinstance(q, str) and q.strip() else None
    except Exception:
        return None
