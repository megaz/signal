from pydantic import BaseModel


class RebuiltBeat(BaseModel):
    beat_type: str
    order: int
    action: str


class PlanOut(BaseModel):
    strategy: str                    # "variations" | "full_recreate"
    rationale: str                   # one sentence headline shown to user
    reasoning_steps: list[str]       # 2-4 visible reasoning steps
    affected_beat_ids: list[str]     # beat IDs to patch (variations only)
    rebuilt_beats: list[RebuiltBeat] # proposed new structure (full_recreate only)
