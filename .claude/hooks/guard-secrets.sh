#!/usr/bin/env bash
# Guard hook: flag staged diffs for secret patterns and console.log in packages/*.
# Receives JSON on stdin; exits 2 to block if violations found.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

VIOLATIONS=()

# Check staged diff for secret patterns
if git rev-parse --git-dir >/dev/null 2>&1; then
  STAGED=$(git diff --cached --diff-filter=ACM 2>/dev/null || true)
  if [ -n "$STAGED" ]; then
    if echo "$STAGED" | grep -qiE '(sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*=\s*["\x27][^"\x27]+|password\s*=\s*["\x27][^"\x27]+|SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^$\{])'; then
      VIOLATIONS+=("Staged diff contains possible secret/API key pattern")
    fi

    # Flag new console.log in packages/ only (scope diff to that tree)
    PACKAGES_DIFF=$(git diff --cached --diff-filter=ACM -- 'packages/' 2>/dev/null || true)
    if [ -n "$PACKAGES_DIFF" ] && echo "$PACKAGES_DIFF" | grep -qE '^\+[^+].*console\.log'; then
      VIOLATIONS+=("Staged diff adds console.log in packages/ — use structured error handling instead")
    fi
  fi
fi

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  MSG=$(printf '%s\n' "${VIOLATIONS[@]}")
  echo "{\"permission\": \"deny\", \"user_message\": \"$MSG\", \"agent_message\": \"Hook blocked: $MSG\"}" >&1
  exit 2
fi

echo '{"permission": "allow"}' >&1
exit 0
