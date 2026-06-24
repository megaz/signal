#!/usr/bin/env python3

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))
MAX_ATTEMPTS = int(os.getenv("MAX_ATTEMPTS", "60"))


def pretty_print(data: Dict[str, Any]) -> None:
    print(json.dumps(data, indent=2, sort_keys=False))


def request_json(
    method: str,
    path: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    url = f"{BASE_URL}{path}"

    body = None
    headers = {
        "Accept": "application/json",
    }

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(
        url=url,
        data=body,
        headers=headers,
        method=method.upper(),
    )

    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")

            if not raw:
                return {}

            return json.loads(raw)

    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"HTTP {exc.code} error from {url}\n{error_body}"
        ) from exc

    except URLError as exc:
        raise RuntimeError(f"Could not connect to {url}: {exc}") from exc

    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON response from {url}") from exc


def preview_brief(ad_id: str) -> Dict[str, Any]:
    data = request_json(
        method="POST",
        path=f"/api/v1/ads/{ad_id}/brief",
    )
    pretty_print(data)
    return data


def generate(ad_id: str) -> Dict[str, Any]:
    data = request_json(
        method="POST",
        path=f"/api/v1/review/{ad_id}/generate",
    )

    pretty_print(data)

    refresh_id = data.get("id")
    if refresh_id:
        print(f"\nREFRESH_ID={refresh_id}")

    return data


def get_refresh(ad_id: str) -> Dict[str, Any]:
    return request_json(
        method="GET",
        path=f"/api/v1/review/{ad_id}/refresh",
    )


def poll(ad_id: str) -> Dict[str, Any]:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        data = get_refresh(ad_id)

        status = data.get("status")
        video_url = data.get("video_url")

        print(
            f"Attempt {attempt}/{MAX_ATTEMPTS}: "
            f"status={status}, "
            f"video_url_present={bool(video_url)}"
        )

        if status == "ready":
            print("\nVideo is ready:")
            pretty_print(data)

            if video_url:
                print(f"\nVIDEO_URL={video_url}")

            return data

        if status == "rejected":
            print("\nGeneration was rejected:")
            pretty_print(data)
            return data

        time.sleep(POLL_INTERVAL)

    raise TimeoutError(
        f"Timed out after {MAX_ATTEMPTS * POLL_INTERVAL} seconds waiting for video."
    )


def run(ad_id: str) -> Dict[str, Any]:
    print("Previewing brief...")
    preview_brief(ad_id)

    print("\nGenerating video...")
    generate(ad_id)

    print("\nPolling until ready...")
    return poll(ad_id)


def generate_variants(ad_id: str, count: int) -> Dict[str, Any]:
    query = urlencode({"count": count})

    data = request_json(
        method="POST",
        path=f"/api/v1/review/{ad_id}/generate-variants?{query}",
    )

    pretty_print(data)

    print(f"\nQueued {count} variant(s). Polling latest refresh for this ad...")
    return poll(ad_id)


def approve(refresh_id: str, notes: str) -> Dict[str, Any]:
    data = request_json(
        method="POST",
        path=f"/api/v1/review/refresh/{refresh_id}/approve",
        payload={"notes": notes},
    )

    pretty_print(data)
    return data


def reject(refresh_id: str, notes: str) -> Dict[str, Any]:
    data = request_json(
        method="POST",
        path=f"/api/v1/review/refresh/{refresh_id}/reject",
        payload={"notes": notes},
    )

    pretty_print(data)
    return data


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="CLI helper for previewing briefs, generating Luma videos, polling refreshes, and approving/rejecting outputs.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    brief_parser = subparsers.add_parser("brief", help="Preview the creative brief without using Luma credits.")
    brief_parser.add_argument("ad_id")

    generate_parser = subparsers.add_parser("generate", help="Generate a Luma video for an ad.")
    generate_parser.add_argument("ad_id")

    poll_parser = subparsers.add_parser("poll", help="Poll until the latest refresh is ready or rejected.")
    poll_parser.add_argument("ad_id")

    run_parser = subparsers.add_parser("run", help="Preview brief, generate video, then poll until ready.")
    run_parser.add_argument("ad_id")

    variants_parser = subparsers.add_parser("variants", help="Generate multiple variants.")
    variants_parser.add_argument("ad_id")
    variants_parser.add_argument("count", nargs="?", type=int, default=3)

    approve_parser = subparsers.add_parser("approve", help="Approve a refresh.")
    approve_parser.add_argument("refresh_id")
    approve_parser.add_argument("notes", nargs="?", default="Ship this variant")

    reject_parser = subparsers.add_parser("reject", help="Reject a refresh.")
    reject_parser.add_argument("refresh_id")
    reject_parser.add_argument("notes", nargs="?", default="Hook too weak")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.command == "brief":
            preview_brief(args.ad_id)

        elif args.command == "generate":
            generate(args.ad_id)

        elif args.command == "poll":
            poll(args.ad_id)

        elif args.command == "run":
            run(args.ad_id)

        elif args.command == "variants":
            generate_variants(args.ad_id, args.count)

        elif args.command == "approve":
            approve(args.refresh_id, args.notes)

        elif args.command == "reject":
            reject(args.refresh_id, args.notes)

        else:
            parser.print_help()
            return 1

        return 0

    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        return 130

    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
