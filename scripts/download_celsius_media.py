"""Download the scraped @celsiusofficial videos + covers from Apify into
frontend/public/celsius/ so they're served same-origin (no auth, no CORS, permanent).

Reads scripts/output/celsius_profile_downloaded.json (discovery items with mediaUrls),
writes scripts/output/celsius_media_manifest.json for the seeder.

Run: scripts/.venv/bin/python scripts/download_celsius_media.py
"""
import json
import os
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")
TOKEN = os.getenv("APIFY_TOKEN")
if not TOKEN:
    raise SystemExit("Missing APIFY_TOKEN")

items = json.loads((ROOT / "scripts" / "output" / "celsius_profile_downloaded.json").read_text())
outdir = ROOT / "frontend" / "public" / "celsius"
outdir.mkdir(parents=True, exist_ok=True)


def dl(url: str, dest: Path) -> None:
    signed = url + ("&" if "?" in url else "?") + "token=" + TOKEN
    req = urllib.request.Request(signed, headers={"User-Agent": "curl/8"})
    with urllib.request.urlopen(req, timeout=90) as r, open(dest, "wb") as f:
        f.write(r.read())


manifest = []
for it in items:
    vid = str(it.get("id") or "")
    media = it.get("mediaUrls") or []
    vm = it.get("videoMeta") or {}
    cov = vm.get("coverUrl") or vm.get("originalCoverUrl")
    if not vid or not media or not cov:
        continue
    try:
        dl(media[0], outdir / f"{vid}.mp4")
        dl(cov, outdir / f"{vid}.jpg")
    except Exception as exc:  # noqa: BLE001
        print("skip", vid, exc)
        continue
    manifest.append({
        "id": vid,
        "text": (it.get("text") or "").strip(),
        "playCount": it.get("playCount") or 0,
        "diggCount": it.get("diggCount") or 0,
        "createTimeISO": it.get("createTimeISO"),
        "video": f"/celsius/{vid}.mp4",
        "cover": f"/celsius/{vid}.jpg",
    })
    print("ok", vid)

(ROOT / "scripts" / "output" / "celsius_media_manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=1)
)
print(f"\nDownloaded {len(manifest)} videos+covers to {outdir}")
