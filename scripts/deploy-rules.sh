#!/usr/bin/env bash
# Deploy Firestore + Storage rules — ONLY after the full test suite is green.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project ganesh-puja-trust
echo "Rules deployed $(date '+%Y-%m-%d %H:%M'). Add a build-log line."
