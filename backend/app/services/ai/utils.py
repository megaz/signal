"""Shared utilities for AI service responses."""
import json
import re


def parse_json(text: str) -> dict:
    """Parse Claude's JSON response, stripping any markdown code fences."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())
