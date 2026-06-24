from typing import Literal

from pydantic import BaseModel, Field


class PrismTurn(BaseModel):
    """A prior message in the conversation, for multi-turn context."""

    role: Literal["user", "assistant"]
    text: str


class PrismChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    brand: str | None = None
    category: str | None = None
    campaign_context: str | None = None
    # Prior turns (text-only) so Prism can hold a conversation. Cards/sources from
    # earlier turns are not replayed — only the natural-language exchange.
    history: list[PrismTurn] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Card contract (documentation + reference for the frontend).
#
# Cards are produced by the model via the `render_cards` client tool and streamed
# verbatim to the browser as `card` SSE frames, so the backend does not strictly
# validate them. These models document the discriminated union; `extra="allow"`
# keeps the contract forward-compatible as card shapes evolve.
# ---------------------------------------------------------------------------

CardType = Literal[
    "insight",
    "metrics",
    "chart",
    "comparison",
    "action",
    "image",
    "brief",
    "concepts",
    "sources",
]


class PrismCard(BaseModel):
    model_config = {"extra": "allow"}

    type: CardType
