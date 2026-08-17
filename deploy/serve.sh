#!/usr/bin/env bash
# Static file server for Bikes v2 on Odin (Cloudflare Tunnel target).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
PORT="${BIKES_V2_PORT:-8311}"
HOST="${BIKES_V2_HOST:-127.0.0.1}"

if [[ ! -d "$DIST" ]]; then
  echo "Missing dist/ — run npm run build first" >&2
  exit 1
fi

cd "$DIST"
exec python3 -m http.server "$PORT" --bind "$HOST"
