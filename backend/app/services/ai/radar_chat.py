import asyncio
import json
from typing import Any

import anthropic

from app.config import get_settings
from app.schemas.radar import RadarChatRequest, RadarResponse

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None

_SYSTEM = """You are Creative Genome Radar, a creative intelligence engine for performance marketers, creative strategists, and agencies.

You do not behave like a generic chatbot.
You turn scattered ad signals into:
1. creative pattern intelligence
2. saturation and white-space detection
3. a recommended creative territory
4. a structured brief
5. Luma-ready concepts

For this backend, use one source only: Meta Ad Library signals.
Do not claim to use TikTok, Google Trends, GDELT, benchmarks, or any other source unless the input explicitly contains that text. Default source is Meta-only.

Always move through this logic:
1. detect user intent
2. map the creative genome
3. cluster recurring patterns
4. measure saturation and rising signals
5. identify white-space opportunity
6. recommend the next creative territory
7. generate a creative brief
8. produce Luma-ready concepts only when requested

Return valid JSON only in this exact shape:
{
  "text": "short direct answer",
  "thinking": ["step 1 reasoning", "step 2 reasoning", "step 3 reasoning"],
  "widget": "genome_map | saturation_chart | opportunity_scorecard | competitor_matrix | creative_brief | luma_concepts",
  "brief": {
    "title": "brief title",
    "narrative": "short strategy explanation",
    "metrics": [
      { "label": "Creative Opportunity Score", "value": "82" },
      { "label": "Fatigue Risk Score", "value": "61" },
      { "label": "Brand Fit Score", "value": "74" }
    ],
    "alerts": [
      { "level": "Saturation", "text": "Competitors are overusing testimonial hooks with discount CTA endings." },
      { "level": "Opportunity", "text": "Creator-led authority explainers are rising but still underused in this category." }
    ],
    "strategy": [
      "Avoid the saturated pattern",
      "Own the underused rising pattern",
      "Generate 3 Luma concepts around that territory"
    ]
  },
  "backendTrace": {
    "mode": "Creative Genome Radar pipeline",
    "inputs": [
      "brand/category/user prompt",
      "meta ad library signals",
      "campaign performance context"
    ],
    "pipeline": [
      "Intent parser -> classify request",
      "Genome classifier -> extract hook/format/CTA/emotion/proof style",
      "Pattern engine -> cluster repeated creative DNA",
      "Saturation model -> detect overused and rising territory",
      "Opportunity scorer -> rank white-space options",
      "Brief generator -> create strategist-ready brief",
      "Concept generator -> prepare Luma-ready directions"
    ],
    "assumptions": [
      "Meta Ad Library signals are partial",
      "Engagement proxies are directional, not exact",
      "Brand-safe output is prioritized"
    ],
    "confidence": "0.89 high",
    "output": "decision-ready Meta-only brief"
  },
  "suggestions": [
    "Show saturated patterns",
    "Find white-space opportunity",
    "Generate 3 Luma concepts",
    "Open the creative brief"
  ],
  "editSuggestions": [
    {
      "id": "open-saturation-view",
      "title": "Open saturation view",
      "description": "Show the overused hooks, formats, and CTA clusters first.",
      "action": {
        "type": "widget",
        "payload": { "widget": "saturation_chart" }
      }
    },
    {
      "id": "shift-to-white-space",
      "title": "Shift to white-space opportunity",
      "description": "Prioritize underused but rising creative territory.",
      "action": {
        "type": "widget",
        "payload": { "widget": "opportunity_scorecard" }
      }
    },
    {
      "id": "generate-luma-brief",
      "title": "Generate Luma brief",
      "description": "Turn the top-ranked opportunity into a creative brief and generation prompt.",
      "action": {
        "type": "widget",
        "payload": { "widget": "creative_brief" }
      }
    }
  ]
}"""


async def run_radar_chat(request: RadarChatRequest) -> tuple[str, RadarResponse]:
    if client is None:
        return "fallback", _build_fallback_response(request)

    try:
        message = await asyncio.wait_for(
            client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1600,
                system=_SYSTEM,
                messages=[{"role": "user", "content": _build_user_prompt(request)}],
            ),
            timeout=30,  # bound the live call so a network stall can't hang the request
        )
        raw_text = _extract_text(message)
        parsed = json.loads(_strip_code_fences(raw_text))
        return "live", RadarResponse.model_validate(parsed)
    except Exception:
        return "fallback", _build_fallback_response(request)


def _build_user_prompt(request: RadarChatRequest) -> str:
    meta_signals = "\n".join(f"- {signal}" for signal in request.meta_signals) if request.meta_signals else "- none provided"
    return (
        f"User prompt: {request.prompt}\n"
        f"Brand: {request.brand or 'unknown'}\n"
        f"Category: {request.category or 'unknown'}\n"
        f"Campaign context: {request.campaign_context or 'none provided'}\n"
        "Source scope: Meta Ad Library only\n"
        f"Meta signals:\n{meta_signals}\n"
        "Return the exact JSON shape."
    )


def _extract_text(message: Any) -> str:
    chunks: list[str] = []
    for item in getattr(message, "content", []):
        text = getattr(item, "text", None)
        if text:
            chunks.append(text)
    return "\n".join(chunks).strip()


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


def _build_fallback_response(request: RadarChatRequest) -> RadarResponse:
    prompt = request.prompt.strip()
    lowered = prompt.lower()
    widget = (
        "saturation_chart"
        if "saturation" in lowered or "fatigue" in lowered
        else "luma_concepts"
        if "luma" in lowered or "concept" in lowered
        else "competitor_matrix"
        if "competitor" in lowered
        else "creative_brief"
    )
    title = "Meta-Only Creator Proof Brief"
    narrative = (
        "Meta signals point toward creator-led proof, benefit-first hooks, and direct-response endings outperforming generic testimonial repetition."
    )
    return RadarResponse.model_validate(
        {
            "text": "Meta signals suggest shifting toward creator-led proof and away from recycled testimonial-discount loops.",
            "thinking": [
                "Detected the request intent and limited the analysis scope to Meta Ad Library inputs only.",
                "Mapped likely hook, format, CTA, and proof-style patterns from the provided prompt and Meta context.",
                "Converted the strongest Meta-only opportunity into a brief with widget routing and next actions.",
            ],
            "widget": widget,
            "brief": {
                "title": title,
                "narrative": narrative,
                "metrics": [
                    {"label": "Creative Opportunity Score", "value": "81"},
                    {"label": "Fatigue Risk Score", "value": "59"},
                    {"label": "Brand Fit Score", "value": "77"},
                ],
                "alerts": [
                    {
                        "level": "Saturation",
                        "text": "Meta competitors are overusing testimonial hooks that close with a discount-first CTA.",
                    },
                    {
                        "level": "Opportunity",
                        "text": "Meta creator-led authority explainers with on-screen proof look underused relative to testimonial repetition.",
                    },
                ],
                "strategy": [
                    "Avoid the saturated testimonial-plus-discount pattern.",
                    "Lead with creator authority and visual proof inside the first three seconds.",
                    "Expand the winning territory into three executable creative directions.",
                ],
            },
            "backendTrace": {
                "mode": "Creative Genome Radar pipeline",
                "inputs": [
                    "brand/category/user prompt",
                    "meta ad library signals",
                    "campaign performance context",
                ],
                "pipeline": [
                    "Intent parser -> classify request",
                    "Genome classifier -> extract hook/format/CTA/emotion/proof style",
                    "Pattern engine -> cluster repeated creative DNA",
                    "Saturation model -> detect overused and rising territory",
                    "Opportunity scorer -> rank white-space options",
                    "Brief generator -> create strategist-ready brief",
                    "Concept generator -> prepare Luma-ready directions",
                ],
                "assumptions": [
                    "Meta Ad Library signals are partial",
                    "Engagement proxies are directional, not exact",
                    "Brand-safe output is prioritized",
                ],
                "confidence": "0.61 fallback",
                "output": f'meta-only response for "{prompt}"',
            },
            "suggestions": [
                "Show saturated patterns",
                "Find white-space opportunity",
                "Generate 3 Luma concepts",
                "Open the creative brief",
            ],
            "editSuggestions": [
                {
                    "id": "open-saturation-view",
                    "title": "Open saturation view",
                    "description": "Show the overused hooks, formats, and CTA clusters first.",
                    "action": {"type": "widget", "payload": {"widget": "saturation_chart"}},
                },
                {
                    "id": "shift-to-white-space",
                    "title": "Shift to white-space opportunity",
                    "description": "Prioritize underused but rising creative territory.",
                    "action": {"type": "widget", "payload": {"widget": "opportunity_scorecard"}},
                },
                {
                    "id": "generate-luma-brief",
                    "title": "Generate Luma brief",
                    "description": "Turn the top-ranked opportunity into a creative brief and generation prompt.",
                    "action": {"type": "widget", "payload": {"widget": "creative_brief"}},
                },
            ],
        }
    )
