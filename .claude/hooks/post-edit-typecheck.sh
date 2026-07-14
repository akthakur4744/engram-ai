#!/usr/bin/env bash
# Post-edit hook: run typecheck on packages after file edits.
# Receives JSON on stdin (Cursor/Claude hook protocol); exits 0 always (advisory).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Only typecheck — full verify is expensive for every edit
if command -v pnpm >/dev/null 2>&1; then
  pnpm -r --parallel typecheck 2>&1 || {
    echo '{"additional_context": "Typecheck failed after file edit. Run pnpm verify before completing the task."}' >&1
    exit 0
  }
fi

exit 0
