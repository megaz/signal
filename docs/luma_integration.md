# Luma API Integration — Technical Specification

Signal's intelligence layer (TikTok ingestion, fatigue scoring, creative families) produces performance signals. Luma turns those signals into **structured creative briefs** and **generated video variants** via the Luma Agents API.

This doc is the implementation reference. Code lives under `backend/app/services/ai/` and `backend/app/api/v1/routers/`.

---

## Overview

```
tiktok_posts + ads ──► brief_builder.py (Claude)
                              │
                              ▼
                       CreativeBrief JSON
                              │
                              ▼
                       luma_client.py (Ray 3.2 API)
                              │
                              ▼
                       refreshes table ──► Review UI
```

**Out of scope:** Luma Agents App UI (`https://app.lumalabs.ai/`) — this integration is API-only.

---

## Credits & setup

1. Fill out the hackathon credits form (linked in the brief) to receive **100k Luma API credits**.
2. Create an API key at [platform.lumalabs.ai](https://platform.lumalabs.ai).
3. Add to `backend/.env`:

```env
LUMA_API_KEY=luma-xxxx
```

4. Optional override for debugging:

```env
LUMA_API_BASE=https://agents.lumalabs.ai/v1
```

Docker Compose loads `backend/.env` via the `api` service `env_file`.

---

## API choice

| Surface | Base URL | Status |
|---|---|---|
| Legacy Dream Machine | `https://api.lumalabs.ai/dream-machine/v1` | Deprecated — do not use for new work |
| **Luma Agents API** | `https://agents.lumalabs.ai/v1` | **Current** — Ray 3.2 video generation |

### Authentication

```
Authorization: Bearer $LUMA_API_KEY
Content-Type: application/json
```

### Async pattern

1. `POST /v1/generations` — submit job, receive `id`
2. Poll `GET /v1/generations/{id}` until `state` is `completed` or `failed`
3. Download video from presigned URL in response (`assets.video` or equivalent)

### Text-to-video payload (default)

```json
{
  "model": "ray-3.2",
  "type": "video",
  "prompt": "<luma_prompt from brief>",
  "video": {
    "resolution": "720p",
    "duration": "5s"
  }
}
```

### Image-to-video (when thumbnail available)

Pass the ad's `thumbnail_url` as `video.start_frame`:

```json
{
  "video": {
    "resolution": "720p",
    "duration": "5s",
    "start_frame": { "url": "https://..." }
  }
}
```

Luma fetches the image server-side. If start-frame submission fails, fall back to text-only.

---

## Creative brief schema

Produced by `brief_builder.py` via Claude from ad + TikTok post signals.

```json
{
  "ad_id": "uuid",
  "title": "original caption or ad title",
  "hook_type": "ugc_tag | testimonial | product_demo | collab | trend_react",
  "format_length": "15s vertical TikTok",
  "visual_pacing": "fast cuts in first 2s, slow product reveal",
  "creative_direction": "Strategist-facing paragraph",
  "luma_prompt": "Cinematic 9:16 prompt for Ray 3.2, max ~200 words",
  "performance_rationale": "Why refresh now — cites health, reach, family saturation",
  "concepts": [
    {
      "label": "Variant A — hook swap",
      "hook_type": "testimonial",
      "luma_prompt": "..."
    }
  ]
}
```

### Input signals (from DB)

| Signal | Source | Use in brief |
|---|---|---|
| `health`, `health_score` | `ads` | Fatigue diagnosis |
| `reach_bucket`, `run_days` | `ads` | Performance proxy |
| `variant_count`, `creative_family_id` | `ads` | Family saturation |
| `play_count`, `digg_count`, `comment_count` | `tiktok_posts` | Engagement context |
| `caption`, `author_username` | `tiktok_posts` | Hook / UGC pattern |
| `thumbnail_url` | `ads` | Image-to-video start frame |

Join `ads.external_id` to `tiktok_posts.video_id`. Fall back to caption/title prefix match if needed.

---

## Credit guardrails

| Rule | Default |
|---|---|
| Max variants per `generate-variants` call | 3 |
| Video duration | 5s |
| Resolution | 720p |
| Model | `ray-3.2` |

Every generation stores `luma_generation_id` on the `refreshes` row for audit and retry.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/ads/{ad_id}/brief` | Build `CreativeBrief` from intelligence (no Luma call) |
| `POST` | `/api/v1/review/{ad_id}/generate` | Build brief, queue single Luma generation |
| `POST` | `/api/v1/review/{ad_id}/generate-variants?count=3` | Queue N variant generations |
| `GET` | `/api/v1/review/{ad_id}/refresh` | Poll latest refresh (includes `brief`) |
| `POST` | `/api/v1/review/refresh/{id}/approve` | Approve + Slack handoff |
| `POST` | `/api/v1/review/refresh/{id}/reject` | Reject with notes |

---

## Database

`refreshes` table (`backend/app/models/refresh.py`):

| Column | Purpose |
|---|---|
| `luma_generation_id` | Luma job ID for polling |
| `video_url` | Completed output URL |
| `brief_json` | Structured `CreativeBrief` snapshot |
| `status` | `generating` → `ready` / `rejected` |

---

## Error handling

- Luma `failed` state → `RefreshStatus.rejected`
- Missing `LUMA_API_KEY` → HTTP 503 on generate routes
- Timeout after 600s poll → `rejected`
- Brief builder works **without beats** — TikTok ingest path often has no beat teardown

---

## Files

| File | Role |
|---|---|
| `backend/app/services/ai/brief_builder.py` | Intelligence → brief |
| `backend/app/services/ai/luma_client.py` | Agents API submit/poll |
| `backend/app/services/ai/luma_generator.py` | Orchestration + variants |
| `backend/app/schemas/brief.py` | Pydantic models |
| `backend/app/api/v1/routers/ads.py` | `POST /{ad_id}/brief` |
| `backend/app/api/v1/routers/review.py` | Generate + variants |
| `frontend/src/services/briefService.ts` | Client API |
| `frontend/src/components/review/BriefSummary.tsx` | Brief display |

---

## Manual E2E verification

```bash
# 1. Brief only
curl -X POST http://localhost:8000/api/v1/ads/{ad_id}/brief

# 2. Generate (requires LUMA_API_KEY)
curl -X POST http://localhost:8000/api/v1/review/{ad_id}/generate

# 3. Poll
curl http://localhost:8000/api/v1/review/{ad_id}/refresh

# 4. UI
open http://localhost:3000/review
```

Pick a fatiguing TikTok ad from brand `1ad089e1-9e52-435a-883d-004966a456e1`.
