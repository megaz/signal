# Ingestor — Technical Specification

The ingestor is PULSE's data pipeline. It pulls ad portfolio data from three public sources, normalises it into a unified schema, scores each ad for fatigue, and persists everything to the database. No private performance data is needed — all signals are derived from public APIs.

---

## Overview

```
Meta Ad Library ──┐
TikTok Creative   ├──► Normalise ──► Fatigue Score ──► Upsert DB ──► Trigger Similarity Tree
Google Trends  ───┘
```

The pipeline is **pull-based and background-driven**: routes trigger background tasks; the ingestor runs async and never blocks a request.

---

## Source 1 — Meta Ad Library

**File:** [backend/app/services/ingestion/meta_ad_library.py](../backend/app/services/ingestion/meta_ad_library.py)

### How to get access

1. Apply for the Meta Ad Library API at [developers.facebook.com/docs/ad-library-api](https://developers.facebook.com/docs/ad-library-api)
2. Requires a verified developer account and an approved use case (research/transparency)
3. You'll receive a long-lived `access_token` — add it to `.env` as `META_ACCESS_TOKEN`
4. Find a brand's `meta_page_id` by searching their Page on Facebook and noting the numeric ID in the URL

### Endpoint

```
GET https://graph.facebook.com/{version}/ads_archive
```

### Fields we request

| Field | Purpose |
|---|---|
| `id` | External ad ID (used for upsert deduplication) |
| `ad_creative_body` | Ad copy text → used as `title` fallback |
| `ad_creative_link_caption` | Headline → preferred `title` source |
| `ad_delivery_start_time` | When the ad went live → used to compute `run_days` |
| `ad_delivery_stop_time` | When it stopped (null = still running) |
| `impressions` | Impression bucket (we don't store raw numbers, just bucket) |
| `ad_snapshot_url` | Thumbnail/preview URL |

### The performance proxy

Meta does not expose CTR, ROAS, or spend in the public library. The proxy is:

```
run_days = ad_delivery_stop_time - ad_delivery_start_time
         (if still running: now - start)
```

**Why this works:** Brands kill ads that underperform. An ad that has run for 30+ days has been judged worth keeping by the brand's own team, making run-duration a reliable public signal of relative performance.

**Decay curve** (implemented in `fatigue_scorer.py`):

```
score = 1 / (1 + e^(0.15 × (run_days − 21)))
```

- New ads (< 5 days): score ~0.5 (unknown, not yet judged)
- Peak window (7–21 days): score 0.7–0.9 (thriving)
- Long-runners (> 30 days): score begins falling (aging → fatiguing)
- Very long (> 60 days): high probability of fatiguing audience (declining)

The curve is a logistic function centred at 21 days. **This threshold is adjustable** — to backtest it, compare the model's fatigue flags against ads that were actually pulled shortly after.

### Pagination

The API returns up to 200 results per call. If a brand has more than 200 active ads, implement cursor pagination:

```python
# after the first call:
cursor = resp.json().get("paging", {}).get("cursors", {}).get("after")
while cursor:
    params["after"] = cursor
    resp = await client.get(BASE, params=params)
    data = resp.json()
    results.extend(data.get("data", []))
    cursor = data.get("paging", {}).get("cursors", {}).get("after")
```

Add this to `fetch_ads_for_page()` in `meta_ad_library.py`.

### Rate limits

- 200 calls/hour per access token
- For a brand with 500 ads (3 pages), that's 3 calls — well within limits
- For bulk syncs across many brands, add a small `asyncio.sleep(0.5)` between brand calls

### Error handling to add

```python
# in fetch_ads_for_page:
if resp.status_code == 429:
    raise RateLimitError("Meta API rate limit hit")
if resp.status_code == 401:
    raise AuthError("META_ACCESS_TOKEN expired or invalid")
```

---

## Source 2 — TikTok Creative Center

**File:** [backend/app/services/ingestion/tiktok_creative.py](../backend/app/services/ingestion/tiktok_creative.py)

### How to get access

1. Create a TikTok for Business developer account at [ads.tiktok.com](https://ads.tiktok.com)
2. Create an app under **TikTok for Business API**
3. Request the `Creative Center` permission scope
4. Add `TIKTOK_APP_ID` and `TIKTOK_SECRET` to `.env`

### Endpoint

```
GET https://business-api.tiktok.com/open_api/v1.3/creative/center/ad/detail/
```

### Fields we use

| Field | Maps to |
|---|---|
| `item_id` | `external_id` |
| `video_info.vid_url_list[0]` | `video_url` |
| `video_cover` | `thumbnail_url` |
| `impression_bucket` | `reach_bucket` (`"low"` / `"mid"` / `"high"`) |

### Performance proxy

TikTok's Creative Center exposes **impression buckets** directly — this is a stronger signal than Meta's run-duration alone. The bucket maps to `reach_bucket` on the Ad model:

| Bucket | Meaning |
|---|---|
| `high` | >1M impressions in 7 days |
| `mid` | 100K–1M impressions |
| `low` | <100K impressions |

These feed directly into `fatigue_scorer._reach_score()` alongside run-duration.

### Industry IDs

TikTok filters by industry. A list of IDs is available in their docs. For most use cases:

| Industry | ID |
|---|---|
| Fashion & Apparel | `2` |
| E-commerce | `5` |
| Food & Beverage | `7` |
| Gaming | `9` |

Pass the correct ID when calling `sync_tiktok_ads(brand_id, industry_id)`.

### What's missing — add this

The current implementation only pulls **top trending** ads by industry. To get **a specific brand's** TikTok ads, you need their TikTok advertiser account ID and use a different endpoint:

```
GET /open_api/v1.3/ad/get/
params: advertiser_id, fields: ["ad_id", "video_id", "status", "create_time"]
```

This requires the brand to grant your app access to their ad account. For the demo, the top-trending industry pull is sufficient to show competitor landscape.

---

## Source 3 — Google Trends

**File:** [backend/app/services/ingestion/google_trends.py](../backend/app/services/ingestion/google_trends.py)

No API key required. Uses `pytrends` (unofficial Google Trends client).

### Purpose

Trends data is **not** stored in the DB. It's fetched on-demand by `fix_proposer.py` when generating a fix for a weak beat. The idea: if a beat's hook is weak and "authentic storytelling" is trending this week, the proposed fix should tap that signal.

### Usage

```python
from app.services.ingestion.google_trends import fetch_trends

data = await fetch_trends(["authentic ads", "brand storytelling"], geo="US")
# returns: {"authentic ads": {<date>: 78, ...}, "brand storytelling": {...}}
```

### Limitations

- `pytrends` is unofficial and can be rate-limited by Google
- For production, cache results in Redis with a 6-hour TTL
- Consider switching to the official Google Trends API (requires application) for reliability

### Caching layer to add (Redis)

```python
import redis.asyncio as aioredis
import json

redis = aioredis.from_url(settings.redis_url)

async def fetch_trends_cached(keywords: list[str], geo: str = "US") -> dict:
    key = f"trends:{':'.join(sorted(keywords))}:{geo}"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    data = await fetch_trends(keywords, geo)
    await redis.setex(key, 21600, json.dumps(data))  # 6h TTL
    return data
```

---

## Triggering Ingestion

### Via API (background task)

```bash
# Sync a brand's Meta ads
POST /api/v1/ads/sync/{brand_id}

# Response (immediate, task runs in background)
{"queued": true}
```

### Manually (for dev/seed)

```python
import asyncio
from app.services.ingestion.meta_ad_library import sync_brand_ads

asyncio.run(sync_brand_ads("your-brand-uuid"))
```

---

## After Ingestion — What runs next

Once ads are upserted, two things should run automatically:

1. **Fatigue scoring** — recalculate `health_score` and `health` for every ad in the brand
2. **Similarity tree** — recluster ads into creative families

Neither of these is currently wired to auto-trigger post-sync. The simplest approach is to chain them inside `sync_brand_ads` after the `await db.commit()`:

```python
# at the end of sync_brand_ads in meta_ad_library.py
from app.services.analysis.fatigue_scorer import score_ad
from app.services.analysis.similarity_tree import cluster_brand_families

# re-score all ads
all_ads_result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
for ad in all_ads_result.scalars().all():
    ad.health_score, ad.health = score_ad(ad)
await db.commit()

# recluster families
await cluster_brand_families(brand_id)
```

---

## Data Schema Reference

After ingestion, each ad row looks like this:

```
Ad {
  id:                 uuid                  # internal
  brand_id:           uuid                  # foreign key → brands
  platform:           "meta" | "tiktok"
  external_id:        "12345678"            # Meta or TikTok ad ID
  title:              "Summer sale — shop now"
  video_url:          "https://..."         # nullable; populated from TikTok
  thumbnail_url:      "https://..."
  health:             "thriving"            # computed by fatigue_scorer
  health_score:       0.82                  # 0–1 float
  run_days:           14
  reach_bucket:       "high"
  variant_count:      3                     # how many variants of this creative
  creative_family_id: "family-abc123"       # set by similarity tree
  started_at:         datetime
  last_seen_at:       datetime
  fetched_at:         datetime
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `META_ACCESS_TOKEN` | Yes (Meta) | Long-lived token from Meta developers portal |
| `META_API_VERSION` | No (default: v19.0) | API version string |
| `TIKTOK_APP_ID` | Yes (TikTok) | App ID from TikTok for Business |
| `TIKTOK_SECRET` | Yes (TikTok) | App secret / access token |

---

## Testing the Ingestor

A unit test for the fatigue scorer lives at [backend/tests/unit/test_fatigue_scorer.py](../backend/tests/unit/test_fatigue_scorer.py).

For integration testing the API calls without hitting live APIs, mock `httpx.AsyncClient`:

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_meta_fetch_returns_ads():
    mock_response = AsyncMock()
    mock_response.json.return_value = {"data": [{"id": "123", "ad_delivery_start_time": "2024-01-01T00:00:00+0000"}]}
    mock_response.raise_for_status = lambda: None

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        from app.services.ingestion.meta_ad_library import fetch_ads_for_page
        ads = await fetch_ads_for_page("some-page-id")
        assert len(ads) == 1
        assert ads[0]["id"] == "123"
```
