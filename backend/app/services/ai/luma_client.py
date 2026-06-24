"""
Luma Agents API client — Ray 3.2 video generation.
"""
import asyncio
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()

DEFAULT_BASE = "https://agents.lumalabs.ai/v1"


def _base_url() -> str:
    return getattr(settings, "luma_api_base", None) or DEFAULT_BASE


def _headers() -> dict[str, str]:
    if not settings.luma_api_key:
        raise RuntimeError("LUMA_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {settings.luma_api_key}",
        "Content-Type": "application/json",
    }


def _extract_video_url(data: dict[str, Any]) -> str | None:
    output = data.get("output")
    if isinstance(output, list):
        for item in output:
            if isinstance(item, dict) and item.get("type") == "video" and item.get("url"):
                return str(item["url"])
            if isinstance(item, dict) and item.get("url"):
                return str(item["url"])

    assets = data.get("assets") or {}
    if isinstance(assets, dict):
        if assets.get("video"):
            return str(assets["video"])
        video = assets.get("video_url") or assets.get("url")
        if video:
            return str(video)

    result = data.get("result")
    if isinstance(result, dict) and result.get("video"):
        return str(result["video"])
    return data.get("video_url")


async def submit_video_generation(
    prompt: str,
    *,
    start_frame_url: str | None = None,
    duration: str = "5s",
    resolution: str = "720p",
) -> str:
    payload: dict[str, Any] = {
        "model": "ray-3.2",
        "type": "video",
        "prompt": prompt,
        "video": {
            "resolution": resolution,
            "duration": duration,
        },
    }
    if start_frame_url:
        payload["video"]["start_frame"] = {"url": start_frame_url}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_base_url()}/generations",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        body = resp.json()
        generation_id = body.get("id") or body.get("generation_id")
        if not generation_id:
            raise RuntimeError(f"Luma submit missing id: {body}")
        return str(generation_id)


async def poll_generation(generation_id: str, timeout: int = 600) -> str:
    url = f"{_base_url()}/generations/{generation_id}"
    elapsed = 0
    interval = 5

    async with httpx.AsyncClient(timeout=30) as client:
        while elapsed < timeout:
            resp = await client.get(url, headers=_headers())
            resp.raise_for_status()
            data = resp.json()
            state = (data.get("state") or data.get("status") or "").lower()

            if state in ("completed", "succeeded", "success"):
                video_url = _extract_video_url(data)
                if video_url:
                    return video_url
                raise RuntimeError(f"Luma completed but no video URL: {data}")

            if state in ("failed", "error", "cancelled"):
                raise RuntimeError(f"Luma generation failed: {data.get('failure_reason', data)}")

            await asyncio.sleep(interval)
            elapsed += interval

    raise TimeoutError(f"Luma generation timed out after {timeout}s")


async def generate_video(
    prompt: str,
    *,
    start_frame_url: str | None = None,
    duration: str = "5s",
    resolution: str = "720p",
    timeout: int = 600,
) -> tuple[str, str]:
    """Submit and poll. Returns (generation_id, video_url)."""
    generation_id = await submit_video_generation(
        prompt,
        start_frame_url=start_frame_url,
        duration=duration,
        resolution=resolution,
    )
    video_url = await poll_generation(generation_id, timeout=timeout)
    return generation_id, video_url
