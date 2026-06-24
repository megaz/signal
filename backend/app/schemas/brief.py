from pydantic import BaseModel, Field


class LumaConcept(BaseModel):
    label: str
    hook_type: str
    luma_prompt: str


class CreativeBrief(BaseModel):
    ad_id: str
    title: str
    hook_type: str
    format_length: str
    visual_pacing: str
    creative_direction: str
    luma_prompt: str
    performance_rationale: str
    concepts: list[LumaConcept] = Field(default_factory=list)
