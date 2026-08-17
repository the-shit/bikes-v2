#!/usr/bin/env bash
# Ship bikes-v2 from the source clone to the live dist on odin.
#
# Source checkout:  BIKES_V2_SRC  (default ~/Sites/bikes-v2-src)
# Live tree:        LIVE_ROOT     (default ~/Sites/bikes-v2)

set -euo pipefail

BIKES_V2_SRC="${BIKES_V2_SRC:-${HOME}/Sites/bikes-v2-src}"
LIVE_ROOT="${LIVE_ROOT:-${HOME}/Sites/bikes-v2}"
LIVE_DIST="${LIVE_DIST:-$LIVE_ROOT/dist}"
BRANCH="${DEPLOY_BRANCH:-main}"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"
NPM_BIN="${NPM_BIN:-/usr/bin/npm}"

log() {
    echo "[$(date -Iseconds)] $*"
}

die() {
    echo "[$(date -Iseconds)] ERROR: $*" >&2
    exit 1
}

[ -d "$BIKES_V2_SRC/.git" ] || die "not a git checkout: $BIKES_V2_SRC"
[ -x "$NODE_BIN" ] || die "node missing: $NODE_BIN"
[ -x "$NPM_BIN" ] || die "npm missing: $NPM_BIN"
command -v rsync >/dev/null 2>&1 || die "missing required command: rsync"
command -v git >/dev/null 2>&1 || die "missing required command: git"

export PATH="/usr/bin:/bin"
export npm_config_engine_strict=false

cd "$BIKES_V2_SRC"
log "Fetching origin/${BRANCH} in $BIKES_V2_SRC"
git fetch origin "$BRANCH"
git checkout --quiet "$BRANCH" 2>/dev/null || git checkout --quiet -B "$BRANCH" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}" --quiet
COMMIT=$(git rev-parse --short HEAD)
log "Building $COMMIT ($(git log -1 --pretty=format:'%s')) with $($NODE_BIN -v)"

"$NPM_BIN" ci --no-audit --no-fund
"$NPM_BIN" run build

[ -f "$BIKES_V2_SRC/dist/index.html" ] || die "build produced no dist/index.html"

mkdir -p "$LIVE_DIST"
log "Rsync dist/ → $LIVE_DIST"
rsync -a --delete "$BIKES_V2_SRC/dist/" "$LIVE_DIST/"

LIVE_SERVER="$LIVE_ROOT/deploy/server.mjs"
SRC_SERVER="$BIKES_V2_SRC/deploy/server.mjs"
if [ -f "$SRC_SERVER" ]; then
    mkdir -p "$(dirname "$LIVE_SERVER")"
    if [ ! -f "$LIVE_SERVER" ] || ! cmp -s "$SRC_SERVER" "$LIVE_SERVER"; then
        log "Updating deploy/server.mjs and restarting bikes-v2.service"
        cp "$SRC_SERVER" "$LIVE_SERVER"
        if command -v systemctl >/dev/null 2>&1; then
            export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
            systemctl --user restart bikes-v2.service
        fi
    fi
fi

log "Deploy complete ($COMMIT). Live index:"
grep -o 'index-[^"]*\.js' "$LIVE_DIST/index.html" | head -1 || true
