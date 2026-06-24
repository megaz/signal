#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

if [[ ! -d "$VENV" ]]; then
  echo "Creating scripts virtualenv..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -q -r "$SCRIPT_DIR/requirements.txt"

exec "$VENV/bin/python" "$SCRIPT_DIR/scrape_tiktok_posts.py" "$@"
