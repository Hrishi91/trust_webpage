# Build log (append-only, newest at bottom)

## 2026-09-03 — v0.0.1 scaffold
Repo created; design spec approved; docs discipline + pre-commit hook; dev-only
package.json (firebase-tools, rules-unit-testing, playwright). No site code yet.
Fix: test scripts use globs (Node 24), rules-unit-testing ^5 (firebase 12 peer). package-lock synced to 5.0.2.

v0.0.2 — firebase.json (emulator ports 8080/9099/9199/4000), .firebaserc, firebase-config.js placeholder (PASTE), deny-all rules stubs, setup-firebase.md guide (Bengali).

v0.1.0 — i18n module (getLang/setLang/pick/t/STRINGS/onLangChange), 11 unit tests.

v0.2.0 — ui helpers (escapeHtml, countdown, bnDigits, fmtDate, el, toast), 9 unit tests.
Fix: Bengali digit codepoints (was Devanagari 1–9), date-only fmtDate parses as local, 9 tests.

v0.3.0 — Firestore rules (default deny; published+deleted gates; admins console-only; audit append-only) + emulator test matrix (9 tests). Mutation checks: dropping the deleted clause fails history/events/albums; dropping audit uid check fails audit.
