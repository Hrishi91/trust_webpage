#!/usr/bin/env bash
# Refuse a commit that changes code without touching docs/build-log.md.
# Install: ln -sf ../../scripts/pre-commit-docs.sh .git/hooks/pre-commit
set -euo pipefail
staged=$(git diff --cached --name-only)
code=$(echo "$staged" | grep -E '^(js|admin|css|tests|scripts|firestore\.rules|storage\.rules|.*\.html)' || true)
if [ -n "$code" ] && ! echo "$staged" | grep -q '^docs/build-log.md$'; then
  echo "pre-commit: code changed but docs/build-log.md is not staged." >&2
  echo "Add a build-log entry (one subject per commit, docs in the same commit)." >&2
  exit 1
fi
if echo "$staged" | grep -qE 'service-?account.*\.json|\.env$'; then
  echo "pre-commit: refusing to commit a secret-looking file." >&2
  exit 1
fi
