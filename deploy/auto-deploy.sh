#!/usr/bin/env bash
# Poll origin/main on odin. When it moves, run deploy/odin.sh.
#
# Invoked by bikes-v2-autodeploy.timer. GitHub-hosted Actions cannot reach
# this tailnet box — do not add a GH SSH deploy workflow unless a
# self-hosted runner exists.

set -euo pipefail

BIKES_V2_SRC="${BIKES_V2_SRC:-${HOME}/Sites/bikes-v2-src}"
BRANCH="${DEPLOY_BRANCH:-main}"
STATE_FILE="${STATE_FILE:-${HOME}/.local/state/bikes-v2-deploy/last-sha}"
LOCK_FILE="${LOCK_FILE:-${HOME}/.local/state/bikes-v2-deploy/lock}"
ODIN_SH="${ODIN_SH:-$BIKES_V2_SRC/deploy/odin.sh}"
if [ ! -x "$ODIN_SH" ] && [ -x "${HOME}/.local/bin/bikes-v2-odin.sh" ]; then
    ODIN_SH="${HOME}/.local/bin/bikes-v2-odin.sh"
fi

log() {
    echo "[$(date -Iseconds)] $*"
}

die() {
    echo "[$(date -Iseconds)] ERROR: $*" >&2
    exit 1
}

[ -d "$BIKES_V2_SRC/.git" ] || die "not a git checkout: $BIKES_V2_SRC"
command -v git >/dev/null 2>&1 || die "missing required command: git"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"

mkdir -p "$(dirname "$STATE_FILE")" "$(dirname "$LOCK_FILE")"

cd "$BIKES_V2_SRC"
git fetch origin "$BRANCH" --quiet
NEW_SHA=$(git rev-parse "origin/${BRANCH}")
LAST_SHA=$(cat "$STATE_FILE" 2>/dev/null || echo none)

INTAKE="$BIKES_V2_SRC/deploy/mmIntake.mjs"
if [ -x "$NODE_BIN" ] && [ -f "$INTAKE" ]; then
    set +e
    "$NODE_BIN" "$INTAKE"
    intake_status=$?
    set -e
    if [ "$intake_status" -ne 0 ]; then
        log "mm intake failed (exit $intake_status)"
    fi
fi

if [ "$NEW_SHA" = "$LAST_SHA" ]; then
    exit 0
fi

[ -x "$ODIN_SH" ] || die "odin.sh not executable: $ODIN_SH"

log "Deploying ${LAST_SHA:0:7} → ${NEW_SHA:0:7}"
export BIKES_V2_DEPLOY_FROM="$LAST_SHA"

if command -v flock >/dev/null 2>&1; then
    set +e
    flock -n -o "$LOCK_FILE" "$ODIN_SH"
    status=$?
    set -e
    if [ "$status" -ne 0 ]; then
        if flock -n "$LOCK_FILE" true; then
            die "odin.sh failed (exit $status)"
        fi
        log "another deploy holds $LOCK_FILE — skip"
        exit 0
    fi
else
    "$ODIN_SH"
fi

DEPLOYED=$(git -C "$BIKES_V2_SRC" rev-parse HEAD)
printf '%s\n' "$DEPLOYED" > "$STATE_FILE"
log "Recorded $DEPLOYED in $STATE_FILE"
