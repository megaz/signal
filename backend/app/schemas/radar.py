from typing import Literal

from pydantic import BaseModel, Field


WidgetType = Literal[
    "genome_map",
    "saturation_chart",
    "opportunity_scorecard",
    "competitor_matrix",
    "creative_brief",
    "luma_concepts",
]


class RadarMetric(BaseModel):
    label: str
    value: str


class RadarAlert(BaseModel):
    level: str
    text: str


class RadarActionPayload(BaseModel):
    widget: WidgetType


class RadarAction(BaseModel):
    type: str
    payload: RadarActionPayload


class RadarEditSuggestion(BaseModel):
    id: str
    title: str
    description: str
    action: RadarAction


class RadarBrief(BaseModel):
    title: str
    narrative: str
    metrics: list[RadarMetric]
    alerts: list[RadarAlert]
    strategy: list[str]


class RadarBackendTrace(BaseModel):
    mode: str
    inputs: list[str]
    pipeline: list[str]
    assumptions: list[str]
    confidence: str
    output: str


class RadarResponse(BaseModel):
    text: str
    thinking: list[str]
    widget: WidgetType
    brief: RadarBrief
    backendTrace: RadarBackendTrace
    suggestions: list[str]
    editSuggestions: list[RadarEditSuggestion]


class RadarChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    brand: str | None = None
    category: str | None = None
    meta_signals: list[str] = Field(default_factory=list)
    campaign_context: str | None = None


class RadarChatEnvelope(BaseModel):
    ok: bool
    source: Literal["meta_ad_library"]
    mode: Literal["live", "fallback"]
    result: RadarResponse
