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
export VITE_GIT_SHA="$COMMIT"
# Asgard swap is config-only: set VITE_FEEDBACK_URL to the intake URL when it exists.
# Default (unset) is same-origin POST /api/feedback on this box.
log "Building $COMMIT ($(git log -1 --pretty=format:'%s')) with $($NODE_BIN -v)"

"$NPM_BIN" ci --no-audit --no-fund
"$NPM_BIN" run build

[ -f "$BIKES_V2_SRC/dist/index.html" ] || die "build produced no dist/index.html"

mkdir -p "$LIVE_DIST"
log "Rsync dist/ → $LIVE_DIST"
rsync -a --delete "$BIKES_V2_SRC/dist/" "$LIVE_DIST/"

LIVE_DEPLOY="$LIVE_ROOT/deploy"
SRC_DEPLOY="$BIKES_V2_SRC/deploy"
deploy_changed=0
mkdir -p "$LIVE_DEPLOY"
for src in "$SRC_DEPLOY"/*.mjs; do
    [ -f "$src" ] || continue
    base="$(basename "$src")"
    dest="$LIVE_DEPLOY/$base"
    if [ ! -f "$dest" ] || ! cmp -s "$src" "$dest"; then
        cp "$src" "$dest"
        deploy_changed=1
    fi
done
if [ "$deploy_changed" -eq 1 ]; then
    log "Updating deploy/*.mjs and restarting bikes-v2.service"
    if command -v systemctl >/dev/null 2>&1; then
        export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
        systemctl --user restart bikes-v2.service
    fi
fi

log "Deploy complete ($COMMIT). Live index:"
grep -o 'index-[^"]*\.js' "$LIVE_DIST/index.html" | head -1 || true
