#!/usr/bin/env bash
# Add bikes-v2.jordanpartridge.us to the existing odin Cloudflare tunnel.
# Run on odin. Requires cloudflared + write access to ~/.cloudflared/config.yml.
#
#   ~/Sites/bikes-v2-src/deploy/install-tunnel.sh
#
# Does not restart cloudflared unless APPLY=1.

set -euo pipefail

HOSTNAME="${BIKES_V2_HOSTNAME:-bikes-v2.jordanpartridge.us}"
ORIGIN="${BIKES_V2_ORIGIN:-http://127.0.0.1:8311}"
CONFIG="${CLOUDFLARED_CONFIG:-${HOME}/.cloudflared/config.yml}"
TUNNEL_ID="${CLOUDFLARED_TUNNEL_ID:-7ed7631a-4afc-4b13-88d8-89c0db80c27d}"

if [ "${FORCE_INSTALL:-}" != "1" ]; then
    host="$(hostname -s 2>/dev/null || hostname)"
    if [ "$host" != "odin" ]; then
        echo "ERROR: refusing tunnel edit on host '$host' (expected odin). FORCE_INSTALL=1 to override." >&2
        exit 1
    fi
fi

[ -f "$CONFIG" ] || {
    echo "ERROR: missing $CONFIG" >&2
    exit 1
}

if grep -Fq "hostname: $HOSTNAME" "$CONFIG"; then
    echo "Ingress already has $HOSTNAME"
else
    cp "$CONFIG" "${CONFIG}.bak.bikes-v2.$(date +%s)"
    python3 - "$CONFIG" "$HOSTNAME" "$ORIGIN" <<'PY'
import sys
from pathlib import Path

path, hostname, origin = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
text = path.read_text()
needle = "  # catch-all\n  - service: http_status:404\n"
block = (
    f"  # Bikes v2 — empty-scene / rewrite\n"
    f"  - hostname: {hostname}\n"
    f"    service: {origin}\n\n"
    f"{needle}"
)
if needle not in text:
    raise SystemExit("could not find catch-all ingress block to splice before")
path.write_text(text.replace(needle, block, 1))
print(f"Added {hostname} → {origin}")
PY
fi

if command -v cloudflared >/dev/null 2>&1; then
    cloudflared tunnel route dns -f "$TUNNEL_ID" "$HOSTNAME"
    echo "DNS route requested for $HOSTNAME"
else
    echo "WARN: cloudflared not on PATH; add DNS route by hand" >&2
fi

if [ "${APPLY:-}" = "1" ]; then
    export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
    if systemctl --user restart cloudflared 2>/dev/null; then
        echo "Restarted user cloudflared"
    elif sudo -n systemctl restart cloudflared 2>/dev/null; then
        echo "Restarted system cloudflared"
    else
        echo "WARN: could not restart cloudflared; reload it by hand" >&2
        exit 2
    fi
else
    echo "Config updated. Reloading cloudflared is left to APPLY=1 or a human."
fi
