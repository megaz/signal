"""
Two-phase TikTok post scraper via Apify clockworks/tiktok-scraper.

Phase 1 — discovery (commentsPerPost=0): search/hashtag scrape to collect post URLs.
Phase 2 — detail (commentsPerPost=N): re-scrape those URLs with comments for full context.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any

from apify_client import ApifyClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "output"

TIKTOK_POSTS_ACTOR_ID = "clockworks/tiktok-scraper"
DEFAULT_COMMENTS_PER_POST = 25

QUERY_STOPWORDS = frozenset({
    "drinks", "drink", "energy", "beverage", "beverages", "the", "a", "an", "and", "or",
})


def load_env() -> None:
    for env_path in (ROOT_DIR / "backend" / ".env", ROOT_DIR / ".env"):
        if env_path.exists():
            load_dotenv(env_path)
            return


def significant_query_terms(query: str) -> list[str]:
    terms = [
        term
        for term in re.split(r"[^\w]+", query.lower())
        if term and term not in QUERY_STOPWORDS
    ]
    return terms or [query.lower().strip()]


def matches_query(item: dict[str, Any], terms: list[str]) -> bool:
    if not terms:
        return True
    text = str(item.get("text") or item.get("desc") or "").lower()
    author = ""
    author_meta = item.get("authorMeta")
    if isinstance(author_meta, dict):
        author = str(author_meta.get("name") or author_meta.get("nickName") or "").lower()
    blob = f"{text} {author}"
    return terms[0] in blob


def _base_input() -> dict[str, Any]:
    return {
        "excludePinnedPosts": False,
        "maxFollowersPerProfile": 0,
        "maxFollowingPerProfile": 0,
        "maxRepliesPerComment": 0,
        "proxyCountryCode": "None",
        "scrapeRelatedVideos": False,
        "shouldDownloadAvatars": False,
        "shouldDownloadCovers": False,
        "shouldDownloadMusicCovers": False,
        "shouldDownloadSlideshowImages": False,
        "shouldDownloadVideos": False,
        "topLevelCommentsPerPost": 0,
        "commentsPerPost": 0,
    }


def build_discovery_input(
    *,
    search_queries: list[str] | None = None,
    hashtags: list[str] | None = None,
    profiles: list[str] | None = None,
    results_per_page: int = 100,
    download_videos: bool = False,
    download_covers: bool = False,
) -> dict[str, Any]:
    run_input = _base_input()
    run_input["resultsPerPage"] = results_per_page
    if profiles:
        run_input.update(
            {
                "profiles": profiles,
                "shouldDownloadVideos": download_videos,
                "shouldDownloadCovers": download_covers,
                "shouldDownloadSubtitles": False,
                "shouldDownloadSlideshowImages": False,
                "profileScrapeSections": ["videos"],
                "profileSorting": "latest",
                "searchSection": "",
                "maxProfilesPerQuery": 10,
                "videoSearchSorting": "MOST_RELEVANT",
                "videoSearchDateFilter": "ALL_TIME",
                "downloadSubtitlesOptions": "NEVER_DOWNLOAD_SUBTITLES",
            }
        )
    if search_queries:
        run_input["searchQueries"] = search_queries
    if hashtags:
        run_input["hashtags"] = hashtags
    return run_input


def build_detail_input(
    post_urls: list[str],
    *,
    comments_per_post: int = DEFAULT_COMMENTS_PER_POST,
    results_per_page: int = 100,
) -> dict[str, Any]:
    run_input = _base_input()
    run_input["postURLs"] = post_urls
    run_input["commentsPerPost"] = comments_per_post
    run_input["resultsPerPage"] = results_per_page
    return run_input


def extract_post_url(item: dict[str, Any]) -> str | None:
    url = item.get("webVideoUrl") or item.get("web_video_url")
    if url:
        return str(url)
    video_id = item.get("id")
    author_meta = item.get("authorMeta")
    if video_id and isinstance(author_meta, dict):
        username = author_meta.get("name") or author_meta.get("uniqueId")
        if username:
            return f"https://www.tiktok.com/@{username}/video/{video_id}"
    return None


def extract_post_urls(items: list[dict[str, Any]]) -> list[str]:
    urls: list[str] = []
    for item in items:
        url = extract_post_url(item)
        if url:
            urls.append(url)
    return list(dict.fromkeys(urls))


def enrich_items_with_comments(client: ApifyClient, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fetch inline comments from per-post comments datasets when Apify returns a URL."""
    import re

    enriched: list[dict[str, Any]] = []
    for item in items:
        row = dict(item)
        if row.get("comments"):
            enriched.append(row)
            continue

        dataset_url = row.get("commentsDatasetURL") or row.get("commentsDatasetUrl")
        if not dataset_url:
            enriched.append(row)
            continue

        match = re.search(r"/datasets/([^/?]+)", str(dataset_url))
        if not match:
            enriched.append(row)
            continue

        try:
            comments = list(client.dataset(match.group(1)).iterate_items())
            row["comments"] = comments
        except Exception as exc:  # noqa: BLE001 — keep post even if comments fetch fails
            row["comments"] = [{"error": str(exc)}]
        enriched.append(row)
    return enriched


def run_actor(client: ApifyClient, run_input: dict[str, Any]) -> list[dict[str, Any]]:
    print(f"Running Apify actor: {TIKTOK_POSTS_ACTOR_ID}")
    print(f"Actor input: {json.dumps(run_input, ensure_ascii=False)}")
    run = client.actor(TIKTOK_POSTS_ACTOR_ID).call(run_input=run_input)
    if run is None:
        raise RuntimeError("Apify actor run returned no result.")
    status = run.status if hasattr(run, "status") else run["status"]
    if status != "SUCCEEDED":
        run_id = run.id if hasattr(run, "id") else run["id"]
        raise RuntimeError(f"Apify run finished with status {status!r}. Run id: {run_id}")
    dataset_id = run.default_dataset_id if hasattr(run, "default_dataset_id") else run["defaultDatasetId"]
    return list(client.dataset(dataset_id).iterate_items())


def suggest_profile(query: str | None, brand_name: str | None = None) -> str | None:
    blob = f"{query or ''} {brand_name or ''}".lower()
    if "celsius" in blob:
        return "celsiusofficial"
    return None


def run_tiktok_posts_scraper(
    token: str,
    *,
    query: str | None = None,
    hashtags: list[str] | None = None,
    profiles: list[str] | None = None,
    results_per_page: int = 100,
    comments_per_post: int = DEFAULT_COMMENTS_PER_POST,
    filter_query: bool = True,
    max_posts: int = 50,
    post_urls: list[str] | None = None,
    download_videos: bool = False,
    download_covers: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Returns (discovery_items, detail_items_with_comments).
    Skips discovery when post_urls are supplied directly.
    """
    client = ApifyClient(token)
    terms = significant_query_terms(query) if query else []

    if post_urls:
        discovery_items: list[dict[str, Any]] = []
        urls = list(dict.fromkeys(post_urls))[:max_posts]
    else:
        if not query and not hashtags and not profiles:
            raise ValueError("Provide query, hashtags, profiles, or post_urls")

        use_profiles = bool(profiles)
        discovery_input = build_discovery_input(
            search_queries=[query] if query and not profiles else None,
            hashtags=hashtags,
            profiles=profiles,
            results_per_page=results_per_page,
            download_videos=download_videos or use_profiles,
            download_covers=download_covers or use_profiles,
        )
        discovery_items = run_actor(client, discovery_input)
        if filter_query and terms and not profiles:
            discovery_items = [item for item in discovery_items if matches_query(item, terms)]
            print(f"Discovery filter: kept {len(discovery_items)} posts matching {terms!r}")
        urls = extract_post_urls(discovery_items)[:max_posts]
        print(f"Discovered {len(urls)} post URLs for detail scrape")

    if not urls:
        return discovery_items, []

    detail_input = build_detail_input(urls, comments_per_post=comments_per_post)
    detail_items = enrich_items_with_comments(client, run_actor(client, detail_input))
    return discovery_items, detail_items


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape TikTok posts + comments via Apify.")
    parser.add_argument("--query", help="Search query, e.g. 'celsius drinks'")
    parser.add_argument("--hashtags", nargs="*", default=[], help="Hashtags without #")
    parser.add_argument("--profiles", nargs="*", default=[], help="TikTok usernames, e.g. celsiusofficial")
    parser.add_argument("--post-url", action="append", dest="post_urls", default=[])
    parser.add_argument("--results-per-page", type=int, default=30)
    parser.add_argument("--comments-per-post", type=int, default=DEFAULT_COMMENTS_PER_POST)
    parser.add_argument("--max-posts", type=int, default=50)
    parser.add_argument("--no-filter", action="store_true")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    args = parser.parse_args()

    load_env()
    token = os.getenv("APIFY_TOKEN")
    if not token:
        raise RuntimeError("Missing APIFY_TOKEN in backend/.env")

    _, detail_items = run_tiktok_posts_scraper(
        token,
        query=args.query,
        hashtags=args.hashtags or None,
        profiles=args.profiles or None,
        results_per_page=args.results_per_page,
        comments_per_post=args.comments_per_post,
        filter_query=not args.no_filter,
        max_posts=args.max_posts,
        post_urls=args.post_urls or None,
        download_videos=bool(args.profiles),
        download_covers=bool(args.profiles),
    )

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "tiktok_posts_detail.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(detail_items, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(detail_items)} posts with comments to {out_path}")


if __name__ == "__main__":
    main()
