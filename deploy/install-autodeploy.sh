#!/usr/bin/env bash
# One-shot install of bikes-v2 origin/main poller on odin (user systemd, no sudo).
# Idempotent. Run on odin:
#   ~/Sites/bikes-v2-src/deploy/install-autodeploy.sh
#
# Refuses to run off-box unless FORCE_INSTALL=1.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_PATH="${BIN_PATH:-${HOME}/.local/bin/bikes-v2-auto-deploy.sh}"
UNIT_DIR="${UNIT_DIR:-${HOME}/.config/systemd/user}"
STATE_DIR="${STATE_DIR:-${HOME}/.local/state/bikes-v2-deploy}"
REPO_DIR="${BIKES_V2_SRC:-${HOME}/Sites/bikes-v2-src}"
LIVE_ROOT="${LIVE_ROOT:-${HOME}/Sites/bikes-v2}"
GIT_URL="${BIKES_V2_GIT_URL:-git@github.com:the-shit/bikes-v2.git}"

if [ "${FORCE_INSTALL:-}" != "1" ]; then
    host="$(hostname -s 2>/dev/null || hostname)"
    if [ "$host" != "odin" ]; then
        echo "ERROR: refusing install on host '$host' (expected odin). FORCE_INSTALL=1 to override." >&2
        exit 1
    fi
fi

if [ ! -x "$SRC_DIR/auto-deploy.sh" ] || [ ! -x "$SRC_DIR/odin.sh" ]; then
    echo "ERROR: auto-deploy.sh / odin.sh missing or not executable in $SRC_DIR" >&2
    exit 1
fi

mkdir -p "$(dirname "$BIN_PATH")" "$UNIT_DIR" "$STATE_DIR" "$LIVE_ROOT/dist"

if [ ! -d "$REPO_DIR/.git" ]; then
    echo "Cloning $GIT_URL → $REPO_DIR"
    mkdir -p "$(dirname "$REPO_DIR")"
    git clone "$GIT_URL" "$REPO_DIR"
fi

install -m 755 "$SRC_DIR/auto-deploy.sh" "$BIN_PATH"
install -m 755 "$SRC_DIR/odin.sh" "$(dirname "$BIN_PATH")/bikes-v2-odin.sh"
install -m 644 "$SRC_DIR/bikes-v2-autodeploy.service" "$UNIT_DIR/bikes-v2-autodeploy.service"
install -m 644 "$SRC_DIR/bikes-v2-autodeploy.timer" "$UNIT_DIR/bikes-v2-autodeploy.timer"
install -m 644 "$SRC_DIR/bikes-v2.service" "$UNIT_DIR/bikes-v2.service"

systemctl --user daemon-reload
systemctl --user enable --now bikes-v2.service
systemctl --user enable --now bikes-v2-autodeploy.timer
systemctl --user status bikes-v2.service --no-pager || true
systemctl --user status bikes-v2-autodeploy.timer --no-pager || true

echo "Installed $BIN_PATH and enabled bikes-v2.service + bikes-v2-autodeploy.timer"
echo "Source clone: $REPO_DIR"
echo "Live dist:    $LIVE_ROOT/dist"
