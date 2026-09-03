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
- [~] Task 21 — docs done; Firestore rules + 9 indexes LIVE 2026-09-03; Pages+Storage live 2026-09-04; ⏳ owner: App Check key, domain, phone upload test, live checklist

## Deferred minors (from reviews)

Small, non-blocking items noted during code review across Tasks 1–20. None of these gate go-live; revisit opportunistically.

- rules test matrix cells still missing (other-user reads of drafts, updates of existing docs by anon/other, admin list on admins, admin read of unknown collections) — admin list on audit/committee added in the 2026-09-03 fix wave
- image/svg+xml passes Storage okType (admin-only upload; revisit if Storage is fronted by our domain)
- rich.js: ALLOW_DATA_ATTR/ARIA false, RETURN_DOM_FRAGMENT, rel noreferrer — console.warn on missing DOMPurify added in the 2026-09-03 fix wave
- reauth uses unmasked prompt()
- captions single-language; history images are URL fields
- events: upcoming wrapped in div, past not
- stale `// Task N` labels in admin.js

## Phase 2 — Donation · Phase 3 — Live hub · Phase 4 — Members

Plan: `docs/superpowers/plans/2026-09-04-phase-2-4-donation-transparency-live-members.md`.

- [x] Task 1 rules + tests + indexes for donations/transparency/announcements/members/notices/roster (2026-09-04)
- [x] Task 2 shared plumbing — i18n, content reads, nav, money helpers, PDF upload (2026-09-04)
- [x] Task 3 admin donations section (2026-09-04)
- [x] Task 4 public donate.html (2026-09-04)
- [x] Task 5 admin transparency section + PDF upload (2026-09-04)
- [x] Task 6 public transparency.html (2026-09-04)
- [x] Task 7 admin announcements section (2026-09-04)
- [x] Task 8 live strip on home (realtime) + today's schedule (2026-09-04)
- [x] Task 9 phone auth enablement + seed/e2e groundwork (2026-09-04)
- [x] Task 10 admin members section + payments (2026-09-04)
- [x] Task 11 admin notices + roster sections (2026-09-04)
- [x] Task 12 public members.html (phone OTP portal) (2026-09-04)
- [x] Task 13 e2e for phases 2–4 (donate/transparency/live/members, 19 specs total) + docs; members-portal "torn down after sign-in" concern investigated, not reproducible against committed code (2026-09-04)
- [ ] Task 14 pending — production rollout: rules/indexes deploy, `testPhoneNumbers` auth config, demo data, live verification (owner-driven, needs the real Firebase project + Blaze, same blocker as Task 11 in Phase 0)

### Deferred minors from Phase 2–4 reviews

Small, non-blocking items noted during Tasks 1–13 review. None gate Task 14; revisit opportunistically.

- `admin/js/upload.js`'s `fileField` (PDF upload) stores the raw uploaded filename in the Storage path rather than a sanitised/slugified one
- PDF MIME type is checked by Storage rules at write time only, not re-verified client-side before upload starts
- transparency admin form: a blank amount field is coerced to `0` rather than rejected/required
- `fileField`'s Storage folder is stamped with the current year at row-add time, not the transparency doc's own `year` field — editing an old year's doc later still files new uploads under this year
- admin tab click (e.g. switching donations year-select) triggers a full section re-render/refetch rather than an in-place list filter
- a few `catch` blocks across the six new admin sections set an `errored` flag that is read but never actually branched on in the render (dead code, harmless — the generic `common.error` text still shows via the surrounding try/catch)
- announcements admin list's "সম্পাদনা"/"Edit" button label doesn't change to anything else while a row is mid-edit
- `js/pages/members.js`'s `normalizePhone` (and its admin twin) accepts an 11-digit input with a leading 0 (e.g. `09999999999`) as if it were a valid `+0999...` E.164 number — no leading-zero rejection
- donations/notices/roster soft-delete and members phone-uniqueness checks have a TOCTOU window (read-then-write, no transaction) — acceptable at single-admin scale, would need a transaction or Firestore-side uniqueness constraint at larger scale
- `js/pages/home.js`'s live strip can paint once before `onAnnouncements()`'s first `onSnapshot` callback resolves (empty strip flashes, then fills) — not a correctness bug, just a first-paint flicker

## Later phases (spec §8)

Payment gateway (real online UPI/card checkout, not the current "pay via UPI app + WhatsApp confirm" flow) once 80G registration lands and the trust can accept it directly.
