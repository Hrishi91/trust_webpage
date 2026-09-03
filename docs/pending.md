# Pending / Roadmap

## Phase 0 — Foundation

- [x] Task 1 scaffold (2026-09-03)
- [x] Task 2 Firebase project decisions (Blaze, ₹100 alert) (2026-09-03)
- [x] Task 3 i18n (2026-09-03)
- [x] Task 4 ui helpers (2026-09-03)
- [x] Task 5 Firestore rules (2026-09-03)
- [x] Task 6 Storage rules (2026-09-03)
- [x] Task 7 firebase.js (2026-09-03)
- [x] Task 8 admin auth shell (2026-09-03)
- [x] Task 9 settings + audit (2026-09-03)
- [x] Task 10 export (2026-09-03)
- [ ] Task 11 partial — code done (placeholder index, .nojekyll, deploy guide); ⏳ owner: GitHub PAT with Administration permission → repo create + Pages, real Firebase project + Blaze, rules deploy, custom domain

## Phase 1 — Showcase

- [x] Task 12 content.js (2026-09-03)
- [x] Task 13 public shell (2026-09-03)
- [x] Task 14 home (2026-09-03)
- [x] Task 15 history (2026-09-03)
- [x] Task 16 committee (2026-09-03)
- [x] Task 17 upload (2026-09-03)
- [x] Task 18 gallery (2026-09-03)
- [x] Task 19 events (2026-09-03)
- [x] Task 20 e2e (2026-09-03)
- [ ] Task 21 go-live — docs done (admin guide, go-live checklist, this file, PROJECT_CONTEXT, README, build-log); ⏳ live checklist (indexes, real-project verification, App Check enforcement) after owner completes Task 11's prerequisites — see `docs/user-guide/go-live-checklist.md`

## Deferred minors (from reviews)

Small, non-blocking items noted during code review across Tasks 1–20. None of these gate go-live; revisit opportunistically.

- rules test matrix cells still missing (other-user reads of drafts, updates of existing docs by anon/other, admin list on admins, admin read of unknown collections) — admin list on audit/committee added in the 2026-09-03 fix wave
- image/svg+xml passes Storage okType (admin-only upload; revisit if Storage is fronted by our domain)
- rich.js: ALLOW_DATA_ATTR/ARIA false, RETURN_DOM_FRAGMENT, rel noreferrer — console.warn on missing DOMPurify added in the 2026-09-03 fix wave
- reauth uses unmasked prompt()
- captions single-language; history images are URL fields
- events: upcoming wrapped in div, past not
- stale `// Task N` labels in admin.js

## Phase 2 — Donation + Transparency

Next phase after go-live. See design spec §8 (`docs/superpowers/specs/2026-09-03-trust-website-design.md`) for scope.

## Later phases (spec §8)

3 Live hub · 4 Members
