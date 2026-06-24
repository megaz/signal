import argparse
import csv
import json
import os
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "output"

# Ad Library (keyword search) — best for brand/competitor queries.
AD_LIBRARY_ACTOR_ID = "whoareyouanas/tiktok-ad-scraper"
# Creative Center (top ads) — good for US/global; keyword filter is weak server-side.
CREATIVE_CENTER_ACTOR_ID = "khadinakbar/tiktok-ads-scraper"
DEFAULT_ACTOR_ID = AD_LIBRARY_ACTOR_ID

EU_AD_LIBRARY_COUNTRIES = frozenset({
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
    "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
    "SE", "GB", "CH", "NO", "IS", "LI",
})

QUERY_STOPWORDS = frozenset({
    "drinks", "drink", "energy", "beverage", "beverages", "the", "a", "an", "and", "or",
})

WHOAREYOUANAS_INDUSTRY_SLUGS = {
    "Food & Beverage": "food_and_beverage",
    "All Industries": "all",
}


def load_env() -> None:
    """Load APIFY_TOKEN from backend/.env or project-root .env if present."""
    for env_path in (ROOT_DIR / "backend" / ".env", ROOT_DIR / ".env"):
        if env_path.exists():
            load_dotenv(env_path)
            return


def get_nested(data: Dict[str, Any], path: str) -> Optional[Any]:
    """Safely get a nested value from a dictionary using dot notation."""
    current: Any = data

    for key in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(key)

    return current


def first_available(data: Dict[str, Any], paths: Iterable[str]) -> Optional[Any]:
    """Return the first non-empty value from a list of possible field paths."""
    for path in paths:
        value = get_nested(data, path)
        if value not in (None, "", [], {}):
            return value
    return None


def first_scalar(value: Any) -> Optional[Any]:
    """Return the first element when value is a non-empty list."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def significant_query_terms(query: str) -> list[str]:
    """Extract meaningful search terms, dropping generic words like 'drinks'."""
    terms = [
        term
        for term in re.split(r"[^\w]+", query.lower())
        if term and term not in QUERY_STOPWORDS
    ]
    return terms or [query.lower().strip()]


def suggest_industry(query: str) -> Optional[str]:
    if re.search(r"\b(drinks?|beverage|energy\s+drink)\b", query, re.IGNORECASE):
        return "Food & Beverage"
    return None


def item_match_text(item: Dict[str, Any]) -> str:
    parts: list[str] = []
    for key in (
        "ad_text", "ad_title", "adText", "text", "title", "description",
        "advertiser_name", "brand_name", "advertiserName", "businessName",
    ):
        value = item.get(key)
        if value:
            parts.append(str(value))
    return " ".join(parts).lower()


def matches_query(item: Dict[str, Any], terms: list[str]) -> bool:
    if not terms:
        return True
    text = item_match_text(item)
    if not text.strip():
        return False
    # Require the primary brand term (e.g. "celsius" from "celsius drinks").
    return terms[0] in text


def filter_by_query(
    raw_items: list[Dict[str, Any]],
    normalized_items: list[Dict[str, Any]],
    terms: list[str],
) -> tuple[list[Dict[str, Any]], list[Dict[str, Any]]]:
    paired = [
        (raw, norm)
        for raw, norm in zip(raw_items, normalized_items)
        if matches_query(norm, terms) or matches_query(raw, terms)
    ]
    if not paired:
        return [], []
    raw_out, norm_out = zip(*paired)
    return list(raw_out), list(norm_out)


def normalize_ad_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Convert raw Apify dataset item into a simpler format."""
    video_url = first_scalar(first_available(item, [
        "video_url", "videoUrl", "tiktokVideoUrl", "url",
        "videoMeta.videoUrl", "videoMeta.playAddr", "creative.videoUrl", "video_urls",
    ]))
    cover_url = first_scalar(first_available(item, [
        "cover_url", "videoMeta.coverUrl", "coverUrl", "thumbnailUrl", "imageUrl",
        "coverImageUrl", "creative.coverUrl", "creative.thumbnailUrl", "video.coverUrl",
        "cover_images", "image_urls",
    ]))

    return {
        "ad_id": first_available(item, [
            "ad_id", "adId", "id", "ad.id", "metadata.adId",
        ]),
        "advertiser_name": first_available(item, [
            "advertiser_name", "brand_name", "advertiserName",
            "advertiser.name", "advertiser.businessName", "businessName",
        ]),
        "ad_text": first_available(item, [
            "ad_text", "ad_title", "adText", "text", "title",
            "description", "videoMeta.description",
        ]),
        "video_url": video_url,
        "cover_url": cover_url,
        "impressions": first_available(item, [
            "impressions", "impression", "impressionRange",
            "metrics.impressions", "estimated_audience",
        ]),
        "countries": first_available(item, [
            "countries", "shownCountries", "country", "region", "target_regions",
        ]),
        "start_date": first_available(item, [
            "start_date", "startDate", "first_shown_date", "firstShownDate", "createdAt",
        ]),
        "end_date": first_available(item, [
            "end_date", "endDate", "last_shown_date", "lastShownDate",
        ]),
    }


def write_json(path: str, items: list[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as file:
        json.dump(items, file, indent=2, ensure_ascii=False)


def write_csv(path: str, items: list[Dict[str, Any]]) -> None:
    if not items:
        return

    fieldnames = list(items[0].keys())

    with open(path, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(items)


def resolve_scrape_plan(
    actor_id: str,
    mode: str,
    country: str,
) -> tuple[str, str]:
    """Pick actor + scrape mode. Ad Library is used for EU keyword search."""
    if actor_id not in (DEFAULT_ACTOR_ID, AD_LIBRARY_ACTOR_ID, CREATIVE_CENTER_ACTOR_ID):
        return actor_id, mode if mode != "auto" else "custom"

    if mode == "auto":
        if country.upper() in EU_AD_LIBRARY_COUNTRIES:
            return AD_LIBRARY_ACTOR_ID, "ad_library"
        return CREATIVE_CENTER_ACTOR_ID, "creative_center"

    if mode == "ad_library":
        return AD_LIBRARY_ACTOR_ID, "ad_library"

    return CREATIVE_CENTER_ACTOR_ID, "creative_center"


def build_run_input(
    actor_id: str,
    scrape_mode: str,
    query: str,
    max_pages: int,
    country: str,
    start_date: Optional[str],
    end_date: Optional[str],
    quick_search: bool,
    period: str,
    industry: Optional[str],
) -> Dict[str, Any]:
    # TikTok search works better with the core brand term than full phrases.
    search_term = significant_query_terms(query)[0]

    if scrape_mode == "ad_library":
        ad_country = country if country.upper() in EU_AD_LIBRARY_COUNTRIES else "GB"
        run_input: Dict[str, Any] = {
            "searchQuery": search_term,
            "country": ad_country,
            "scrapeMode": "ad_library",
            "maxResults": min(max(max_pages * 12, 20), 500),
        }
        if industry and industry in WHOAREYOUANAS_INDUSTRY_SLUGS:
            run_input["industry"] = WHOAREYOUANAS_INDUSTRY_SLUGS[industry]
        return run_input

    run_input = {
        "keyword": search_term,
        "country": "" if country == "all" else country,
        "maxResults": min(max(max_pages * 20, 50), 500),
        "period": period,
        "responseFormat": "detailed",
    }
    if industry:
        run_input["industry"] = industry
    return run_input


def extract_approval_url(error: ApifyApiError) -> Optional[str]:
    match = re.search(r"https://console\.apify\.com/[^\s]+approvePermissions=true", str(error))
    return match.group(0) if match else None


def get_dataset_id(run: Any) -> str:
    if hasattr(run, "default_dataset_id"):
        return run.default_dataset_id
    return run["defaultDatasetId"]


def get_run_id(run: Any) -> str:
    if hasattr(run, "id"):
        return run.id
    return run["id"]


def get_run_status(run: Any) -> str:
    if hasattr(run, "status"):
        return run.status
    return run["status"]


def fetch_actor_items(
    client: ApifyClient,
    actor_id: str,
    run_input: Dict[str, Any],
) -> list[Dict[str, Any]]:
    print(f"Running Apify actor: {actor_id}")
    print(f"Actor input: {json.dumps(run_input, ensure_ascii=False)}")

    try:
        run = client.actor(actor_id).call(run_input=run_input)
    except ApifyApiError as exc:
        approval_url = extract_approval_url(exc)
        if approval_url:
            raise RuntimeError(
                f"Apify actor '{actor_id}' needs permission approval in your account.\n"
                f"Approve it here: {approval_url}\n"
                f"Or re-run with: --actor-id {AD_LIBRARY_ACTOR_ID}"
            ) from exc
        raise

    if run is None:
        raise RuntimeError("Apify actor run returned no result.")

    status = get_run_status(run)
    if status != "SUCCEEDED":
        raise RuntimeError(
            f"Apify actor run finished with status {status!r}. "
            f"Check logs: https://console.apify.com/actors/runs/{get_run_id(run)}"
        )

    dataset_id = get_dataset_id(run)
    print(f"Dataset ID: {dataset_id}")
    return list(client.dataset(dataset_id).iterate_items())


def run_tiktok_ads_scraper(
    token: str,
    query: str,
    actor_id: str,
    mode: str,
    max_pages: int,
    country: str,
    start_date: Optional[str],
    end_date: Optional[str],
    quick_search: bool,
    period: str,
    industry: Optional[str],
    filter_query: bool,
    fallback_ad_library: bool,
) -> tuple[list[Dict[str, Any]], list[Dict[str, Any]]]:
    client = ApifyClient(token)
    terms = significant_query_terms(query)
    resolved_actor, scrape_mode = resolve_scrape_plan(actor_id, mode, country)

    print(f"Search query: {query!r} (match terms: {terms})")

    run_input = build_run_input(
        actor_id=resolved_actor,
        scrape_mode=scrape_mode,
        query=query,
        max_pages=max_pages,
        country=country,
        start_date=start_date,
        end_date=end_date,
        quick_search=quick_search,
        period=period,
        industry=industry,
    )

    raw_items = fetch_actor_items(client, resolved_actor, run_input)
    normalized_items = [normalize_ad_item(item) for item in raw_items]

    if filter_query:
        filtered_raw, filtered_norm = filter_by_query(raw_items, normalized_items, terms)
        print(
            f"Query filter: kept {len(filtered_norm)} of {len(normalized_items)} ads "
            f"matching {terms!r}"
        )
        raw_items, normalized_items = filtered_raw, filtered_norm

    if (
        not normalized_items
        and fallback_ad_library
        and scrape_mode == "creative_center"
        and country.upper() not in EU_AD_LIBRARY_COUNTRIES
    ):
        print(
            "No matching ads from Creative Center — retrying TikTok Ad Library (EU/GB) "
            "for keyword search..."
        )
        fallback_input = build_run_input(
            actor_id=AD_LIBRARY_ACTOR_ID,
            scrape_mode="ad_library",
            query=query,
            max_pages=max_pages,
            country="GB",
            start_date=start_date,
            end_date=end_date,
            quick_search=quick_search,
            period=period,
            industry=industry,
        )
        raw_items = fetch_actor_items(client, AD_LIBRARY_ACTOR_ID, fallback_input)
        normalized_items = [normalize_ad_item(item) for item in raw_items]
        if filter_query:
            raw_items, normalized_items = filter_by_query(raw_items, normalized_items, terms)
            print(
                f"Ad Library fallback filter: kept {len(normalized_items)} ads "
                f"matching {terms!r}"
            )

    if filter_query and not normalized_items:
        raise RuntimeError(
            f"No ads matched query {query!r} (terms: {terms}). "
            "TikTok often returns unrelated trending ads when the keyword has few matches.\n"
            "Try:\n"
            "  • A shorter brand term: --query celsius\n"
            "  • EU Ad Library directly: --mode ad_library --country GB\n"
            "  • Narrow industry: --industry 'Food & Beverage'\n"
            "  • Disable filter to inspect raw results: --no-filter"
        )

    return raw_items, normalized_items


def main() -> None:
    yesterday = date.today() - timedelta(days=1)
    one_year_ago = date.today() - timedelta(days=365)

    parser = argparse.ArgumentParser(
        description="Scrape TikTok ads from Apify for a search term."
    )

    parser.add_argument(
        "--query",
        default="celsius drinks",
        help="Brand or keyword to search for, e.g. 'celsius' or 'celsius drinks'.",
    )

    parser.add_argument(
        "--mode",
        choices=["auto", "ad_library", "creative_center"],
        default="auto",
        help="auto: Ad Library for EU countries, Creative Center elsewhere (default).",
    )

    parser.add_argument(
        "--actor-id",
        default=DEFAULT_ACTOR_ID,
        help="Override Apify actor ID (advanced).",
    )

    parser.add_argument(
        "--max-pages",
        type=int,
        default=3,
        help="Rough page count; converted to maxResults/limit for the chosen actor.",
    )

    parser.add_argument(
        "--country",
        default="US",
        help="Country code (e.g. US, GB). Ad Library only supports EU/EEA/UK countries.",
    )

    parser.add_argument(
        "--industry",
        default=None,
        help="Industry filter, e.g. 'Food & Beverage'. Auto-suggested for drink queries.",
    )

    parser.add_argument(
        "--period",
        choices=["7", "30", "180"],
        default="180",
        help="Creative Center ranking window in days.",
    )

    parser.add_argument(
        "--start-date",
        default=one_year_ago.isoformat(),
        help="Start date in YYYY-MM-DD format (ad-library actors only).",
    )

    parser.add_argument(
        "--end-date",
        default=yesterday.isoformat(),
        help="End date in YYYY-MM-DD format (ad-library actors only).",
    )

    parser.add_argument(
        "--quick-search",
        action="store_true",
        help="Use fast mode for ad-library actors (skip full detail fetch).",
    )

    parser.add_argument(
        "--no-filter",
        action="store_true",
        help="Keep all ads returned by Apify (do not filter by query relevance).",
    )

    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="Do not retry EU Ad Library when Creative Center returns no matches.",
    )

    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory for output files (created if missing).",
    )

    parser.add_argument(
        "--raw-json",
        default="tiktok_ads_raw.json",
        help="Output filename for raw JSON (relative to --output-dir).",
    )

    parser.add_argument(
        "--csv",
        default="tiktok_ads.csv",
        help="Output filename for normalized CSV (relative to --output-dir).",
    )

    parser.add_argument(
        "--normalized-json",
        default="tiktok_ads_normalized.json",
        help="Output filename for normalized JSON (relative to --output-dir).",
    )

    args = parser.parse_args()

    load_env()

    token = os.getenv("APIFY_TOKEN")
    if not token:
        raise RuntimeError(
            "Missing APIFY_TOKEN environment variable. "
            "Add it to backend/.env or run: export APIFY_TOKEN='your_token_here'"
        )

    industry = args.industry or suggest_industry(args.query)

    raw_items, normalized_items = run_tiktok_ads_scraper(
        token=token,
        query=args.query,
        actor_id=args.actor_id,
        mode=args.mode,
        max_pages=args.max_pages,
        country=args.country,
        start_date=args.start_date,
        end_date=args.end_date,
        quick_search=args.quick_search,
        period=args.period,
        industry=industry,
        filter_query=not args.no_filter,
        fallback_ad_library=not args.no_fallback,
    )

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    raw_json_path = output_dir / args.raw_json
    normalized_json_path = output_dir / args.normalized_json
    csv_path = output_dir / args.csv

    write_json(str(raw_json_path), raw_items)
    write_json(str(normalized_json_path), normalized_items)
    write_csv(str(csv_path), normalized_items)

    print(f"\nFound {len(normalized_items)} ads matching your query.")
    print(f"Raw JSON saved to: {raw_json_path}")
    print(f"Normalized JSON saved to: {normalized_json_path}")
    print(f"CSV saved to: {csv_path}")

    print("\nSample results:")
    for item in normalized_items[:5]:
        print(json.dumps(item, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
