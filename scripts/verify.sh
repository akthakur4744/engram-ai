#!/usr/bin/env bash
# Definition of done: typecheck all packages, then build the web app.
# Used by hooks, skills, and CI. Exit non-zero on first failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> typecheck"
pnpm -r --parallel typecheck

echo "==> build"
pnpm build

echo "==> verify passed"
